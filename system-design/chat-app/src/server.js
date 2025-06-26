const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const database = require('./services/database');

const app = express();
const server = http.createServer(app);

// Basic middleware
app.use(cors({
  origin: "*",
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: config.serviceId,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));

// Initialize chat service
const chatService = require('./services/simple-chat-service');
chatService.initialize(server);

// Serve static files for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Initialize services and start server
async function startServer() {
  try {
    // Connect to database
    await database.connect();
    logger.info('Database connected successfully');

    // Start server
    const PORT = config.port || 3000;
    server.listen(PORT, () => {
      logger.info(`Chat server started on port ${PORT}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Service ID: ${config.serviceId}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = server;