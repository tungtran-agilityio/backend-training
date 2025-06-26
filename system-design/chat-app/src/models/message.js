const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  readAt: {
    type: Date,
    default: null
  },
  metadata: {
    fileUrl: String,
    fileName: String,
    fileSize: Number,
    thumbnailUrl: String
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for efficient conversation queries
messageSchema.index({ conversationId: 1, timestamp: -1 });
messageSchema.index({ conversationId: 1, timestamp: 1 });
messageSchema.index({ sender: 1, timestamp: -1 });
messageSchema.index({ receiver: 1, timestamp: -1 });
messageSchema.index({ status: 1, timestamp: -1 });

// Static method to generate conversation ID from two user IDs
messageSchema.statics.generateConversationId = function(userId1, userId2) {
  // Sort user IDs to ensure consistent conversation ID
  const sortedIds = [userId1.toString(), userId2.toString()].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};

// Static method to get conversation history
messageSchema.statics.getConversationHistory = function(conversationId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return this.find({
    conversationId,
    isDeleted: false
  })
  .populate('sender', 'username displayName avatar')
  .populate('receiver', 'username displayName avatar')
  .sort({ timestamp: -1 })
  .skip(skip)
  .limit(limit)
  .exec();
};

// Method to mark message as delivered
messageSchema.methods.markAsDelivered = function() {
  if (this.status === 'sent') {
    this.status = 'delivered';
    this.deliveredAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to mark message as read
messageSchema.methods.markAsRead = function() {
  if (this.status !== 'read') {
    this.status = 'read';
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to soft delete message
messageSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Transform output to remove sensitive data
messageSchema.methods.toJSON = function() {
  const message = this.toObject();
  
  if (message.isDeleted) {
    return {
      id: message._id,
      conversationId: message.conversationId,
      timestamp: message.timestamp,
      isDeleted: true,
      content: 'This message was deleted'
    };
  }
  
  return {
    id: message._id,
    conversationId: message.conversationId,
    sender: message.sender,
    receiver: message.receiver,
    content: message.content,
    messageType: message.messageType,
    timestamp: message.timestamp,
    status: message.status,
    deliveredAt: message.deliveredAt,
    readAt: message.readAt,
    metadata: message.metadata
  };
};

module.exports = mongoose.model('Message', messageSchema); 