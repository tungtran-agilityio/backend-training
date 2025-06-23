#!/bin/bash

echo "Python Kafka Example Container Started"
echo "Available scripts:"
echo "  python src/producer.py - Run the message producer"
echo "  python src/consumer.py - Run the message consumer"
echo "  python src/demo.py - Run the interactive demo"
echo ""
echo "Container is ready. Use 'docker exec -it python-kafka-app bash' to interact."

# Keep container running
tail -f /dev/null 