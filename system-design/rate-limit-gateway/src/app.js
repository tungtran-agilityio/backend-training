const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const redisClient = require('./config/redis');
const apiRoutes = require('./routes/api');

class GatewayApp {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    
    // CORS middleware
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true
    }));

    // Request logging
    this.app.use(morgan('combined'));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', true);

    // Request ID middleware for tracing
    this.app.use((req, res, next) => {
      req.id = Math.random().toString(36).substr(2, 9);
      res.set('X-Request-ID', req.id);
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: require('../package.json').version
      });
    });

    // API routes
    this.app.use('/', apiRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error(`Error in request ${req.id}:`, error);
      
      const statusCode = error.statusCode || error.status || 500;
      const message = error.message || 'Internal Server Error';
      
      res.status(statusCode).json({
        error: {
          message,
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    });

    // Unhandled rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }

  async start() {
    try {
      // Connect to Redis
      await redisClient.connect();
      console.log('Redis connection established');

      // Start the server
      this.server = this.app.listen(this.port, () => {
        console.log(`🚀 Gateway server running on port ${this.port}`);
        console.log(`📊 Health check: http://localhost:${this.port}/health`);
        console.log(`🔒 Rate limiting active with Token Bucket algorithm`);
      });

      return this.server;
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async stop() {
    if (this.server) {
      this.server.close();
    }
    await redisClient.disconnect();
    console.log('Server stopped gracefully');
  }
}

// Handle graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  if (global.gatewayApp) {
    await global.gatewayApp.stop();
  }
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the application
if (require.main === module) {
  global.gatewayApp = new GatewayApp();
  global.gatewayApp.start();
}

module.exports = GatewayApp; 