require('dotenv').config();

const config = {
  // Server Configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  serviceId: process.env.SERVICE_ID || `chat-service-${Date.now()}`,

  // Kafka Configuration
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'chat-app',
    topics: {
      messages: 'chat-messages',
      presence: 'user-presence',
      notifications: 'push-notifications'
    }
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    keyPrefix: 'chat:',
    ttl: {
      presence: 300, // 5 minutes
      session: 86400 // 24 hours
    }
  },

  // MongoDB Configuration
  mongodb: {
    url: process.env.MONGODB_URL || 'mongodb://chatuser:chatpass@localhost:27017/chatdb?authSource=admin',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    }
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  // WebSocket Configuration
  websocket: {
    corsOrigin: process.env.WEBSOCKET_CORS_ORIGIN || 'http://localhost:3000',
    heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL, 10) || 30,
    heartbeatTimeout: parseInt(process.env.HEARTBEAT_TIMEOUT, 10) || 60
  },

  // Message Configuration
  message: {
    maxLength: parseInt(process.env.MAX_MESSAGE_LENGTH, 10) || 1000,
    retentionDays: parseInt(process.env.MESSAGE_RETENTION_DAYS, 10) || 365
  }
};

module.exports = config; 