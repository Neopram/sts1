# Multi-stage Docker build for STS Clearance Hub Frontend
# Optimized for production deployment with security hardening

# ============================================================================
# BUILD STAGE
# ============================================================================
FROM node:18-alpine as builder

# Set build arguments
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION
ARG REACT_APP_API_URL
ARG REACT_APP_WS_URL
ARG REACT_APP_VERSION

# Add metadata labels
LABEL maintainer="STS Clearance Hub Team"
LABEL org.opencontainers.image.title="STS Clearance Hub Frontend"
LABEL org.opencontainers.image.description="Maritime STS Operations Management System - Frontend Application"
LABEL org.opencontainers.image.version=$VERSION
LABEL org.opencontainers.image.created=$BUILD_DATE
LABEL org.opencontainers.image.revision=$VCS_REF
LABEL org.opencontainers.image.vendor="Maritime Operations Ltd"
LABEL org.opencontainers.image.licenses="MIT"

# Set environment variables for build
ENV NODE_ENV=production \
    REACT_APP_API_URL=$REACT_APP_API_URL \
    REACT_APP_WS_URL=$REACT_APP_WS_URL \
    REACT_APP_VERSION=$REACT_APP_VERSION \
    GENERATE_SOURCEMAP=false \
    INLINE_RUNTIME_CHUNK=false

# Install build dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++

# Set work directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --no-audit --no-fund

# Copy source code
COPY . .

# Build application
RUN npm run build

# Remove development dependencies and clean up
RUN npm prune --production && \
    rm -rf node_modules/.cache && \
    rm -rf src/ public/ && \
    rm -rf *.json *.js *.ts *.md

# ============================================================================
# PRODUCTION STAGE
# ============================================================================
FROM nginx:1.25-alpine as production

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S appuser && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G appuser -g appuser appuser

# Copy built application from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Create nginx directories and set permissions
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp && \
    chown -R appuser:appuser /var/cache/nginx && \
    chown -R appuser:appuser /usr/share/nginx/html && \
    chown -R appuser:appuser /etc/nginx/conf.d && \
    chmod -R 755 /usr/share/nginx/html

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# ============================================================================
# DEVELOPMENT STAGE
# ============================================================================
FROM node:18-alpine as development

# Install development dependencies
RUN apk add --no-cache git

# Set work directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Set development environment
ENV NODE_ENV=development \
    REACT_APP_API_URL=http://localhost:8000 \
    REACT_APP_WS_URL=ws://localhost:8000 \
    CHOKIDAR_USEPOLLING=true

# Expose development port
EXPOSE 3000

# Start development server
CMD ["npm", "start"]

# ============================================================================
# TESTING STAGE
# ============================================================================
FROM development as testing

# Install additional testing tools
RUN npm install -g @playwright/test

# Install Playwright browsers
RUN npx playwright install --with-deps

# Set testing environment
ENV NODE_ENV=test \
    CI=true

# Run tests by default
CMD ["npm", "run", "test:ci"]