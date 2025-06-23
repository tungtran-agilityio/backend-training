#!/usr/bin/env python3
"""
Kafka Producer Example

This script demonstrates how to send messages to Kafka topics.
"""

import json
import time
import sys
from datetime import datetime
from kafka import KafkaProducer
from kafka.errors import KafkaError
import config

class MessageProducer:
    def __init__(self):
        """Initialize the Kafka producer"""
        self.producer = None
        self.connect_to_kafka()
    
    def connect_to_kafka(self):
        """Establish connection to Kafka"""
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=config.KAFKA_BOOTSTRAP_SERVERS,
                acks=config.PRODUCER_ACKS,
                retries=config.PRODUCER_RETRIES,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None
            )
            print("✅ Connected to Kafka successfully!")
        except Exception as e:
            print(f"❌ Failed to connect to Kafka: {e}")
            sys.exit(1)
    
    def send_message(self, topic, message, key=None):
        """Send a message to the specified topic"""
        try:
            future = self.producer.send(topic, value=message, key=key)
            record_metadata = future.get(timeout=config.REQUEST_TIMEOUT)
            
            print(f"📤 Message sent to topic '{topic}':")
            print(f"   Partition: {record_metadata.partition}")
            print(f"   Offset: {record_metadata.offset}")
            print(f"   Key: {key}")
            print(f"   Message: {message}")
            print("-" * 50)
            
        except KafkaError as e:
            print(f"❌ Failed to send message: {e}")
    
    def send_user_activity(self, user_id, action, details=None):
        """Send user activity message"""
        message = {
            'timestamp': datetime.now().isoformat(),
            'user_id': user_id,
            'action': action,
            'details': details or {}
        }
        
        self.send_message(
            topic=config.USER_MESSAGES_TOPIC,
            message=message,
            key=f"user_{user_id}"
        )
    
    def send_system_event(self, event_type, data):
        """Send system event message"""
        message = {
            'timestamp': datetime.now().isoformat(),
            'event_type': event_type,
            'data': data,
            'source': 'demo-system'
        }
        
        self.send_message(
            topic=config.SYSTEM_EVENTS_TOPIC,
            message=message,
            key=event_type
        )
    
    def demo_batch_messages(self):
        """Send a batch of demo messages"""
        print("🚀 Sending batch of demo messages...")
        
        # User activities
        user_activities = [
            (1, 'login', {'ip': '192.168.1.100', 'device': 'web'}),
            (2, 'purchase', {'product_id': 'ABC123', 'amount': 99.99}),
            (1, 'view_product', {'product_id': 'XYZ789'}),
            (3, 'signup', {'email': 'user3@example.com'}),
            (2, 'logout', {})
        ]
        
        for user_id, action, details in user_activities:
            self.send_user_activity(user_id, action, details)
            time.sleep(0.5)  # Small delay between messages
        
        # System events
        system_events = [
            ('server_start', {'version': '1.2.3', 'environment': 'production'}),
            ('database_backup', {'size_mb': 1024, 'duration_seconds': 45}),
            ('cache_clear', {'cache_type': 'redis', 'keys_cleared': 1000}),
            ('health_check', {'status': 'healthy', 'response_time_ms': 15})
        ]
        
        for event_type, data in system_events:
            self.send_system_event(event_type, data)
            time.sleep(0.5)
    
    def interactive_mode(self):
        """Interactive mode for sending custom messages"""
        print("\n🎯 Interactive Producer Mode")
        print("Commands:")
        print("  user <user_id> <action> [details] - Send user activity")
        print("  system <event_type> <data> - Send system event")
        print("  custom <topic> <message> - Send custom message")
        print("  batch - Send batch of demo messages")
        print("  quit - Exit")
        print()
        
        while True:
            try:
                command = input("producer> ").strip()
                
                if command == 'quit':
                    break
                elif command == 'batch':
                    self.demo_batch_messages()
                elif command.startswith('user '):
                    parts = command.split(' ', 3)
                    user_id = int(parts[1])
                    action = parts[2]
                    details = json.loads(parts[3]) if len(parts) > 3 else {}
                    self.send_user_activity(user_id, action, details)
                elif command.startswith('system '):
                    parts = command.split(' ', 2)
                    event_type = parts[1]
                    data = json.loads(parts[2])
                    self.send_system_event(event_type, data)
                elif command.startswith('custom '):
                    parts = command.split(' ', 2)
                    topic = parts[1]
                    message = json.loads(parts[2])
                    self.send_message(topic, message)
                else:
                    print("❌ Unknown command. Type 'quit' to exit.")
                    
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"❌ Error: {e}")
    
    def close(self):
        """Close the producer connection"""
        if self.producer:
            self.producer.close()
            print("📤 Producer closed")

def main():
    producer = MessageProducer()
    
    try:
        if len(sys.argv) > 1 and sys.argv[1] == 'batch':
            producer.demo_batch_messages()
        else:
            producer.interactive_mode()
    finally:
        producer.close()

if __name__ == "__main__":
    main() 