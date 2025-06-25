from kafka import KafkaProducer, KafkaConsumer
from kafka.errors import KafkaError
import json
import logging
from typing import Optional, Callable, Dict, Any
from .config import settings
from .schemas import NotificationMessage

logger = logging.getLogger(__name__)


class KafkaNotificationProducer:
    """Kafka producer for sending notification messages."""
    
    def __init__(self):
        self.producer = None
        self._connect()
    
    def _connect(self):
        """Connect to Kafka."""
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=settings.kafka_bootstrap_servers.split(','),
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None,
                retries=3,
                retry_backoff_ms=1000,
                acks='all'
            )
            logger.info("Successfully connected to Kafka producer")
        except Exception as e:
            logger.error(f"Failed to connect to Kafka producer: {e}")
            raise
    
    async def send_notification(self, channel: str, message: NotificationMessage) -> bool:
        """Send notification message to appropriate Kafka topic."""
        try:
            topic = settings.kafka_topics.get(f"{channel}_notifications")
            if not topic:
                logger.error(f"No topic configured for channel: {channel}")
                return False
            
            # Use user_id as partition key for ordering
            key = message.user_id
            value = message.dict()
            
            future = self.producer.send(topic, key=key, value=value)
            record_metadata = future.get(timeout=10)
            
            logger.info(f"Message sent to topic {topic}, partition {record_metadata.partition}, offset {record_metadata.offset}")
            return True
            
        except KafkaError as e:
            logger.error(f"Kafka error sending message: {e}")
            return False
        except Exception as e:
            logger.error(f"Error sending message to Kafka: {e}")
            return False
    
    def close(self):
        """Close the producer."""
        if self.producer:
            self.producer.close()


class KafkaNotificationConsumer:
    """Kafka consumer for receiving notification messages."""
    
    def __init__(self, topics: list, group_id: str):
        self.topics = topics
        self.group_id = group_id
        self.consumer = None
        self._connect()
    
    def _connect(self):
        """Connect to Kafka consumer."""
        try:
            self.consumer = KafkaConsumer(
                *self.topics,
                bootstrap_servers=settings.kafka_bootstrap_servers.split(','),
                group_id=self.group_id,
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                key_deserializer=lambda k: k.decode('utf-8') if k else None,
                auto_offset_reset='earliest',
                enable_auto_commit=False,  # Manual commit for better control
                max_poll_records=10
            )
            logger.info(f"Successfully connected to Kafka consumer for topics: {self.topics}")
        except Exception as e:
            logger.error(f"Failed to connect to Kafka consumer: {e}")
            raise
    
    def consume_messages(self, message_handler: Callable[[Dict[str, Any]], bool]):
        """Consume messages and process them with the provided handler."""
        try:
            for message in self.consumer:
                try:
                    # Process the message
                    success = message_handler(message.value)
                    
                    if success:
                        # Commit the offset if processing was successful
                        self.consumer.commit()
                        logger.debug(f"Successfully processed message from {message.topic}")
                    else:
                        logger.warning(f"Failed to process message from {message.topic}")
                        # Don't commit - message will be reprocessed
                        
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
                    # Don't commit - message will be reprocessed
                    
        except KeyboardInterrupt:
            logger.info("Consumer interrupted by user")
        except Exception as e:
            logger.error(f"Consumer error: {e}")
        finally:
            self.close()
    
    def close(self):
        """Close the consumer."""
        if self.consumer:
            self.consumer.close()


# Global producer instance
notification_producer = KafkaNotificationProducer() 