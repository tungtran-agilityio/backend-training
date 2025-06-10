# Cache API Service

A simple cache API service built with Express.js and Redis.

## Prerequisites

- Node.js (v14 or higher)
- Docker

## Setup

1. Start Redis using Docker:
```bash
# Pull Redis image
docker pull redis:7-alpine

# Run Redis container
docker run --name cache-api-redis \
  -p 6379:6379 \
  -v redis_data:/data \
  -d redis:7-alpine \
  redis-server --appendonly yes
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following content:
```
PORT=3000
REDIS_URL=redis://localhost:6379
```

4. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## Redis Management

- Start Redis container: `docker start cache-api-redis`
- Stop Redis container: `docker stop cache-api-redis`
- Remove Redis container: `docker rm -f cache-api-redis`
- View Redis logs: `docker logs -f cache-api-redis`
- Connect to Redis CLI: `docker exec -it cache-api-redis redis-cli`

## API Endpoints

### Set Cache
- **POST** `/cache/:key`
- **Body**: `{ "value": "your value here" }`
- **Response**: `{ "success": true, "message": "Value cached successfully" }`

### Get Cache
- **GET** `/cache/:key`
- **Response**: `{ "success": true, "data": "cached value" }`

### Delete Cache
- **DELETE** `/cache/:key`
- **Response**: `{ "success": true, "message": "Cache deleted successfully" }`

### Health Check
- **GET** `/health`
- **Response**: `{ "status": "ok", "timestamp": "2024-03-14T12:00:00.000Z" }`

## Example Usage

```bash
# Set a cache value
curl -X POST http://localhost:3000/cache/mykey \
  -H "Content-Type: application/json" \
  -d '{"value": "Hello World"}'

# Get a cache value
curl http://localhost:3000/cache/mykey

# Delete a cache value
curl -X DELETE http://localhost:3000/cache/mykey
``` 