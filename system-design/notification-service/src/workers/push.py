from typing import Dict, Any, Optional
from .base_worker import BaseNotificationWorker
from ..providers.push import apns_provider, fcm_provider
from ..providers.base import BaseNotificationProvider
from ..config import settings


class PushNotificationWorker(BaseNotificationWorker):
    """Worker for processing push notifications."""
    
    def __init__(self):
        topics = [settings.kafka_topics["push_notifications"]]
        super().__init__("push_notification_worker", topics)
    
    def get_provider(self) -> BaseNotificationProvider:
        """Get push notification provider based on device token."""
        # For simplicity, we'll use APNS as default
        # In a real implementation, you'd determine the provider based on the device token format
        return apns_provider
    
    def get_recipient_from_user(self, user_data: Dict[str, Any]) -> Optional[str]:
        """Extract device token from user data."""
        # Prefer iOS token, fallback to Android
        ios_token = user_data.get("ios_device_token")
        android_token = user_data.get("android_device_token")
        
        if ios_token:
            self.logger.info("Using iOS device token")
            return ios_token
        elif android_token:
            self.logger.info("Using Android device token") 
            # Switch to FCM provider for Android tokens
            self.provider = fcm_provider
            return android_token
        
        return None


if __name__ == "__main__":
    worker = PushNotificationWorker()
    import asyncio
    asyncio.run(worker.start()) 