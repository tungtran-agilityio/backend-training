# FastAPI Application with Docker

A simple REST API built with FastAPI and Docker. This guide focuses on how to use Docker with this project.

## Docker Setup

### Building the Image

```bash
# Build the image
docker build -t fastapi-app .
```

### Running the Container

```bash
# Run the container
docker run -d -p 8000:8000 --name fastapi-container fastapi-app
```

### Using Docker Compose

```bash
# Start the application
docker compose up -d

# Stop the application
docker compose down

# View logs
docker compose logs -f
```

### Running Tests with Docker

```bash
# Run tests
docker compose --profile test up test --build --abort-on-container-exit

```
