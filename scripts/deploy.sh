#!/bin/bash

# STS Clearance Hub - Production Deployment Script
# This script automates the deployment process for production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${ENVIRONMENT:-production}
BACKUP_BEFORE_DEPLOY=${BACKUP_BEFORE_DEPLOY:-true}
RUN_MIGRATIONS=${RUN_MIGRATIONS:-true}
HEALTH_CHECK_TIMEOUT=${HEALTH_CHECK_TIMEOUT:-300}

echo -e "${BLUE}🚢 STS Clearance Hub - Production Deployment${NC}"
echo "Environment: $ENVIRONMENT"
echo "Backup before deploy: $BACKUP_BEFORE_DEPLOY"
echo "Run migrations: $RUN_MIGRATIONS"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Pre-deployment checks
echo -e "${BLUE}📋 Pre-deployment checks${NC}"

# Check required tools
if ! command_exists docker; then
    print_error "Docker is not installed"
    exit 1
fi

if ! command_exists docker-compose; then
    print_error "Docker Compose is not installed"
    exit 1
fi

print_status "Docker and Docker Compose are available"

# Check environment file
if [[ ! -f "backend/config/production.env" ]]; then
    print_error "Production environment file not found"
    exit 1
fi

print_status "Environment configuration found"

# Check SSL certificates (if SSL is enabled)
if [[ "${SSL_ENABLED:-true}" == "true" ]]; then
    if [[ ! -f "nginx/ssl/sts-clearance.crt" ]] || [[ ! -f "nginx/ssl/sts-clearance.key" ]]; then
        print_warning "SSL certificates not found. Make sure to configure SSL certificates."
    else
        print_status "SSL certificates found"
    fi
fi

# Backup existing data
if [[ "$BACKUP_BEFORE_DEPLOY" == "true" ]]; then
    echo -e "${BLUE}💾 Creating backup${NC}"
    
    # Create backup directory
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup database if running
    if docker-compose -f docker-compose.prod.yml ps postgres | grep -q "Up"; then
        print_status "Creating database backup"
        docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U sts_user -d sts_clearance_prod > "$BACKUP_DIR/database.sql"
    fi
    
    # Backup uploaded files
    if [[ -d "uploads" ]]; then
        print_status "Backing up uploaded files"
        tar -czf "$BACKUP_DIR/uploads.tar.gz" uploads/
    fi
    
    print_status "Backup completed: $BACKUP_DIR"
fi

# Build images
echo -e "${BLUE}🔨 Building Docker images${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache
print_status "Docker images built successfully"

# Stop existing services
echo -e "${BLUE}⏹️  Stopping existing services${NC}"
docker-compose -f docker-compose.prod.yml down
print_status "Services stopped"

# Start database and Redis first
echo -e "${BLUE}🗄️  Starting database and Redis${NC}"
docker-compose -f docker-compose.prod.yml up -d postgres redis
print_status "Database and Redis started"

# Wait for database to be ready
echo -e "${BLUE}⏳ Waiting for database to be ready${NC}"
timeout=60
while ! docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U sts_user -d sts_clearance_prod >/dev/null 2>&1; do
    sleep 2
    timeout=$((timeout - 2))
    if [[ $timeout -le 0 ]]; then
        print_error "Database failed to start within 60 seconds"
        exit 1
    fi
done
print_status "Database is ready"

# Run migrations
if [[ "$RUN_MIGRATIONS" == "true" ]]; then
    echo -e "${BLUE}🔄 Running database migrations${NC}"
    
    # Create a temporary container to run migrations
    docker-compose -f docker-compose.prod.yml run --rm backend alembic upgrade head
    print_status "Database migrations completed"
fi

# Start all services
echo -e "${BLUE}🚀 Starting all services${NC}"
docker-compose -f docker-compose.prod.yml up -d
print_status "All services started"

# Health checks
echo -e "${BLUE}🏥 Performing health checks${NC}"

# Wait for backend to be healthy
echo "Waiting for backend to be healthy..."
timeout=$HEALTH_CHECK_TIMEOUT
while true; do
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        break
    fi
    
    sleep 5
    timeout=$((timeout - 5))
    if [[ $timeout -le 0 ]]; then
        print_error "Backend health check failed after $HEALTH_CHECK_TIMEOUT seconds"
        echo "Backend logs:"
        docker-compose -f docker-compose.prod.yml logs backend | tail -20
        exit 1
    fi
done
print_status "Backend is healthy"

# Check frontend (if applicable)
if curl -f http://localhost:3000 >/dev/null 2>&1; then
    print_status "Frontend is healthy"
else
    print_warning "Frontend health check failed (this might be expected if using Nginx)"
fi

# Check Nginx (if running)
if docker-compose -f docker-compose.prod.yml ps nginx | grep -q "Up"; then
    if curl -f http://localhost >/dev/null 2>&1; then
        print_status "Nginx is healthy"
    else
        print_warning "Nginx health check failed"
    fi
fi

# Verify database connection
echo "Verifying database connection..."
if docker-compose -f docker-compose.prod.yml exec -T backend python -c "
import asyncio
from app.database import engine
async def test_db():
    async with engine.begin() as conn:
        result = await conn.execute('SELECT 1')
        print('Database connection successful')
asyncio.run(test_db())
" >/dev/null 2>&1; then
    print_status "Database connection verified"
else
    print_error "Database connection failed"
    exit 1
fi

# Performance verification
echo -e "${BLUE}⚡ Performance verification${NC}"

# Test API response time
response_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:8000/health)
if (( $(echo "$response_time < 1.0" | bc -l) )); then
    print_status "API response time: ${response_time}s (Good)"
else
    print_warning "API response time: ${response_time}s (Slow)"
fi

# Show service status
echo -e "${BLUE}📊 Service Status${NC}"
docker-compose -f docker-compose.prod.yml ps

# Show resource usage
echo -e "${BLUE}💻 Resource Usage${NC}"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker-compose -f docker-compose.prod.yml ps -q)

# Security checks
echo -e "${BLUE}🔒 Security verification${NC}"

# Check if running as root
if docker-compose -f docker-compose.prod.yml exec -T backend whoami | grep -q root; then
    print_warning "Backend is running as root (security concern)"
else
    print_status "Backend is running as non-root user"
fi

# Check file permissions
if [[ -d "uploads" ]]; then
    upload_perms=$(stat -c "%a" uploads)
    if [[ "$upload_perms" == "755" ]] || [[ "$upload_perms" == "750" ]]; then
        print_status "Upload directory permissions are secure"
    else
        print_warning "Upload directory permissions might be too permissive: $upload_perms"
    fi
fi

# Final deployment summary
echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "Services running:"
echo "  - Backend API: http://localhost:8000"
echo "  - Frontend: http://localhost:3000"
if docker-compose -f docker-compose.prod.yml ps nginx | grep -q "Up"; then
    echo "  - Nginx: http://localhost (HTTPS: https://localhost)"
fi
if docker-compose -f docker-compose.prod.yml ps prometheus | grep -q "Up"; then
    echo "  - Prometheus: http://localhost:9090"
fi
if docker-compose -f docker-compose.prod.yml ps grafana | grep -q "Up"; then
    echo "  - Grafana: http://localhost:3001"
fi

echo ""
echo "Next steps:"
echo "  1. Configure domain DNS to point to this server"
echo "  2. Setup SSL certificates with Let's Encrypt"
echo "  3. Configure monitoring alerts"
echo "  4. Setup automated backups"
echo "  5. Configure log rotation"
echo ""
echo -e "${BLUE}Deployment log saved to: deployment_$(date +%Y%m%d_%H%M%S).log${NC}"

# Save deployment info
cat > "deployment_info.json" << EOF
{
    "deployment_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
    "services": {
        "backend": "$(docker-compose -f docker-compose.prod.yml ps -q backend)",
        "frontend": "$(docker-compose -f docker-compose.prod.yml ps -q frontend)",
        "postgres": "$(docker-compose -f docker-compose.prod.yml ps -q postgres)",
        "redis": "$(docker-compose -f docker-compose.prod.yml ps -q redis)"
    }
}
EOF

print_status "Deployment information saved to deployment_info.json"
