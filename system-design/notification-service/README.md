# Notification Service

A scalable notification system that supports multiple channels (push notifications, SMS, email) using Kafka for message queuing.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────┐
│   Client Apps   │───▶│ Notification API │───▶│   Kafka     │
└─────────────────┘    └──────────────────┘    └─────────────┘
                                                       │
                       ┌────────────────────────────────┼────────────────────────────────┐
                       ▼                                ▼                                ▼
                ┌─────────────┐                 ┌─────────────┐                ┌─────────────┐
                │ Push Worker │                 │ SMS Worker  │                │Email Worker │
                └─────────────┘                 └─────────────┘                └─────────────┘
                       │                                │                                │
                       ▼                                ▼                                ▼
                ┌─────────────┐                 ┌─────────────┐                ┌─────────────┐
                │ APNS/FCM    │                 │   Twilio    │                │  SendGrid   │
                │   (Mock)    │                 │   (Mock)    │                │   (Mock)    │
                └─────────────┘                 └─────────────┘                └─────────────┘
```

## Features

- **Multi-channel Support**: iOS/Android push notifications, SMS, Email
- **Kafka Integration**: Reliable message queuing with topic-based routing
- **Mock Providers**: Simulated third-party services for testing
- **Retry Mechanism**: Automatic retry for failed notifications
- **Rate Limiting**: Configurable rate limits per channel
- **Template System**: Reusable notification templates
- **User Preferences**: Respect user notification settings
- **Monitoring**: Comprehensive logging and metrics

## Quick Start

1. **Start the services**:
   ```bash
   docker-compose up -d
   ```

2. **Send a notification**:
   ```bash
   curl -X POST http://localhost:8000/api/v1/notifications \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "user123",
       "template_id": "welcome",
       "channels": ["push", "email"],
       "data": {"username": "john_doe"}
     }'
   ```

## API Endpoints

### Send Notification
```http
POST /api/v1/notifications
Content-Type: application/json

{
  "user_id": "string",
  "template_id": "string", 
  "channels": ["push", "sms", "email"],
  "data": {}
}
```

### User Preferences
```http
GET /api/v1/users/{user_id}/preferences
PUT /api/v1/users/{user_id}/preferences
```

### Templates
```http
GET /api/v1/templates
POST /api/v1/templates
```

## Configuration

Environment variables:
- `KAFKA_BOOTSTRAP_SERVERS`: Kafka broker addresses
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection for rate limiting
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR)

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run tests
pytest tests/

# Run individual services
python -m src.api.main        # API server
python -m src.workers.push    # Push notification worker
python -m src.workers.sms     # SMS worker  
python -m src.workers.email   # Email worker
```

## Monitoring

- Health checks available at `/health`
- Metrics endpoint at `/metrics`
- Logs are structured JSON format
- Kafka consumer lag monitoring included 