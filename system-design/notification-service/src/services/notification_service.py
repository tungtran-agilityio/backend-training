import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from ..database import get_database
from ..models import User, NotificationTemplate, Notification, NotificationChannel, NotificationStatus
from ..schemas import (
    SendNotificationRequest, 
    NotificationMessage, 
    NotificationChannel as SchemaChannel
)
from ..kafka_client import notification_producer
from ..config import settings
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """Main notification service handling business logic."""
    
    def __init__(self):
        self.database = get_database()
    
    async def send_notification(self, request: SendNotificationRequest) -> Dict[str, Any]:
        """Process notification send request."""
        try:
            # Get user information
            user = await self._get_user(request.user_id)
            if not user:
                return {
                    "success": False,
                    "error": f"User {request.user_id} not found"
                }
            
            # Check if user is in do-not-disturb period
            if self._is_user_in_dnd(user):
                logger.info(f"User {request.user_id} is in do-not-disturb period")
                return {
                    "success": False,
                    "error": "User is in do-not-disturb period"
                }
            
            # Get template if specified
            template = None
            if request.template_id:
                template = await self._get_template(request.template_id)
                if not template:
                    return {
                        "success": False,
                        "error": f"Template {request.template_id} not found"
                    }
            
            request_id = str(uuid.uuid4())
            channels_queued = []
            
            # Process each channel
            for channel in request.channels:
                # Check if user has this channel enabled
                if not self._is_channel_enabled(user, channel):
                    logger.info(f"Channel {channel} disabled for user {request.user_id}")
                    continue
                
                # Get recipient information for this channel
                recipient = self._get_recipient_for_channel(user, channel)
                if not recipient:
                    logger.warning(f"No recipient info for channel {channel} and user {request.user_id}")
                    continue
                
                # Prepare notification content
                title, content = self._prepare_content(
                    channel, template, request.title, request.content, request.data
                )
                
                # Create notification record
                notification_id = await self._create_notification_record(
                    user_id=request.user_id,
                    template_id=request.template_id,
                    channel=channel,
                    title=title,
                    content=content
                )
                
                # Create Kafka message
                message = NotificationMessage(
                    notification_id=notification_id,
                    user_id=request.user_id,
                    channel=channel,
                    title=title,
                    content=content
                )
                
                # Send to Kafka
                success = await notification_producer.send_notification(channel.value, message)
                if success:
                    channels_queued.append(channel)
                    logger.info(f"Notification queued for channel {channel}")
                else:
                    logger.error(f"Failed to queue notification for channel {channel}")
            
            return {
                "success": True,
                "request_id": request_id,
                "channels_queued": channels_queued,
                "message": f"Notification queued for {len(channels_queued)} channels"
            }
            
        except Exception as e:
            logger.error(f"Error processing notification request: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user information from database."""
        query = "SELECT * FROM users WHERE id = :user_id"
        result = await self.database.fetch_one(query, {"user_id": user_id})
        return dict(result) if result else None
    
    async def _get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get template information from database."""
        query = "SELECT * FROM notification_templates WHERE id = :template_id"
        result = await self.database.fetch_one(query, {"template_id": template_id})
        return dict(result) if result else None
    
    def _is_user_in_dnd(self, user: Dict[str, Any]) -> bool:
        """Check if user is currently in do-not-disturb period."""
        if not user.get("dnd_start_hour") or not user.get("dnd_end_hour"):
            return False
        
        current_hour = datetime.now().hour
        start_hour = user["dnd_start_hour"]
        end_hour = user["dnd_end_hour"]
        
        if start_hour <= end_hour:
            # Same day DND (e.g., 9 AM to 5 PM)
            return start_hour <= current_hour <= end_hour
        else:
            # Overnight DND (e.g., 10 PM to 6 AM)
            return current_hour >= start_hour or current_hour <= end_hour
    
    def _is_channel_enabled(self, user: Dict[str, Any], channel: SchemaChannel) -> bool:
        """Check if the channel is enabled for the user."""
        channel_mapping = {
            SchemaChannel.PUSH: "push_enabled",
            SchemaChannel.SMS: "sms_enabled",
            SchemaChannel.EMAIL: "email_enabled"
        }
        field = channel_mapping.get(channel)
        return user.get(field, False) if field else False
    
    def _get_recipient_for_channel(self, user: Dict[str, Any], channel: SchemaChannel) -> Optional[str]:
        """Get recipient identifier for the specified channel."""
        if channel == SchemaChannel.PUSH:
            # Prefer iOS token, fallback to Android
            return user.get("ios_device_token") or user.get("android_device_token")
        elif channel == SchemaChannel.SMS:
            return user.get("phone_number")
        elif channel == SchemaChannel.EMAIL:
            return user.get("email")
        return None
    
    def _prepare_content(self, channel: SchemaChannel, template: Optional[Dict[str, Any]], 
                        title: Optional[str], content: Optional[str], 
                        data: Dict[str, Any]) -> tuple[Optional[str], str]:
        """Prepare notification title and content."""
        if template:
            # Use template content
            if channel == SchemaChannel.PUSH:
                template_title = template.get("push_title", "")
                template_content = template.get("push_body", "")
            elif channel == SchemaChannel.SMS:
                template_title = None
                template_content = template.get("sms_content", "")
            elif channel == SchemaChannel.EMAIL:
                template_title = template.get("email_subject", "")
                template_content = template.get("email_body", "")
            else:
                template_title = title
                template_content = content or ""
            
            # Substitute variables
            final_title = self._substitute_variables(template_title, data) if template_title else None
            final_content = self._substitute_variables(template_content, data)
        else:
            # Use direct content
            final_title = title
            final_content = content or ""
        
        return final_title, final_content
    
    def _substitute_variables(self, text: str, data: Dict[str, Any]) -> str:
        """Substitute template variables with actual data."""
        if not text:
            return ""
        
        result = text
        for key, value in data.items():
            placeholder = f"{{{key}}}"
            result = result.replace(placeholder, str(value))
        
        return result
    
    async def _create_notification_record(self, user_id: str, template_id: Optional[str],
                                        channel: SchemaChannel, title: Optional[str], 
                                        content: str) -> str:
        """Create notification record in database."""
        notification_id = str(uuid.uuid4())
        
        query = """
        INSERT INTO notifications (id, user_id, template_id, channel, status, title, content, created_at)
        VALUES (:id, :user_id, :template_id, :channel, :status, :title, :content, :created_at)
        """
        
        await self.database.execute(query, {
            "id": notification_id,
            "user_id": user_id,
            "template_id": template_id,
            "channel": channel.value,
            "status": NotificationStatus.PENDING.value,
            "title": title,
            "content": content,
            "created_at": datetime.utcnow()
        })
        
        return notification_id


# Global service instance
notification_service = NotificationService() 