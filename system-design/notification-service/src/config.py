from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/notification_service"
    
    # Kafka
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_topics: dict = {
        "push_notifications": "notifications.push",
        "sms_notifications": "notifications.sms", 
        "email_notifications": "notifications.email"
    }
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # Rate Limiting
    rate_limit_per_minute: int = 100
    rate_limit_burst: int = 200
    
    # Retry configuration
    max_retries: int = 3
    retry_delay_seconds: int = 60
    
    # Mock services
    mock_services_enabled: bool = True
    apns_mock_url: str = "http://localhost:8001"
    fcm_mock_url: str = "http://localhost:8002"
    twilio_mock_url: str = "http://localhost:8003"
    sendgrid_mock_url: str = "http://localhost:8004"
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"


# Global settings instance
settings = Settings() 