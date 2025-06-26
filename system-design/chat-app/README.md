# Scalable Chat System with Kafka - Demo Implementation

This is a demonstration implementation of a scalable chat system as described in Chapter 12 of "System Design Interview" book. The system uses **Kafka** for message routing, **WebSocket** for real-time communication, **Redis** for service discovery and presence management, and **MongoDB** for message persistence.

## Architecture Overview

### Key Components

1. **WebSocket Chat Service** - Stateful service handling real-time connections
2. **Kafka Message Broker** - For cross-service message routing and pub/sub
3. **Redis** - Service discovery, presence management, and caching
4. **MongoDB** - Persistent storage for users and messages
5. **Nginx** - Load balancer with sticky sessions for WebSocket connections

### System Design Patterns Implemented

- **Service Discovery**: Redis-based registry for chat services
- **Message Routing**: Kafka topics for reliable message delivery
- **Presence System**: Real-time online/offline status via Redis pub/sub
- **Stateful Load Balancing**: Nginx with ip_hash for WebSocket connections
- **Horizontal Scaling**: Multiple chat service instances

## Features Implemented

### Core Chat Features
- ✅ Real-time 1-on-1 messaging via WebSocket
- ✅ Message persistence with MongoDB
- ✅ User authentication with JWT
- ✅ Online/Offline presence indicators
- ✅ Message delivery status (sent/delivered/read)
- ✅ Cross-service message routing via Kafka

### Scalability Features
- ✅ Multiple chat service instances
- ✅ Service discovery with Redis
- ✅ Kafka-based message distribution
- ✅ Load balancing with sticky sessions
- ✅ Heartbeat mechanism for connection health

### System Observability
- ✅ Structured logging with Winston
- ✅ Health check endpoints
- ✅ Service registration and heartbeat
- ✅ Connection statistics

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)

### 1. Start Infrastructure Services

```bash
# Start Kafka, Redis, and MongoDB
docker-compose up -d zookeeper kafka redis mongodb
```

### 2. Run Chat Service Locally

```bash
# Install dependencies
npm install

# Start the chat service
npm run dev
```

### 3. Access the Demo

Open your browser to `http://localhost:3000`

## Full Docker Deployment

### Start All Services

```bash
# Build and start all services
docker-compose up --build
```

This will start:
- 2 Chat service instances (ports 3001, 3002)
- Nginx load balancer (port 8080)
- Kafka + Zookeeper
- Redis
- MongoDB

### Access Points

- **Demo App**: http://localhost:8080
- **Chat Service 1**: http://localhost:3001
- **Chat Service 2**: http://localhost:3002
- **Health Check**: http://localhost:8080/health

## API Documentation

### Authentication

#### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "displayName": "John Doe"
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### WebSocket Events

#### Client → Server
- `join` - Join the chat with username
- `send_message` - Send a message
- `mark_read` - Mark message as read
- `typing` - Indicate typing status

#### Server → Client
- `connected` - Connection successful
- `new_message` - New message received
- `user_joined` - User joined chat
- `user_left` - User left chat
- `message_read` - Message read receipt

## System Architecture Diagrams

### Message Flow Architecture

```
┌─────────────┐    WebSocket    ┌─────────────────┐
│   Client    │◄──────────────►│  Chat Service   │
│             │                 │     (Node 1)    │
└─────────────┘                 └─────────────────┘
                                          │
                                          ▼
┌─────────────┐                 ┌─────────────────┐
│   Client    │                 │     Kafka       │
│             │                 │   (Messages)    │
└─────────────┘                 └─────────────────┘
       │                                  │
       │ WebSocket           ┌─────────────────┐
       └────────────────────►│  Chat Service   │
                             │     (Node 2)    │
                             └─────────────────┘
```

### Service Discovery with Redis

```
┌─────────────────┐    Register    ┌─────────────────┐
│  Chat Service   │──────────────►│     Redis       │
│     (Node 1)    │                │  (Discovery)    │
└─────────────────┘                └─────────────────┘
                                          ▲
┌─────────────────┐    Heartbeat          │
│  Chat Service   │──────────────────────┘
│     (Node 2)    │
└─────────────────┘
```

## Kafka Topics

- **`chat-messages`** - All chat messages and events
- **`user-presence`** - User online/offline status updates
- **`push-notifications`** - Push notification events

## Monitoring and Observability

### Health Checks

```bash
# Check service health
curl http://localhost:3000/health

# Check service discovery
curl http://localhost:3000/api/services
```

### Logs

The application uses structured logging with different log levels:

- **Error**: System errors and failures
- **Warn**: Warnings and degraded performance
- **Info**: General system events
- **Debug**: Detailed debugging information

### Metrics

The system tracks:
- Connected users per service
- Message throughput
- Service health status
- Kafka consumer lag

## Development

### Project Structure

```
src/
├── config/           # Configuration management
├── models/           # MongoDB models
├── services/         # Core services (Kafka, Redis, Database)
├── routes/           # HTTP API routes
├── middleware/       # Express middleware
├── utils/            # Utility functions
└── server.js         # Main server file
```

### Environment Variables

Key configuration options:

```bash
NODE_ENV=development
PORT=3000
SERVICE_ID=chat-service-1

# Kafka
KAFKA_BROKERS=localhost:9092

# Redis
REDIS_URL=redis://localhost:6379

# MongoDB
MONGODB_URL=mongodb://localhost:27017/chatdb

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

### Running Tests

```bash
npm test
```

## Production Considerations

### Security
- Use environment variables for secrets
- Implement rate limiting
- Add input validation and sanitization
- Use HTTPS/WSS in production
- Implement proper CORS policies

### Scalability
- Add Kafka partitioning strategy
- Implement database sharding
- Add caching layers
- Use CDN for static assets
- Monitor and auto-scale services

### Monitoring
- Add APM tools (New Relic, Datadog)
- Implement distributed tracing
- Set up alerting for critical metrics
- Log aggregation and analysis

## Limitations & Future Enhancements

### Current Limitations
- Simplified authentication (production needs OAuth2/SSO)
- Basic presence system (no away/busy status)
- No group chat implementation
- No file/media upload support
- No end-to-end encryption

### Planned Enhancements
- Group chat support
- File sharing capabilities
- Push notifications via Firebase
- Mobile app integration
- Advanced presence features
- Message search functionality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This is a demo implementation for educational purposes.

---

**Note**: This is a demonstration implementation designed to showcase the architectural patterns described in system design interviews. For production use, additional security, monitoring, and performance optimizations would be required. 