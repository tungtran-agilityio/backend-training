"""
Parser component for extracting links and content from HTML pages.

This module handles HTML parsing, link extraction, and content processing
with robust error handling for malformed HTML.
"""

import re
from typing import List, Optional, Set
from urllib.parse import urljoin, urlparse, urlunparse
from bs4 import BeautifulSoup, Comment
import structlog

from .models import CrawledPage
from .config import CrawlerConfig

logger = structlog.get_logger()


class Parser:
    """
    Parser extracts information from HTML documents.
    
    Features:
    - Robust HTML parsing with BeautifulSoup
    - Link extraction with URL normalization
    - Content extraction (removing boilerplate)
    - Metadata extraction (title, description, keywords)
    - Malformed HTML handling
    """
    
    def __init__(self, config: CrawlerConfig):
        self.config = config
        self.total_parsed = 0
        self.successful_parses = 0
        self.failed_parses = 0
        
        # URL patterns to filter out
        self.excluded_extensions = {
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.zip', '.rar', '.tar', '.gz', '.7z',
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
            '.mp3', '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv',
            '.css', '.js', '.ico', '.xml', '.json'
        }
        
        # Common boilerplate selectors to remove
        self.boilerplate_selectors = [
            'script', 'style', 'nav', 'footer', 'header',
            '.advertisement', '.ads', '.sidebar', '.menu',
            '.navigation', '.breadcrumb', '.social-media'
        ]
    
    def parse(self, page: CrawledPage) -> CrawledPage:
        """
        Parse an HTML page to extract links and content.
        
        Args:
            page: CrawledPage object to parse
            
        Returns:
            CrawledPage: Updated page with extracted information
        """
        self.total_parsed += 1
        
        try:
            logger.debug("Parsing page", url=page.url)
            
            # Parse HTML with BeautifulSoup
            soup = BeautifulSoup(page.content, 'lxml')
            
            # Extract title
            page.title = self._extract_title(soup)
            
            # Extract meta information
            page.meta_description = self._extract_meta_description(soup)
            page.meta_keywords = self._extract_meta_keywords(soup)
            
            # Extract links
            page.links = self._extract_links(soup, str(page.url))
            
            # Extract images
            page.images = self._extract_images(soup, str(page.url))
            
            # Extract main content (optional, can be resource intensive)
            # page.content = self._extract_main_content(soup)
            
            self.successful_parses += 1
            logger.debug("Successfully parsed page", 
                        url=page.url, 
                        links_found=len(page.links),
                        images_found=len(page.images))
            
        except Exception as e:
            self.failed_parses += 1
            logger.error("Failed to parse page", url=page.url, error=str(e))
            # Keep the original content if parsing fails
        
        return page
    
    def _extract_title(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract page title."""
        try:
            title_tag = soup.find('title')
            if title_tag and title_tag.string:
                return title_tag.string.strip()
            
            # Fallback to h1 tag
            h1_tag = soup.find('h1')
            if h1_tag:
                return h1_tag.get_text().strip()
            
        except Exception as e:
            logger.debug("Error extracting title", error=str(e))
        
        return None
    
    def _extract_meta_description(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract meta description."""
        try:
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc and meta_desc.get('content'):
                return meta_desc['content'].strip()
            
            # Fallback to og:description
            og_desc = soup.find('meta', attrs={'property': 'og:description'})
            if og_desc and og_desc.get('content'):
                return og_desc['content'].strip()
            
        except Exception as e:
            logger.debug("Error extracting meta description", error=str(e))
        
        return None
    
    def _extract_meta_keywords(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract meta keywords."""
        try:
            meta_keywords = soup.find('meta', attrs={'name': 'keywords'})
            if meta_keywords and meta_keywords.get('content'):
                return meta_keywords['content'].strip()
            
        except Exception as e:
            logger.debug("Error extracting meta keywords", error=str(e))
        
        return None
    
    def _extract_links(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        """
        Extract and normalize links from the page.
        
        Args:
            soup: BeautifulSoup object
            base_url: Base URL for resolving relative links
            
        Returns:
            List of normalized URLs
        """
        links = []
        seen_urls = set()
        
        try:
            # Find all anchor tags with href attributes
            for link in soup.find_all('a', href=True):
                href = link['href'].strip()
                
                if not href or href.startswith('#'):
                    continue
                
                # Resolve relative URLs
                absolute_url = urljoin(base_url, href)
                
                # Normalize URL
                normalized_url = self._normalize_url(absolute_url)
                
                if normalized_url and self._is_valid_url(normalized_url):
                    if normalized_url not in seen_urls:
                        links.append(normalized_url)
                        seen_urls.add(normalized_url)
            
            logger.debug("Extracted links", count=len(links), base_url=base_url)
            
        except Exception as e:
            logger.error("Error extracting links", base_url=base_url, error=str(e))
        
        return links
    
    def _extract_images(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        """
        Extract image URLs from the page.
        
        Args:
            soup: BeautifulSoup object
            base_url: Base URL for resolving relative links
            
        Returns:
            List of image URLs
        """
        images = []
        seen_urls = set()
        
        try:
            # Find all img tags with src attributes
            for img in soup.find_all('img', src=True):
                src = img['src'].strip()
                
                if not src:
                    continue
                
                # Resolve relative URLs
                absolute_url = urljoin(base_url, src)
                
                # Normalize URL
                normalized_url = self._normalize_url(absolute_url)
                
                if normalized_url and normalized_url not in seen_urls:
                    images.append(normalized_url)
                    seen_urls.add(normalized_url)
            
            logger.debug("Extracted images", count=len(images), base_url=base_url)
            
        except Exception as e:
            logger.error("Error extracting images", base_url=base_url, error=str(e))
        
        return images
    
    def _extract_main_content(self, soup: BeautifulSoup) -> str:
        """
        Extract main content from the page, removing boilerplate.
        
        Args:
            soup: BeautifulSoup object
            
        Returns:
            Cleaned main content
        """
        try:
            # Remove unwanted elements
            for selector in self.boilerplate_selectors:
                for element in soup.select(selector):
                    element.decompose()
            
            # Remove comments
            for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
                comment.extract()
            
            # Try to find main content area
            main_selectors = [
                'main', 'article', '[role="main"]',
                '.content', '.main-content', '.post-content',
                '#content', '#main-content', '#post-content'
            ]
            
            for selector in main_selectors:
                main_element = soup.select_one(selector)
                if main_element:
                    return main_element.get_text(separator=' ', strip=True)
            
            # Fallback to body content
            body = soup.find('body')
            if body:
                return body.get_text(separator=' ', strip=True)
            
            # Final fallback to all text
            return soup.get_text(separator=' ', strip=True)
            
        except Exception as e:
            logger.error("Error extracting main content", error=str(e))
            return soup.get_text(separator=' ', strip=True) if soup else ""
    
    def _normalize_url(self, url: str) -> Optional[str]:
        """
        Normalize URL by removing fragments, sorting query parameters, etc.
        
        Args:
            url: URL to normalize
            
        Returns:
            Normalized URL or None if invalid
        """
        try:
            parsed = urlparse(url)
            
            # Remove fragment
            normalized = urlunparse((
                parsed.scheme,
                parsed.netloc.lower(),
                parsed.path,
                parsed.params,
                parsed.query,
                None  # Remove fragment
            ))
            
            # Remove trailing slash for non-root paths
            if normalized.endswith('/') and normalized.count('/') > 3:
                normalized = normalized[:-1]
            
            return normalized
            
        except Exception:
            return None
    
    def _is_valid_url(self, url: str) -> bool:
        """
        Check if URL is valid for crawling.
        
        Args:
            url: URL to validate
            
        Returns:
            bool: True if valid, False otherwise
        """
        try:
            parsed = urlparse(url)
            
            # Must have scheme and netloc
            if not parsed.scheme or not parsed.netloc:
                return False
            
            # Only HTTP/HTTPS
            if parsed.scheme not in ['http', 'https']:
                return False
            
            # Check URL length
            if len(url) > self.config.max_url_length:
                return False
            
            # Check file extension
            path_lower = parsed.path.lower()
            for ext in self.excluded_extensions:
                if path_lower.endswith(ext):
                    return False
            
            # Check domain filtering
            domain = parsed.netloc.lower()
            
            # Check blocked domains
            if domain in self.config.blocked_domains:
                return False
            
            # Check allowed domains (if specified)
            if self.config.allowed_domains:
                if domain not in self.config.allowed_domains:
                    return False
            
            return True
            
        except Exception:
            return False
    
    def get_stats(self) -> dict:
        """Get parser statistics."""
        return {
            "total_parsed": self.total_parsed,
            "successful_parses": self.successful_parses,
            "failed_parses": self.failed_parses,
            "success_rate": (
                self.successful_parses / self.total_parsed 
                if self.total_parsed > 0 else 0
            )
        } 