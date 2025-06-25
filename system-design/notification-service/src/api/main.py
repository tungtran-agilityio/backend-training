import logging
import structlog
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List

from ..config import settings
from ..database import connect_database, disconnect_database, create_tables
from ..schemas import (
    SendNotificationRequest, 
    SendNotificationResponse,
    HealthResponse,
    NotificationChannel
)
from ..services.notification_service import notification_service

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
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info("Starting notification service API")
    try:
        create_tables()
        await connect_database()
        logger.info("Database connected successfully")
    except Exception as e:
        logger.error("Failed to initialize database", error=str(e))
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down notification service API")
    await disconnect_database()


# Create FastAPI app
app = FastAPI(
    title="Notification Service API",
    description="A scalable notification system supporting multiple channels",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow(),
        services={
            "database": "connected",
            "kafka": "connected"
        }
    )


@app.post("/api/v1/notifications", response_model=SendNotificationResponse)
async def send_notification(request: SendNotificationRequest):
    """Send notification(s) to a user."""
    logger.info("Received notification request", user_id=request.user_id, channels=request.channels)
    
    try:
        result = await notification_service.send_notification(request)
        
        if not result["success"]:
            logger.warning("Notification request failed", error=result.get("error"))
            raise HTTPException(status_code=400, detail=result["error"])
        
        logger.info("Notification request processed successfully", 
                   request_id=result["request_id"],
                   channels_queued=len(result["channels_queued"]))
        
        return SendNotificationResponse(
            request_id=result["request_id"],
            user_id=request.user_id,
            channels_queued=result["channels_queued"],
            message=result["message"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error processing notification", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/v1/users/{user_id}/notifications")
async def get_user_notifications(user_id: str, limit: int = 50, offset: int = 0):
    """Get notification history for a user."""
    # TODO: Implement this endpoint
    return {"message": "Not implemented yet"}


@app.get("/api/v1/templates")
async def get_templates():
    """Get all notification templates."""
    # TODO: Implement this endpoint
    return {"message": "Not implemented yet"}


@app.post("/api/v1/templates")
async def create_template():
    """Create a new notification template."""
    # TODO: Implement this endpoint
    return {"message": "Not implemented yet"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=settings.log_level.lower()
    ) 