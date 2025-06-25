"""
Main WebCrawler class that orchestrates all components.

This module brings together all the components to create a complete
web crawler following distributed systems design principles.
"""

import asyncio
import time
from typing import List, Optional, Dict, Any
from urllib.parse import urlparse
import structlog

from .config import CrawlerConfig
from .models import UrlInfo, CrawlStatus
from .url_frontier import UrlFrontier
from .robots_handler import RobotsHandler
from .fetcher import Fetcher
from .parser import Parser
from .storage import Storage

logger = structlog.get_logger()


class WebCrawler:
    """
    Main web crawler orchestrating all components.
    
    Features:
    - Coordinated crawling with all components
    - Concurrent request handling
    - Graceful shutdown and cleanup
    - Comprehensive statistics and monitoring
    - Configurable crawling parameters
    """
    
    def __init__(self, config: CrawlerConfig):
        self.config = config
        
        # Initialize components
        self.url_frontier = UrlFrontier(config)
        self.robots_handler = RobotsHandler(config)
        self.fetcher = Fetcher(config)
        self.parser = Parser(config)
        self.storage = Storage(config)
        
        # Crawler state
        self.is_running = False
        self.start_time = None
        self.pages_crawled = 0
        self.pages_stored = 0
        self.crawl_semaphore = asyncio.Semaphore(config.max_concurrent_requests)
        
        # Statistics
        self.stats = {
            "start_time": None,
            "end_time": None,
            "total_runtime": 0,
            "pages_crawled": 0,
            "pages_stored": 0,
            "errors": 0,
            "robots_denied": 0,
            "filtered": 0
        }
    
    async def initialize(self):
        """Initialize all components."""
        logger.info("Initializing web crawler", config=self.config.dict())
        
        await self.url_frontier.initialize()
        await self.robots_handler.initialize()
        await self.fetcher.initialize()
        await self.storage.initialize()
        
        logger.info("Web crawler initialized successfully")
    
    async def crawl(self, seed_urls: List[str]) -> Dict[str, Any]:
        """
        Start crawling from seed URLs.
        
        Args:
            seed_urls: List of URLs to start crawling from
            
        Returns:
            Dict containing crawl statistics
        """
        if self.is_running:
            raise RuntimeError("Crawler is already running")
        
        self.is_running = True
        self.start_time = time.time()
        self.stats["start_time"] = self.start_time
        
        try:
            logger.info("Starting crawl", seed_urls=seed_urls)
            
            # Add seed URLs to frontier
            for url in seed_urls:
                url_info = UrlInfo(url=url, depth=0, priority=100)
                await self.url_frontier.add_url(url_info)
            
            # Start crawler workers
            tasks = []
            for i in range(self.config.max_concurrent_requests):
                task = asyncio.create_task(self._crawler_worker(f"worker-{i}"))
                tasks.append(task)
            
            # Wait for all workers to complete or reach limits
            await asyncio.gather(*tasks, return_exceptions=True)
            
            # Final statistics
            end_time = time.time()
            self.stats["end_time"] = end_time
            self.stats["total_runtime"] = end_time - self.start_time
            self.stats["pages_crawled"] = self.pages_crawled
            self.stats["pages_stored"] = self.pages_stored
            
            logger.info("Crawl completed", stats=self.stats)
            return self.stats
            
        except Exception as e:
            logger.error("Crawl failed", error=str(e))
            raise
        finally:
            self.is_running = False
    
    async def _crawler_worker(self, worker_id: str):
        """
        Worker coroutine that processes URLs from the frontier.
        
        Args:
            worker_id: Unique identifier for this worker
        """
        logger.debug("Crawler worker started", worker_id=worker_id)
        
        while self.is_running:
            try:
                # Check if we've reached crawling limits
                if self.pages_crawled >= self.config.max_pages:
                    logger.info("Reached maximum pages limit", 
                              pages_crawled=self.pages_crawled,
                              max_pages=self.config.max_pages)
                    break
                
                # Get next URL from frontier
                url_info = await self.url_frontier.get_next_url()
                if not url_info:
                    # No URLs available, wait a bit and try again
                    await asyncio.sleep(1)
                    
                    # Check if frontier is empty and we should stop
                    if await self.url_frontier.is_empty():
                        logger.info("URL frontier is empty, stopping worker", 
                                  worker_id=worker_id)
                        break
                    continue
                
                # Process the URL
                async with self.crawl_semaphore:
                    await self._process_url(url_info, worker_id)
                    
            except asyncio.CancelledError:
                logger.info("Worker cancelled", worker_id=worker_id)
                break
            except Exception as e:
                logger.error("Worker error", worker_id=worker_id, error=str(e))
                await asyncio.sleep(1)  # Brief pause before continuing
        
        logger.debug("Crawler worker stopped", worker_id=worker_id)
    
    async def _process_url(self, url_info: UrlInfo, worker_id: str):
        """
        Process a single URL through the crawling pipeline.
        
        Args:
            url_info: URL information to process
            worker_id: ID of the worker processing this URL
        """
        url = url_info.url
        
        try:
            logger.debug("Processing URL", url=url, worker_id=worker_id, depth=url_info.depth)
            
            # Check robots.txt
            if not await self.robots_handler.can_fetch(url):
                logger.debug("Robots.txt denies access", url=url)
                await self.url_frontier.mark_completed(url, success=False)
                self.stats["robots_denied"] += 1
                return
            
            # Fetch the page
            crawl_result = await self.fetcher.fetch(
                url, depth=url_info.depth, parent_url=url_info.parent_url
            )
            
            # Update statistics based on result
            if crawl_result.status == CrawlStatus.SUCCESS:
                self.pages_crawled += 1
                
                # Parse the page
                parsed_page = self.parser.parse(crawl_result.page)
                
                # Store the page
                if await self.storage.store_page(parsed_page):
                    self.pages_stored += 1
                
                # Add discovered links to frontier (if within depth limit)
                if url_info.depth < self.config.max_depth:
                    await self._add_discovered_links(
                        parsed_page.links, url, url_info.depth + 1
                    )
                
                await self.url_frontier.mark_completed(url, success=True)
                
                logger.debug("Successfully processed URL", 
                           url=url, 
                           links_found=len(parsed_page.links),
                           processing_time=crawl_result.processing_time)
                
            elif crawl_result.status == CrawlStatus.ROBOTS_DENIED:
                self.stats["robots_denied"] += 1
                await self.url_frontier.mark_completed(url, success=False)
                
            elif crawl_result.status == CrawlStatus.FILTERED:
                self.stats["filtered"] += 1
                await self.url_frontier.mark_completed(url, success=False)
                
            else:
                self.stats["errors"] += 1
                await self.url_frontier.mark_completed(url, success=False)
                logger.warning("Failed to process URL", 
                             url=url, 
                             status=crawl_result.status,
                             error=crawl_result.error_message)
            
        except Exception as e:
            self.stats["errors"] += 1
            await self.url_frontier.mark_completed(url, success=False)
            logger.error("Error processing URL", url=url, error=str(e))
    
    async def _add_discovered_links(self, links: List[str], parent_url: str, depth: int):
        """
        Add discovered links to the frontier.
        
        Args:
            links: List of discovered links
            parent_url: URL of the parent page
            depth: Depth of the discovered links
        """
        added_count = 0
        
        for link in links:
            try:
                # Create URL info for the discovered link
                url_info = UrlInfo(
                    url=link,
                    depth=depth,
                    parent_url=parent_url,
                    priority=max(0, 100 - depth * 10)  # Decrease priority with depth
                )
                
                # Add to frontier
                if await self.url_frontier.add_url(url_info):
                    added_count += 1
                    
            except Exception as e:
                logger.debug("Failed to add discovered link", 
                           link=link, parent_url=parent_url, error=str(e))
        
        if added_count > 0:
            logger.debug("Added discovered links to frontier", 
                       parent_url=parent_url, 
                       added_count=added_count,
                       total_links=len(links))
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive crawler statistics."""
        # Component stats
        frontier_stats = await self.url_frontier.get_stats()
        fetcher_stats = self.fetcher.get_stats()
        parser_stats = self.parser.get_stats()
        storage_stats = await self.storage.get_stats()
        
        # Calculate runtime
        runtime = 0
        if self.start_time:
            end_time = time.time() if self.is_running else self.stats.get("end_time", time.time())
            runtime = end_time - self.start_time
        
        return {
            "crawler": {
                "is_running": self.is_running,
                "runtime_seconds": runtime,
                "pages_crawled": self.pages_crawled,
                "pages_stored": self.pages_stored,
                **self.stats
            },
            "frontier": frontier_stats,
            "fetcher": fetcher_stats,
            "parser": parser_stats,
            "storage": storage_stats
        }
    
    async def stop(self):
        """Stop the crawler gracefully."""
        logger.info("Stopping crawler...")
        self.is_running = False
        
        # Allow some time for workers to finish current tasks
        await asyncio.sleep(2)
        
        logger.info("Crawler stopped")
    
    async def cleanup(self):
        """Clean up all components."""
        logger.info("Cleaning up crawler components...")
        
        await self.url_frontier.cleanup()
        await self.robots_handler.cleanup()
        await self.fetcher.cleanup()
        await self.storage.cleanup()
        
        logger.info("Crawler cleanup completed")
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.cleanup() 