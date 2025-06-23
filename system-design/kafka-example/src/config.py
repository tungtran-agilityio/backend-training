"""
Kafka configuration settings
"""

# Kafka broker configuration
KAFKA_BOOTSTRAP_SERVERS = ['kafka:29092']

# Topic configuration
DEFAULT_TOPIC = 'demo-topic'
USER_MESSAGES_TOPIC = 'user-messages'
SYSTEM_EVENTS_TOPIC = 'system-events'

# Consumer configuration
CONSUMER_GROUP_ID = 'demo-consumer-group'
AUTO_OFFSET_RESET = 'earliest'

# Producer configuration
PRODUCER_ACKS = 'all'  # Wait for all replicas to acknowledge
PRODUCER_RETRIES = 3

# Timeouts
CONNECTION_TIMEOUT = 10
REQUEST_TIMEOUT = 30 