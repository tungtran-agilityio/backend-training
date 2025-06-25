#!/usr/bin/env python3
"""
Test script to send sample notifications.
"""

import asyncio
import httpx
import json
import time
from typing import List, Dict, Any


async def send_notification(base_url: str, payload: Dict[str, Any]):
    """Send a notification request."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{base_url}/api/v1/notifications",
                json=payload,
                timeout=10.0
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Notification sent successfully!")
                print(f"   Request ID: {result['request_id']}")
                print(f"   Channels queued: {result['channels_queued']}")
                print(f"   Message: {result['message']}")
                return True
            else:
                print(f"❌ Failed to send notification: {response.status_code}")
                print(f"   Error: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error sending notification: {e}")
            return False


async def test_template_notifications(base_url: str):
    """Test notifications using templates."""
    print("🧪 Testing template-based notifications...")
    
    test_cases = [
        {
            "name": "Welcome notification for user123",
            "payload": {
                "user_id": "user123",
                "template_id": "welcome",
                "channels": ["push", "email", "sms"],
                "data": {"username": "John Doe"}
            }
        },
        {
            "name": "Order confirmation for user456", 
            "payload": {
                "user_id": "user456",
                "template_id": "order_confirmation",
                "channels": ["push", "sms"],
                "data": {
                    "order_id": "ORD-12345",
                    "total": "99.99",
                    "tracking_url": "https://track.example.com/ORD-12345"
                }
            }
        },
        {
            "name": "Password reset for user789",
            "payload": {
                "user_id": "user789",
                "template_id": "password_reset",
                "channels": ["push", "email"],
                "data": {"reset_code": "ABC123"}
            }
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. {test_case['name']}")
        success = await send_notification(base_url, test_case['payload'])
        if success:
            print("   ✅ Test passed")
        else:
            print("   ❌ Test failed")
        
        # Wait between requests
        await asyncio.sleep(1)


async def test_direct_notifications(base_url: str):
    """Test direct notifications without templates."""
    print("\n🧪 Testing direct notifications...")
    
    test_cases = [
        {
            "name": "Direct push notification",
            "payload": {
                "user_id": "user123",
                "channels": ["push"],
                "title": "Test Notification",
                "content": "This is a direct push notification test!"
            }
        },
        {
            "name": "Direct SMS notification",
            "payload": {
                "user_id": "user456",
                "channels": ["sms"],
                "content": "This is a direct SMS test message!"
            }
        },
        {
            "name": "Direct email notification",
            "payload": {
                "user_id": "user789",
                "channels": ["email"],
                "title": "Test Email",
                "content": "This is a direct email test message!"
            }
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. {test_case['name']}")
        success = await send_notification(base_url, test_case['payload'])
        if success:
            print("   ✅ Test passed")
        else:
            print("   ❌ Test failed")
        
        # Wait between requests
        await asyncio.sleep(1)


async def test_edge_cases(base_url: str):
    """Test edge cases and error scenarios."""
    print("\n🧪 Testing edge cases...")
    
    test_cases = [
        {
            "name": "Non-existent user",
            "payload": {
                "user_id": "nonexistent",
                "channels": ["push"],
                "content": "This should fail"
            },
            "expect_failure": True
        },
        {
            "name": "Invalid template",
            "payload": {
                "user_id": "user123",
                "template_id": "nonexistent_template",
                "channels": ["push"],
                "data": {}
            },
            "expect_failure": True
        },
        {
            "name": "User with disabled channels",
            "payload": {
                "user_id": "user456",  # has email disabled
                "channels": ["email"],
                "content": "This should be filtered out"
            },
            "expect_failure": False  # Should succeed but no channels queued
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. {test_case['name']}")
        success = await send_notification(base_url, test_case['payload'])
        
        if test_case.get("expect_failure"):
            if not success:
                print("   ✅ Test passed (expected failure)")
            else:
                print("   ❌ Test failed (expected failure but succeeded)")
        else:
            if success:
                print("   ✅ Test passed")
            else:
                print("   ❌ Test failed")
        
        # Wait between requests
        await asyncio.sleep(1)


async def health_check(base_url: str):
    """Check if the API is healthy."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{base_url}/health", timeout=5.0)
            if response.status_code == 200:
                health_data = response.json()
                print(f"✅ API is healthy")
                print(f"   Status: {health_data['status']}")
                print(f"   Services: {health_data['services']}")
                return True
            else:
                print(f"❌ API health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error checking API health: {e}")
            return False


async def main():
    """Main test function."""
    base_url = "http://localhost:8000"
    
    print("🚀 Starting notification service tests...")
    print(f"   API URL: {base_url}")
    
    # Health check first
    print("\n1️⃣ Health Check")
    if not await health_check(base_url):
        print("❌ API is not healthy. Make sure the service is running.")
        return
    
    # Test template-based notifications
    print("\n2️⃣ Template-based notifications")
    await test_template_notifications(base_url)
    
    # Test direct notifications
    print("\n3️⃣ Direct notifications")
    await test_direct_notifications(base_url)
    
    # Test edge cases
    print("\n4️⃣ Edge cases")
    await test_edge_cases(base_url)
    
    print("\n🎉 All tests completed!")
    print("\n💡 Tip: Check the worker logs to see the notifications being processed.")


if __name__ == "__main__":
    asyncio.run(main()) 