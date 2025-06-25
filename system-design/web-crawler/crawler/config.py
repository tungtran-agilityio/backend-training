"""
Configuration module for the web crawler.
"""

from typing import List, Optional
from pydantic import BaseModel, Field
from pathlib import Path


class CrawlerConfig(BaseModel):
    """Configuration for the web crawler."""
    
    # Crawling settings
    max_depth: int = Field(default=3, ge=1, description="Maximum crawl depth")
    max_pages: int = Field(default=1000, ge=1, description="Maximum pages to crawl")
    max_concurrent_requests: int = Field(default=10, ge=1, le=100, description="Max concurrent requests")
    request_delay: float = Field(default=1.0, ge=0.1, description="Delay between requests (seconds)")
    request_timeout: int = Field(default=30, ge=1, description="Request timeout (seconds)")
    
    # URL filtering
    allowed_domains: Optional[List[str]] = Field(default=None, description="Allowed domains (None = all)")
    blocked_domains: List[str] = Field(default_factory=list, description="Blocked domains")
    max_url_length: int = Field(default=2048, ge=1, description="Maximum URL length")
    
    # Storage settings
    storage_dir: Path = Field(default=Path("./crawl_data"), description="Directory to store crawled data")
    database_url: str = Field(default="sqlite:///./crawler.db", description="Database URL")
    
    # Politeness settings
    respect_robots_txt: bool = Field(default=True, description="Respect robots.txt")
    user_agent: str = Field(
        default="WebCrawler/1.0 (+https://example.com/bot)",
        description="User agent string"
    )
    
    # Content filtering
    allowed_content_types: List[str] = Field(
        default_factory=lambda: ["text/html", "application/xhtml+xml"],
        description="Allowed content types"
    )
    max_file_size: int = Field(default=10 * 1024 * 1024, description="Maximum file size (bytes)")
    
    # Logging
    log_level: str = Field(default="INFO", description="Logging level")
    
    class Config:
        env_prefix = "CRAWLER_"
        env_file = ".env" 