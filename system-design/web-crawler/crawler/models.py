"""
Data models for the web crawler.
"""

from typing import Optional, Dict, List
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, HttpUrl
from dataclasses import dataclass


class CrawlStatus(str, Enum):
    """Status of a crawled URL."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"
    ROBOTS_DENIED = "robots_denied"
    FILTERED = "filtered"


class ContentType(str, Enum):
    """Supported content types."""
    HTML = "text/html"
    XHTML = "application/xhtml+xml"
    XML = "application/xml"
    TEXT = "text/plain"


@dataclass
class UrlInfo:
    """Information about a URL in the frontier."""
    url: str
    depth: int
    parent_url: Optional[str] = None
    priority: int = 0
    discovered_at: datetime = datetime.now()
    
    def __lt__(self, other):
        """For priority queue ordering."""
        return self.priority < other.priority


class CrawledPage(BaseModel):
    """Model for a crawled web page."""
    url: HttpUrl
    status_code: int
    content_type: str
    content: str
    title: Optional[str] = None
    links: List[str] = Field(default_factory=list)
    images: List[str] = Field(default_factory=list)
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None
    headers: Dict[str, str] = Field(default_factory=dict)
    crawled_at: datetime = Field(default_factory=datetime.now)
    parent_url: Optional[str] = None
    depth: int = 0
    file_size: int = 0
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            HttpUrl: lambda url: str(url)
        }


class CrawlResult(BaseModel):
    """Result of a crawl operation."""
    url: str
    status: CrawlStatus
    page: Optional[CrawledPage] = None
    error_message: Optional[str] = None
    processing_time: float = 0.0
    retries: int = 0
    
    class Config:
        use_enum_values = True


class RobotsTxtInfo(BaseModel):
    """Information from robots.txt file."""
    domain: str
    can_fetch: bool
    crawl_delay: Optional[float] = None
    sitemap_urls: List[str] = Field(default_factory=list)
    last_fetched: datetime = Field(default_factory=datetime.now)
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        } 