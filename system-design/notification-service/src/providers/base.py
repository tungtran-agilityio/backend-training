from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class NotificationResult:
    """Result of sending a notification."""
    success: bool
    provider_message_id: Optional[str] = None
    error_message: Optional[str] = None
    retry_after: Optional[int] = None  # Seconds to wait before retry


class BaseNotificationProvider(ABC):
    """Base class for all notification providers."""
    
    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(f"{__name__}.{name}")
    
    @abstractmethod
    async def send(self, recipient: str, title: str, content: str, 
                   extra_data: Optional[Dict[str, Any]] = None) -> NotificationResult:
        """Send a notification.
        
        Args:
            recipient: The recipient identifier (device token, phone, email)
            title: Notification title
            content: Notification content/body
            extra_data: Additional provider-specific data
            
        Returns:
            NotificationResult with success status and details
        """
        pass
    
    @abstractmethod
    async def validate_recipient(self, recipient: str) -> bool:
        """Validate if the recipient identifier is valid for this provider."""
        pass
    
    def get_provider_name(self) -> str:
        """Get the provider name."""
        return self.name 