const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

class SimpleChatService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.io.on('connection', (socket) => {
      logger.info('User connected:', socket.id);

      socket.on('join', (data) => {
        const { username } = data;
        socket.username = username;
        this.connectedUsers.set(socket.id, username);
        
        socket.broadcast.emit('user_joined', { username });
        logger.info(`User ${username} joined`);
      });

      socket.on('send_message', (data) => {
        const { message, to } = data;
        
        if (to) {
          // Private message
          const targetSocket = Array.from(this.io.sockets.sockets.values())
            .find(s => s.username === to);
          
          if (targetSocket) {
            targetSocket.emit('private_message', {
              from: socket.username,
              message,
              timestamp: new Date()
            });
          }
        } else {
          // Broadcast message
          socket.broadcast.emit('new_message', {
            from: socket.username,
            message,
            timestamp: new Date()
          });
        }
        
        logger.chatMessage(socket.username, message);
      });

      socket.on('disconnect', () => {
        const username = this.connectedUsers.get(socket.id);
        this.connectedUsers.delete(socket.id);
        
        if (username) {
          socket.broadcast.emit('user_left', { username });
          logger.info(`User ${username} left`);
        }
      });
    });

    logger.info('Simple chat service initialized');
  }

  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      users: Array.from(this.connectedUsers.values())
    };
  }
}

module.exports = new SimpleChatService(); 