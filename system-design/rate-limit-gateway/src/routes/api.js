const express = require('express');
const rateLimitConfigs = require('../middleware/rateLimitConfig');
const router = express.Router();

// Simulate authentication middleware
const simulateAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    req.user = { id: 'user123', name: 'Test User' };
  }
  next();
};

// Public endpoints with anonymous rate limiting
router.get('/public/status', rateLimitConfigs.anonymous.middleware(), (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Public endpoint - anonymous rate limiting applied'
  });
});

router.get('/public/info', rateLimitConfigs.anonymous.middleware(), (req, res) => {
  res.json({ 
    service: 'Rate Limited Gateway',
    version: '1.0.0',
    rateLimit: 'anonymous'
  });
});

// Login endpoint with strict rate limiting
router.post('/auth/login', rateLimitConfigs.login.middleware(), (req, res) => {
  const { username, password } = req.body;
  
  // Simulate login logic
  if (username === 'admin' && password === 'password') {
    res.json({ 
      success: true, 
      token: 'fake-jwt-token',
      message: 'Login successful'
    });
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid credentials'
    });
  }
});

// Protected endpoints with authenticated user rate limiting
router.use(simulateAuth);

router.get('/protected/profile', rateLimitConfigs.authenticated.middleware(), (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  res.json({ 
    user: req.user,
    message: 'Protected endpoint - authenticated rate limiting applied'
  });
});

router.get('/protected/data', rateLimitConfigs.authenticated.middleware(), (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  res.json({ 
    data: [1, 2, 3, 4, 5],
    timestamp: new Date().toISOString(),
    user: req.user.id
  });
});

// API endpoints with API key rate limiting
router.get('/api/v1/users', rateLimitConfigs.api.middleware(), (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  res.json({ 
    users: [
      { id: 1, name: 'John Doe' },
      { id: 2, name: 'Jane Smith' }
    ],
    message: 'API endpoint - API key rate limiting applied'
  });
});

// Heavy operation endpoint
router.post('/api/v1/process', rateLimitConfigs.heavy.middleware(), (req, res) => {
  // Simulate heavy processing
  setTimeout(() => {
    res.json({ 
      result: 'Processing completed',
      processingTime: '2000ms',
      message: 'Heavy operation - strict rate limiting applied'
    });
  }, 2000);
});

// Rate limit status endpoint
router.get('/rate-limit/status', async (req, res) => {
  const redisClient = require('../config/redis');
  const redis = redisClient.getClient();
  
  try {
    const keys = await redis.keys('rate_limit:*');
    const status = {};
    
    for (const key of keys.slice(0, 10)) { // Limit to first 10 keys
      const bucket = await redis.hGetAll(key);
      status[key] = bucket;
    }
    
    res.json({
      activeBuckets: keys.length,
      sampleBuckets: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get rate limit status' });
  }
});

module.exports = router; 