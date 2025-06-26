const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const redisClient = require('./redis-client');
const kafkaClient = require('./kafka-client');
const Message = require('../models/message');
const User = require('../models/user');

class ChatService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket mapping
    this.userSockets = new Map(); // socketId -> userId mapping
    this.heartbeatInterval = null;
  }

  async initialize(server) {
    try {
      // Initialize Socket.IO
      this.io = new Server(server, {
        cors: {
          origin: config.websocket.corsOrigin,
          methods: ['GET', 'POST'],
          credentials: true
        },
        transports: ['websocket', 'polling']
      });

      // Setup authentication middleware
      this.io.use(this.authenticateSocket.bind(this));

      // Setup event handlers
      this.setupEventHandlers();

      // Start Kafka consumers
      await this.startKafkaConsumers();

      // Start heartbeat mechanism
      this.startHeartbeat();

      // Register this service
      await this.registerService();

      logger.info('Chat service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize chat service:', error);
      throw error;
    }
  }

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user || !user.isActive) {
        return next(new Error('Invalid user'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      logger.error('Socket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  async handleConnection(socket) {
    const userId = socket.userId;
    const user = socket.user;

    try {
      // Store user connection
      this.connectedUsers.set(userId, socket);
      this.userSockets.set(socket.id, userId);

      // Update user presence
      await this.setUserOnline(userId);

      // Join user to their personal room
      socket.join(`user:${userId}`);

      logger.userAction(userId, 'connected', { socketId: socket.id });

      // Setup event handlers for this socket
      this.setupSocketHandlers(socket);

      // Send connection acknowledgment
      socket.emit('connected', {
        message: 'Connected successfully',
        user: user.toPublicJSON()
      });

    } catch (error) {
      logger.error('Error handling connection:', error);
      socket.disconnect();
    }
  }

  setupSocketHandlers(socket) {
    const userId = socket.userId;

    // Handle private messages
    socket.on('send_message', async (data) => {
      await this.handleSendMessage(socket, data);
    });

    // Handle message read receipts
    socket.on('mark_read', async (data) => {
      await this.handleMarkRead(socket, data);
    });

    // Handle conversation history requests
    socket.on('get_conversation', async (data) => {
      await this.handleGetConversation(socket, data);
    });

    // Handle user search
    socket.on('search_users', async (data) => {
      await this.handleSearchUsers(socket, data);
    });

    // Handle friend requests
    socket.on('send_friend_request', async (data) => {
      await this.handleFriendRequest(socket, data);
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      this.handleTyping(socket, data);
    });

    socket.on('stop_typing', (data) => {
      this.handleStopTyping(socket, data);
    });

    // Handle heartbeat
    socket.on('heartbeat', () => {
      socket.emit('heartbeat_ack');
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      await this.handleDisconnection(socket, reason);
    });
  }

  async handleSendMessage(socket, data) {
    try {
      const { receiverId, content, messageType = 'text' } = data;
      const senderId = socket.userId;

      // Validate input
      if (!receiverId || !content) {
        return socket.emit('error', { message: 'Receiver ID and content are required' });
      }

      if (content.length > config.message.maxLength) {
        return socket.emit('error', { message: 'Message too long' });
      }

      // Check if receiver exists
      const receiver = await User.findById(receiverId);
      if (!receiver) {
        return socket.emit('error', { message: 'Receiver not found' });
      }

      // Generate conversation ID
      const conversationId = Message.generateConversationId(senderId, receiverId);

      // Create message
      const message = new Message({
        conversationId,
        sender: senderId,
        receiver: receiverId,
        content,
        messageType,
        timestamp: new Date()
      });

      await message.save();
      await message.populate(['sender', 'receiver'], 'username displayName avatar');

      // Publish to Kafka for cross-service message routing
      await kafkaClient.publishChatMessage({
        type: 'new_message',
        message: message.toJSON(),
        senderId,
        receiverId,
        conversationId
      });

      // Acknowledge to sender
      socket.emit('message_sent', {
        messageId: message._id,
        conversationId,
        status: 'sent'
      });

      logger.chatMessage(senderId, content, { 
        receiverId, 
        messageId: message._id.toString(),
        conversationId 
      });

    } catch (error) {
      logger.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  async handleMarkRead(socket, data) {
    try {
      const { messageId, conversationId } = data;
      const userId = socket.userId;

      if (messageId) {
        // Mark specific message as read
        const message = await Message.findById(messageId);
        if (message && message.receiver.toString() === userId) {
          await message.markAsRead();
          
          // Notify sender via Kafka
          await kafkaClient.publishChatMessage({
            type: 'message_read',
            messageId: message._id,
            conversationId: message.conversationId,
            readBy: userId,
            readAt: message.readAt
          });
        }
      } else if (conversationId) {
        // Mark all messages in conversation as read
        await Message.updateMany(
          { 
            conversationId, 
            receiver: userId, 
            status: { $ne: 'read' } 
          },
          { 
            status: 'read', 
            readAt: new Date() 
          }
        );

        // Notify sender via Kafka
        await kafkaClient.publishChatMessage({
          type: 'conversation_read',
          conversationId,
          readBy: userId,
          readAt: new Date()
        });
      }

    } catch (error) {
      logger.error('Error marking message as read:', error);
    }
  }

  async handleGetConversation(socket, data) {
    try {
      const { userId: otherUserId, page = 1, limit = 50 } = data;
      const currentUserId = socket.userId;

      const conversationId = Message.generateConversationId(currentUserId, otherUserId);
      const messages = await Message.getConversationHistory(conversationId, page, limit);

      socket.emit('conversation_history', {
        conversationId,
        messages,
        page,
        hasMore: messages.length === limit
      });

    } catch (error) {
      logger.error('Error fetching conversation:', error);
      socket.emit('error', { message: 'Failed to fetch conversation' });
    }
  }

  async handleSearchUsers(socket, data) {
    try {
      const { query, limit = 10 } = data;
      
      const users = await User.find({
        $and: [
          { _id: { $ne: socket.userId } },
          { isActive: true },
          {
            $or: [
              { username: { $regex: query, $options: 'i' } },
              { displayName: { $regex: query, $options: 'i' } }
            ]
          }
        ]
      })
      .limit(limit)
      .select('username displayName avatar status lastSeen');

      socket.emit('search_results', { users });

    } catch (error) {
      logger.error('Error searching users:', error);
      socket.emit('error', { message: 'Failed to search users' });
    }
  }

  async handleFriendRequest(socket, data) {
    try {
      const { userId: friendId } = data;
      const currentUserId = socket.userId;

      const user = await User.findById(currentUserId);
      const friend = await User.findById(friendId);

      if (!friend) {
        return socket.emit('error', { message: 'User not found' });
      }

      // Check if already friends
      const isAlreadyFriend = user.friends.some(f => f.user.toString() === friendId);
      if (isAlreadyFriend) {
        return socket.emit('error', { message: 'Already friends' });
      }

      // Add friend
      user.friends.push({ user: friendId });
      friend.friends.push({ user: currentUserId });

      await Promise.all([user.save(), friend.save()]);

      // Notify both users via Kafka
      await kafkaClient.publishChatMessage({
        type: 'friend_added',
        userId: currentUserId,
        friendId,
        timestamp: new Date()
      });

      socket.emit('friend_added', { friend: friend.toPublicJSON() });

    } catch (error) {
      logger.error('Error handling friend request:', error);
      socket.emit('error', { message: 'Failed to add friend' });
    }
  }

  handleTyping(socket, data) {
    const { receiverId } = data;
    const senderId = socket.userId;

    // Notify receiver if they're connected to this service
    const receiverSocket = this.connectedUsers.get(receiverId);
    if (receiverSocket) {
      receiverSocket.emit('user_typing', { userId: senderId });
    } else {
      // Notify via Kafka for cross-service communication
      kafkaClient.publishChatMessage({
        type: 'typing',
        senderId,
        receiverId,
        timestamp: Date.now()
      });
    }
  }

  handleStopTyping(socket, data) {
    const { receiverId } = data;
    const senderId = socket.userId;

    // Notify receiver if they're connected to this service
    const receiverSocket = this.connectedUsers.get(receiverId);
    if (receiverSocket) {
      receiverSocket.emit('user_stop_typing', { userId: senderId });
    } else {
      // Notify via Kafka for cross-service communication
      kafkaClient.publishChatMessage({
        type: 'stop_typing',
        senderId,
        receiverId,
        timestamp: Date.now()
      });
    }
  }

  async handleDisconnection(socket, reason) {
    const userId = socket.userId;

    try {
      // Remove from local maps
      this.connectedUsers.delete(userId);
      this.userSockets.delete(socket.id);

      // Update presence
      await this.setUserOffline(userId);

      logger.userAction(userId, 'disconnected', { 
        reason, 
        socketId: socket.id 
      });

    } catch (error) {
      logger.error('Error handling disconnection:', error);
    }
  }

  async startKafkaConsumers() {
    // Consumer for handling cross-service messages
    await kafkaClient.startMessageConsumer(async (messageData, context) => {
      await this.handleKafkaMessage(messageData, context);
    });

    // Consumer for presence updates
    await kafkaClient.startPresenceConsumer(async (presenceData, context) => {
      await this.handlePresenceUpdate(presenceData, context);
    });
  }

  async handleKafkaMessage(messageData, context) {
    try {
      const { type, senderId, receiverId } = messageData;

      switch (type) {
        case 'new_message':
          await this.deliverMessage(messageData);
          break;
        case 'message_read':
          await this.notifyMessageRead(messageData);
          break;
        case 'conversation_read':
          await this.notifyConversationRead(messageData);
          break;
        case 'typing':
          await this.deliverTypingIndicator(messageData);
          break;
        case 'stop_typing':
          await this.deliverStopTypingIndicator(messageData);
          break;
        case 'friend_added':
          await this.notifyFriendAdded(messageData);
          break;
        default:
          logger.warn('Unknown message type:', type);
      }

    } catch (error) {
      logger.error('Error handling Kafka message:', error);
    }
  }

  async deliverMessage(messageData) {
    const { message, receiverId } = messageData;
    const receiverSocket = this.connectedUsers.get(receiverId);

    if (receiverSocket) {
      // Mark as delivered if user is online
      const msg = await Message.findById(message.id);
      if (msg) {
        await msg.markAsDelivered();
      }

      receiverSocket.emit('new_message', message);
      logger.debug('Message delivered to user:', receiverId);
    } else {
      // User is offline, will be delivered when they come online
      logger.debug('User offline, message stored for delivery:', receiverId);
    }
  }

  async notifyMessageRead(messageData) {
    const { messageId, readBy, readAt } = messageData;
    
    // Find the sender and notify them
    const message = await Message.findById(messageId);
    if (message) {
      const senderSocket = this.connectedUsers.get(message.sender.toString());
      if (senderSocket) {
        senderSocket.emit('message_read', {
          messageId,
          readBy,
          readAt
        });
      }
    }
  }

  async notifyConversationRead(messageData) {
    const { conversationId, readBy, readAt } = messageData;
    
    // Notify all participants in the conversation
    const messages = await Message.find({ conversationId }).distinct('sender');
    
    for (const senderId of messages) {
      if (senderId.toString() !== readBy) {
        const senderSocket = this.connectedUsers.get(senderId.toString());
        if (senderSocket) {
          senderSocket.emit('conversation_read', {
            conversationId,
            readBy,
            readAt
          });
        }
      }
    }
  }

  async deliverTypingIndicator(messageData) {
    const { senderId, receiverId } = messageData;
    const receiverSocket = this.connectedUsers.get(receiverId);

    if (receiverSocket) {
      receiverSocket.emit('user_typing', { userId: senderId });
    }
  }

  async deliverStopTypingIndicator(messageData) {
    const { senderId, receiverId } = messageData;
    const receiverSocket = this.connectedUsers.get(receiverId);

    if (receiverSocket) {
      receiverSocket.emit('user_stop_typing', { userId: senderId });
    }
  }

  async notifyFriendAdded(messageData) {
    const { userId, friendId } = messageData;
    
    const userSocket = this.connectedUsers.get(userId);
    const friendSocket = this.connectedUsers.get(friendId);

    if (userSocket || friendSocket) {
      const [user, friend] = await Promise.all([
        User.findById(userId).select('username displayName avatar status'),
        User.findById(friendId).select('username displayName avatar status')
      ]);

      if (userSocket) {
        userSocket.emit('friend_added', { friend: friend.toPublicJSON() });
      }
      if (friendSocket) {
        friendSocket.emit('friend_added', { friend: user.toPublicJSON() });
      }
    }
  }

  async handlePresenceUpdate(presenceData, context) {
    // Broadcast presence updates to connected users
    const { userId, status, serviceId } = presenceData;
    
    // Find all friends of this user who are connected to this service
    const user = await User.findById(userId).populate('friends.user', '_id');
    if (user) {
      const friendIds = user.friends.map(f => f.user._id.toString());
      
      for (const friendId of friendIds) {
        const friendSocket = this.connectedUsers.get(friendId);
        if (friendSocket) {
          friendSocket.emit('friend_status_update', {
            userId,
            status,
            timestamp: Date.now()
          });
        }
      }
    }
  }

  async setUserOnline(userId) {
    try {
      // Update Redis presence
      await redisClient.setUserPresence(userId, 'online', config.serviceId);
      
      // Update database
      await User.findByIdAndUpdate(userId, { 
        status: 'online',
        lastSeen: new Date()
      });

      // Publish presence update
      await kafkaClient.publishPresenceUpdate({
        userId,
        status: 'online',
        serviceId: config.serviceId,
        timestamp: Date.now()
      });

    } catch (error) {
      logger.error('Error setting user online:', error);
    }
  }

  async setUserOffline(userId) {
    try {
      // Update Redis presence
      await redisClient.removeUserPresence(userId);
      
      // Update database
      await User.findByIdAndUpdate(userId, { 
        status: 'offline',
        lastSeen: new Date()
      });

      // Publish presence update
      await kafkaClient.publishPresenceUpdate({
        userId,
        status: 'offline',
        serviceId: null,
        timestamp: Date.now()
      });

    } catch (error) {
      logger.error('Error setting user offline:', error);
    }
  }

  async registerService() {
    try {
      const serviceInfo = {
        serviceId: config.serviceId,
        host: 'localhost', // In production, this would be the actual host
        port: config.port,
        connectedUsers: this.connectedUsers.size,
        startTime: Date.now()
      };

      await redisClient.registerService(config.serviceId, serviceInfo);
      logger.info('Service registered successfully');
    } catch (error) {
      logger.error('Failed to register service:', error);
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      try {
        // Update service heartbeat
        await redisClient.updateServiceHeartbeat(config.serviceId);
        
        // Send heartbeat to all connected clients
        this.io.emit('heartbeat');
        
      } catch (error) {
        logger.error('Heartbeat error:', error);
      }
    }, config.websocket.heartbeatInterval * 1000);
  }

  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      totalSockets: this.io.sockets.sockets.size,
      serviceId: config.serviceId
    };
  }

  async shutdown() {
    try {
      // Clear heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }

      // Set all connected users offline
      for (const userId of this.connectedUsers.keys()) {
        await this.setUserOffline(userId);
      }

      // Unregister service
      await redisClient.unregisterService(config.serviceId);

      // Close Socket.IO
      if (this.io) {
        this.io.close();
      }

      logger.info('Chat service shutdown completed');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
}

module.exports = new ChatService(); 