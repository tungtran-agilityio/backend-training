# Rate Limiting Gateway

A high-performance Express.js API Gateway with Token Bucket rate limiting algorithm using Redis for distributed rate limiting.

## Features

- 🪣 **Token Bucket Algorithm**: Efficient rate limiting with burst capacity
- 🔄 **Redis Backend**: Distributed rate limiting across multiple instances
- 🎯 **Multiple Rate Limit Policies**: Different limits for various use cases
- 🔒 **Security Headers**: Helmet.js integration for security
- 📊 **Rate Limit Headers**: Standard rate limit headers in responses
- 🚀 **High Performance**: Optimized for high-throughput scenarios
- 🐳 **Docker Ready**: Complete Docker setup with Redis
- 📈 **Monitoring**: Built-in endpoints for monitoring rate limit status

## Rate Limiting Policies

| Policy        | Capacity    | Refill Rate | Window | Use Case                      |
| ------------- | ----------- | ----------- | ------ | ----------------------------- |
| Anonymous     | 20 tokens   | 5/min       | 1 min  | Public endpoints              |
| Authenticated | 100 tokens  | 20/min      | 1 min  | Logged-in users               |
| Login         | 5 tokens    | 1/5min      | 5 min  | Login attempts                |
| API           | 1000 tokens | 100/min     | 1 min  | API key access                |
| Heavy         | 5 tokens    | 1/min       | 1 min  | Resource-intensive operations |

## Token Bucket Algorithm

The Token Bucket algorithm works by:

1. **Bucket Initialization**: Each client gets a bucket with a maximum capacity
2. **Token Consumption**: Each request consumes one token
3. **Token Refill**: Tokens are added at a constant rate
4. **Burst Handling**: Allows bursts up to bucket capacity
5. **Rate Limiting**: Requests are rejected when bucket is empty

### Advantages

- **Burst Traffic**: Handles sudden spikes efficiently
- **Predictable**: Consistent refill rate
- **Fair**: Equal treatment based on time windows
- **Flexible**: Different buckets for different clients/endpoints

## Quick Start

### Using Docker (Recommended)

1. **Clone and navigate to the project**:
   ```bash
   cd system-design/rate-limit-gateway
   ```

2. **Start with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

3. **Check health**:
   ```bash
   curl http://localhost:3000/health
   ```

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start Redis** (or use Docker):
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

3. **Set environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

4. **Start the application**:
   ```bash
   npm run dev
   ```

## API Endpoints

### Public Endpoints (Anonymous Rate Limit: 20 req/min)

```bash
# Get service status
curl http://localhost:3000/public/status

# Get service info
curl http://localhost:3000/public/info
```

### Authentication (Login Rate Limit: 5 req/5min)

```bash
# Login attempt
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'
```

### Protected Endpoints (Authenticated Rate Limit: 100 req/min)

```bash
# Access with Bearer token
curl http://localhost:3000/protected/profile \
  -H "Authorization: Bearer your-token"

# Or with user ID header
curl http://localhost:3000/protected/data \
  -H "X-User-ID: user123"
```

### API Endpoints (API Rate Limit: 1000 req/min)

```bash
# API access with API key
curl http://localhost:3000/api/v1/users \
  -H "X-API-Key: your-api-key"
```

### Heavy Operations (Strict Rate Limit: 5 req/min)

```bash
# Resource-intensive operation
curl -X POST http://localhost:3000/api/v1/process \
  -H "X-User-ID: user123"
```

### Monitoring

```bash
# Check rate limit status
curl http://localhost:3000/rate-limit/status

# Health check
curl http://localhost:3000/health
```

## Rate Limit Headers

All responses include standard rate limiting headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-01T12:01:00.000Z
Retry-After: 60
```

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=60000      # 1 minute window
RATE_LIMIT_MAX_TOKENS=100       # Maximum tokens in bucket
RATE_LIMIT_REFILL_RATE=10       # Tokens added per window

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Custom Rate Limiting

Create custom rate limiting policies:

```javascript
const TokenBucket = require('./src/middleware/tokenBucket');

const customRateLimit = new TokenBucket({
  capacity: 50,           // Maximum tokens
  refillRate: 10,         // Tokens per window
  windowMs: 60000,        // 1 minute window
  keyGenerator: (req) => `custom:${req.ip}`,
  onLimitReached: (req, res) => {
    res.status(429).json({ error: 'Custom limit exceeded' });
  }
});

app.use('/custom-endpoint', customRateLimit.middleware());
```

## Testing Rate Limits

### Test Anonymous Rate Limit

```bash
# Run this multiple times quickly to trigger rate limiting
for i in {1..25}; do
  curl -w "Status: %{http_code}\n" http://localhost:3000/public/status
done
```

### Test Login Rate Limit

```bash
# Try multiple failed login attempts
for i in {1..10}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "wrong", "password": "wrong"}' \
    -w "Status: %{http_code}\n"
done
```

### Load Testing

Use tools like `wrk` or `ab` for load testing:

```bash
# Install wrk (macOS)
brew install wrk

# Load test
wrk -t12 -c400 -d30s http://localhost:3000/public/status
```

## Monitoring and Observability

### Rate Limit Metrics

The gateway provides real-time metrics:

```bash
# Get current rate limit status
curl http://localhost:3000/rate-limit/status | jq
```

### Redis Monitoring

Monitor Redis directly:

```bash
# Connect to Redis CLI
docker exec -it rate-limit-redis redis-cli

# Check rate limit keys
127.0.0.1:6379> KEYS rate_limit:*
127.0.0.1:6379> HGETALL rate_limit:anonymous:192.168.1.1
```

## Production Considerations

### Security

- Use environment variables for sensitive configuration
- Implement proper authentication/authorization
- Use HTTPS in production
- Configure CORS properly
- Set up proper firewall rules

### Performance

- Use Redis Cluster for high availability
- Implement connection pooling
- Monitor Redis memory usage
- Use Redis persistence for data durability
- Consider Redis Sentinel for failover

### Scaling

- Deploy multiple gateway instances behind a load balancer
- Use Redis Cluster for distributed caching
- Implement circuit breakers for external services
- Monitor application metrics

## Architecture

```
┌─────────┐    ┌─────────────────┐    ┌─────────────┐
│ Client  │───▶│ Rate Limiter    │───▶│ API Servers │
│         │    │ Middleware      │    │             │
└─────────┘    └─────────────────┘    └─────────────┘
                        │
                        ▼
                ┌─────────────┐
                │    Redis    │
                │             │
                └─────────────┘
```

The Token Bucket algorithm maintains state in Redis, allowing for:
- Distributed rate limiting across multiple gateway instances
- Persistent rate limit state across application restarts
- High-performance token bucket operations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details 