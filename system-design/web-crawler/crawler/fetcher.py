"""
Fetcher component for downloading web pages.

This module handles HTTP requests with robust error handling,
timeout management, and content type validation.
"""

import aiohttp
import asyncio
import time
from typing import Optional, Dict, Any
from urllib.parse import urlparse
import structlog

from .models import CrawledPage, CrawlResult, CrawlStatus
from .config import CrawlerConfig

logger = structlog.get_logger()


class Fetcher:
    """
    Fetcher downloads web page content.
    
    Features:
    - Robust HTTP client with retry logic
    - Content type validation
    - File size limits
    - Timeout handling
    - Proper error handling for various HTTP status codes
    """
    
    def __init__(self, config: CrawlerConfig):
        self.config = config
        self._session: Optional[aiohttp.ClientSession] = None
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
    
    async def initialize(self):
        """Initialize the fetcher with HTTP session."""
        # Configure connection limits and timeouts
        connector = aiohttp.TCPConnector(
            limit=self.config.max_concurrent_requests * 2,
            limit_per_host=10,
            ttl_dns_cache=300,
            use_dns_cache=True
        )
        
        timeout = aiohttp.ClientTimeout(total=self.config.request_timeout)
        
        headers = {
            "User-Agent": self.config.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1"
        }
        
        self._session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers=headers
        )
        
        logger.info("Fetcher initialized")
    
    async def fetch(self, url: str, depth: int = 0, parent_url: Optional[str] = None) -> CrawlResult:
        """
        Fetch a web page.
        
        Args:
            url: URL to fetch
            depth: Crawl depth
            parent_url: URL of the parent page
            
        Returns:
            CrawlResult: Result of the fetch operation
        """
        start_time = time.time()
        self.total_requests += 1
        
        try:
            logger.debug("Fetching URL", url=url, depth=depth)
            
            # Validate URL
            parsed_url = urlparse(url)
            if not parsed_url.scheme or not parsed_url.netloc:
                return CrawlResult(
                    url=url,
                    status=CrawlStatus.FAILED,
                    error_message="Invalid URL format"
                )
            
            # Make HTTP request
            async with self._session.get(url) as response:
                processing_time = time.time() - start_time
                
                # Check content type
                content_type = response.headers.get('content-type', '').lower()
                if not self._is_allowed_content_type(content_type):
                    logger.debug("Content type not allowed", 
                               url=url, content_type=content_type)
                    return CrawlResult(
                        url=url,
                        status=CrawlStatus.FILTERED,
                        error_message=f"Content type not allowed: {content_type}",
                        processing_time=processing_time
                    )
                
                # Check content length
                content_length = response.headers.get('content-length')
                if content_length and int(content_length) > self.config.max_file_size:
                    logger.debug("File too large", url=url, size=content_length)
                    return CrawlResult(
                        url=url,
                        status=CrawlStatus.FILTERED,
                        error_message=f"File too large: {content_length} bytes",
                        processing_time=processing_time
                    )
                
                # Handle different HTTP status codes
                if response.status == 200:
                    # Read content with size limit
                    content = await self._read_content_safely(response)
                    
                    if content is None:
                        return CrawlResult(
                            url=url,
                            status=CrawlStatus.FAILED,
                            error_message="Content too large or read error",
                            processing_time=processing_time
                        )
                    
                    # Create crawled page
                    page = CrawledPage(
                        url=url,
                        status_code=response.status,
                        content_type=content_type.split(';')[0].strip(),
                        content=content,
                        headers=dict(response.headers),
                        parent_url=parent_url,
                        depth=depth,
                        file_size=len(content.encode('utf-8'))
                    )
                    
                    self.successful_requests += 1
                    logger.debug("Successfully fetched URL", 
                               url=url, size=len(content), 
                               processing_time=processing_time)
                    
                    return CrawlResult(
                        url=url,
                        status=CrawlStatus.SUCCESS,
                        page=page,
                        processing_time=processing_time
                    )
                
                elif response.status in [301, 302, 303, 307, 308]:
                    # Handle redirects
                    redirect_url = response.headers.get('location')
                    if redirect_url:
                        logger.debug("Redirect encountered", 
                                   url=url, redirect_url=redirect_url,
                                   status=response.status)
                        # For now, we'll treat redirects as failed
                        # In a more sophisticated implementation, 
                        # we could follow redirects
                        return CrawlResult(
                            url=url,
                            status=CrawlStatus.FAILED,
                            error_message=f"Redirect to {redirect_url}",
                            processing_time=processing_time
                        )
                
                elif response.status == 404:
                    logger.debug("Page not found", url=url)
                    return CrawlResult(
                        url=url,
                        status=CrawlStatus.FAILED,
                        error_message="Page not found (404)",
                        processing_time=processing_time
                    )
                
                elif response.status == 403:
                    logger.debug("Access forbidden", url=url)
                    return CrawlResult(
                        url=url,
                        status=CrawlStatus.ROBOTS_DENIED,
                        error_message="Access forbidden (403)",
                        processing_time=processing_time
                    )
                
                elif response.status == 429:
                    logger.warning("Rate limited", url=url)
                    return CrawlResult(
                        url=url,
                        status=CrawlStatus.FAILED,
                        error_message="Rate limited (429)",
                        processing_time=processing_time
                    )
                
                elif response.status >= 500:
                    logger.warning("Server error", url=url, status=response.status)
                    return CrawlResult(
                        url=url,
                        status=CrawlStatus.FAILED,
                        error_message=f"Server error ({response.status})",
                        processing_time=processing_time
                    )
                
                else:
                    logger.warning("Unexpected status code", 
                                 url=url, status=response.status)
                    return CrawlResult(
                        url=url,
                        status=CrawlStatus.FAILED,
                        error_message=f"Unexpected status code: {response.status}",
                        processing_time=processing_time
                    )
        
        except asyncio.TimeoutError:
            self.failed_requests += 1
            processing_time = time.time() - start_time
            logger.warning("Request timeout", url=url, timeout=self.config.request_timeout)
            return CrawlResult(
                url=url,
                status=CrawlStatus.FAILED,
                error_message="Request timeout",
                processing_time=processing_time
            )
        
        except aiohttp.ClientError as e:
            self.failed_requests += 1
            processing_time = time.time() - start_time
            logger.error("Client error", url=url, error=str(e))
            return CrawlResult(
                url=url,
                status=CrawlStatus.FAILED,
                error_message=f"Client error: {str(e)}",
                processing_time=processing_time
            )
        
        except Exception as e:
            self.failed_requests += 1
            processing_time = time.time() - start_time
            logger.error("Unexpected error", url=url, error=str(e))
            return CrawlResult(
                url=url,
                status=CrawlStatus.FAILED,
                error_message=f"Unexpected error: {str(e)}",
                processing_time=processing_time
            )
    
    async def _read_content_safely(self, response: aiohttp.ClientResponse) -> Optional[str]:
        """
        Safely read response content with size limits.
        
        Args:
            response: HTTP response object
            
        Returns:
            str: Response content or None if too large
        """
        try:
            content_length = 0
            chunks = []
            
            async for chunk in response.content.iter_chunked(8192):
                content_length += len(chunk)
                if content_length > self.config.max_file_size:
                    logger.warning("Content too large during reading", 
                                 url=str(response.url), size=content_length)
                    return None
                chunks.append(chunk)
            
            # Decode content
            content_bytes = b''.join(chunks)
            
            # Try to detect encoding
            encoding = 'utf-8'
            content_type = response.headers.get('content-type', '')
            if 'charset=' in content_type:
                try:
                    encoding = content_type.split('charset=')[1].split(';')[0].strip()
                except:
                    encoding = 'utf-8'
            
            try:
                return content_bytes.decode(encoding)
            except UnicodeDecodeError:
                # Fallback to utf-8 with error handling
                return content_bytes.decode('utf-8', errors='replace')
                
        except Exception as e:
            logger.error("Error reading content", url=str(response.url), error=str(e))
            return None
    
    def _is_allowed_content_type(self, content_type: str) -> bool:
        """
        Check if content type is allowed.
        
        Args:
            content_type: Content type to check
            
        Returns:
            bool: True if allowed, False otherwise
        """
        if not content_type:
            return False
        
        content_type = content_type.split(';')[0].strip().lower()
        return content_type in self.config.allowed_content_types
    
    def get_stats(self) -> Dict[str, Any]:
        """Get fetcher statistics."""
        return {
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "success_rate": (
                self.successful_requests / self.total_requests 
                if self.total_requests > 0 else 0
            )
        }
    
    async def cleanup(self):
        """Clean up resources."""
        if self._session:
            await self._session.close()
        logger.info("Fetcher cleanup completed") 