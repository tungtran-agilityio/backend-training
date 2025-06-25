#!/usr/bin/env python3
"""
Initialize sample data for the notification service.
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.database import get_database, create_tables
from src.config import settings
from datetime import datetime


async def init_sample_data():
    """Initialize sample users and templates."""
    database = get_database()
    
    try:
        await database.connect()
        print("Connected to database")
        
        # Create sample users
        sample_users = [
            {
                "id": "user123",
                "email": "john.doe@example.com",
                "phone_number": "+1234567890",
                "ios_device_token": "a1b2c3d4e5f67890123456789abcdef012345678901234567890abcdef012345",
                "android_device_token": "fcm_token_android_sample_123456789012345678901234567890",
                "push_enabled": True,
                "sms_enabled": True,
                "email_enabled": True,
                "dnd_start_hour": None,
                "dnd_end_hour": None
            },
            {
                "id": "user456",
                "email": "jane.smith@example.com", 
                "phone_number": "+0987654321",
                "ios_device_token": None,
                "android_device_token": "fcm_token_android_sample_098765432109876543210987654321",
                "push_enabled": True,
                "sms_enabled": True,
                "email_enabled": False,  # Email disabled
                "dnd_start_hour": 22,  # 10 PM
                "dnd_end_hour": 6      # 6 AM
            },
            {
                "id": "user789",
                "email": "test.user@example.com",
                "phone_number": "+1122334455",
                "ios_device_token": "b1c2d3e4f5a67890123456789bcdefab012345678901234567890bcdefab012345",
                "android_device_token": None,
                "push_enabled": True,
                "sms_enabled": False,  # SMS disabled
                "email_enabled": True,
                "dnd_start_hour": None,
                "dnd_end_hour": None
            }
        ]
        
        # Insert users
        for user in sample_users:
            query = """
            INSERT INTO users (id, email, phone_number, ios_device_token, android_device_token,
                             push_enabled, sms_enabled, email_enabled, dnd_start_hour, dnd_end_hour,
                             created_at, updated_at)
            VALUES (:id, :email, :phone_number, :ios_device_token, :android_device_token,
                    :push_enabled, :sms_enabled, :email_enabled, :dnd_start_hour, :dnd_end_hour,
                    :created_at, :updated_at)
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                phone_number = EXCLUDED.phone_number,
                ios_device_token = EXCLUDED.ios_device_token,
                android_device_token = EXCLUDED.android_device_token,
                push_enabled = EXCLUDED.push_enabled,
                sms_enabled = EXCLUDED.sms_enabled,
                email_enabled = EXCLUDED.email_enabled,
                dnd_start_hour = EXCLUDED.dnd_start_hour,
                dnd_end_hour = EXCLUDED.dnd_end_hour,
                updated_at = EXCLUDED.updated_at
            """
            
            user["created_at"] = datetime.utcnow()
            user["updated_at"] = datetime.utcnow()
            
            await database.execute(query, user)
            print(f"Inserted/Updated user: {user['id']}")
        
        # Create sample templates
        sample_templates = [
            {
                "id": "welcome",
                "name": "Welcome Message",
                "push_title": "Welcome to our app!",
                "push_body": "Hello {username}, welcome to our amazing app!",
                "sms_content": "Hi {username}! Welcome to our app. Get started now!",
                "email_subject": "Welcome to our platform, {username}!",
                "email_body": "Dear {username},\n\nWelcome to our platform! We're excited to have you on board.\n\nBest regards,\nThe Team",
                "variables": ["username"]
            },
            {
                "id": "order_confirmation",
                "name": "Order Confirmation",
                "push_title": "Order Confirmed",
                "push_body": "Your order #{order_id} has been confirmed!",
                "sms_content": "Order #{order_id} confirmed! Total: ${total}. Track at: {tracking_url}",
                "email_subject": "Order Confirmation - #{order_id}",
                "email_body": "Your order #{order_id} has been confirmed.\nTotal: ${total}\nTracking: {tracking_url}",
                "variables": ["order_id", "total", "tracking_url"]
            },
            {
                "id": "password_reset",
                "name": "Password Reset",
                "push_title": "Password Reset",
                "push_body": "Use code {reset_code} to reset your password",
                "sms_content": "Your password reset code is: {reset_code}. Valid for 10 minutes.",
                "email_subject": "Password Reset Request",
                "email_body": "Use this code to reset your password: {reset_code}\n\nThis code expires in 10 minutes.",
                "variables": ["reset_code"]
            }
        ]
        
        # Insert templates
        for template in sample_templates:
            query = """
            INSERT INTO notification_templates (id, name, push_title, push_body, sms_content, 
                                              email_subject, email_body, variables, created_at, updated_at)
            VALUES (:id, :name, :push_title, :push_body, :sms_content, 
                    :email_subject, :email_body, :variables, :created_at, :updated_at)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                push_title = EXCLUDED.push_title,
                push_body = EXCLUDED.push_body,
                sms_content = EXCLUDED.sms_content,
                email_subject = EXCLUDED.email_subject,
                email_body = EXCLUDED.email_body,
                variables = EXCLUDED.variables,
                updated_at = EXCLUDED.updated_at
            """
            
            template["variables"] = template["variables"]  # Should be JSON
            template["created_at"] = datetime.utcnow()
            template["updated_at"] = datetime.utcnow()
            
            await database.execute(query, template)
            print(f"Inserted/Updated template: {template['id']}")
        
        print("Sample data initialization completed!")
        
    except Exception as e:
        print(f"Error initializing data: {e}")
        raise
    finally:
        await database.disconnect()


if __name__ == "__main__":
    # First create tables
    print("Creating database tables...")
    create_tables()
    print("Tables created!")
    
    # Then initialize sample data
    print("Initializing sample data...")
    asyncio.run(init_sample_data()) 