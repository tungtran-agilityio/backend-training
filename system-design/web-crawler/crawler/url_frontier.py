"""
URL Frontier - manages the queue of URLs to be crawled.

This component implements politeness by ensuring proper delays between
requests to the same domain and manages URL prioritization.
"""

import asyncio
import aiosqlite
from typing import Optional, Set, Dict
from collections import defaultdict, deque
from urllib.parse import urlparse
from datetime import datetime, timedelta
import structlog

from .models import UrlInfo
from .config import CrawlerConfig

logger = structlog.get_logger()


class UrlFrontier:
    """
    URL Frontier manages URLs to be crawled.
    
    Features:
    - Domain-based politeness (per-domain queues)
    - Priority-based URL ordering
    - Persistent storage with SQLite
    - Deduplication
    - Rate limiting per domain
    """
    
    def __init__(self, config: CrawlerConfig):
        self.config = config
        self.db_path = "crawler_frontier.db"
        
        # In-memory structures for active crawling
        self.domain_queues: Dict[str, deque] = defaultdict(deque)
        self.last_access_time: Dict[str, datetime] = {}
        self.seen_urls: Set[str] = set()
        self.total_urls = 0
        
        # Locks for thread safety
        self.domain_locks: Dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)
        self.global_lock = asyncio.Lock()
    
    async def initialize(self):
        """Initialize the frontier database."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS url_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT UNIQUE NOT NULL,
                    domain TEXT NOT NULL,
                    depth INTEGER NOT NULL,
                    priority INTEGER DEFAULT 0,
                    parent_url TEXT,
                    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'pending'
                )
            """)
            
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_domain_priority 
                ON url_queue(domain, priority DESC, discovered_at)
            """)
            
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_status 
                ON url_queue(status)
            """)
            
            await db.commit()
        
        # Load pending URLs into memory
        await self._load_pending_urls()
        logger.info("URL Frontier initialized", total_urls=self.total_urls)
    
    async def add_url(self, url_info: UrlInfo) -> bool:
        """
        Add a URL to the frontier.
        
        Args:
            url_info: URL information to add
            
        Returns:
            bool: True if URL was added, False if already seen
        """
        url = url_info.url
        
        # Check if already seen
        if url in self.seen_urls:
            return False
        
        # Extract domain
        domain = self._extract_domain(url)
        if not domain:
            logger.warning("Invalid URL, skipping", url=url)
            return False
        
        async with self.global_lock:
            # Add to seen set
            self.seen_urls.add(url)
            
            # Add to domain queue
            self.domain_queues[domain].append(url_info)
            self.total_urls += 1
        
        # Persist to database
        await self._persist_url(url_info, domain)
        
        logger.debug("URL added to frontier", url=url, domain=domain, depth=url_info.depth)
        return True
    
    async def get_next_url(self) -> Optional[UrlInfo]:
        """
        Get the next URL to crawl, respecting politeness constraints.
        
        Returns:
            UrlInfo: Next URL to crawl, or None if none available
        """
        now = datetime.now()
        
        # Find a domain that can be crawled (respecting delays)
        for domain, queue in self.domain_queues.items():
            if not queue:
                continue
            
            # Check if enough time has passed since last access
            last_access = self.last_access_time.get(domain)
            if last_access:
                time_since_last = (now - last_access).total_seconds()
                if time_since_last < self.config.request_delay:
                    continue
            
            async with self.domain_locks[domain]:
                if queue:
                    url_info = queue.popleft()
                    self.last_access_time[domain] = now
                    self.total_urls -= 1
                    
                    # Mark as in progress in database
                    await self._update_url_status(url_info.url, 'in_progress')
                    
                    logger.debug("URL retrieved from frontier", 
                               url=url_info.url, domain=domain)
                    return url_info
        
        return None
    
    async def mark_completed(self, url: str, success: bool = True):
        """
        Mark a URL as completed.
        
        Args:
            url: The URL that was processed
            success: Whether the crawl was successful
        """
        status = 'success' if success else 'failed'
        await self._update_url_status(url, status)
        logger.debug("URL marked as completed", url=url, success=success)
    
    async def get_stats(self) -> Dict[str, int]:
        """Get frontier statistics."""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT status, COUNT(*) as count 
                FROM url_queue 
                GROUP BY status
            """) as cursor:
                stats = {}
                async for row in cursor:
                    stats[row[0]] = row[1]
        
        stats['in_memory'] = self.total_urls
        stats['domains'] = len(self.domain_queues)
        return stats
    
    def _extract_domain(self, url: str) -> Optional[str]:
        """Extract domain from URL."""
        try:
            parsed = urlparse(url)
            return parsed.netloc.lower()
        except Exception:
            return None
    
    async def _load_pending_urls(self):
        """Load pending URLs from database into memory."""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT url, depth, priority, parent_url, discovered_at
                FROM url_queue 
                WHERE status = 'pending'
                ORDER BY priority DESC, discovered_at
            """) as cursor:
                async for row in cursor:
                    url, depth, priority, parent_url, discovered_at = row
                    domain = self._extract_domain(url)
                    
                    if domain:
                        url_info = UrlInfo(
                            url=url,
                            depth=depth,
                            parent_url=parent_url,
                            priority=priority,
                            discovered_at=datetime.fromisoformat(discovered_at)
                        )
                        
                        self.domain_queues[domain].append(url_info)
                        self.seen_urls.add(url)
                        self.total_urls += 1
    
    async def _persist_url(self, url_info: UrlInfo, domain: str):
        """Persist URL to database."""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    INSERT OR IGNORE INTO url_queue 
                    (url, domain, depth, priority, parent_url, discovered_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    url_info.url,
                    domain,
                    url_info.depth,
                    url_info.priority,
                    url_info.parent_url,
                    url_info.discovered_at.isoformat()
                ))
                await db.commit()
        except Exception as e:
            logger.error("Failed to persist URL", url=url_info.url, error=str(e))
    
    async def _update_url_status(self, url: str, status: str):
        """Update URL status in database."""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    UPDATE url_queue SET status = ? WHERE url = ?
                """, (status, url))
                await db.commit()
        except Exception as e:
            logger.error("Failed to update URL status", 
                        url=url, status=status, error=str(e))
    
    async def is_empty(self) -> bool:
        """Check if frontier is empty."""
        return self.total_urls == 0
    
    async def cleanup(self):
        """Clean up resources."""
        logger.info("URL Frontier cleanup completed") 