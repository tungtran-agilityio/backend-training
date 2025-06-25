from databases import Database
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
from .config import settings
from .models import Base
import logging

logger = logging.getLogger(__name__)

# Database instances
database = Database(settings.database_url)
metadata = MetaData()

# SQLAlchemy engine for sync operations
engine = create_engine(settings.database_url.replace("postgresql://", "postgresql+psycopg2://"))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


async def connect_database():
    """Connect to the database."""
    try:
        await database.connect()
        logger.info("Successfully connected to database")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise


async def disconnect_database():
    """Disconnect from the database."""
    try:
        await database.disconnect()
        logger.info("Successfully disconnected from database")
    except Exception as e:
        logger.error(f"Failed to disconnect from database: {e}")


def create_tables():
    """Create all database tables."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Successfully created database tables")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        raise


def get_database():
    """Get database instance for dependency injection."""
    return database


def get_db_session():
    """Get database session for sync operations."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 