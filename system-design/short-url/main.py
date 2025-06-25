import time
import threading
from typing import Dict, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, HttpUrl
import uvicorn
import duckdb
from contextlib import contextmanager


# Pydantic models for request/response
class URLShortenRequest(BaseModel):
    url: HttpUrl


class URLShortenResponse(BaseModel):
    short_url: str
    original_url: str


# Snowflake-like ID Generator
class IDGenerator:
    """
    Simplified Snowflake-like ID generator for generating unique IDs
    64-bit ID structure: timestamp(41) + machine_id(10) + sequence(12) + sign(1)
    """
    
    def __init__(self, machine_id: int = 1):
        self.machine_id = machine_id & 0x3FF  # 10 bits
        self.sequence = 0
        self.last_timestamp = -1
        self.lock = threading.Lock()
        
        # Custom epoch (January 1, 2020 00:00:00 UTC)
        self.epoch = 1577836800000  # milliseconds
    
    def _current_timestamp(self) -> int:
        return int(time.time() * 1000)
    
    def generate_id(self) -> int:
        with self.lock:
            timestamp = self._current_timestamp()
            
            if timestamp < self.last_timestamp:
                raise Exception("Clock moved backwards. Refusing to generate id")
            
            if timestamp == self.last_timestamp:
                self.sequence = (self.sequence + 1) & 0xFFF  # 12 bits
                if self.sequence == 0:
                    # Sequence overflow, wait for next millisecond
                    while timestamp <= self.last_timestamp:
                        timestamp = self._current_timestamp()
            else:
                self.sequence = 0
            
            self.last_timestamp = timestamp
            
            # Construct the ID
            id_value = ((timestamp - self.epoch) << 22) | (self.machine_id << 12) | self.sequence
            return id_value


# Base-62 Converter
class Base62Converter:
    """
    Converts integers to base-62 strings and vice versa
    Uses characters: 0-9, a-z, A-Z (62 total characters)
    """
    
    BASE62_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    BASE = 62
    
    @classmethod
    def encode(cls, num: int) -> str:
        """Convert integer to base-62 string"""
        if num == 0:
            return cls.BASE62_CHARS[0]
        
        result = []
        while num > 0:
            result.append(cls.BASE62_CHARS[num % cls.BASE])
            num //= cls.BASE
        
        return ''.join(reversed(result))
    
    @classmethod
    def decode(cls, encoded: str) -> int:
        """Convert base-62 string back to integer"""
        num = 0
        for char in encoded:
            num = num * cls.BASE + cls.BASE62_CHARS.index(char)
        return num


# DuckDB-based database implementation
class URLDatabase:
    """
    DuckDB-based database for storing URL mappings
    Provides ACID compliance and persistent storage while remaining embedded
    """
    
    def __init__(self, db_path: str = "url_shortener.db"):
        self.db_path = db_path
        self.lock = threading.Lock()
        self._init_database()
    
    def _init_database(self):
        """Initialize database and create tables if they don't exist"""
        with self._get_connection() as conn:
            # Create the main URL mappings table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS url_mappings (
                    id BIGINT PRIMARY KEY,
                    short_url VARCHAR(20) UNIQUE NOT NULL,
                    original_url VARCHAR(2048) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    click_count INTEGER DEFAULT 0
                )
            """)
            
            # Create indexes for fast lookups
            conn.execute("CREATE INDEX IF NOT EXISTS idx_short_url ON url_mappings(short_url)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_original_url ON url_mappings(original_url)")
            
            # Create table for tracking analytics (for future use)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS url_clicks (
                    id INTEGER PRIMARY KEY,
                    short_url VARCHAR(20) NOT NULL,
                    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    user_agent VARCHAR(512),
                    ip_address VARCHAR(45),
                    referer VARCHAR(512)
                )
            """)
    
    @contextmanager
    def _get_connection(self):
        """Get a database connection with proper cleanup"""
        conn = duckdb.connect(self.db_path)
        try:
            yield conn
        finally:
            conn.close()
    
    def store_url(self, id_value: int, short_url: str, original_url: str) -> None:
        """Store URL mapping in the database"""
        with self.lock:
            with self._get_connection() as conn:
                try:
                    conn.execute("""
                        INSERT INTO url_mappings (id, short_url, original_url)
                        VALUES (?, ?, ?)
                    """, (id_value, short_url, original_url))
                except duckdb.IntegrityError:
                    # Handle potential race conditions or duplicate IDs
                    raise ValueError(f"URL mapping already exists for ID {id_value}")
    
    def get_original_url(self, short_url: str) -> Optional[str]:
        """Retrieve original URL by short URL"""
        with self._get_connection() as conn:
            result = conn.execute("""
                SELECT original_url FROM url_mappings 
                WHERE short_url = ?
            """, (short_url,)).fetchone()
            
            if result:
                return result[0]
            return None
    
    def get_short_url(self, original_url: str) -> Optional[str]:
        """Check if URL already has a short version"""
        with self._get_connection() as conn:
            result = conn.execute("""
                SELECT short_url FROM url_mappings 
                WHERE original_url = ?
                ORDER BY created_at DESC
                LIMIT 1
            """, (original_url,)).fetchone()
            
            if result:
                return result[0]
            return None
    
    def get_url_stats(self, short_url: str) -> Optional[dict]:
        """Get statistics for a short URL"""
        with self._get_connection() as conn:
            result = conn.execute("""
                SELECT short_url, original_url, created_at, click_count
                FROM url_mappings 
                WHERE short_url = ?
            """, (short_url,)).fetchone()
            
            if result:
                return {
                    "short_url": result[0],
                    "original_url": result[1],
                    "created_at": result[2].isoformat() if result[2] else None,
                    "total_clicks": result[3] or 0,
                    "status": "active"
                }
            return None
    
    def increment_click_count(self, short_url: str) -> None:
        """Increment click count for analytics"""
        with self.lock:
            with self._get_connection() as conn:
                conn.execute("""
                    UPDATE url_mappings 
                    SET click_count = click_count + 1 
                    WHERE short_url = ?
                """, (short_url,))
    
    def record_click(self, short_url: str, user_agent: str = None, 
                    ip_address: str = None, referer: str = None) -> None:
        """Record detailed click analytics"""
        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO url_clicks (short_url, user_agent, ip_address, referer)
                VALUES (?, ?, ?, ?)
            """, (short_url, user_agent, ip_address, referer))
    
    def get_total_urls(self) -> int:
        """Get total number of URLs in the database"""
        with self._get_connection() as conn:
            result = conn.execute("SELECT COUNT(*) FROM url_mappings").fetchone()
            return result[0] if result else 0
    
    def get_recent_urls(self, limit: int = 10) -> list:
        """Get recently created URLs"""
        with self._get_connection() as conn:
            results = conn.execute("""
                SELECT short_url, original_url, created_at, click_count
                FROM url_mappings 
                ORDER BY created_at DESC 
                LIMIT ?
            """, (limit,)).fetchall()
            
            return [{
                "short_url": row[0],
                "original_url": row[1],
                "created_at": row[2].isoformat() if row[2] else None,
                "total_clicks": row[3] or 0
            } for row in results]


# Initialize components
app = FastAPI(
    title="URL Shortener Service",
    description="A high-performance URL shortening service built with FastAPI and DuckDB",
    version="1.0.0"
)

id_generator = IDGenerator(machine_id=1)
base62_converter = Base62Converter()
url_database = URLDatabase()


@app.get("/")
async def root():
    """Health check endpoint"""
    total_urls = url_database.get_total_urls()
    return {
        "message": "URL Shortener Service is running!", 
        "status": "healthy",
        "database": "DuckDB",
        "total_urls": total_urls
    }


@app.post("/api/v1/data/shorten", response_model=URLShortenResponse)
async def shorten_url(request: URLShortenRequest):
    """
    Shorten a long URL and return the short URL
    
    This endpoint takes a long URL and returns a shortened version.
    Uses base-62 conversion of unique IDs to generate short URLs.
    """
    original_url = str(request.url)
    
    # Check if URL already exists to avoid duplicates
    existing_short = url_database.get_short_url(original_url)
    if existing_short:
        return URLShortenResponse(
            short_url=existing_short,
            original_url=original_url
        )
    
    try:
        # Generate unique ID using Snowflake-like algorithm
        unique_id = id_generator.generate_id()
        
        # Convert ID to base-62 string
        short_code = base62_converter.encode(unique_id)
        
        # Store in database
        url_database.store_url(unique_id, short_code, original_url)
        
        return URLShortenResponse(
            short_url=short_code,
            original_url=original_url
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate short URL: {str(e)}"
        )


@app.get("/api/v1/{short_url}")
async def redirect_url(short_url: str):
    """
    Redirect short URL to original URL
    
    This endpoint performs the URL redirection. It uses 302 (temporary redirect)
    to ensure that analytics can be tracked on each request.
    """
    # Look up the original URL
    original_url = url_database.get_original_url(short_url)
    
    if not original_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Short URL not found"
        )
    
    # Record analytics (increment click count)
    try:
        url_database.increment_click_count(short_url)
    except Exception:
        # Don't fail the redirect if analytics recording fails
        pass
    
    # Use 302 redirect for analytics tracking
    # Every request hits our service, allowing us to collect click analytics
    return RedirectResponse(url=original_url, status_code=302)


@app.get("/api/v1/stats/{short_url}")
async def get_url_stats(short_url: str):
    """
    Get statistics for a short URL
    Returns click counts, creation date, and other analytics data
    """
    stats = url_database.get_url_stats(short_url)
    
    if not stats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Short URL not found"
        )
    
    return stats


@app.get("/api/v1/admin/recent")
async def get_recent_urls(limit: int = 10):
    """
    Get recently created URLs (admin endpoint for monitoring)
    """
    if limit > 100:
        limit = 100  # Prevent excessive data retrieval
    
    recent_urls = url_database.get_recent_urls(limit)
    return {
        "recent_urls": recent_urls,
        "total_count": url_database.get_total_urls()
    }


@app.get("/api/v1/admin/stats")
async def get_system_stats():
    """
    Get system-wide statistics (admin endpoint)
    """
    total_urls = url_database.get_total_urls()
    recent_urls = url_database.get_recent_urls(5)
    
    return {
        "total_urls": total_urls,
        "database_type": "DuckDB",
        "recent_activity": recent_urls
    }


def main():
    """Run the FastAPI server"""
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )


if __name__ == "__main__":
    main()
