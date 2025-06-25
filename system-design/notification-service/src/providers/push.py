import asyncio
import random
import uuid
from typing import Dict, Any, Optional
from .base import BaseNotificationProvider, NotificationResult


class APNSProvider(BaseNotificationProvider):
    """Mock Apple Push Notification Service provider."""
    
    def __init__(self):
        super().__init__("APNS")
    
    async def send(self, recipient: str, title: str, content: str, 
                   extra_data: Optional[Dict[str, Any]] = None) -> NotificationResult:
        """Send push notification via APNS."""
        self.logger.info(f"Sending APNS notification to {recipient[:20]}...")
        
        # Simulate network delay
        await asyncio.sleep(random.uniform(0.1, 0.5))
        
        # Simulate occasional failures (5% failure rate)
        if random.random() < 0.05:
            error_msg = "APNS service temporarily unavailable"
            self.logger.warning(f"APNS send failed: {error_msg}")
            return NotificationResult(
                success=False,
                error_message=error_msg,
                retry_after=60
            )
        
        # Simulate invalid device token (2% rate)
        if random.random() < 0.02:
            error_msg = "Invalid device token"
            self.logger.warning(f"APNS send failed: {error_msg}")
            return NotificationResult(
                success=False,
                error_message=error_msg
            )
        
        message_id = f"apns_{uuid.uuid4().hex[:16]}"
        self.logger.info(f"APNS notification sent successfully. Message ID: {message_id}")
        
        return NotificationResult(
            success=True,
            provider_message_id=message_id
        )
    
    async def validate_recipient(self, recipient: str) -> bool:
        """Validate iOS device token format."""
        # Simplified validation - real APNS tokens are 64 hex characters
        return (isinstance(recipient, str) and 
                len(recipient) >= 32 and 
                all(c in '0123456789abcdefABCDEF' for c in recipient))


class FCMProvider(BaseNotificationProvider):
    """Mock Firebase Cloud Messaging provider."""
    
    def __init__(self):
        super().__init__("FCM")
    
    async def send(self, recipient: str, title: str, content: str, 
                   extra_data: Optional[Dict[str, Any]] = None) -> NotificationResult:
        """Send push notification via FCM."""
        self.logger.info(f"Sending FCM notification to {recipient[:20]}...")
        
        # Simulate network delay
        await asyncio.sleep(random.uniform(0.1, 0.3))
        
        # Simulate occasional failures (3% failure rate)
        if random.random() < 0.03:
            error_msg = "FCM quota exceeded"
            self.logger.warning(f"FCM send failed: {error_msg}")
            return NotificationResult(
                success=False,
                error_message=error_msg,
                retry_after=30
            )
        
        # Simulate invalid registration token (2% rate)
        if random.random() < 0.02:
            error_msg = "Invalid registration token"
            self.logger.warning(f"FCM send failed: {error_msg}")
            return NotificationResult(
                success=False,
                error_message=error_msg
            )
        
        message_id = f"fcm_{uuid.uuid4().hex[:16]}"
        self.logger.info(f"FCM notification sent successfully. Message ID: {message_id}")
        
        return NotificationResult(
            success=True,
            provider_message_id=message_id
        )
    
    async def validate_recipient(self, recipient: str) -> bool:
        """Validate FCM registration token format."""
        # FCM tokens are typically long strings with various characters
        return (isinstance(recipient, str) and 
                len(recipient) >= 50)


# Provider instances
apns_provider = APNSProvider()
fcm_provider = FCMProvider() 