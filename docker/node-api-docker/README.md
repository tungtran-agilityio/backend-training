# Cache API Service

A simple cache API service built with Express.js and Redis.

## Prerequisites

- Node.js (v14 or higher)
- Docker and Docker Compose

## Setup

### Option 1: Run with Docker Compose (Recommended)

1. Start all services:
```bash
docker compose up -d
```

2. Stop all services:
```bash
docker compose down
```

### Option 2: Run with Docker

1. Build the API Docker image:
```bash
docker build -t cache-api .
```

2. Start Redis:
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

3. Run the API container:
```bash
docker run --name cache-api \
  -p 3000:3000 \
  --env-file .env \
  --link cache-api-redis:redis \
  -d cache-api
```

## Container Management

### Using Docker Compose
- Start all services: `docker compose up -d`
- Stop all services: `docker compose down`
- Restart services: `docker compose restart`


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