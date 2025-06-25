from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class NotificationChannel(str, Enum):
    PUSH = "push"
    SMS = "sms"
    EMAIL = "email"


class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    RETRYING = "retrying"


# Request Schemas
class SendNotificationRequest(BaseModel):
    """Request to send notification(s) to a user."""
    user_id: str = Field(..., description="User ID to send notification to")
    template_id: Optional[str] = Field(None, description="Template ID to use")
    channels: List[NotificationChannel] = Field(..., description="Channels to send notification on")
    data: Dict[str, Any] = Field(default_factory=dict, description="Variables for template substitution")
    
    # Direct content (if not using template)
    title: Optional[str] = Field(None, description="Notification title")
    content: Optional[str] = Field(None, description="Notification content")


class UserPreferencesUpdate(BaseModel):
    """Update user notification preferences."""
    push_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None  
    email_enabled: Optional[bool] = None
    dnd_start_hour: Optional[int] = Field(None, ge=0, le=23)
    dnd_end_hour: Optional[int] = Field(None, ge=0, le=23)


class CreateTemplateRequest(BaseModel):
    """Create a new notification template."""
    id: str = Field(..., description="Template ID")
    name: str = Field(..., description="Template name")
    push_title: Optional[str] = None
    push_body: Optional[str] = None
    sms_content: Optional[str] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    variables: List[str] = Field(default_factory=list)


# Response Schemas
class NotificationResponse(BaseModel):
    """Response for notification operations."""
    id: str
    user_id: str
    channel: NotificationChannel
    status: NotificationStatus
    title: Optional[str] = None
    content: str
    created_at: datetime
    sent_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    error_message: Optional[str] = None


class UserResponse(BaseModel):
    """User information response."""
    id: str
    email: Optional[str] = None
    phone_number: Optional[str] = None
    push_enabled: bool
    sms_enabled: bool
    email_enabled: bool
    dnd_start_hour: Optional[int] = None
    dnd_end_hour: Optional[int] = None


class TemplateResponse(BaseModel):
    """Template information response."""
    id: str
    name: str
    push_title: Optional[str] = None
    push_body: Optional[str] = None
    sms_content: Optional[str] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    variables: List[str]
    created_at: datetime


class SendNotificationResponse(BaseModel):
    """Response after sending notification request."""
    request_id: str
    user_id: str
    channels_queued: List[NotificationChannel]
    message: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    timestamp: datetime
    services: Dict[str, str]


# Kafka Message Schemas
class NotificationMessage(BaseModel):
    """Message sent to Kafka topics."""
    notification_id: str
    user_id: str
    channel: NotificationChannel
    title: Optional[str] = None
    content: str
    priority: int = Field(default=0, description="Priority level (0=normal, 1=high)")
    retry_count: int = Field(default=0)
    max_retries: int = Field(default=3) 