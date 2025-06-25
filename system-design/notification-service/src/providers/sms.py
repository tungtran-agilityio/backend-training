import asyncio
import random
import uuid
import re
from typing import Dict, Any, Optional
from .base import BaseNotificationProvider, NotificationResult


class TwilioProvider(BaseNotificationProvider):
    """Mock Twilio SMS provider."""
    
    def __init__(self):
        super().__init__("Twilio")
    
    async def send(self, recipient: str, title: str, content: str, 
                   extra_data: Optional[Dict[str, Any]] = None) -> NotificationResult:
        """Send SMS via Twilio."""
        self.logger.info(f"Sending SMS to {recipient}")
        
        # Simulate network delay
        await asyncio.sleep(random.uniform(0.2, 0.8))
        
        # Simulate rate limiting (2% rate)
        if random.random() < 0.02:
            error_msg = "Rate limit exceeded"
            self.logger.warning(f"Twilio send failed: {error_msg}")
            return NotificationResult(
                success=False,
                error_message=error_msg,
                retry_after=120
            )
        
        # Simulate invalid phone number (3% rate)
        if random.random() < 0.03:
            error_msg = "Invalid phone number format"
            self.logger.warning(f"Twilio send failed: {error_msg}")
            return NotificationResult(
                success=False,
                error_message=error_msg
            )
        
        # Simulate carrier rejection (1% rate)
        if random.random() < 0.01:
            error_msg = "Message blocked by carrier"
            self.logger.warning(f"Twilio send failed: {error_msg}")
            return NotificationResult(
                success=False,
                error_message=error_msg
            )
        
        message_id = f"SM{uuid.uuid4().hex[:32]}"  # Twilio SID format
        self.logger.info(f"SMS sent successfully. Message SID: {message_id}")
        
        return NotificationResult(
            success=True,
            provider_message_id=message_id
        )
    
    async def validate_recipient(self, recipient: str) -> bool:
        """Validate phone number format."""
        # Simple phone number validation (E.164 format)
        phone_pattern = r'^\+[1-9]\d{1,14}$'
        return bool(re.match(phone_pattern, recipient))


# Provider instance
twilio_provider = TwilioProvider() 