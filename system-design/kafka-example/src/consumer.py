#!/usr/bin/env python3
"""
Kafka Consumer Example

This script demonstrates how to consume messages from Kafka topics.
"""

import json
import sys
from datetime import datetime
from kafka import KafkaConsumer
from kafka.errors import KafkaError
import config

class MessageConsumer:
    def __init__(self, topics=None, group_id=None):
        """Initialize the Kafka consumer"""
        self.topics = topics or [config.DEFAULT_TOPIC]
        self.group_id = group_id or config.CONSUMER_GROUP_ID
        self.consumer = None
        self.connect_to_kafka()
    
    def connect_to_kafka(self):
        """Establish connection to Kafka"""
        try:
            self.consumer = KafkaConsumer(
                *self.topics,
                bootstrap_servers=config.KAFKA_BOOTSTRAP_SERVERS,
                group_id=self.group_id,
                auto_offset_reset=config.AUTO_OFFSET_RESET,
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                key_deserializer=lambda k: k.decode('utf-8') if k else None,
                consumer_timeout_ms=1000  # Timeout for polling
            )
            print(f"✅ Consumer connected to Kafka!")
            print(f"📋 Subscribed to topics: {self.topics}")
            print(f"👥 Consumer group: {self.group_id}")
            print("-" * 50)
        except Exception as e:
            print(f"❌ Failed to connect to Kafka: {e}")
            sys.exit(1)
    
    def format_message(self, message):
        """Format message for display"""
        timestamp = datetime.fromtimestamp(message.timestamp / 1000).strftime('%Y-%m-%d %H:%M:%S')
        
        output = []
        output.append(f"📨 Message received at {timestamp}")
        output.append(f"   Topic: {message.topic}")
        output.append(f"   Partition: {message.partition}")
        output.append(f"   Offset: {message.offset}")
        output.append(f"   Key: {message.key}")
        
        # Pretty print the message value
        if isinstance(message.value, dict):
            output.append("   Value:")
            for key, value in message.value.items():
                output.append(f"     {key}: {value}")
        else:
            output.append(f"   Value: {message.value}")
        
        output.append("-" * 50)
        return "\n".join(output)
    
    def consume_messages(self, max_messages=None):
        """Consume messages from subscribed topics"""
        print("🎧 Starting to consume messages...")
        print("Press Ctrl+C to stop\n")
        
        message_count = 0
        
        try:
            for message in self.consumer:
                print(self.format_message(message))
                
                # Process message based on topic
                self.process_message(message)
                
                message_count += 1
                
                if max_messages and message_count >= max_messages:
                    print(f"✅ Consumed {message_count} messages. Stopping.")
                    break
                    
        except KeyboardInterrupt:
            print(f"\n🛑 Consumer stopped. Total messages consumed: {message_count}")
    
    def process_message(self, message):
        """Process message based on its topic and content"""
        topic = message.topic
        value = message.value
        
        if topic == config.USER_MESSAGES_TOPIC:
            self.process_user_message(value)
        elif topic == config.SYSTEM_EVENTS_TOPIC:
            self.process_system_event(value)
        else:
            self.process_generic_message(value)
    
    def process_user_message(self, message):
        """Process user activity messages"""
        user_id = message.get('user_id')
        action = message.get('action')
        details = message.get('details', {})
        
        print(f"👤 User Activity: User {user_id} performed '{action}'")
        if details:
            print(f"   Details: {details}")
    
    def process_system_event(self, message):
        """Process system event messages"""
        event_type = message.get('event_type')
        data = message.get('data', {})
        source = message.get('source', 'unknown')
        
        print(f"🔧 System Event: {event_type} from {source}")
        if data:
            print(f"   Data: {data}")
    
    def process_generic_message(self, message):
        """Process generic messages"""
        print(f"📝 Generic Message: {message}")
    
    def get_topic_info(self):
        """Get information about available topics"""
        try:
            metadata = self.consumer.list_consumer_group_offsets()
            topics = self.consumer.topics()
            print(f"📊 Available topics: {list(topics)}")
        except Exception as e:
            print(f"❌ Error getting topic info: {e}")
    
    def close(self):
        """Close the consumer connection"""
        if self.consumer:
            self.consumer.close()
            print("📥 Consumer closed")

def main():
    # Parse command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == '--topics':
            topics = sys.argv[2].split(',') if len(sys.argv) > 2 else None
        elif sys.argv[1] == '--user-messages':
            topics = [config.USER_MESSAGES_TOPIC]
        elif sys.argv[1] == '--system-events':
            topics = [config.SYSTEM_EVENTS_TOPIC]
        elif sys.argv[1] == '--all':
            topics = [config.USER_MESSAGES_TOPIC, config.SYSTEM_EVENTS_TOPIC, config.DEFAULT_TOPIC]
        else:
            topics = [sys.argv[1]]
    else:
        topics = [config.USER_MESSAGES_TOPIC, config.SYSTEM_EVENTS_TOPIC]
    
    # Initialize consumer
    consumer = MessageConsumer(topics=topics)
    
    try:
        consumer.get_topic_info()
        consumer.consume_messages()
    finally:
        consumer.close()

if __name__ == "__main__":
    main() 