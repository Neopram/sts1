"""
Enterprise-grade Security Middleware Suite for STS Clearance Hub
Implements comprehensive security hardening as per maritime compliance requirements
"""

import hashlib
import hmac
import json
import logging
import os
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import jwt
import magic
import redis
from fastapi import HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)


class SecurityMiddleware:
    """
    Comprehensive security middleware implementing:
    - Rate limiting with granular controls
    - JWT authentication with refresh tokens
    - CORS validation for production
    - Input sanitization against XSS/SQLi
    - File upload validation
    - SQL injection protection
    - Security headers enforcement
    """

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.limiter = Limiter(
            key_func=get_remote_address,
            default_limits=["100 per minute", "1000 per hour"],
        )
        self.jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key")
        self.jwt_algorithm = "HS256"
        self.environment = os.getenv("ENVIRONMENT", "development")

        # Production CORS whitelist
        self.allowed_origins = (
            [
                "https://sts-hub.maritime.com",
                "https://app.sts-clearance.com",
                "https://maritime-ops.example.com",
            ]
            if self.environment == "production"
            else [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
            ]
        )

        # Dangerous patterns for XSS protection
        self.xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe",
            r"<object",
            r"<embed",
            r"<link",
            r"<meta",
            r"<style",
            r"vbscript:",
            r"data:text/html",
        ]

        # SQL injection patterns
        self.sql_patterns = [
            r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)",
            r"(\b(OR|AND)\s+\d+\s*=\s*\d+)",
            r"(\b(OR|AND)\s+['\"]?\w+['\"]?\s*=\s*['\"]?\w+['\"]?)",
            r"(--|#|/\*|\*/)",
            r"(\bxp_\w+)",
            r"(\bsp_\w+)",
        ]

    async def __call__(self, request: Request, call_next):
        """Main middleware entry point"""
        try:
            # Skip security checks for health endpoints
            if request.url.path in ["/health", "/", "/docs", "/redoc", "/openapi.json"]:
                return await call_next(request)

            # 1. Rate limiting check
            await self.check_rate_limit(request)

            # 2. CORS validation
            await self.validate_cors(request)

            # 3. Input sanitization
            await self.sanitize_input(request)

            # 4. JWT validation for protected routes
            if request.url.path.startswith("/api/"):
                await self.validate_jwt(request)

            # 5. SQL injection protection
            await self.check_sql_injection(request)

            # 6. File upload validation
            if "multipart/form-data" in request.headers.get("content-type", ""):
                await self.validate_file_upload(request)

            # Process request
            response = await call_next(request)

            # 7. Add security headers
            response = self.add_security_headers(response)

            return response

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Security middleware error: {e}")
            raise HTTPException(status_code=500, detail="Security validation failed")

    async def check_rate_limit(self, request: Request):
        """Granular rate limiting per endpoint"""
        client_ip = get_remote_address(request)
        path = request.url.path
        method = request.method

        # Custom rate limits per endpoint type
        limits = {
            # Authentication endpoints - strict limits
            "/api/v1/auth/login": (10, 300),  # 10 requests per 5 minutes
            "/api/v1/auth/register": (5, 3600),  # 5 requests per hour
            "/api/v1/auth/refresh": (20, 300),  # 20 requests per 5 minutes
            # File operations - moderate limits
            "/api/v1/upload": (50, 3600),  # 50 uploads per hour
            "/api/v1/files": (100, 3600),  # 100 file requests per hour
            # Export operations - strict limits
            "/api/v1/export": (5, 300),  # 5 exports per 5 minutes
            "/api/v1/snapshots": (10, 600),  # 10 snapshots per 10 minutes
            # API endpoints - standard limits
            "/api/v1/rooms": (200, 3600),  # 200 requests per hour
            "/api/v1/documents": (300, 3600),  # 300 requests per hour
            "/api/v1/activities": (500, 3600),  # 500 requests per hour
        }

        # Find matching limit
        limit, window = (100, 60)  # Default: 100 requests per minute
        for endpoint, (req_limit, time_window) in limits.items():
            if path.startswith(endpoint):
                limit, window = req_limit, time_window
                break

        # Create rate limit key
        key = f"rate_limit:{client_ip}:{path}:{method}"

        try:
            current = await self.redis.incr(key)
            if current == 1:
                await self.redis.expire(key, window)

            if current > limit:
                # Log rate limit violation
                logger.warning(
                    f"Rate limit exceeded for {client_ip} on {path}: {current}/{limit}"
                )

                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "Rate limit exceeded",
                        "limit": limit,
                        "window": window,
                        "current": current,
                        "retry_after": window,
                    },
                )
        except redis.RedisError as e:
            logger.error(f"Redis error in rate limiting: {e}")
            # Continue without rate limiting if Redis is down
            pass

    async def validate_cors(self, request: Request):
        """Validate CORS policy"""
        origin = request.headers.get("origin")

        if origin and origin not in self.allowed_origins:
            logger.warning(f"CORS violation from origin: {origin}")
            raise HTTPException(
                status_code=403, detail="CORS policy violation - origin not allowed"
            )

    async def sanitize_input(self, request: Request):
        """Sanitize input against XSS attacks"""
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                # Get request body
                body = await request.body()
                if body:
                    body_str = body.decode("utf-8")

                    # Check for XSS patterns
                    for pattern in self.xss_patterns:
                        if re.search(pattern, body_str, re.IGNORECASE):
                            logger.warning(
                                f"XSS attempt detected from {get_remote_address(request)}: {pattern}"
                            )
                            raise HTTPException(
                                status_code=400, detail="Malicious input detected"
                            )

                # Check query parameters
                for param, value in request.query_params.items():
                    for pattern in self.xss_patterns:
                        if re.search(pattern, str(value), re.IGNORECASE):
                            logger.warning(f"XSS in query param {param}: {value}")
                            raise HTTPException(
                                status_code=400,
                                detail="Malicious query parameter detected",
                            )

            except UnicodeDecodeError:
                # Binary data is OK for file uploads
                pass

    async def validate_jwt(self, request: Request):
        """Validate JWT tokens for API endpoints"""
        # Skip auth for public endpoints
        public_endpoints = [
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/health",
            "/api/v1/stats/system",
        ]

        if any(request.url.path.startswith(endpoint) for endpoint in public_endpoints):
            return

        # Get token from Authorization header
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=401, detail="Missing or invalid authorization header"
            )

        token = auth_header.split(" ")[1]

        try:
            # Decode and validate JWT
            payload = jwt.decode(
                token, self.jwt_secret, algorithms=[self.jwt_algorithm]
            )

            # Check token expiration
            exp = payload.get("exp")
            if exp and datetime.utcnow().timestamp() > exp:
                raise HTTPException(status_code=401, detail="Token has expired")

            # Check if token is blacklisted
            token_id = payload.get("jti")
            if token_id:
                blacklisted = await self.redis.get(f"blacklist:{token_id}")
                if blacklisted:
                    raise HTTPException(
                        status_code=401, detail="Token has been revoked"
                    )

            # Add user info to request state
            request.state.user = payload

        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")

    async def check_sql_injection(self, request: Request):
        """Check for SQL injection attempts"""
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.body()
                if body:
                    body_str = body.decode("utf-8")

                    # Check for SQL injection patterns
                    for pattern in self.sql_patterns:
                        if re.search(pattern, body_str, re.IGNORECASE):
                            logger.warning(
                                f"SQL injection attempt from {get_remote_address(request)}"
                            )
                            raise HTTPException(
                                status_code=400, detail="Malicious SQL detected"
                            )

            except UnicodeDecodeError:
                pass

        # Check query parameters
        for param, value in request.query_params.items():
            for pattern in self.sql_patterns:
                if re.search(pattern, str(value), re.IGNORECASE):
                    logger.warning(f"SQL injection in query param {param}")
                    raise HTTPException(
                        status_code=400, detail="Malicious query parameter detected"
                    )

    async def validate_file_upload(self, request: Request):
        """Validate file uploads for security"""
        # This is a placeholder - actual implementation would need
        # to parse multipart data and validate files
        content_length = request.headers.get("content-length")
        if content_length:
            size = int(content_length)
            max_size = 50 * 1024 * 1024  # 50MB limit

            if size > max_size:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum size: {max_size} bytes",
                )

    def add_security_headers(self, response):
        """Add comprehensive security headers"""
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # XSS protection
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # HSTS for HTTPS enforcement
        if self.environment == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # Content Security Policy
        csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' wss: https:;"
        response.headers["Content-Security-Policy"] = csp

        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions Policy
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )

        return response


class RateLimitConfig:
    """Rate limiting configuration for different endpoint types"""

    AUTHENTICATION = {
        "login": (10, 300),  # 10 attempts per 5 minutes
        "register": (5, 3600),  # 5 registrations per hour
        "refresh": (20, 300),  # 20 refreshes per 5 minutes
    }

    FILE_OPERATIONS = {
        "upload": (50, 3600),  # 50 uploads per hour
        "download": (100, 3600),  # 100 downloads per hour
        "delete": (20, 3600),  # 20 deletions per hour
    }

    API_ENDPOINTS = {
        "rooms": (200, 3600),  # 200 requests per hour
        "documents": (300, 3600),  # 300 requests per hour
        "activities": (500, 3600),  # 500 requests per hour
        "search": (100, 3600),  # 100 searches per hour
    }

    EXPORT_OPERATIONS = {
        "pdf": (5, 300),  # 5 PDF exports per 5 minutes
        "excel": (10, 600),  # 10 Excel exports per 10 minutes
        "snapshot": (3, 300),  # 3 snapshots per 5 minutes
    }


class SecurityAuditLogger:
    """Security event logging for compliance"""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    async def log_security_event(self, event_type: str, details: Dict[str, Any]):
        """Log security events for audit trail"""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "details": details,
        }

        # Store in Redis with 7-year retention (maritime compliance)
        key = f"security_audit:{datetime.utcnow().strftime('%Y-%m-%d')}:{event_type}"
        await self.redis.lpush(key, json.dumps(event))
        await self.redis.expire(key, 7 * 365 * 24 * 3600)  # 7 years

        # Also log to application logs
        logger.info(f"Security Event: {event_type} - {details}")
