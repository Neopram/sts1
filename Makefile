# STS Clearance Hub - Development Makefile
# Provides convenient commands for development, testing, and deployment

.PHONY: help up down restart status logs clean build test seed migrate reset-db health shell backend-shell frontend-shell

# Default target
help:
	@echo "STS Clearance Hub - Development Commands"
	@echo "========================================"
	@echo ""
	@echo "Service Management:"
	@echo "  up          - Start all services (backend, frontend, database)"
	@echo "  down        - Stop all services"
	@echo "  restart     - Restart all services"
	@echo "  status      - Check service status"
	@echo "  logs        - View all service logs"
	@echo "  logs-backend- View backend logs only"
	@echo "  logs-frontend- View frontend logs only"
	@echo "  logs-db     - View database logs only"
	@echo ""
	@echo "Development:"
	@echo "  build       - Build all Docker images"
	@echo "  test        - Run backend tests"
	@echo "  test-watch  - Run tests in watch mode"
	@echo "  lint        - Run code linting"
	@echo "  format      - Format code with black/isort"
	@echo ""
	@echo "Database:"
	@echo "  seed        - Seed database with sample data"
	@echo "  migrate     - Run database migrations"
	@echo "  reset-db    - Reset database (drop and recreate)"
	@echo "  db-shell    - Open database shell"
	@echo ""
	@echo "Shell Access:"
	@echo "  shell       - Open backend shell"
	@echo "  backend-shell - Open backend shell (alias)"
	@echo "  frontend-shell - Open frontend shell"
	@echo ""
	@echo "Utilities:"
	@echo "  health      - Health check all services"
	@echo "  clean       - Clean up everything (containers, volumes, images)"
	@echo "  snapshot    - Generate PDF snapshot"
	@echo "  backup      - Backup database"
	@echo "  restore     - Restore database from backup"

# Service Management
up:
	@echo "Starting STS Clearance Hub services..."
	docker-compose up -d
	@echo "Services started. Waiting for database to be ready..."
	@sleep 10
	@echo "Running database migrations..."
	@make migrate
	@echo "✓ All services are up and running!"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:8000"
	@echo "  API Docs: http://localhost:8000/docs"

down:
	@echo "Stopping STS Clearance Hub services..."
	docker-compose down
	@echo "✓ Services stopped"

restart:
	@echo "Restarting STS Clearance Hub services..."
	docker-compose restart
	@echo "✓ Services restarted"

status:
	@echo "Service Status:"
	@docker-compose ps

logs:
	@echo "Viewing all service logs..."
	docker-compose logs -f

logs-backend:
	@echo "Viewing backend logs..."
	docker-compose logs -f backend

logs-frontend:
	@echo "Viewing frontend logs..."
	docker-compose logs -f frontend

logs-db:
	@echo "Viewing database logs..."
	docker-compose logs -f postgres

# Development Commands
build:
	@echo "Building Docker images..."
	docker-compose build --no-cache
	@echo "✓ Images built successfully"

test:
	@echo "Running backend tests..."
	docker-compose exec backend pytest tests/ -v --tb=short

test-watch:
	@echo "Running tests in watch mode..."
	docker-compose exec backend pytest tests/ -v --tb=short -f

lint:
	@echo "Running code linting..."
	docker-compose exec backend black --check app/ tests/
	docker-compose exec backend isort --check-only app/ tests/
	docker-compose exec backend flake8 app/ tests/

format:
	@echo "Formatting code..."
	docker-compose exec backend black app/ tests/
	docker-compose exec backend isort app/ tests/

# Database Commands
seed:
	@echo "Seeding database with sample data..."
	docker-compose exec backend python seed_data.py
	@echo "✓ Database seeded successfully"

migrate:
	@echo "Running database migrations..."
	docker-compose exec backend alembic upgrade head
	@echo "✓ Migrations completed"

reset-db:
	@echo "⚠️  WARNING: This will delete all data!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "Resetting database..."
	docker-compose down -v
	docker-compose up -d postgres
	@sleep 10
	@make migrate
	@make seed
	@echo "✓ Database reset and reseeded"

db-shell:
	@echo "Opening database shell..."
	docker-compose exec postgres psql -U postgres -d sts_clearance

# Shell Access
shell:
	@echo "Opening backend shell..."
	docker-compose exec backend /bin/bash

backend-shell: shell

frontend-shell:
	@echo "Opening frontend shell..."
	docker-compose exec frontend /bin/bash

# Utility Commands
health:
	@echo "Health Check:"
	@echo "Backend API:"
	@curl -s http://localhost:8000/health || echo "❌ Backend not responding"
	@echo ""
	@echo "Frontend:"
	@curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend responding" || echo "❌ Frontend not responding"
	@echo ""
	@echo "Database:"
	@docker-compose exec postgres pg_isready -U postgres && echo "✅ Database ready" || echo "❌ Database not ready"

clean:
	@echo "⚠️  WARNING: This will remove all containers, volumes, and images!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "Cleaning up everything..."
	docker-compose down -v --rmi all
	docker system prune -f
	@echo "✓ Cleanup completed"

snapshot:
	@echo "Generating PDF snapshot..."
	@read -p "Enter room ID: " room_id; \
	docker-compose exec backend curl -s "http://localhost:8000/api/v1/rooms/$$room_id/snapshot.pdf" \
		-o "/tmp/sts-snapshot-$$room_id.pdf"
	@echo "✓ Snapshot generated: /tmp/sts-snapshot-{room_id}.pdf"

backup:
	@echo "Creating database backup..."
	@timestamp=$$(date +%Y%m%d_%H%M%S); \
	docker-compose exec postgres pg_dump -U postgres sts_clearance > "backup_$$timestamp.sql"
	@echo "✓ Backup created: backup_$$timestamp.sql"

restore:
	@echo "Restoring database from backup..."
	@read -p "Enter backup filename: " backup_file; \
	docker-compose exec -T postgres psql -U postgres -d sts_clearance < "$$backup_file"
	@echo "✓ Database restored from $$backup_file"

# Development Setup
setup: build up seed
	@echo "✓ STS Clearance Hub setup completed!"
	@echo "  Access the application at: http://localhost:3000"

# Production Commands
prod-build:
	@echo "Building production images..."
	docker-compose -f docker-compose.prod.yml build --no-cache

prod-deploy:
	@echo "Deploying to production..."
	docker-compose -f docker-compose.prod.yml up -d

prod-logs:
	@echo "Viewing production logs..."
	docker-compose -f docker-compose.prod.yml logs -f

# Monitoring and Debugging
monitor:
	@echo "System monitoring..."
	@echo "CPU Usage:"
	@docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
	@echo ""
	@echo "Disk Usage:"
	@docker system df

debug:
	@echo "Debug information:"
	@echo "Docker version:"
	@docker --version
	@echo ""
	@echo "Docker Compose version:"
	@docker-compose --version
	@echo ""
	@echo "Environment:"
	@env | grep -E "(DATABASE_URL|API_|NEXT_PUBLIC_)" || echo "No relevant environment variables found"

# Quick Development Commands
dev: up
	@echo "Development environment ready!"

dev-reset: down clean up seed
	@echo "Development environment reset and ready!"

# Helpers
check-deps:
	@echo "Checking dependencies..."
	@command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
	@command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed."; exit 1; }
	@echo "✅ Dependencies check passed"

# Auto-completion for common commands
complete:
	@echo "Add this to your ~/.bashrc or ~/.zshrc:"
	@echo "complete -W 'up down restart status logs build test seed migrate reset-db health shell clean snapshot backup restore setup dev dev-reset' make"

# Default target
.DEFAULT_GOAL := help
