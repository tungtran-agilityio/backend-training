# URL Shortener Service

A high-performance URL shortening service built with FastAPI, implementing the design patterns from Chapter 8 of system design fundamentals.

## Features

- **URL Shortening**: Convert long URLs to short, unique aliases using base-62 encoding
- **URL Redirection**: Fast redirection from short URLs to original URLs  
- **Real-time Analytics**: Built-in click tracking with persistent storage
- **Collision-Free**: Uses Snowflake-like ID generation to eliminate hash collisions
- **Duplicate Prevention**: Prevents creating multiple short URLs for the same long URL
- **DuckDB Integration**: Embedded database with ACID compliance and SQL capabilities
- **Admin Dashboard**: Endpoints for monitoring and analytics
- **RESTful API**: Clean API design with proper HTTP status codes

## Architecture Overview

### Core Components

1. **ID Generator (Snowflake-like)**
   - Generates unique 64-bit IDs
   - Structure: timestamp(41) + machine_id(10) + sequence(12) + sign(1)
   - Ensures uniqueness across distributed systems

2. **Base-62 Converter**
   - Converts large integers to short strings
   - Uses characters: `0-9`, `a-z`, `A-Z` (62 total)
   - Example: ID `1000` → `g8`, ID `9999999999` → `2qgGMB`

3. **DuckDB Database**
   - Embedded ACID-compliant database with excellent performance
   - Persistent storage with SQL capabilities
   - Built-in analytics tracking (click counts, timestamps)
   - Easily scalable to production workloads

### Design Decisions

- **302 vs 301 Redirects**: Uses 302 (temporary) redirects to enable analytics tracking
- **Base-62 Encoding**: Preferred over hash-and-resolve for collision-free operation
- **Unique ID Generation**: Snowflake algorithm ensures no collisions, eliminating database round-trips

## API Endpoints

### 1. Shorten URL
```http
POST /api/v1/data/shorten
Content-Type: application/json

{
    "url": "https://example.com/very/long/url/path"
}
```

**Response:**
```json
{
    "short_url": "g8",
    "original_url": "https://example.com/very/long/url/path"
}
```

### 2. Redirect URL
```http
GET /api/v1/{short_url}
```

**Response:** HTTP 302 redirect to original URL

### 3. URL Statistics (Demo)
```http
GET /api/v1/stats/{short_url}
```

**Response:**
```json
{
    "short_url": "g8",
    "original_url": "https://example.com/very/long/url/path",
    "created_at": "2024-01-01T00:00:00Z",
    "total_clicks": 0,
    "status": "active"
}
```

### 4. Health Check
```http
GET /
```

### 5. Admin - Recent URLs
```http
GET /api/v1/admin/recent?limit=10
```

**Response:**
```json
{
    "recent_urls": [
        {
            "short_url": "RB4I9o9eI8",
            "original_url": "https://example.com/url",
            "created_at": "2024-01-01T10:00:00Z",
            "total_clicks": 5
        }
    ],
    "total_count": 100
}
```

### 6. Admin - System Statistics
```http
GET /api/v1/admin/stats
```

**Response:**
```json
{
    "total_urls": 100,
    "database_type": "DuckDB",
    "recent_activity": [...]
}
```

## Quick Start

### 1. Install Dependencies
```bash
# Navigate to the project directory
cd system-design/short-url

# Install with uv (recommended)
uv sync

# Or install with pip
pip install -e .
```

### 2. Run the Server
```bash
# Run with uv
uv run python main.py

# Or run directly
python main.py
```

The service will start on `http://localhost:8000`

### 3. Access Documentation
- Interactive API docs: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

## Usage Examples

### Using curl

```bash
# Shorten a URL
curl -X POST "http://localhost:8000/api/v1/data/shorten" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://www.example.com/very/long/url"}'

# Response: {"short_url": "g8", "original_url": "https://www.example.com/very/long/url"}

# Access the short URL (will redirect)
curl -I "http://localhost:8000/api/v1/g8"

# Check statistics
curl "http://localhost:8000/api/v1/stats/g8"
```

### Using Python requests

```python
import requests

# Shorten URL
response = requests.post(
    "http://localhost:8000/api/v1/data/shorten",
    json={"url": "https://www.example.com/very/long/url"}
)
data = response.json()
short_code = data["short_url"]

# Access short URL
redirect_response = requests.get(
    f"http://localhost:8000/api/v1/{short_code}",
    allow_redirects=False
)
print(f"Redirect to: {redirect_response.headers['location']}")
```

## Performance Characteristics

Based on the Chapter 8 requirements:

- **Write Throughput**: Designed for 100M URLs/day (~1,160 writes/sec)
- **Read Throughput**: Optimized for 10:1 read/write ratio (~11,600 reads/sec)
- **Storage**: Supports 365B records over 10 years (~365TB)
- **Short URL Length**: 6-7 characters for most use cases

## Production Considerations

### Database Scaling
DuckDB is production-ready for many use cases, but for massive scale consider:

```python
# Option 1: DuckDB with connection pooling
import duckdb
from concurrent.futures import ThreadPoolExecutor

class ScaledURLDatabase:
    def __init__(self, db_path: str, max_workers: int = 10):
        self.db_path = db_path
        self.executor = ThreadPoolExecutor(max_workers=max_workers)

# Option 2: Migration to PostgreSQL for extreme scale
from sqlalchemy import create_engine, Column, BigInteger, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

class URLMapping(Base):
    __tablename__ = "url_mappings"
    
    id = Column(BigInteger, primary_key=True)
    short_url = Column(String(10), unique=True, index=True)
    original_url = Column(String(2048), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    click_count = Column(Integer, default=0)
```

### Caching Layer
Add Redis for high-performance lookups:

```python
import redis

redis_client = redis.Redis(host='localhost', port=6379, db=0)

# Cache short URL mappings
def get_original_url_cached(short_url: str) -> Optional[str]:
    # Check cache first
    cached = redis_client.get(f"short:{short_url}")
    if cached:
        return cached.decode('utf-8')
    
    # Fallback to database
    url = database.get_original_url(short_url)
    if url:
        redis_client.setex(f"short:{short_url}", 3600, url)  # 1 hour TTL
    return url
```

### Rate Limiting
Add rate limiting for production use:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/v1/data/shorten")
@limiter.limit("10/minute")  # 10 requests per minute per IP
async def shorten_url(request: Request, url_request: URLShortenRequest):
    # ... implementation
```

### Monitoring & Analytics
Add comprehensive logging and metrics:

```python
import logging
from prometheus_client import Counter, Histogram

# Metrics
url_shortens_total = Counter('url_shortens_total', 'Total URL shortening requests')
url_redirects_total = Counter('url_redirects_total', 'Total URL redirections')
response_time = Histogram('response_time_seconds', 'Response time')

# Usage in endpoints
@url_shortens_total.count_exceptions()
@response_time.time()
async def shorten_url(request: URLShortenRequest):
    # ... implementation
```

## Development

### Running Tests
```bash
# Install dev dependencies
uv add --dev pytest httpx

# Run tests
uv run pytest
```

