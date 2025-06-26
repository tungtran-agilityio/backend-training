const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../utils/logger');

class DatabaseService {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    try {
      await mongoose.connect(config.mongodb.url, config.mongodb.options);
      
      this.isConnected = true;
      logger.info('Connected to MongoDB successfully');

      // Event listeners
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', message: 'Database not connected' };
      }

      // Simple ping to check if database is responsive
      await mongoose.connection.db.admin().ping();
      
      return { 
        status: 'healthy', 
        message: 'Database connection is healthy',
        connection: this.getConnectionStatus()
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return { 
        status: 'unhealthy', 
        message: error.message,
        connection: this.getConnectionStatus()
      };
    }
  }
}

module.exports = new DatabaseService(); 