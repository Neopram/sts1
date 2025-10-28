"""
Security Initialization Module
Integrates all security components in a safe, modular way
"""

import logging
from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import Settings

logger = logging.getLogger(__name__)

def initialize_security_middleware(app: FastAPI, settings: Settings) -> None:
    """
    Initialize all security-related middleware
    
    Args:
        app: FastAPI application instance
        settings: Application settings
    """
    
    # 1. CORS Configuration
    cors_origins = settings.cors_origins
    if settings.is_production():
        # Production: strict CORS
        app.add_middleware(
            CORSMiddleware,
            allow_origins=cors_origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
            allow_headers=["Authorization", "Content-Type"],
            expose_headers=[
                "X-RateLimit-Limit",
                "X-RateLimit-Remaining",
                "X-RateLimit-Reset",
                "X-Process-Time"
            ],
            max_age=3600,
        )
    else:
        # Development: permissive CORS
        app.add_middleware(
            CORSMiddleware,
            allow_origins=cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    logger.info(f"🔒 Security initialized for {settings.environment.value} environment")


def initialize_security_headers(app: FastAPI, settings: Settings) -> None:
    """
    Add security headers to all responses
    
    Args:
        app: FastAPI application instance
        settings: Application settings
    """
    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.responses import Response
    
    class SecurityHeadersMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request, call_next):
            response: Response = await call_next(request)
            
            # Security headers
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            
            if settings.environment.value == "production":
                response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
                response.headers["Content-Security-Policy"] = "default-src 'self'"
            
            return response
    
    app.add_middleware(SecurityHeadersMiddleware)
    logger.info("✅ Security headers middleware initialized")


def get_security_configuration(settings: Settings) -> dict:
    """
    Get security configuration summary
    
    Args:
        settings: Application settings
        
    Returns:
        Dictionary with security configuration
    """
    return {
        "environment": settings.environment.value,
        "debug": settings.debug,
        "rate_limiting": settings.rate_limit_enabled,
        "cors_origins": settings.cors_origins,
        "jwt_expiration_hours": settings.jwt_expiration_hours,
        "database_pool_size": settings.database_pool_size,
        "https_only": settings.is_production(),
    }