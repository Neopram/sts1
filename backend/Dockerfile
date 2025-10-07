# Multi-stage Docker build for STS Clearance Hub Backend
# Optimized for production deployment with security hardening

# ============================================================================
# BUILD STAGE
# ============================================================================
FROM python:3.11-slim as builder

# Set build arguments
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

# Add metadata labels
LABEL maintainer="STS Clearance Hub Team"
LABEL org.opencontainers.image.title="STS Clearance Hub Backend"
LABEL org.opencontainers.image.description="Maritime STS Operations Management System - Backend API"
LABEL org.opencontainers.image.version=$VERSION
LABEL org.opencontainers.image.created=$BUILD_DATE
LABEL org.opencontainers.image.revision=$VCS_REF
LABEL org.opencontainers.image.vendor="Maritime Operations Ltd"
LABEL org.opencontainers.image.licenses="MIT"

# Set environment variables for build
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    POETRY_VERSION=1.6.1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry==$POETRY_VERSION

# Set work directory
WORKDIR /app

# Copy dependency files
COPY pyproject.toml poetry.lock* ./

# Configure Poetry and install dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --only=main --no-dev --no-interaction --no-ansi

# ============================================================================
# PRODUCTION STAGE
# ============================================================================
FROM python:3.11-slim as production

# Set production environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ENVIRONMENT=production \
    PORT=8000

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set work directory
WORKDIR /app

# Copy Python packages from builder stage
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/uploads /app/logs \
    && chown -R appuser:appuser /app \
    && chmod -R 755 /app

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Expose port
EXPOSE $PORT

# Run application with Gunicorn for production
CMD ["gunicorn", "app.main:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--workers", "4", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--keep-alive", "5", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "100", \
     "--preload", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info"]

# ============================================================================
# DEVELOPMENT STAGE
# ============================================================================
FROM builder as development

# Install development dependencies
RUN poetry install --no-interaction --no-ansi

# Install additional development tools
RUN pip install debugpy pytest-xvfb

# Set development environment
ENV ENVIRONMENT=development \
    DEBUG=1

# Expose debug port
EXPOSE 5678

# Development command with hot reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ============================================================================
# TESTING STAGE
# ============================================================================
FROM development as testing

# Install testing dependencies
RUN pip install pytest pytest-asyncio pytest-cov pytest-xdist pytest-benchmark \
    coverage bandit safety

# Copy test files
COPY tests/ ./tests/

# Set testing environment
ENV ENVIRONMENT=testing

# Run tests by default
CMD ["pytest", "tests/", "-v", "--cov=app", "--cov-report=html", "--cov-report=term"]