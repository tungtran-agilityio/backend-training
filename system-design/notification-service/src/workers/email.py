from typing import Dict, Any, Optional
from .base_worker import BaseNotificationWorker
from ..providers.email import sendgrid_provider
from ..providers.base import BaseNotificationProvider
from ..config import settings


class EmailNotificationWorker(BaseNotificationWorker):
    """Worker for processing email notifications."""
    
    def __init__(self):
        topics = [settings.kafka_topics["email_notifications"]]
        super().__init__("email_notification_worker", topics)
    
    def get_provider(self) -> BaseNotificationProvider:
        """Get email provider."""
        return sendgrid_provider
    
    def get_recipient_from_user(self, user_data: Dict[str, Any]) -> Optional[str]:
        """Extract email address from user data."""
        email = user_data.get("email")
        if email:
            self.logger.info("Using email address", email=email[:3] + "***@" + email.split("@")[1] if "@" in email else "***")
            return email
        return None


if __name__ == "__main__":
    worker = EmailNotificationWorker()
    import asyncio
    asyncio.run(worker.start()) 