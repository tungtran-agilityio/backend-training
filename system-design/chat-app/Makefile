.PHONY: help install dev start stop clean build logs test

# Default target
help:
	@echo "Available commands:"
	@echo "  install      - Install dependencies"
	@echo "  dev          - Run in development mode"
	@echo "  start        - Start all services with Docker Compose"
	@echo "  stop         - Stop all services"
	@echo "  restart      - Restart all services"
	@echo "  clean        - Clean up containers and volumes"
	@echo "  build        - Build Docker images"
	@echo "  logs         - Show logs from all services"
	@echo "  logs-app     - Show logs from chat services only"
	@echo "  test         - Run tests"
	@echo "  kafka-topics - List Kafka topics"
	@echo "  redis-cli    - Open Redis CLI"
	@echo "  mongo-cli    - Open MongoDB CLI"

# Install dependencies
install:
	npm install

# Development mode
dev:
	npm run dev

# Start all services
start:
	docker-compose up -d

# Start with logs
start-logs:
	docker-compose up

# Stop all services
stop:
	docker-compose down

# Restart services
restart: stop start

# Clean up everything
clean:
	docker-compose down -v --remove-orphans
	docker system prune -f

# Build images
build:
	docker-compose build

# Show logs
logs:
	docker-compose logs -f

# Show logs from chat services only
logs-app:
	docker-compose logs -f chat-service-1 chat-service-2

# Run tests
test:
	npm test

# Kafka management
kafka-topics:
	docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list

kafka-create-topics:
	docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic chat-messages --partitions 3 --replication-factor 1
	docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic user-presence --partitions 3 --replication-factor 1
	docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic push-notifications --partitions 3 --replication-factor 1

# Redis CLI
redis-cli:
	docker-compose exec redis redis-cli

# MongoDB CLI
mongo-cli:
	docker-compose exec mongodb mongosh --username chatuser --password chatpass --authenticationDatabase admin chatdb

# Health checks
health:
	@echo "Checking service health..."
	@curl -s http://localhost:8080/health | jq '.' || echo "Service not responding"

# Development setup
setup: clean start
	@echo "Waiting for services to start..."
	@sleep 30
	@make kafka-create-topics
	@echo "Setup complete! Visit http://localhost:8080"

# Quick demo setup for local development
demo:
	@echo "Starting demo environment..."
	@docker compose up -d zookeeper kafka redis mongodb
	@echo "Waiting for infrastructure services..."
	@sleep 20
	@npm install
	@npm run dev 