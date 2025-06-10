# FastAPI Application with SQLite

A simple REST API built with FastAPI that provides CRUD operations for managing items. The API uses SQLite as its database and includes unit tests for all endpoints.

## Features

- FastAPI framework
- SQLite database with SQLAlchemy ORM
- CRUD operations for items
- Unit tests with pytest
- Docker support
- API documentation with Swagger UI and ReDoc

## Installation

### Using Docker

```bash
# Build the image
docker build -t fastapi-app .

# Run the container
docker run -d -p 8000:8000 --name fastapi-container fastapi-app
```

### Local Development

1. Install dependencies:
```bash
pip install -e .
```

2. Run the application:
```bash
python main.py
```

## API Documentation

Once the application is running, you can access:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing

Run the tests using pytest:
```bash
pytest
```

## Project Structure

```
.
├── main.py           # FastAPI application
├── database.py       # Database configuration
├── models.py         # SQLAlchemy models
├── schemas.py        # Pydantic schemas
├── tests/           # Test directory
│   └── test_main.py # Test cases
├── Dockerfile       # Docker configuration
└── pyproject.toml   # Project dependencies
```

## License

MIT
