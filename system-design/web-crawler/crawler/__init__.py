"""
Web Crawler Package

A scalable and robust web crawler implementation following 
distributed systems design principles.
"""

from .web_crawler import WebCrawler
from .config import CrawlerConfig

__all__ = ["WebCrawler", "CrawlerConfig"] 