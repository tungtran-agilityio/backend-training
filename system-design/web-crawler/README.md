# Web Crawler

A scalable and robust web crawler implementation following distributed systems design principles from Chapter 9: Design a Web Crawler.

## Overview

This web crawler is built with a modular architecture that handles the complexities of large-scale web crawling, including:

- **Scalability**: Capable of crawling millions of pages
- **Robustness**: Handles malformed pages, network issues, and server errors
- **Politeness**: Respects robots.txt rules and implements rate limiting
- **Extensibility**: Easily configurable and extensible architecture
- **Performance**: Efficient concurrent crawling with proper resource management

## Architecture

The crawler follows a distributed systems architecture with these core components:

### 1. URL Frontier
- **Purpose**: Manages URLs to be crawled with prioritization and politeness
- **Features**:
  - Domain-based politeness (per-domain queues)
  - Priority-based URL ordering
  - Persistent storage with SQLite
  - Deduplication
  - Rate limiting per domain

### 2. Robots Handler
- **Purpose**: Respects website crawling policies
- **Features**:
  - Fetches and caches robots.txt files
  - Respects crawl delays
  - Handles malformed robots.txt gracefully
  - Automatic cache expiration

### 3. Fetcher
- **Purpose**: Downloads web page content
- **Features**:
  - Robust HTTP client with retry logic
  - Content type validation
  - File size limits
  - Timeout handling
  - Proper error handling for various HTTP status codes

### 4. Parser
- **Purpose**: Extracts links and content from HTML pages
- **Features**:
  - BeautifulSoup-based HTML parsing
  - Link extraction with URL normalization
  - Content extraction (removing boilerplate)
  - Metadata extraction (title, description, keywords)
  - Malformed HTML handling

### 5. Storage
- **Purpose**: Persists crawled data
- **Features**:
  - SQLite database for metadata and indexing
  - File system storage for raw content
  - Content deduplication
  - Query interface for crawled data

## Installation

1. **Navigate to the web crawler directory**:
   ```bash
   cd system-design/web-crawler
   ```

2. **Install dependencies using uv**:
   ```bash
   uv sync
   ```

   This will automatically create a virtual environment and install all dependencies.

3. **Activate the virtual environment** (if needed):
   ```bash
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

## Quick Start

### Basic Usage

```python
import asyncio
from crawler import WebCrawler, CrawlerConfig

async def basic_crawl():
    # Configure the crawler
    config = CrawlerConfig(
        max_depth=2,
        max_pages=100,
        max_concurrent_requests=5,
        request_delay=1.0,
        allowed_domains=["example.com"]
    )
    
    # Create and run the crawler
    async with WebCrawler(config) as crawler:
        stats = await crawler.crawl(["https://example.com"])
        print(f"Crawled {stats['pages_crawled']} pages")

# Run the crawler
asyncio.run(basic_crawl())
```

### Running the Demo

The included demo script showcases various crawler features:

```bash
uv run python main.py
```

This will run several demonstration scenarios:
- Basic web crawling
- Focused domain crawling
- Politeness features
- Storage and querying
- Error handling

## Configuration

The crawler is highly configurable through the `CrawlerConfig` class:

### Crawling Settings
- `max_depth`: Maximum crawl depth (default: 3)
- `max_pages`: Maximum pages to crawl (default: 1000)
- `max_concurrent_requests`: Number of concurrent requests (default: 10)
- `request_delay`: Delay between requests in seconds (default: 1.0)
- `request_timeout`: Request timeout in seconds (default: 30)

### URL Filtering
- `allowed_domains`: List of allowed domains (None = all domains)
- `blocked_domains`: List of blocked domains
- `max_url_length`: Maximum URL length (default: 2048)

### Storage Settings
- `storage_dir`: Directory for storing crawled data (default: "./crawl_data")
- `database_url`: Database URL (default: SQLite)

### Politeness Settings
- `respect_robots_txt`: Whether to respect robots.txt (default: True)
- `user_agent`: User agent string

### Content Filtering
- `allowed_content_types`: List of allowed content types
- `max_file_size`: Maximum file size in bytes (default: 10MB)

## Examples

### Example 1: Focused Domain Crawling

```python
config = CrawlerConfig(
    max_depth=3,
    max_pages=200,
    allowed_domains=["example.com", "subdomain.example.com"],
    respect_robots_txt=True,
    request_delay=2.0  # Be extra polite
)

async with WebCrawler(config) as crawler:
    stats = await crawler.crawl(["https://example.com"])
```

### Example 2: Fast Crawling (Use Responsibly)

```python
config = CrawlerConfig(
    max_concurrent_requests=20,
    request_delay=0.1,
    respect_robots_txt=True,
    max_pages=5000
)

async with WebCrawler(config) as crawler:
    stats = await crawler.crawl(seed_urls)
```

### Example 3: Conservative Crawling

```python
config = CrawlerConfig(
    max_concurrent_requests=2,
    request_delay=5.0,
    respect_robots_txt=True,
    user_agent="Conservative Bot/1.0 (+https://example.com/bot)"
)

async with WebCrawler(config) as crawler:
    stats = await crawler.crawl(seed_urls)
```

## Querying Stored Data

The crawler provides methods to query stored data:

```python
async with WebCrawler(config) as crawler:
    # After crawling...
    
    # Search pages by domain
    pages = await crawler.storage.search_pages(
        domain="example.com", 
        limit=10
    )
    
    # Get specific page
    page = await crawler.storage.get_page("https://example.com")
    
    # Get storage statistics
    stats = await crawler.storage.get_stats()
```

## Output Files

The crawler generates several files:

### Databases
- `crawler_frontier.db`: URL frontier with crawl queue
- `crawler_storage.db`: Metadata and links database

### Storage Directory Structure
```
crawl_data/
├── content/
│   ├── abc123.html     # Raw HTML content
│   └── def456.html
└── metadata/
    ├── abc123.json     # Page metadata
    └── def456.json
```

## Best Practices

### 1. Be Respectful
- Always respect robots.txt
- Use appropriate delays between requests
- Set a proper User-Agent string
- Don't overwhelm servers

### 2. Error Handling
- Monitor crawl statistics
- Handle network errors gracefully
- Implement retry logic for transient failures

### 3. Resource Management
- Use appropriate concurrency limits
- Monitor memory usage for large crawls
- Clean up resources properly

### 4. Monitoring
- Check crawl statistics regularly
- Monitor storage usage
- Watch for blocked domains

## Architecture Decisions

### Why SQLite?
- Simple deployment (no external database required)
- ACID compliance for reliability
- Good performance for moderate scale
- Easy to inspect and debug

### Why Async/Await?
- Efficient I/O handling for network requests
- Better resource utilization
- Natural fit for concurrent web crawling

### Why Component-Based Architecture?
- Separation of concerns
- Easy testing and maintenance
- Configurable and extensible
- Follows distributed systems principles

## Limitations and Future Improvements

### Current Limitations
- Single-machine deployment (not distributed)
- SQLite may become bottleneck at very large scale
- No JavaScript rendering (static HTML only)
- Basic content extraction

### Potential Improvements
- Distributed crawling across multiple machines
- Support for JavaScript-heavy sites (Selenium/Playwright)
- Advanced content extraction and NLP
- Integration with message queues (Redis, RabbitMQ)
- Kubernetes deployment support
- Advanced analytics and monitoring

## Testing

Run the demo to test functionality:

```bash
uv run python main.py
```

For development testing:

```bash
# Install dev dependencies
uv sync --group dev

# Run tests (if implemented)
uv run pytest
```

## Contributing

When contributing to this project:

1. Follow the existing code structure
2. Add proper error handling
3. Include logging for debugging
4. Respect the politeness features
5. Update documentation

## License

This project is for educational purposes, demonstrating web crawler design principles from distributed systems literature.

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Check robots.txt compliance
   - Verify User-Agent string
   - Reduce request rate

2. **Memory Issues**
   - Reduce `max_concurrent_requests`
   - Lower `max_pages` limit
   - Clean up old data files

3. **Network Timeouts**
   - Increase `request_timeout`
   - Check network connectivity
   - Verify target site availability

4. **Database Locked Errors**
   - Ensure proper cleanup on exit
   - Check for concurrent access
   - Restart if necessary

### Debug Mode

Enable debug logging:

```python
config = CrawlerConfig(log_level="DEBUG")
```

This provides detailed information about crawler operations.

---

For more advanced usage and customization, see the source code documentation in the `crawler/` package.
