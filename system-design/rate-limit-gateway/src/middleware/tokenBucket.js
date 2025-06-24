const redisClient = require('../config/redis');

class TokenBucket {
  constructor(options = {}) {
    this.capacity = options.capacity || parseInt(process.env.RATE_LIMIT_MAX_TOKENS) || 100;
    this.refillRate = options.refillRate || parseInt(process.env.RATE_LIMIT_REFILL_RATE) || 10;
    this.windowMs = options.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000;
    this.keyGenerator = options.keyGenerator || this.defaultKeyGenerator;
    this.skipIf = options.skipIf || (() => false);
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.onLimitReached = options.onLimitReached || this.defaultOnLimitReached;
  }

  defaultKeyGenerator(req) {
    // Generate key based on IP address and optional user identification
    const userKey = req.user?.id || req.headers['x-user-id'] || '';
    return `rate_limit:${req.ip}:${userKey}`;
  }

  defaultOnLimitReached(req, res) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(this.windowMs / 1000)
    });
  }

  async refillTokens(key, lastRefill, currentTime) {
    const timePassed = currentTime - lastRefill;
    const tokensToAdd = Math.floor(timePassed / (this.windowMs / this.refillRate));
    
    if (tokensToAdd > 0) {
      const redis = redisClient.getClient();
      const bucket = await redis.hGetAll(key);
      const currentTokens = parseInt(bucket.tokens) || 0;
      const newTokens = Math.min(this.capacity, currentTokens + tokensToAdd);
      
      await redis.hSet(key, {
        tokens: newTokens.toString(),
        lastRefill: currentTime.toString()
      });
      
      return newTokens;
    }
    
    return null;
  }

  async consumeToken(key) {
    const redis = redisClient.getClient();
    const currentTime = Date.now();
    
    // Get or initialize bucket
    let bucket = await redis.hGetAll(key);
    
    if (Object.keys(bucket).length === 0) {
      // Initialize new bucket
      bucket = {
        tokens: this.capacity.toString(),
        lastRefill: currentTime.toString()
      };
      await redis.hSet(key, bucket);
      await redis.expire(key, Math.ceil(this.windowMs / 1000) * 2); // Set TTL
    }
    
    const tokens = parseInt(bucket.tokens);
    const lastRefill = parseInt(bucket.lastRefill);
    
    // Refill tokens based on time elapsed
    const newTokens = await this.refillTokens(key, lastRefill, currentTime);
    const currentTokens = newTokens !== null ? newTokens : tokens;
    
    if (currentTokens > 0) {
      // Consume a token
      await redis.hSet(key, 'tokens', (currentTokens - 1).toString());
      return {
        allowed: true,
        tokensRemaining: currentTokens - 1,
        retryAfter: null
      };
    } else {
      // No tokens available
      const timeUntilRefill = this.windowMs / this.refillRate;
      return {
        allowed: false,
        tokensRemaining: 0,
        retryAfter: Math.ceil(timeUntilRefill / 1000)
      };
    }
  }

  middleware() {
    return async (req, res, next) => {
      try {
        // Skip rate limiting if condition is met
        if (this.skipIf(req)) {
          return next();
        }

        const key = this.keyGenerator(req);
        const result = await this.consumeToken(key);

        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': this.capacity,
          'X-RateLimit-Remaining': result.tokensRemaining,
          'X-RateLimit-Reset': new Date(Date.now() + this.windowMs).toISOString()
        });

        if (!result.allowed) {
          res.set('Retry-After', result.retryAfter);
          return this.onLimitReached(req, res);
        }

        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        // Fail open - allow request if rate limiter fails
        next();
      }
    };
  }
}

module.exports = TokenBucket; 