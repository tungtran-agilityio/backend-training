# Simple FastAPI Application

This is a simple FastAPI application with SQLite integration and unit tests.

## Setup

1. Install dependencies:
```bash
pip install -e .
```

2. Run the application:
```bash
python main.py
```

The API will be available at http://localhost:8000

## API Documentation

Once the application is running, you can access:
- Swagger UI documentation: http://localhost:8000/docs
- ReDoc documentation: http://localhost:8000/redoc

## Available Endpoints

- `POST /items/` - Create a new item
- `GET /items/` - List all items
- `GET /items/{item_id}` - Get a specific item

## Running Tests

To run the tests:
```bash
pytest
```
