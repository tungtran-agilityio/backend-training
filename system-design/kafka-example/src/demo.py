#!/usr/bin/env python3
"""
Interactive Kafka Demo

This script provides an interactive demonstration of Kafka features.
"""

import json
import time
import threading
from datetime import datetime
from producer import MessageProducer
from consumer import MessageConsumer
import config

class KafkaDemo:
    def __init__(self):
        """Initialize the Kafka demo"""
        self.producer = MessageProducer()
        self.consumer = None
        self.consumer_thread = None
        self.stop_consumer = False
    
    def print_header(self):
        """Print demo header"""
        print("🎭" + "="*60 + "🎭")
        print("         KAFKA DEMO - Interactive Learning Tool")
        print("🎭" + "="*60 + "🎭")
        print()
    
    def print_menu(self):
        """Print the main menu"""
        print("\n📋 KAFKA DEMO MENU:")
        print("1. 📤 Send sample messages (Producer)")
        print("2. 📥 Start consumer (listen for messages)")
        print("3. 🛑 Stop consumer")
        print("4. 🔄 Producer-Consumer demo")
        print("5. 📊 Show Kafka concepts")
        print("6. 🧪 Advanced features demo")
        print("7. ❓ Help")
        print("0. 🚪 Exit")
        print()
    
    def send_sample_messages(self):
        """Send various types of sample messages"""
        print("\n📤 Sending sample messages...")
        
        # E-commerce example messages
        messages = [
            {
                'topic': config.USER_MESSAGES_TOPIC,
                'key': 'user_123',
                'message': {
                    'user_id': 123,
                    'action': 'product_view',
                    'timestamp': datetime.now().isoformat(),
                    'details': {
                        'product_id': 'laptop-pro-15',
                        'category': 'electronics',
                        'price': 1299.99
                    }
                }
            },
            {
                'topic': config.USER_MESSAGES_TOPIC,
                'key': 'user_456',
                'message': {
                    'user_id': 456,
                    'action': 'add_to_cart',
                    'timestamp': datetime.now().isoformat(),
                    'details': {
                        'product_id': 'wireless-mouse',
                        'quantity': 2,
                        'price': 29.99
                    }
                }
            },
            {
                'topic': config.SYSTEM_EVENTS_TOPIC,
                'key': 'inventory_update',
                'message': {
                    'event_type': 'inventory_update',
                    'timestamp': datetime.now().isoformat(),
                    'data': {
                        'product_id': 'laptop-pro-15',
                        'old_quantity': 50,
                        'new_quantity': 49,
                        'warehouse': 'US-WEST-1'
                    }
                }
            },
            {
                'topic': config.SYSTEM_EVENTS_TOPIC,
                'key': 'payment_processed',
                'message': {
                    'event_type': 'payment_processed',
                    'timestamp': datetime.now().isoformat(),
                    'data': {
                        'order_id': 'ORD-2024-001',
                        'amount': 59.98,
                        'payment_method': 'credit_card',
                        'status': 'success'
                    }
                }
            }
        ]
        
        for msg_data in messages:
            self.producer.send_message(
                topic=msg_data['topic'],
                message=msg_data['message'],
                key=msg_data['key']
            )
            time.sleep(1)  # Small delay for better visualization
        
        print("✅ Sample messages sent!")
    
    def start_consumer_demo(self):
        """Start a consumer in a separate thread"""
        if self.consumer_thread and self.consumer_thread.is_alive():
            print("❌ Consumer is already running!")
            return
        
        print("\n📥 Starting consumer...")
        topics = [config.USER_MESSAGES_TOPIC, config.SYSTEM_EVENTS_TOPIC]
        self.consumer = MessageConsumer(topics=topics, group_id="demo-group")
        
        self.stop_consumer = False
        self.consumer_thread = threading.Thread(target=self._consumer_worker)
        self.consumer_thread.daemon = True
        self.consumer_thread.start()
        
        print("✅ Consumer started! It will display messages as they arrive.")
    
    def _consumer_worker(self):
        """Worker function for consumer thread"""
        try:
            for message in self.consumer.consumer:
                if self.stop_consumer:
                    break
                print("\n" + self.consumer.format_message(message))
                self.consumer.process_message(message)
        except Exception as e:
            print(f"❌ Consumer error: {e}")
    
    def stop_consumer_demo(self):
        """Stop the consumer"""
        if not self.consumer_thread or not self.consumer_thread.is_alive():
            print("❌ No consumer is running!")
            return
        
        print("\n🛑 Stopping consumer...")
        self.stop_consumer = True
        if self.consumer:
            self.consumer.close()
        self.consumer_thread.join(timeout=2)
        print("✅ Consumer stopped!")
    
    def producer_consumer_demo(self):
        """Demonstrate producer-consumer interaction"""
        print("\n🔄 Producer-Consumer Demo")
        print("This demo will start a consumer and then send messages to see real-time processing.")
        
        # Start consumer
        self.start_consumer_demo()
        time.sleep(2)  # Give consumer time to start
        
        # Send messages with delays
        print("\n📤 Sending messages in real-time...")
        
        demo_messages = [
            "Welcome to our e-commerce platform!",
            "User logged in from mobile app",
            "Product search: 'gaming laptop'",
            "Item added to wishlist",
            "Checkout process started",
            "Payment successful",
            "Order confirmation sent"
        ]
        
        for i, msg in enumerate(demo_messages, 1):
            message = {
                'id': i,
                'message': msg,
                'timestamp': datetime.now().isoformat(),
                'demo': True
            }
            
            self.producer.send_message(
                topic=config.DEFAULT_TOPIC,
                message=message,
                key=f"demo_{i}"
            )
            
            print(f"📤 Sent: {msg}")
            time.sleep(2)  # 2-second delay between messages
        
        print("\n✅ Demo completed! Consumer will continue running until stopped.")
    
    def show_kafka_concepts(self):
        """Display Kafka concepts and terminology"""
        print("\n📊 KAFKA CONCEPTS:")
        print("-" * 50)
        
        concepts = {
            "🏢 Broker": "A Kafka server that stores and serves messages",
            "📁 Topic": "A category/feed of messages (like a database table)",
            "📄 Partition": "Topics are split into partitions for scalability",
            "📤 Producer": "Application that sends messages to topics",
            "📥 Consumer": "Application that reads messages from topics",
            "👥 Consumer Group": "Group of consumers that work together",
            "🔢 Offset": "Unique position of a message within a partition",
            "🔑 Key": "Optional identifier for message routing",
            "💾 Replication": "Copies of data for fault tolerance",
            "⚖️ Load Balancing": "Distributing messages across partitions"
        }
        
        for concept, description in concepts.items():
            print(f"{concept}: {description}")
        
        print("\n🎯 KAFKA GUARANTEES:")
        print("- Messages within a partition are ordered")
        print("- Messages are durable (persisted to disk)")
        print("- Consumers can replay messages")
        print("- Horizontal scalability through partitions")
        
        print("\n💡 USE CASES:")
        print("- Real-time data streaming")
        print("- Event sourcing")
        print("- Log aggregation")
        print("- Message queuing")
        print("- Activity tracking")
    
    def advanced_features_demo(self):
        """Demonstrate advanced Kafka features"""
        print("\n🧪 ADVANCED FEATURES DEMO")
        
        print("\n1. 🔑 Message Keys and Partitioning:")
        print("   Messages with the same key go to the same partition")
        
        # Send messages with keys to demonstrate partitioning
        for i in range(5):
            key = f"user_{i % 3}"  # Only 3 different keys
            message = {
                'user_id': i % 3,
                'action': f'action_{i}',
                'timestamp': datetime.now().isoformat()
            }
            self.producer.send_message(
                topic=config.USER_MESSAGES_TOPIC,
                message=message,
                key=key
            )
        
        print("\n2. 📊 Batch Processing:")
        print("   Sending multiple messages efficiently")
        
        # Batch send
        batch_messages = []
        for i in range(10):
            batch_messages.append({
                'batch_id': 'BATCH_001',
                'item_id': i,
                'data': f'batch_item_{i}',
                'timestamp': datetime.now().isoformat()
            })
        
        for msg in batch_messages:
            self.producer.send_message(
                topic=config.DEFAULT_TOPIC,
                message=msg,
                key='batch_demo'
            )
        
        print("✅ Advanced features demonstrated!")
    
    def show_help(self):
        """Show help information"""
        print("\n❓ HELP - How to use this demo:")
        print("-" * 40)
        print("📤 PRODUCER: Sends messages to Kafka topics")
        print("   - Choose option 1 to send predefined messages")
        print("   - Messages include user activities and system events")
        print()
        print("📥 CONSUMER: Reads messages from Kafka topics")
        print("   - Choose option 2 to start listening for messages")
        print("   - Consumer will show all incoming messages")
        print("   - Use option 3 to stop the consumer")
        print()
        print("🔄 DEMO: Interactive producer-consumer demonstration")
        print("   - Option 4 shows real-time message flow")
        print("   - Messages are sent with delays for visualization")
        print()
        print("💡 TIPS:")
        print("   - Start a consumer before sending messages to see them")
        print("   - You can run multiple consumers (different terminals)")
        print("   - Each consumer in the same group gets different messages")
        print("   - Messages are persistent and can be replayed")
    
    def run(self):
        """Run the interactive demo"""
        self.print_header()
        
        while True:
            self.print_menu()
            
            try:
                choice = input("Enter your choice (0-7): ").strip()
                
                if choice == '0':
                    print("\n👋 Goodbye! Thanks for using the Kafka demo!")
                    break
                elif choice == '1':
                    self.send_sample_messages()
                elif choice == '2':
                    self.start_consumer_demo()
                elif choice == '3':
                    self.stop_consumer_demo()
                elif choice == '4':
                    self.producer_consumer_demo()
                elif choice == '5':
                    self.show_kafka_concepts()
                elif choice == '6':
                    self.advanced_features_demo()
                elif choice == '7':
                    self.show_help()
                else:
                    print("❌ Invalid choice. Please enter a number between 0-7.")
                
                if choice != '0':
                    input("\nPress Enter to continue...")
                    
            except KeyboardInterrupt:
                print("\n\n👋 Demo interrupted. Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")
        
        # Clean up
        self.stop_consumer_demo()
        self.producer.close()

def main():
    demo = KafkaDemo()
    demo.run()

if __name__ == "__main__":
    main() 