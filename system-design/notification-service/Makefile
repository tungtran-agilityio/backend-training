.PHONY: help build up down logs clean test init-data

# Default target
help:
	@echo "Available commands:"
	@echo "  make build     - Build Docker images"
	@echo "  make up        - Start all services"
	@echo "  make down      - Stop all services"
	@echo "  make logs      - Show logs from all services"
	@echo "  make clean     - Clean up containers and volumes"
	@echo "  make test      - Run notification tests"
	@echo "  make init-data - Initialize sample data"
	@echo "  make restart   - Restart all services"

# Build Docker images
build:
	docker-compose build --no-cache

# Start all services
up:
	docker-compose up -d
	@echo "Waiting for services to start..."
	@sleep 10
	@echo "Services should be ready!"
	@echo "API: http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"

# Stop all services
down:
	docker-compose down

# Show logs
logs:
	docker-compose logs -f

# Show logs for specific service
logs-api:
	docker-compose logs -f notification-api

logs-workers:
	docker-compose logs -f push-worker sms-worker email-worker

logs-kafka:
	docker-compose logs -f kafka zookeeper

# Clean up
clean:
	docker-compose down -v
	docker system prune -f

# Initialize sample data
init-data:
	@echo "Initializing sample data..."
	python scripts/init_data.py

# Run tests
test:
	@echo "Running notification tests..."
	python scripts/test_notifications.py

# Restart all services
restart: down up

# Development shortcuts
dev-setup: build up init-data
	@echo "Development environment is ready!"
	@echo "Try: make test"

# Check service status
status:
	docker-compose ps

# Enter API container for debugging
shell-api:
	docker-compose exec notification-api /bin/bash

# View Kafka topics
kafka-topics:
	docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list

# Create Kafka topics manually (if needed)
kafka-create-topics:
	docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic notifications.push --partitions 3 --replication-factor 1
	docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic notifications.sms --partitions 3 --replication-factor 1  
	docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic notifications.email --partitions 3 --replication-factor 1

# Monitor Kafka messages
kafka-monitor-push:
	docker-compose exec kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic notifications.push --from-beginning

kafka-monitor-sms:
	docker-compose exec kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic notifications.sms --from-beginning

kafka-monitor-email:
	docker-compose exec kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic notifications.email --from-beginning 