const TokenBucket = require('./tokenBucket');

// Different rate limiting configurations for various use cases
const rateLimitConfigs = {
  // Strict rate limiting for anonymous users
  anonymous: new TokenBucket({
    capacity: 20,
    refillRate: 5,
    windowMs: 60000, // 1 minute
    keyGenerator: (req) => `rate_limit:anonymous:${req.ip}`,
    onLimitReached: (req, res) => {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded for anonymous users. Consider authenticating for higher limits.',
        retryAfter: 12
      });
    }
  }),

  // More lenient for authenticated users
  authenticated: new TokenBucket({
    capacity: 100,
    refillRate: 20,
    windowMs: 60000,
    keyGenerator: (req) => {
      const userId = req.user?.id || req.headers['x-user-id'];
      return `rate_limit:user:${userId}`;
    },
    skipIf: (req) => !req.user && !req.headers['x-user-id']
  }),

  // Very strict for login attempts
  login: new TokenBucket({
    capacity: 5,
    refillRate: 1,
    windowMs: 300000, // 5 minutes
    keyGenerator: (req) => `rate_limit:login:${req.ip}`,
    onLimitReached: (req, res) => {
      res.status(429).json({
        error: 'Too Many Login Attempts',
        message: 'Too many login attempts. Please try again in 5 minutes.',
        retryAfter: 300
      });
    }
  }),

  // API-specific rate limiting
  api: new TokenBucket({
    capacity: 1000,
    refillRate: 100,
    windowMs: 60000,
    keyGenerator: (req) => {
      const apiKey = req.headers['x-api-key'];
      return apiKey ? `rate_limit:api:${apiKey}` : `rate_limit:api:${req.ip}`;
    }
  }),

  // Heavy operations (file uploads, data processing)
  heavy: new TokenBucket({
    capacity: 5,
    refillRate: 1,
    windowMs: 60000,
    keyGenerator: (req) => {
      const userId = req.user?.id || req.headers['x-user-id'] || req.ip;
      return `rate_limit:heavy:${userId}`;
    }
  })
};

module.exports = rateLimitConfigs; 