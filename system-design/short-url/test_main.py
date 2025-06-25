import pytest
import os
import tempfile
import shutil
from fastapi.testclient import TestClient
from main import app, id_generator, base62_converter, URLDatabase

client = TestClient(app)

# Use a temporary database for testing
@pytest.fixture(scope="function")
def test_db():
    """Create a temporary database for testing"""
    # Create a temporary directory and generate a unique filename
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test_url_shortener.db")
    
    # Replace the global database with test database
    test_database = URLDatabase(db_path)
    
    # Patch the global url_database
    import main
    original_db = main.url_database
    main.url_database = test_database
    
    yield test_database
    
    # Restore original database and cleanup
    main.url_database = original_db
    # Clean up the entire temporary directory
    import shutil
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)


def test_health_check():
    """Test the health check endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "DuckDB"
    assert "total_urls" in data


def test_shorten_url(test_db):
    """Test URL shortening functionality"""
    test_url = "https://www.example.com/very/long/url/path"
    
    response = client.post(
        "/api/v1/data/shorten",
        json={"url": test_url}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "short_url" in data
    assert data["original_url"] == test_url
    assert len(data["short_url"]) > 0


def test_shorten_url_duplicate(test_db):
    """Test that duplicate URLs return the same short code"""
    test_url = "https://www.example.com/duplicate/test"
    
    # First request
    response1 = client.post(
        "/api/v1/data/shorten",
        json={"url": test_url}
    )
    
    # Second request with same URL
    response2 = client.post(
        "/api/v1/data/shorten",
        json={"url": test_url}
    )
    
    assert response1.status_code == 200
    assert response2.status_code == 200
    
    data1 = response1.json()
    data2 = response2.json()
    
    # Should return the same short URL
    assert data1["short_url"] == data2["short_url"]


def test_redirect_url(test_db):
    """Test URL redirection functionality"""
    test_url = "https://www.example.com/redirect/test"
    
    # First shorten the URL
    shorten_response = client.post(
        "/api/v1/data/shorten",
        json={"url": test_url}
    )
    
    assert shorten_response.status_code == 200
    short_code = shorten_response.json()["short_url"]
    
    # Then test the redirect
    redirect_response = client.get(
        f"/api/v1/{short_code}",
        follow_redirects=False
    )
    
    assert redirect_response.status_code == 302  # Temporary redirect
    assert redirect_response.headers["location"] == test_url


def test_redirect_not_found(test_db):
    """Test redirect with non-existent short URL"""
    response = client.get("/api/v1/nonexistent", follow_redirects=False)
    assert response.status_code == 404


def test_url_stats(test_db):
    """Test URL statistics endpoint"""
    test_url = "https://www.example.com/stats/test"
    
    # First shorten the URL
    shorten_response = client.post(
        "/api/v1/data/shorten",
        json={"url": test_url}
    )
    
    assert shorten_response.status_code == 200
    short_code = shorten_response.json()["short_url"]
    
    # Then get stats
    stats_response = client.get(f"/api/v1/stats/{short_code}")
    
    assert stats_response.status_code == 200
    stats_data = stats_response.json()
    assert stats_data["short_url"] == short_code
    assert stats_data["original_url"] == test_url
    assert "total_clicks" in stats_data
    assert "created_at" in stats_data
    assert stats_data["status"] == "active"


def test_stats_not_found(test_db):
    """Test stats endpoint with non-existent short URL"""
    response = client.get("/api/v1/stats/nonexistent")
    assert response.status_code == 404


def test_click_tracking(test_db):
    """Test that click counts are tracked properly"""
    test_url = "https://www.example.com/click/tracking/test"
    
    # Shorten URL
    shorten_response = client.post(
        "/api/v1/data/shorten",
        json={"url": test_url}
    )
    short_code = shorten_response.json()["short_url"]
    
    # Check initial click count
    stats_response = client.get(f"/api/v1/stats/{short_code}")
    initial_clicks = stats_response.json()["total_clicks"]
    
    # Make a redirect request (this should increment the click count)
    client.get(f"/api/v1/{short_code}", follow_redirects=False)
    
    # Check updated click count
    stats_response = client.get(f"/api/v1/stats/{short_code}")
    updated_clicks = stats_response.json()["total_clicks"]
    
    assert updated_clicks == initial_clicks + 1


def test_admin_recent_urls(test_db):
    """Test the admin endpoint for recent URLs"""
    # Create a few test URLs
    test_urls = [
        "https://www.example.com/url1",
        "https://www.example.com/url2", 
        "https://www.example.com/url3"
    ]
    
    for url in test_urls:
        client.post("/api/v1/data/shorten", json={"url": url})
    
    # Get recent URLs
    response = client.get("/api/v1/admin/recent?limit=5")
    assert response.status_code == 200
    
    data = response.json()
    assert "recent_urls" in data
    assert "total_count" in data
    assert len(data["recent_urls"]) >= 3
    assert data["total_count"] >= 3


def test_admin_system_stats(test_db):
    """Test the admin system statistics endpoint"""
    # Create a test URL
    client.post("/api/v1/data/shorten", json={"url": "https://www.example.com/admin/test"})
    
    response = client.get("/api/v1/admin/stats")
    assert response.status_code == 200
    
    data = response.json()
    assert "total_urls" in data
    assert "database_type" in data
    assert "recent_activity" in data
    assert data["database_type"] == "DuckDB"
    assert data["total_urls"] >= 1


def test_invalid_url(test_db):
    """Test shortening with invalid URL"""
    response = client.post(
        "/api/v1/data/shorten",
        json={"url": "not-a-valid-url"}
    )
    
    assert response.status_code == 422  # Validation error


def test_base62_converter():
    """Test the base-62 conversion utility"""
    # Test encoding
    assert base62_converter.encode(0) == "0"
    assert base62_converter.encode(61) == "Z"
    assert base62_converter.encode(62) == "10"
    assert base62_converter.encode(1000) == "g8"
    
    # Test decoding
    assert base62_converter.decode("0") == 0
    assert base62_converter.decode("Z") == 61
    assert base62_converter.decode("10") == 62
    assert base62_converter.decode("g8") == 1000
    
    # Test round-trip
    for num in [0, 1, 61, 62, 1000, 999999999]:
        encoded = base62_converter.encode(num)
        decoded = base62_converter.decode(encoded)
        assert decoded == num


def test_id_generator():
    """Test the ID generator"""
    # Generate multiple IDs and ensure they're unique
    ids = set()
    for _ in range(1000):
        new_id = id_generator.generate_id()
        assert new_id not in ids
        assert new_id > 0
        ids.add(new_id)


def test_database_persistence(test_db):
    """Test that data persists across database connections"""
    test_url = "https://www.example.com/persistence/test"
    
    # Store URL in database
    shorten_response = client.post(
        "/api/v1/data/shorten",
        json={"url": test_url}
    )
    short_code = shorten_response.json()["short_url"]
    
    # Create a new database connection with the same file
    new_db = URLDatabase(test_db.db_path)
    
    # Verify data persists
    retrieved_url = new_db.get_original_url(short_code)
    assert retrieved_url == test_url


def test_concurrent_url_creation(test_db):
    """Test creating multiple URLs concurrently"""
    import threading
    import time
    
    results = []
    errors = []
    
    def create_url(index):
        try:
            response = client.post(
                "/api/v1/data/shorten",
                json={"url": f"https://www.example.com/concurrent/test/{index}"}
            )
            if response.status_code == 200:
                results.append(response.json())
            else:
                errors.append(response.status_code)
        except Exception as e:
            errors.append(str(e))
    
    # Create 10 URLs concurrently
    threads = []
    for i in range(10):
        thread = threading.Thread(target=create_url, args=(i,))
        threads.append(thread)
        thread.start()
    
    # Wait for all threads to complete
    for thread in threads:
        thread.join()
    
    # Verify results
    assert len(errors) == 0, f"Errors occurred: {errors}"
    assert len(results) == 10
    
    # Verify all short URLs are unique
    short_urls = [result["short_url"] for result in results]
    assert len(set(short_urls)) == 10  # All should be unique


if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 