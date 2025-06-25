"""
Web Crawler Demo

This script demonstrates how to use the web crawler with different configurations
and provides examples of crawling various types of websites.
"""

import asyncio
import json
from pathlib import Path
import structlog

from crawler import WebCrawler, CrawlerConfig


# Configure structured logging
structlog.configure(
    processors=[
        structlog.dev.ConsoleRenderer()
    ]
)

logger = structlog.get_logger()


async def demo_basic_crawl():
    """Demonstrate basic web crawling functionality."""
    print("\n" + "="*60)
    print("BASIC WEB CRAWLER DEMO")
    print("="*60)
    
    # Configure crawler for basic demo
    config = CrawlerConfig(
        max_depth=2,
        max_pages=20,
        max_concurrent_requests=3,
        request_delay=1.0,
        allowed_domains=["httpbin.org", "example.com"],
        log_level="INFO"
    )
    
    # Seed URLs for demonstration
    seed_urls = [
        "https://httpbin.org/",
        "https://example.com/"
    ]
    
    print(f"Configuration:")
    print(f"  Max Depth: {config.max_depth}")
    print(f"  Max Pages: {config.max_pages}")
    print(f"  Concurrent Requests: {config.max_concurrent_requests}")
    print(f"  Request Delay: {config.request_delay}s")
    print(f"  Allowed Domains: {config.allowed_domains}")
    print(f"  Seed URLs: {seed_urls}")
    print()
    
    async with WebCrawler(config) as crawler:
        # Start crawling
        stats = await crawler.crawl(seed_urls)
        
        # Display results
        print("\nCRAWL RESULTS:")
        print("-" * 40)
        print(f"Total Runtime: {stats['total_runtime']:.2f} seconds")
        print(f"Pages Crawled: {stats['pages_crawled']}")
        print(f"Pages Stored: {stats['pages_stored']}")
        print(f"Errors: {stats['errors']}")
        print(f"Robots Denied: {stats['robots_denied']}")
        print(f"Filtered: {stats['filtered']}")
        
        # Get detailed statistics
        detailed_stats = await crawler.get_stats()
        print(f"\nDETAILED STATISTICS:")
        print("-" * 40)
        print(json.dumps(detailed_stats, indent=2, default=str))


async def demo_focused_crawl():
    """Demonstrate focused crawling on a specific domain."""
    print("\n" + "="*60)
    print("FOCUSED DOMAIN CRAWL DEMO")
    print("="*60)
    
    # Configure for focused crawling
    config = CrawlerConfig(
        max_depth=3,
        max_pages=50,
        max_concurrent_requests=5,
        request_delay=0.5,
        allowed_domains=["httpbin.org"],  # Focus on one domain
        respect_robots_txt=True,
        log_level="INFO"
    )
    
    seed_urls = ["https://httpbin.org/"]
    
    print(f"Focused crawling on: {config.allowed_domains}")
    print(f"Starting from: {seed_urls}")
    print()
    
    async with WebCrawler(config) as crawler:
        stats = await crawler.crawl(seed_urls)
        
        print(f"\nFOCUSED CRAWL RESULTS:")
        print("-" * 40)
        print(f"Pages Crawled: {stats['pages_crawled']}")
        print(f"Storage Statistics:")
        
        storage_stats = await crawler.storage.get_stats()
        if storage_stats:
            print(f"  Total Pages in Storage: {storage_stats.get('total_pages', 0)}")
            print(f"  Storage Size: {storage_stats.get('storage_size_mb', 0)} MB")
            print(f"  Duplicate Content: {storage_stats.get('duplicate_content', 0)}")


async def demo_politeness_features():
    """Demonstrate politeness features like robots.txt respect."""
    print("\n" + "="*60)
    print("POLITENESS FEATURES DEMO")
    print("="*60)
    
    config = CrawlerConfig(
        max_depth=1,
        max_pages=10,
        max_concurrent_requests=2,
        request_delay=2.0,  # Longer delay to be polite
        respect_robots_txt=True,
        user_agent="WebCrawler Demo Bot/1.0 (+https://example.com/bot)",
        log_level="INFO"
    )
    
    # Test with sites that have robots.txt
    seed_urls = [
        "https://httpbin.org/",
        "https://example.com/"
    ]
    
    print(f"User Agent: {config.user_agent}")
    print(f"Respecting robots.txt: {config.respect_robots_txt}")
    print(f"Request Delay: {config.request_delay}s")
    print()
    
    async with WebCrawler(config) as crawler:
        # Show robots.txt handling
        for url in seed_urls:
            can_fetch = await crawler.robots_handler.can_fetch(url)
            crawl_delay = await crawler.robots_handler.get_crawl_delay(url)
            print(f"Robots.txt for {url}:")
            print(f"  Can Fetch: {can_fetch}")
            print(f"  Suggested Delay: {crawl_delay}s")
        
        print("\nStarting polite crawl...")
        stats = await crawler.crawl(seed_urls)
        
        print(f"\nPOLITENESS CRAWL RESULTS:")
        print("-" * 40)
        print(f"Pages Crawled: {stats['pages_crawled']}")
        print(f"Robots Denied: {stats['robots_denied']}")


async def demo_storage_query():
    """Demonstrate querying stored crawl data."""
    print("\n" + "="*60)
    print("STORAGE QUERY DEMO")
    print("="*60)
    
    config = CrawlerConfig(
        max_depth=2,
        max_pages=15,
        storage_dir=Path("./demo_crawl_data")
    )
    
    seed_urls = ["https://httpbin.org/"]
    
    async with WebCrawler(config) as crawler:
        print("Crawling pages for storage demo...")
        await crawler.crawl(seed_urls)
        
        # Query stored data
        print("\nQUERYING STORED DATA:")
        print("-" * 40)
        
        # Search by domain
        pages = await crawler.storage.search_pages(domain="httpbin.org", limit=5)
        print(f"Found {len(pages)} pages for httpbin.org domain:")
        
        for page in pages:
            print(f"  - {page['url']} (Title: {page.get('title', 'N/A')})")
        
        # Get specific page
        if pages:
            url = pages[0]['url']
            page_data = await crawler.storage.get_page(url)
            if page_data:
                print(f"\nDetailed data for {url}:")
                print(f"  Status Code: {page_data.status_code}")
                print(f"  Content Type: {page_data.content_type}")
                print(f"  File Size: {page_data.file_size} bytes")
                print(f"  Links Found: {len(page_data.links)}")


async def demo_error_handling():
    """Demonstrate error handling and recovery."""
    print("\n" + "="*60)
    print("ERROR HANDLING DEMO")
    print("="*60)
    
    config = CrawlerConfig(
        max_depth=1,
        max_pages=10,
        max_concurrent_requests=3,
        request_timeout=5,  # Short timeout to trigger errors
        log_level="DEBUG"
    )
    
    # Include some URLs that will cause errors
    seed_urls = [
        "https://httpbin.org/",
        "https://httpbin.org/status/404",  # Will return 404
        "https://httpbin.org/status/500",  # Will return 500 error
        "https://nonexistentdomain12345.com/",  # DNS error
        "https://httpbin.org/delay/10"  # Will timeout
    ]
    
    print("Testing error handling with problematic URLs:")
    for url in seed_urls:
        print(f"  - {url}")
    print()
    
    async with WebCrawler(config) as crawler:
        stats = await crawler.crawl(seed_urls)
        
        print(f"\nERROR HANDLING RESULTS:")
        print("-" * 40)
        print(f"Pages Crawled Successfully: {stats['pages_crawled']}")
        print(f"Errors Encountered: {stats['errors']}")
        print(f"Success Rate: {stats['pages_crawled'] / (stats['pages_crawled'] + stats['errors']) * 100:.1f}%")
        
        # Show component statistics
        detailed_stats = await crawler.get_stats()
        fetcher_stats = detailed_stats.get('fetcher', {})
        print(f"Fetcher Success Rate: {fetcher_stats.get('success_rate', 0) * 100:.1f}%")


async def main():
    """Run all demonstration scenarios."""
    print("WEB CRAWLER COMPREHENSIVE DEMO")
    print("=" * 60)
    print("This demo showcases various features of the web crawler implementation")
    print("following the design principles from Chapter 9.")
    print()
    
    try:
        # Run different demonstration scenarios
        await demo_basic_crawl()
        await demo_focused_crawl()
        await demo_politeness_features()
        await demo_storage_query()
        await demo_error_handling()
        
        print("\n" + "="*60)
        print("DEMO COMPLETED SUCCESSFULLY!")
        print("="*60)
        print("\nKey Features Demonstrated:")
        print("✓ Basic web crawling with URL frontier")
        print("✓ Focused domain crawling")
        print("✓ Politeness with robots.txt respect")
        print("✓ Persistent storage and querying")
        print("✓ Robust error handling")
        print("✓ Concurrent request processing")
        print("✓ Configurable crawling parameters")
        print("\nCheck the generated files:")
        print("- crawler_frontier.db: URL frontier database")
        print("- crawler_storage.db: Crawled data database")
        print("- ./demo_crawl_data/: Stored content and metadata")
        
    except KeyboardInterrupt:
        print("\nDemo interrupted by user.")
    except Exception as e:
        logger.error("Demo failed", error=str(e))
        raise


if __name__ == "__main__":
    asyncio.run(main())
