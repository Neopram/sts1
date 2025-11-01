"""
Centralized configuration management for STS Clearance Hub
Type-safe, validated settings with environment-based configuration
"""

import json
import logging
from typing import List, Optional
from enum import Enum

from pydantic import Field, field_validator, ConfigDict
from pydantic_settings import BaseSettings


logger = logging.getLogger(__name__)


class Environment(str, Enum):
    """Supported environments"""
    DEVELOPMENT = "development"
    TESTING = "testing"
    STAGING = "staging"
    PRODUCTION = "production"


class Settings(BaseSettings):
    """Application settings - loaded from environment variables"""
    
    # ============ ENVIRONMENT ============
    environment: Environment = Field(
        default=Environment.DEVELOPMENT,
        description="Application environment"
    )
    debug: bool = Field(
        default=False,
        description="Enable debug mode"
    )
    
    # ============ SERVER ============
    server_host: str = Field(
        default="0.0.0.0",
        description="Server host to bind to"
    )
    server_port: int = Field(
        default=8000,
        description="Server port",
        ge=1024, le=65535
    )
    server_reload: bool = Field(
        default=False,
        description="Enable auto-reload on code changes"
    )
    
    # ============ DATABASE ============
    database_url: str = Field(
        default="sqlite:///./sts_clearance.db",
        description="Database connection URL"
    )
    database_echo: bool = Field(
        default=False,
        description="Echo SQL queries to console"
    )
    database_pool_size: int = Field(
        default=20,
        description="Database connection pool size",
        ge=1, le=100
    )
    database_max_overflow: int = Field(
        default=10,
        description="Maximum overflow connections",
        ge=0, le=100
    )
    database_pool_recycle: int = Field(
        default=3600,
        description="Recycle connections after N seconds",
        ge=300
    )
    
    # ============ REDIS ============
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL"
    )
    redis_ttl: int = Field(
        default=3600,
        description="Default Redis key TTL in seconds",
        ge=60
    )
    
    # ============ SECURITY - JWT ============
    jwt_secret_key: str = Field(
        default="your-secret-key-change-in-production",
        description="Secret key for JWT signing - CHANGE IN PRODUCTION"
    )
    jwt_algorithm: str = Field(
        default="HS256",
        description="JWT algorithm"
    )
    jwt_expiration_hours: int = Field(
        default=24,
        description="JWT token expiration in hours",
        ge=1, le=720
    )
    jwt_refresh_expiration_hours: int = Field(
        default=168,
        description="JWT refresh token expiration in hours",
        ge=24, le=2160
    )
    
    # ============ SECURITY - CORS ============
    cors_origins: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ],
        description="Allowed CORS origins. Can be set via CORS_ORIGINS env var (comma-separated)"
    )
    
    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from environment variable or use default"""
        import os
        cors_env = os.getenv('CORS_ORIGINS')
        if cors_env:
            # Support comma-separated or JSON array format
            if cors_env.startswith('['):
                import json
                try:
                    return json.loads(cors_env)
                except json.JSONDecodeError:
                    pass
            # Comma-separated format
            return [origin.strip() for origin in cors_env.split(',') if origin.strip()]
        return v if isinstance(v, list) else []
    
    # LAN Testing Configuration
    backend_host: str = Field(
        default="localhost",
        description="Backend host for LAN testing (can be IP address)"
    )
    backend_port: int = Field(
        default=8001,
        description="Backend port for LAN testing",
        ge=1024, le=65535
    )
    
    # ============ SECURITY - RATE LIMITING ============
    rate_limit_enabled: bool = Field(
        default=True,
        description="Enable rate limiting"
    )
    rate_limit_requests_per_minute: int = Field(
        default=60,
        description="Global rate limit: requests per minute",
        ge=10, le=1000
    )
    rate_limit_requests_per_hour: int = Field(
        default=1000,
        description="Global rate limit: requests per hour",
        ge=100, le=10000
    )
    
    # ============ FILE UPLOAD ============
    max_upload_size_mb: int = Field(
        default=100,
        description="Maximum file upload size in MB",
        ge=1, le=1000
    )
    upload_directory: str = Field(
        default="./uploads",
        description="Directory for file uploads"
    )
    allowed_file_extensions: List[str] = Field(
        default=["pdf", "doc", "docx", "xlsx", "xls", "jpg", "png", "jpeg"],
        description="Allowed file extensions"
    )
    
    # ============ LOGGING ============
    log_level: str = Field(
        default="INFO",
        description="Logging level"
    )
    log_format: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        description="Logging format"
    )
    
    # ============ MONITORING ============
    monitoring_enabled: bool = Field(
        default=True,
        description="Enable performance monitoring"
    )
    metrics_port: int = Field(
        default=9090,
        description="Prometheus metrics port",
        ge=1024, le=65535
    )
    
    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="allow"  # Permitir campos extra del .env que no están definidos
    )
    
    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from JSON string or list"""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return v.split(",")
        return v
    
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.environment == Environment.PRODUCTION
    
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.environment == Environment.DEVELOPMENT
    
    def get_database_url_masked(self) -> str:
        """Get database URL with password masked for logging"""
        # Simple mask - replace password with ***
        if "@" in self.database_url:
            parts = self.database_url.split("@")
            return parts[0].rsplit(":", 1)[0] + ":***@" + parts[1]
        return self.database_url


# Load settings from environment
settings = Settings()

# Validate production settings
if settings.is_production():
    if settings.jwt_secret_key == "your-secret-key-change-in-production":
        raise ValueError(
            "❌ CRITICAL: JWT secret key not changed in production! "
            "Set JWT_SECRET_KEY environment variable."
        )
    if settings.debug:
        logger.warning("⚠️  Debug mode is enabled in production!")

logger.info(
    f"✓ Settings loaded - Environment: {settings.environment}, "
    f"Database: {settings.get_database_url_masked()}, "
    f"Debug: {settings.debug}"
)