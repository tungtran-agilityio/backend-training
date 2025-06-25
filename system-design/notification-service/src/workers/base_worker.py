import asyncio
import logging
import structlog
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from ..config import settings
from ..database import get_database
from ..kafka_client import KafkaNotificationConsumer
from ..providers.base import BaseNotificationProvider, NotificationResult

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logging.basicConfig(level=getattr(logging, settings.log_level.upper()))


class BaseNotificationWorker(ABC):
    """Base class for notification workers."""
    
    def __init__(self, worker_name: str, topics: list):
        self.worker_name = worker_name
        self.topics = topics
        self.logger = structlog.get_logger(worker_name)
        self.database = get_database()
        self.consumer = None
        self.provider = None
    
    @abstractmethod
    def get_provider(self) -> BaseNotificationProvider:
        """Get the notification provider for this worker."""
        pass
    
    @abstractmethod
    def get_recipient_from_user(self, user_data: Dict[str, Any]) -> Optional[str]:
        """Extract recipient information from user data."""
        pass
    
    async def start(self):
        """Start the worker."""
        self.logger.info("Starting notification worker")
        
        try:
            # Connect to database
            await self.database.connect()
            self.logger.info("Database connected")
            
            # Get provider
            self.provider = self.get_provider()
            self.logger.info("Provider initialized", provider=self.provider.name)
            
            # Start Kafka consumer
            self.consumer = KafkaNotificationConsumer(
                topics=self.topics,
                group_id=f"{self.worker_name}_group"
            )
            
            self.logger.info("Starting message consumption", topics=self.topics)
            self.consumer.consume_messages(self.process_message)
            
        except KeyboardInterrupt:
            self.logger.info("Worker interrupted by user")
        except Exception as e:
            self.logger.error("Worker error", error=str(e))
        finally:
            await self.cleanup()
    
    async def cleanup(self):
        """Cleanup resources."""
        self.logger.info("Cleaning up worker resources")
        if self.consumer:
            self.consumer.close()
        if self.database:
            await self.database.disconnect()
    
    def process_message(self, message_data: Dict[str, Any]) -> bool:
        """Process a notification message from Kafka."""
        try:
            # Run async processing in sync context
            return asyncio.run(self._process_message_async(message_data))
        except Exception as e:
            self.logger.error("Error processing message", error=str(e), message=message_data)
            return False
    
    async def _process_message_async(self, message_data: Dict[str, Any]) -> bool:
        """Async message processing logic."""
        notification_id = message_data.get("notification_id")
        user_id = message_data.get("user_id")
        title = message_data.get("title")
        content = message_data.get("content")
        
        self.logger.info("Processing notification", 
                        notification_id=notification_id, user_id=user_id)
        
        try:
            # Get user information to find recipient
            user = await self._get_user(user_id)
            if not user:
                self.logger.error("User not found", user_id=user_id)
                await self._update_notification_status(
                    notification_id, "failed", "User not found"
                )
                return True  # Don't retry - user doesn't exist
            
            # Get recipient for this channel
            recipient = self.get_recipient_from_user(user)
            if not recipient:
                self.logger.warning("No recipient info for user", user_id=user_id)
                await self._update_notification_status(
                    notification_id, "failed", "No recipient information"
                )
                return True  # Don't retry - no recipient info
            
            # Validate recipient
            if not await self.provider.validate_recipient(recipient):
                self.logger.warning("Invalid recipient", recipient=recipient[:10] + "...")
                await self._update_notification_status(
                    notification_id, "failed", "Invalid recipient"
                )
                return True  # Don't retry - invalid recipient
            
            # Send notification
            result = await self.provider.send(recipient, title, content)
            
            if result.success:
                # Success - update notification status
                await self._update_notification_status(
                    notification_id, "sent", provider_message_id=result.provider_message_id
                )
                self.logger.info("Notification sent successfully", 
                               notification_id=notification_id,
                               provider_message_id=result.provider_message_id)
                return True
            else:
                # Failed - check if we should retry
                retry_count = message_data.get("retry_count", 0)
                max_retries = message_data.get("max_retries", settings.max_retries)
                
                if retry_count < max_retries and result.retry_after:
                    # Schedule retry
                    await self._schedule_retry(notification_id, retry_count + 1, result.retry_after)
                    self.logger.warning("Notification failed, scheduling retry",
                                      notification_id=notification_id,
                                      retry_count=retry_count + 1,
                                      retry_after=result.retry_after)
                    return True  # Don't reprocess immediately
                else:
                    # Max retries reached or no retry suggested
                    await self._update_notification_status(
                        notification_id, "failed", result.error_message
                    )
                    self.logger.error("Notification failed permanently",
                                    notification_id=notification_id,
                                    error=result.error_message)
                    return True  # Don't retry
            
        except Exception as e:
            self.logger.error("Unexpected error processing notification",
                            notification_id=notification_id, error=str(e))
            return False  # Retry this message
    
    async def _get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user information from database."""
        try:
            query = "SELECT * FROM users WHERE id = :user_id"
            result = await self.database.fetch_one(query, {"user_id": user_id})
            return dict(result) if result else None
        except Exception as e:
            self.logger.error("Error fetching user", user_id=user_id, error=str(e))
            return None
    
    async def _update_notification_status(self, notification_id: str, status: str, 
                                        error_message: Optional[str] = None,
                                        provider_message_id: Optional[str] = None):
        """Update notification status in database."""
        try:
            update_fields = {
                "status": status,
                "updated_at": datetime.utcnow()
            }
            
            if status == "sent":
                update_fields["sent_at"] = datetime.utcnow()
                if provider_message_id:
                    update_fields["provider_message_id"] = provider_message_id
            elif status == "failed":
                update_fields["failed_at"] = datetime.utcnow()
                if error_message:
                    update_fields["error_message"] = error_message
            
            # Build dynamic query
            set_clause = ", ".join([f"{key} = :{key}" for key in update_fields.keys()])
            query = f"UPDATE notifications SET {set_clause} WHERE id = :notification_id"
            update_fields["notification_id"] = notification_id
            
            await self.database.execute(query, update_fields)
            
        except Exception as e:
            self.logger.error("Error updating notification status",
                            notification_id=notification_id, error=str(e))
    
    async def _schedule_retry(self, notification_id: str, retry_count: int, retry_after_seconds: int):
        """Schedule notification for retry."""
        try:
            next_retry_at = datetime.utcnow() + timedelta(seconds=retry_after_seconds)
            
            query = """
            UPDATE notifications 
            SET status = :status, retry_count = :retry_count, next_retry_at = :next_retry_at
            WHERE id = :notification_id
            """
            
            await self.database.execute(query, {
                "status": "retrying",
                "retry_count": retry_count,
                "next_retry_at": next_retry_at,
                "notification_id": notification_id
            })
            
        except Exception as e:
            self.logger.error("Error scheduling retry",
                            notification_id=notification_id, error=str(e)) 