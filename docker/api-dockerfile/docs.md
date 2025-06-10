# API Documentation

## Overview
This is a simple REST API built with FastAPI that provides CRUD operations for managing items. The API uses SQLite as its database and includes unit tests for all endpoints.

## Base URL
```
http://localhost:8000
```

## API Endpoints

### Create Item
Creates a new item in the database.

- **URL**: `/items/`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "name": "string",
    "description": "string"  // optional
  }
  ```
- **Response**: 
  ```json
  {
    "id": "integer",
    "name": "string",
    "description": "string"
  }
  ```
- **Status Codes**:
  - `200 OK`: Item created successfully
  - `422 Unprocessable Entity`: Invalid input data

### List Items
Retrieves a list of all items.

- **URL**: `/items/`
- **Method**: `GET`
- **Query Parameters**:
  - `skip` (optional): Number of items to skip (default: 0)
  - `limit` (optional): Maximum number of items to return (default: 100)
- **Response**:
  ```json
  [
    {
      "id": "integer",
      "name": "string",
      "description": "string"
    }
  ]
  ```
- **Status Codes**:
  - `200 OK`: Success

### Get Item
Retrieves a specific item by ID.

- **URL**: `/items/{item_id}`
- **Method**: `GET`
- **URL Parameters**:
  - `item_id`: ID of the item to retrieve
- **Response**:
  ```json
  {
    "id": "integer",
    "name": "string",
    "description": "string"
  }
  ```
- **Status Codes**:
  - `200 OK`: Item found
  - `404 Not Found`: Item not found

## Data Models

### Item
```json
{
  "id": "integer",
  "name": "string",
  "description": "string"
}
```

## Error Responses

### 404 Not Found
```json
{
  "detail": "Item not found"
}
```

### 422 Unprocessable Entity
```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "error message",
      "type": "error type"
    }
  ]
}
```

## Interactive Documentation
The API provides interactive documentation through Swagger UI and ReDoc:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Example Usage

### Using curl

1. Create a new item:
```bash
curl -X POST "http://localhost:8000/items/" \
     -H "Content-Type: application/json" \
     -d '{"name": "Test Item", "description": "This is a test item"}'
```

2. List all items:
```bash
curl "http://localhost:8000/items/"
```

3. Get a specific item:
```bash
curl "http://localhost:8000/items/1"
```

### Using Python requests

```python
import requests

# Create an item
response = requests.post(
    "http://localhost:8000/items/",
    json={"name": "Test Item", "description": "This is a test item"}
)
print(response.json())

# List all items
response = requests.get("http://localhost:8000/items/")
print(response.json())

# Get a specific item
response = requests.get("http://localhost:8000/items/1")
print(response.json())
```

## Testing
The API includes unit tests that can be run using pytest:

```bash
pytest
```

The tests cover:
- Creating items
- Listing items
- Retrieving specific items
- Error handling for non-existent items 