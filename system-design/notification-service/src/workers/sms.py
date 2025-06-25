from typing import Dict, Any, Optional
from .base_worker import BaseNotificationWorker
from ..providers.sms import twilio_provider
from ..providers.base import BaseNotificationProvider
from ..config import settings


class SMSNotificationWorker(BaseNotificationWorker):
    """Worker for processing SMS notifications."""
    
    def __init__(self):
        topics = [settings.kafka_topics["sms_notifications"]]
        super().__init__("sms_notification_worker", topics)
    
    def get_provider(self) -> BaseNotificationProvider:
        """Get SMS provider."""
        return twilio_provider
    
    def get_recipient_from_user(self, user_data: Dict[str, Any]) -> Optional[str]:
        """Extract phone number from user data."""
        phone_number = user_data.get("phone_number")
        if phone_number:
            self.logger.info("Using phone number", phone=phone_number[:5] + "***")
            return phone_number
        return None


if __name__ == "__main__":
    worker = SMSNotificationWorker()
    import asyncio
    asyncio.run(worker.start()) 