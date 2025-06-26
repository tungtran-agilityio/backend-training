const winston = require('winston');
const config = require('../config');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    // Add additional metadata
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { 
    service: 'chat-app',
    serviceId: config.serviceId 
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat
    })
  ]
});

// Add custom methods for specific use cases
logger.chatMessage = (userId, message, metadata = {}) => {
  logger.info('Chat message', {
    type: 'chat_message',
    userId,
    message: message.substring(0, 100), // Truncate for logging
    ...metadata
  });
};

logger.userAction = (userId, action, metadata = {}) => {
  logger.info('User action', {
    type: 'user_action',
    userId,
    action,
    ...metadata
  });
};

logger.systemEvent = (event, metadata = {}) => {
  logger.info('System event', {
    type: 'system_event',
    event,
    ...metadata
  });
};

logger.performance = (operation, duration, metadata = {}) => {
  logger.info('Performance metric', {
    type: 'performance',
    operation,
    duration,
    ...metadata
  });
};

module.exports = logger;