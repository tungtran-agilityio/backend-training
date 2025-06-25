"""
Storage component for persisting crawled data.

This module handles storing crawled pages both in a database for metadata
and in the file system for raw content.
"""

import json
import aiosqlite
import asyncio
from typing import Optional, Dict, Any, List
from pathlib import Path
from datetime import datetime
import hashlib
import structlog

from .models import CrawledPage, CrawlResult
from .config import CrawlerConfig

logger = structlog.get_logger()


class Storage:
    """
    Storage handles persistence of crawled data.
    
    Features:
    - SQLite database for metadata and indexing
    - File system storage for raw content
    - Efficient content deduplication
    - Compressed storage options
    - Query interface for crawled data
    """
    
    def __init__(self, config: CrawlerConfig):
        self.config = config
        self.db_path = "crawler_storage.db"
        self.storage_dir = Path(config.storage_dir)
        self.content_dir = self.storage_dir / "content"
        self.metadata_dir = self.storage_dir / "metadata"
        
        # Statistics
        self.total_stored = 0
        self.duplicate_content = 0
        
        # Locks for thread safety
        self.db_lock = asyncio.Lock()
    
    async def initialize(self):
        """Initialize storage directories and database."""
        # Create directories
        self.storage_dir.mkdir(exist_ok=True)
        self.content_dir.mkdir(exist_ok=True)
        self.metadata_dir.mkdir(exist_ok=True)
        
        # Initialize database
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS crawled_pages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT UNIQUE NOT NULL,
                    url_hash TEXT NOT NULL,
                    domain TEXT NOT NULL,
                    title TEXT,
                    content_type TEXT,
                    status_code INTEGER,
                    file_size INTEGER,
                    content_hash TEXT,
                    meta_description TEXT,
                    meta_keywords TEXT,
                    parent_url TEXT,
                    depth INTEGER,
                    crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    links_count INTEGER DEFAULT 0,
                    images_count INTEGER DEFAULT 0,
                    content_file_path TEXT,
                    metadata_file_path TEXT
                )
            """)
            
            await db.execute("""
                CREATE TABLE IF NOT EXISTS extracted_links (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_url TEXT NOT NULL,
                    target_url TEXT NOT NULL,
                    link_text TEXT,
                    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (source_url) REFERENCES crawled_pages (url)
                )
            """)
            
            await db.execute("""
                CREATE TABLE IF NOT EXISTS crawl_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_name TEXT NOT NULL,
                    metric_value TEXT NOT NULL,
                    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes
            await db.execute("CREATE INDEX IF NOT EXISTS idx_url_hash ON crawled_pages(url_hash)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_domain ON crawled_pages(domain)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_content_hash ON crawled_pages(content_hash)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_crawled_at ON crawled_pages(crawled_at)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_source_url ON extracted_links(source_url)")
            
            await db.commit()
        
        logger.info("Storage initialized", 
                   storage_dir=str(self.storage_dir),
                   db_path=self.db_path)
    
    async def store_page(self, page: CrawledPage) -> bool:
        """
        Store a crawled page.
        
        Args:
            page: CrawledPage to store
            
        Returns:
            bool: True if stored successfully, False otherwise
        """
        try:
            # Generate hashes
            url_hash = self._hash_url(str(page.url))
            content_hash = self._hash_content(page.content)
            
            # Check for duplicate content
            if await self._is_duplicate_content(content_hash):
                self.duplicate_content += 1
                logger.debug("Duplicate content detected", url=page.url)
                # Still store metadata but don't store content file
                return await self._store_metadata_only(page, url_hash, content_hash)
            
            # Store content file
            content_file_path = await self._store_content_file(page, url_hash)
            
            # Store metadata file
            metadata_file_path = await self._store_metadata_file(page, url_hash)
            
            # Store in database
            await self._store_in_database(
                page, url_hash, content_hash, 
                content_file_path, metadata_file_path
            )
            
            # Store extracted links
            await self._store_links(page)
            
            self.total_stored += 1
            logger.debug("Page stored successfully", 
                        url=page.url, 
                        content_size=len(page.content),
                        links_count=len(page.links))
            
            return True
            
        except Exception as e:
            logger.error("Failed to store page", url=page.url, error=str(e))
            return False
    
    async def get_page(self, url: str) -> Optional[CrawledPage]:
        """
        Retrieve a stored page by URL.
        
        Args:
            url: URL to retrieve
            
        Returns:
            CrawledPage if found, None otherwise
        """
        try:
            async with aiosqlite.connect(self.db_path) as db:
                async with db.execute("""
                    SELECT * FROM crawled_pages WHERE url = ?
                """, (url,)) as cursor:
                    row = await cursor.fetchone()
                    
                    if row:
                        return await self._row_to_crawled_page(row)
            
        except Exception as e:
            logger.error("Failed to retrieve page", url=url, error=str(e))
        
        return None
    
    async def search_pages(self, 
                          domain: Optional[str] = None,
                          limit: int = 100,
                          offset: int = 0) -> List[Dict[str, Any]]:
        """
        Search stored pages with filters.
        
        Args:
            domain: Domain to filter by
            limit: Maximum number of results
            offset: Offset for pagination
            
        Returns:
            List of page metadata
        """
        try:
            query = "SELECT * FROM crawled_pages"
            params = []
            
            if domain:
                query += " WHERE domain = ?"
                params.append(domain)
            
            query += " ORDER BY crawled_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            async with aiosqlite.connect(self.db_path) as db:
                async with db.execute(query, params) as cursor:
                    rows = await cursor.fetchall()
                    
                    columns = [desc[0] for desc in cursor.description]
                    return [dict(zip(columns, row)) for row in rows]
                    
        except Exception as e:
            logger.error("Failed to search pages", error=str(e))
            return []
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get storage statistics."""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Total pages
                async with db.execute("SELECT COUNT(*) FROM crawled_pages") as cursor:
                    total_pages = (await cursor.fetchone())[0]
                
                # Pages by domain
                async with db.execute("""
                    SELECT domain, COUNT(*) as count 
                    FROM crawled_pages 
                    GROUP BY domain 
                    ORDER BY count DESC 
                    LIMIT 10
                """) as cursor:
                    domain_stats = await cursor.fetchall()
                
                # Content types
                async with db.execute("""
                    SELECT content_type, COUNT(*) as count 
                    FROM crawled_pages 
                    GROUP BY content_type
                """) as cursor:
                    content_type_stats = await cursor.fetchall()
                
                # Total storage size
                storage_size = sum(
                    f.stat().st_size 
                    for f in self.storage_dir.rglob('*') 
                    if f.is_file()
                )
                
                return {
                    "total_pages": total_pages,
                    "total_stored": self.total_stored,
                    "duplicate_content": self.duplicate_content,
                    "storage_size_bytes": storage_size,
                    "storage_size_mb": round(storage_size / (1024 * 1024), 2),
                    "domain_stats": dict(domain_stats),
                    "content_type_stats": dict(content_type_stats)
                }
                
        except Exception as e:
            logger.error("Failed to get storage stats", error=str(e))
            return {}
    
    def _hash_url(self, url: str) -> str:
        """Generate hash for URL."""
        return hashlib.sha256(url.encode()).hexdigest()[:16]
    
    def _hash_content(self, content: str) -> str:
        """Generate hash for content."""
        return hashlib.sha256(content.encode()).hexdigest()
    
    async def _is_duplicate_content(self, content_hash: str) -> bool:
        """Check if content hash already exists."""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                async with db.execute("""
                    SELECT 1 FROM crawled_pages WHERE content_hash = ? LIMIT 1
                """, (content_hash,)) as cursor:
                    return await cursor.fetchone() is not None
                    
        except Exception:
            return False
    
    async def _store_content_file(self, page: CrawledPage, url_hash: str) -> str:
        """Store content in file system."""
        content_file = self.content_dir / f"{url_hash}.html"
        
        with open(content_file, 'w', encoding='utf-8') as f:
            f.write(page.content)
        
        return str(content_file.relative_to(self.storage_dir))
    
    async def _store_metadata_file(self, page: CrawledPage, url_hash: str) -> str:
        """Store metadata in JSON file."""
        metadata_file = self.metadata_dir / f"{url_hash}.json"
        
        metadata = {
            "url": str(page.url),
            "title": page.title,
            "meta_description": page.meta_description,
            "meta_keywords": page.meta_keywords,
            "links": page.links,
            "images": page.images,
            "headers": page.headers,
            "crawled_at": page.crawled_at.isoformat(),
            "parent_url": page.parent_url,
            "depth": page.depth,
            "status_code": page.status_code,
            "content_type": page.content_type,
            "file_size": page.file_size
        }
        
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        
        return str(metadata_file.relative_to(self.storage_dir))
    
    async def _store_in_database(self, 
                               page: CrawledPage,
                               url_hash: str,
                               content_hash: str,
                               content_file_path: str,
                               metadata_file_path: str):
        """Store page metadata in database."""
        from urllib.parse import urlparse
        
        domain = urlparse(str(page.url)).netloc.lower()
        
        async with self.db_lock:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    INSERT OR REPLACE INTO crawled_pages 
                    (url, url_hash, domain, title, content_type, status_code, 
                     file_size, content_hash, meta_description, meta_keywords,
                     parent_url, depth, crawled_at, links_count, images_count,
                     content_file_path, metadata_file_path)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    str(page.url), url_hash, domain, page.title,
                    page.content_type, page.status_code, page.file_size,
                    content_hash, page.meta_description, page.meta_keywords,
                    page.parent_url, page.depth, page.crawled_at.isoformat(),
                    len(page.links), len(page.images),
                    content_file_path, metadata_file_path
                ))
                await db.commit()
    
    async def _store_metadata_only(self, 
                                 page: CrawledPage,
                                 url_hash: str,
                                 content_hash: str) -> bool:
        """Store only metadata for duplicate content."""
        try:
            await self._store_in_database(
                page, url_hash, content_hash, "", ""
            )
            await self._store_links(page)
            return True
        except Exception as e:
            logger.error("Failed to store metadata only", error=str(e))
            return False
    
    async def _store_links(self, page: CrawledPage):
        """Store extracted links in database."""
        if not page.links:
            return
        
        async with self.db_lock:
            async with aiosqlite.connect(self.db_path) as db:
                for link in page.links:
                    await db.execute("""
                        INSERT OR IGNORE INTO extracted_links 
                        (source_url, target_url, link_text)
                        VALUES (?, ?, ?)
                    """, (str(page.url), link, ""))
                await db.commit()
    
    async def _row_to_crawled_page(self, row) -> CrawledPage:
        """Convert database row to CrawledPage object."""
        # This is a simplified version - in practice you might want to
        # load the full content from the file system
        return CrawledPage(
            url=row[1],  # url
            status_code=row[6],  # status_code
            content_type=row[5],  # content_type
            content="",  # Would load from file
            title=row[4],  # title
            meta_description=row[9],  # meta_description
            meta_keywords=row[10],  # meta_keywords
            parent_url=row[11],  # parent_url
            depth=row[12],  # depth
            file_size=row[7],  # file_size
            crawled_at=datetime.fromisoformat(row[13])  # crawled_at
        )
    
    async def cleanup(self):
        """Clean up resources."""
        logger.info("Storage cleanup completed") 