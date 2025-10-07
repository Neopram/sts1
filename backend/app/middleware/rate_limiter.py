"""
Rate limiting middleware for production security
"""

import hashlib
import logging
import os
import time
from typing import Dict, Optional

import redis
from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RateLimiter:
    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize rate limiter with Redis backend

        Args:
            redis_url: Redis connection URL
        """
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis_client = None
        self.fallback_storage: Dict[str, Dict] = {}  # Fallback for development

        try:
            self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
            # Note: ping() will be tested in the async context
            logger.info("Redis client initialized for rate limiting")
        except Exception as e:
            logger.warning(
                f"Could not initialize Redis: {e}. Using in-memory fallback."
            )

    def _get_client_id(self, request: Request) -> str:
        """
        Generate unique client identifier

        Args:
            request: FastAPI request object

        Returns:
            Unique client identifier
        """
        # Use X-Forwarded-For if behind proxy, otherwise remote IP
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.client.host

        # Include user agent for additional uniqueness
        user_agent = request.headers.get("User-Agent", "")
        client_data = f"{client_ip}:{user_agent}"

        # Hash for privacy and consistent length
        return hashlib.sha256(client_data.encode()).hexdigest()[:16]

    def _get_rate_limit_key(self, client_id: str, endpoint: str) -> str:
        """
        Generate rate limit key for Redis

        Args:
            client_id: Client identifier
            endpoint: API endpoint

        Returns:
            Redis key for rate limiting
        """
        return f"rate_limit:{client_id}:{endpoint}"

    async def _check_rate_limit_redis(
        self, key: str, limit: int, window: int
    ) -> tuple[bool, int]:
        """
        Check rate limit using Redis

        Args:
            key: Rate limit key
            limit: Maximum requests allowed
            window: Time window in seconds

        Returns:
            Tuple of (allowed, remaining_requests)
        """
        try:
            current_time = int(time.time())
            window_start = current_time - window

            # Use Redis pipeline for atomic operations
            pipe = self.redis_client.pipeline()

            # Remove expired entries
            await pipe.zremrangebyscore(key, 0, window_start)

            # Count current requests in window
            await pipe.zcard(key)

            # Add current request
            await pipe.zadd(key, {str(current_time): current_time})

            # Set expiration
            await pipe.expire(key, window)

            results = await pipe.execute()
            current_requests = results[1]

            allowed = current_requests < limit
            remaining = max(0, limit - current_requests - 1)

            return allowed, remaining

        except Exception as e:
            logger.error(f"Redis rate limit error: {e}")
            return True, limit  # Allow request if Redis fails

    def _check_rate_limit_memory(
        self, key: str, limit: int, window: int
    ) -> tuple[bool, int]:
        """
        Check rate limit using in-memory storage (fallback)

        Args:
            key: Rate limit key
            limit: Maximum requests allowed
            window: Time window in seconds

        Returns:
            Tuple of (allowed, remaining_requests)
        """
        current_time = time.time()

        if key not in self.fallback_storage:
            self.fallback_storage[key] = {
                "requests": [],
                "expires": current_time + window,
            }

        # Clean expired entries
        storage = self.fallback_storage[key]
        storage["requests"] = [
            req_time
            for req_time in storage["requests"]
            if current_time - req_time < window
        ]

        # Check limit
        current_requests = len(storage["requests"])
        allowed = current_requests < limit

        if allowed:
            storage["requests"].append(current_time)

        remaining = max(0, limit - current_requests - (1 if allowed else 0))

        # Clean up expired keys
        if current_time > storage["expires"]:
            del self.fallback_storage[key]

        return allowed, remaining

    async def check_rate_limit(
        self, client_id: str, endpoint: str, limit: int = 100, window: int = 60
    ) -> tuple[bool, int]:
        """
        Check if request is within rate limit

        Args:
            client_id: Client identifier
            endpoint: API endpoint
            limit: Maximum requests per window
            window: Time window in seconds

        Returns:
            Tuple of (allowed, remaining_requests)
        """
        key = self._get_rate_limit_key(client_id, endpoint)

        if self.redis_client:
            return await self._check_rate_limit_redis(key, limit, window)
        else:
            return self._check_rate_limit_memory(key, limit, window)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, rate_limiter: RateLimiter = None):
        super().__init__(app)
        self.rate_limiter = rate_limiter or RateLimiter()

        # Rate limit configurations per endpoint type
        self.rate_limits = {
            "auth": {"limit": 10, "window": 300},  # 10 requests per 5 minutes
            "upload": {"limit": 20, "window": 60},  # 20 uploads per minute
            "api": {"limit": 100, "window": 60},  # 100 API calls per minute
            "download": {"limit": 50, "window": 60},  # 50 downloads per minute
            "default": {"limit": 60, "window": 60},  # 60 requests per minute default
        }

    def _get_endpoint_category(self, path: str) -> str:
        """
        Categorize endpoint for rate limiting

        Args:
            path: Request path

        Returns:
            Endpoint category
        """
        if "/auth/" in path:
            return "auth"
        elif "/upload" in path:
            return "upload"
        elif "/download" in path:
            return "download"
        elif path.startswith("/api/"):
            return "api"
        else:
            return "default"

    async def dispatch(self, request: Request, call_next):
        """
        Process request through rate limiter

        Args:
            request: FastAPI request
            call_next: Next middleware/handler

        Returns:
            Response or rate limit error
        """
        # Skip rate limiting for health checks and static files
        if request.url.path in ["/health", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)

        if request.url.path.startswith("/static/"):
            return await call_next(request)

        try:
            client_id = self.rate_limiter._get_client_id(request)
            endpoint_category = self._get_endpoint_category(request.url.path)

            rate_config = self.rate_limits.get(
                endpoint_category, self.rate_limits["default"]
            )

            allowed, remaining = await self.rate_limiter.check_rate_limit(
                client_id=client_id,
                endpoint=endpoint_category,
                limit=rate_config["limit"],
                window=rate_config["window"],
            )

            if not allowed:
                logger.warning(
                    f"Rate limit exceeded for client {client_id} on {request.url.path}"
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Please try again later.",
                    headers={
                        "X-RateLimit-Limit": str(rate_config["limit"]),
                        "X-RateLimit-Window": str(rate_config["window"]),
                        "X-RateLimit-Remaining": "0",
                        "Retry-After": str(rate_config["window"]),
                    },
                )

            # Process request
            response = await call_next(request)

            # Add rate limit headers to response
            response.headers["X-RateLimit-Limit"] = str(rate_config["limit"])
            response.headers["X-RateLimit-Window"] = str(rate_config["window"])
            response.headers["X-RateLimit-Remaining"] = str(remaining)

            return response

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Rate limiting middleware error: {e}")
            # Allow request if middleware fails
            return await call_next(request)
