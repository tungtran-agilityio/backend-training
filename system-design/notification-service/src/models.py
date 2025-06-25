from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from datetime import datetime
from typing import Optional

Base = declarative_base()


class NotificationChannel(PyEnum):
    PUSH = "push"
    SMS = "sms" 
    EMAIL = "email"


class NotificationStatus(PyEnum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    RETRYING = "retrying"


class User(Base):
    """User model with notification preferences and contact information."""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    email = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    
    # Device tokens for push notifications
    ios_device_token = Column(String, nullable=True)
    android_device_token = Column(String, nullable=True)
    
    # Notification preferences
    push_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=True)
    
    # Do not disturb settings
    dnd_start_hour = Column(Integer, nullable=True)  # 0-23
    dnd_end_hour = Column(Integer, nullable=True)    # 0-23
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class NotificationTemplate(Base):
    """Reusable notification templates."""
    __tablename__ = "notification_templates"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    
    # Template content for different channels
    push_title = Column(String, nullable=True)
    push_body = Column(Text, nullable=True)
    sms_content = Column(Text, nullable=True)
    email_subject = Column(String, nullable=True)
    email_body = Column(Text, nullable=True)
    
    # Variables that can be substituted in templates
    variables = Column(JSON, default=list)  # List of variable names
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Notification(Base):
    """Log of all notifications sent."""
    __tablename__ = "notifications"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    template_id = Column(String, nullable=True)
    
    channel = Column(Enum(NotificationChannel), nullable=False)
    status = Column(Enum(NotificationStatus), default=NotificationStatus.PENDING)
    
    # Content
    title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    
    # Delivery details
    provider = Column(String, nullable=True)  # APNS, FCM, Twilio, SendGrid
    provider_message_id = Column(String, nullable=True)
    
    # Retry information
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    next_retry_at = Column(DateTime(timezone=True), nullable=True)
    
    # Error information
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True) 