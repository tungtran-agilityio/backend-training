# Kafka Python Example with Docker

This project demonstrates basic Kafka functionality using Python and Docker containers. It includes a complete setup with Kafka, Zookeeper, Kafka UI, and Python applications that showcase producer-consumer patterns.

## 🚀 Features

- **Complete Kafka Environment**: Kafka, Zookeeper, and Kafka UI in Docker
- **Python Producer**: Send messages to Kafka topics
- **Python Consumer**: Consume messages from Kafka topics
- **Interactive Demo**: Learn Kafka concepts through hands-on examples
- **Multiple Topics**: User messages, system events, and custom topics
- **Message Serialization**: JSON serialization/deserialization
- **Consumer Groups**: Demonstrate load balancing and scaling
- **Web UI**: Kafka UI for visual monitoring and management

## 📋 Prerequisites

- Docker and Docker Compose
- Python 3.11+ (for local development)
- Basic understanding of messaging systems

## 🛠️ Setup and Installation

### 1. Clone and Navigate
```bash
cd system-design/kafka-example
```

### 2. Start Kafka Environment
```bash
# Start all services (Kafka, Zookeeper, Kafka UI, Python app)
docker-compose up -d

# Check if all services are running
docker-compose ps
```

### 3. Wait for Services
Wait about 30-60 seconds for Kafka to fully initialize before running the Python scripts.

### 4. Access Kafka UI
Open your browser and go to: http://localhost:8080

The Kafka UI provides:
- Topic management
- Message browsing
- Consumer group monitoring
- Cluster health information

## 🎯 Usage Examples

### Interactive Demo (Recommended for Beginners)
```bash
# Run the interactive demo
docker exec -it python-kafka-app python src/demo.py
```

This demo provides:
- Guided Kafka learning experience
- Real-time producer-consumer demonstration
- Kafka concepts explanation
- Advanced features showcase

### Producer Examples

#### Basic Producer
```bash
# Send batch of demo messages
docker exec -it python-kafka-app python src/producer.py batch

# Interactive producer mode
docker exec -it python-kafka-app python src/producer.py
```

#### Interactive Producer Commands
```bash
# In interactive mode, you can use:
producer> user 123 login {"ip": "192.168.1.1", "device": "mobile"}
producer> system server_start {"version": "1.0.0"}
producer> custom my-topic {"message": "Hello Kafka!"}
producer> batch
producer> quit
```

### Consumer Examples

#### Listen to All Topics
```bash
# Default: listens to user-messages and system-events
docker exec -it python-kafka-app python src/consumer.py
```

#### Topic-Specific Consumers
```bash
# Listen to user messages only
docker exec -it python-kafka-app python src/consumer.py --user-messages

# Listen to system events only
docker exec -it python-kafka-app python src/consumer.py --system-events

# Listen to all topics
docker exec -it python-kafka-app python src/consumer.py --all

# Listen to custom topics
docker exec -it python-kafka-app python src/consumer.py --topics "topic1,topic2"
```

## 📚 Kafka Concepts Demonstrated

### 1. **Topics and Partitions**
- `user-messages`: User activity events
- `system-events`: System and application events
- `demo-topic`: General purpose topic

### 2. **Message Structure**
```json
{
  "timestamp": "2024-01-15T10:30:00",
  "user_id": 123,
  "action": "product_view",
  "details": {
    "product_id": "laptop-pro-15",
    "category": "electronics"
  }
}
```

### 3. **Key Features**
- **Message Keys**: Route messages to specific partitions
- **Consumer Groups**: Load balance across multiple consumers
- **Offset Management**: Track message processing progress
- **Serialization**: JSON encoding/decoding
- **Error Handling**: Robust error handling and retries

## 🔧 Configuration

### Kafka Configuration (`config.py`)
```python
KAFKA_BOOTSTRAP_SERVERS = ['kafka:29092']
DEFAULT_TOPIC = 'demo-topic'
USER_MESSAGES_TOPIC = 'user-messages'
SYSTEM_EVENTS_TOPIC = 'system-events'
CONSUMER_GROUP_ID = 'demo-consumer-group'
```

### Docker Services
- **Kafka**: Port 9092 (external), 29092 (internal)
- **Zookeeper**: Port 2181
- **Kafka UI**: Port 8080
- **Python App**: Interactive container

## 🎮 Demo Scenarios

### Scenario 1: E-commerce Platform
```bash
# Start consumer for user activities
docker exec -it python-kafka-app python src/consumer.py --user-messages

# In another terminal, simulate user activities
docker exec -it python-kafka-app python src/producer.py
# Then use: user 123 product_view {"product_id": "laptop"}
```

### Scenario 2: System Monitoring
```bash
# Monitor system events
docker exec -it python-kafka-app python src/consumer.py --system-events

# Send system events
docker exec -it python-kafka-app python src/producer.py
# Then use: system health_check {"status": "ok", "cpu": 15.5}
```

### Scenario 3: Real-time Analytics
```bash
# Run the full interactive demo
docker exec -it python-kafka-app python src/demo.py
# Choose option 4 for producer-consumer demo
```

## 🐛 Troubleshooting

### Common Issues

1. **Kafka Connection Refused**
   ```bash
   # Check if Kafka is running
   docker-compose ps
   
   # Restart services
   docker-compose restart kafka
   ```

2. **Topics Not Created**
   ```bash
   # Topics are auto-created when first message is sent
   # Or create manually via Kafka UI at http://localhost:8080
   ```

3. **Consumer Not Receiving Messages**
   ```bash
   # Check consumer group offset
   # Use Kafka UI to see consumer group status
   
   # Reset consumer group (will re-read all messages)
   docker exec -it kafka kafka-consumer-groups.sh --bootstrap-server localhost:9092 --group demo-consumer-group --reset-offsets --to-earliest --all-topics --execute
   ```

4. **Python Dependencies**
   ```bash
   # Rebuild Python container if needed
   docker-compose build python-app
   ```

### Logs and Debugging
```bash
# View Kafka logs
docker-compose logs kafka

# View Python app logs
docker-compose logs python-app

# Interactive debugging
docker exec -it python-kafka-app bash
```

## 🔄 Development Workflow

### Making Changes
1. Modify Python files in the `src/` directory
2. Changes are automatically reflected (volume mounted)
3. Restart Python container if needed: `docker-compose restart python-app`

### Adding New Features
1. Create new Python modules in `src/`
2. Update `requirements.txt` if needed
3. Rebuild container: `docker-compose build python-app`

## 📖 Learning Path

1. **Start Here**: Run `docker exec -it python-kafka-app python src/demo.py`
2. **Basic Concepts**: Use the demo's menu option 5 to learn Kafka terminology
3. **Hands-on Practice**: Try the producer-consumer demo (option 4)
4. **Advanced Features**: Explore message keys, partitioning, and batching (option 6)
5. **Real Scenarios**: Create your own producer-consumer applications

## 🌐 External Resources

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Kafka Python Client](https://kafka-python.readthedocs.io/)
- [Kafka UI GitHub](https://github.com/provectusllabs/kafka-ui)

## 🛑 Cleanup

```bash
# Stop all services
docker-compose down

# Remove volumes (deletes all Kafka data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## 🤝 Contributing

Feel free to enhance this example by:
- Adding more complex message schemas
- Implementing error handling patterns
- Adding monitoring and metrics
- Creating more realistic business scenarios

Happy Kafka learning! 🎉 