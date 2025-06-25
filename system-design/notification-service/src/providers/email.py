import asyncio
import random
import uuid
import re
from typing import Dict, Any, Optional
from .base import BaseNotificationProvider, NotificationResult


class SendGridProvider(BaseNotificationProvider):
    """Mock SendGrid email provider."""
    
    def __init__(self):
        super().__init__("SendGrid")
    
    async def send(self, recipient: str, title: str, content: str, 
                   extra_data: Optional[Dict[str, Any]] = None) -> NotificationResult:
        """Send email via SendGrid."""
        self.logger.info(f"Sending email to {recipient}")
        
        # Simulate network delay
        await asyncio.sleep(random.uniform(0.3, 1.0))
        
        # Simulate rate limiting (1% rate)
        if random.random() < 0.01:
            error_msg = "Rate limit exceeded"
            self.logger.warning(f"SendGrid send failed: {error_msg}")
            return NotificationResult(
                success=False,
                error_message=error_msg,
                retry_after=300
            )
        
        # Simulate invalid email (2% rate)
        if random.random() < 0.02:
            error_msg = "Invalid email address"
            self.logger.warning(f"SendGrid send failed: {error_msg}")
            return NotificationResult(
                success=False,
                error_message=error_msg
            )
        
        # Simulate bounced email (1% rate)
        if random.random() < 0.01:
            error_msg = "Email bounced"
            self.logger.warning(f"SendGrid send failed: {error_msg}")
            return NotificationResult(
                success=False,
                error_message=error_msg
            )
        
        # Simulate spam filter (0.5% rate)
        if random.random() < 0.005:
            error_msg = "Message rejected by spam filter"
            self.logger.warning(f"SendGrid send failed: {error_msg}")
            return NotificationResult(
                success=False,
                error_message=error_msg
            )
        
        message_id = f"sg_{uuid.uuid4().hex}"
        self.logger.info(f"Email sent successfully. Message ID: {message_id}")
        
        return NotificationResult(
            success=True,
            provider_message_id=message_id
        )
    
    async def validate_recipient(self, recipient: str) -> bool:
        """Validate email address format."""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(email_pattern, recipient))


# Provider instance
sendgrid_provider = SendGridProvider() 