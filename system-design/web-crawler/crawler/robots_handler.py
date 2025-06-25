"""
Robots.txt handler for web crawler politeness.

This module handles robots.txt files to ensure the crawler respects
website owners' crawling preferences.
"""

import aiohttp
import asyncio
from typing import Dict, Optional
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser
import structlog
from datetime import datetime, timedelta

from .models import RobotsTxtInfo
from .config import CrawlerConfig

logger = structlog.get_logger()


class RobotsHandler:
    """
    Handles robots.txt files for web crawler politeness.
    
    Features:
    - Caches robots.txt files per domain
    - Respects crawl delays
    - Handles malformed robots.txt files gracefully
    - Automatic cache expiration
    """
    
    def __init__(self, config: CrawlerConfig):
        self.config = config
        self.cache: Dict[str, RobotsTxtInfo] = {}
        self.cache_expiry = timedelta(hours=24)  # Cache for 24 hours
        self.user_agent = config.user_agent
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def initialize(self):
        """Initialize the robots handler."""
        connector = aiohttp.TCPConnector(limit=100)
        timeout = aiohttp.ClientTimeout(total=self.config.request_timeout)
        self._session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={"User-Agent": self.user_agent}
        )
        logger.info("Robots handler initialized")
    
    async def can_fetch(self, url: str) -> bool:
        """
        Check if the URL can be fetched according to robots.txt.
        
        Args:
            url: The URL to check
            
        Returns:
            bool: True if the URL can be fetched, False otherwise
        """
        if not self.config.respect_robots_txt:
            return True
        
        domain = self._extract_domain(url)
        if not domain:
            return False
        
        robots_info = await self._get_robots_info(domain)
        return robots_info.can_fetch if robots_info else True
    
    async def get_crawl_delay(self, url: str) -> float:
        """
        Get the crawl delay for a domain from robots.txt.
        
        Args:
            url: URL to get crawl delay for
            
        Returns:
            float: Crawl delay in seconds
        """
        if not self.config.respect_robots_txt:
            return self.config.request_delay
        
        domain = self._extract_domain(url)
        if not domain:
            return self.config.request_delay
        
        robots_info = await self._get_robots_info(domain)
        if robots_info and robots_info.crawl_delay:
            return max(robots_info.crawl_delay, self.config.request_delay)
        
        return self.config.request_delay
    
    async def get_sitemap_urls(self, domain: str) -> list[str]:
        """
        Get sitemap URLs from robots.txt.
        
        Args:
            domain: Domain to get sitemaps for
            
        Returns:
            list: List of sitemap URLs
        """
        robots_info = await self._get_robots_info(domain)
        return robots_info.sitemap_urls if robots_info else []
    
    async def _get_robots_info(self, domain: str) -> Optional[RobotsTxtInfo]:
        """
        Get robots.txt information for a domain.
        
        Args:
            domain: Domain to get robots.txt for
            
        Returns:
            RobotsTxtInfo or None if not available
        """
        # Check cache first
        if domain in self.cache:
            robots_info = self.cache[domain]
            if datetime.now() - robots_info.last_fetched < self.cache_expiry:
                return robots_info
            else:
                # Cache expired, remove from cache
                del self.cache[domain]
        
        # Fetch new robots.txt
        robots_info = await self._fetch_robots_txt(domain)
        if robots_info:
            self.cache[domain] = robots_info
        
        return robots_info
    
    async def _fetch_robots_txt(self, domain: str) -> Optional[RobotsTxtInfo]:
        """
        Fetch and parse robots.txt for a domain.
        
        Args:
            domain: Domain to fetch robots.txt for
            
        Returns:
            RobotsTxtInfo or None if fetch failed
        """
        robots_url = f"https://{domain}/robots.txt"
        
        try:
            async with self._session.get(robots_url) as response:
                if response.status == 200:
                    content = await response.text()
                    return await self._parse_robots_txt(domain, content)
                elif response.status == 404:
                    # No robots.txt means everything is allowed
                    logger.debug("No robots.txt found, allowing all", domain=domain)
                    return RobotsTxtInfo(
                        domain=domain,
                        can_fetch=True,
                        crawl_delay=None,
                        sitemap_urls=[]
                    )
                else:
                    logger.warning("Failed to fetch robots.txt", 
                                 domain=domain, status=response.status)
                    # On error, be conservative and allow crawling
                    return RobotsTxtInfo(
                        domain=domain,
                        can_fetch=True,
                        crawl_delay=None,
                        sitemap_urls=[]
                    )
        
        except asyncio.TimeoutError:
            logger.warning("Timeout fetching robots.txt", domain=domain)
        except Exception as e:
            logger.error("Error fetching robots.txt", domain=domain, error=str(e))
        
        # On any error, be conservative and allow crawling
        return RobotsTxtInfo(
            domain=domain,
            can_fetch=True,
            crawl_delay=None,
            sitemap_urls=[]
        )
    
    async def _parse_robots_txt(self, domain: str, content: str) -> RobotsTxtInfo:
        """
        Parse robots.txt content.
        
        Args:
            domain: Domain the robots.txt belongs to
            content: Raw robots.txt content
            
        Returns:
            RobotsTxtInfo: Parsed robots.txt information
        """
        try:
            # Use urllib's RobotFileParser for parsing
            rp = RobotFileParser()
            rp.set_url(f"https://{domain}/robots.txt")
            
            # Parse the content
            lines = content.split('\n')
            rp.read()  # This doesn't actually read, just initializes
            
            # Manually set the content
            rp.modified()
            for line in lines:
                rp.read_line(line)
            
            # Check if our user agent can fetch
            can_fetch = rp.can_fetch(self.user_agent, "/")
            
            # Try to get crawl delay
            crawl_delay = None
            try:
                crawl_delay = rp.crawl_delay(self.user_agent)
            except AttributeError:
                # crawl_delay method might not exist in older Python versions
                pass
            
            # Extract sitemap URLs
            sitemap_urls = []
            for line in lines:
                line = line.strip()
                if line.lower().startswith('sitemap:'):
                    sitemap_url = line[8:].strip()
                    if sitemap_url:
                        sitemap_urls.append(sitemap_url)
            
            logger.debug("Parsed robots.txt", 
                        domain=domain, 
                        can_fetch=can_fetch,
                        crawl_delay=crawl_delay,
                        sitemaps=len(sitemap_urls))
            
            return RobotsTxtInfo(
                domain=domain,
                can_fetch=can_fetch,
                crawl_delay=crawl_delay,
                sitemap_urls=sitemap_urls
            )
        
        except Exception as e:
            logger.error("Error parsing robots.txt", domain=domain, error=str(e))
            # On parse error, be conservative and allow crawling
            return RobotsTxtInfo(
                domain=domain,
                can_fetch=True,
                crawl_delay=None,
                sitemap_urls=[]
            )
    
    def _extract_domain(self, url: str) -> Optional[str]:
        """Extract domain from URL."""
        try:
            parsed = urlparse(url)
            return parsed.netloc.lower()
        except Exception:
            return None
    
    async def cleanup(self):
        """Clean up resources."""
        if self._session:
            await self._session.close()
        logger.info("Robots handler cleanup completed") 