"""
Permission Cache for STS Clearance Hub
Caches permission checks using Redis for performance optimization
"""

import json
import logging
from typing import Optional

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

logger = logging.getLogger(__name__)


class PermissionCache:
    """
    Cache layer for permission checks using Redis
    Improves performance by caching permission validation results
    """

    def __init__(self, redis_client: Optional["redis.Redis"] = None, ttl_seconds: int = 3600):
        """
        Initialize permission cache

        Args:
            redis_client: Redis client instance (optional)
            ttl_seconds: Time to live for cached entries (default: 1 hour)
        """
        self.redis_client = redis_client
        self.ttl_seconds = ttl_seconds
        self.enabled = REDIS_AVAILABLE and redis_client is not None

    def _make_key(self, user_email: str, resource: str, action: str) -> str:
        """Generate cache key for a permission check"""
        return f"perm:{user_email}:{resource}:{action}"

    def _make_vessel_key(self, user_email: str, vessel_id: str) -> str:
        """Generate cache key for vessel access check"""
        return f"vessel:{user_email}:{vessel_id}"

    def get_permission(
        self, user_email: str, resource: str, action: str
    ) -> Optional[bool]:
        """
        Get cached permission result

        Args:
            user_email: User's email
            resource: Resource name
            action: Action name

        Returns:
            Cached boolean result or None if not cached
        """
        if not self.enabled:
            return None

        try:
            key = self._make_key(user_email, resource, action)
            value = self.redis_client.get(key)

            if value:
                return value.decode() == "true"

            return None

        except Exception as e:
            logger.warning(f"Error getting permission from cache: {str(e)}")
            return None

    def set_permission(
        self, user_email: str, resource: str, action: str, allowed: bool
    ) -> bool:
        """
        Cache a permission check result

        Args:
            user_email: User's email
            resource: Resource name
            action: Action name
            allowed: Whether permission is allowed

        Returns:
            True if caching succeeded, False otherwise
        """
        if not self.enabled:
            return False

        try:
            key = self._make_key(user_email, resource, action)
            value = "true" if allowed else "false"
            self.redis_client.setex(key, self.ttl_seconds, value)
            return True

        except Exception as e:
            logger.warning(f"Error setting permission in cache: {str(e)}")
            return False

    def get_vessel_access(self, user_email: str, vessel_id: str) -> Optional[bool]:
        """
        Get cached vessel access result

        Args:
            user_email: User's email
            vessel_id: Vessel ID

        Returns:
            Cached boolean result or None if not cached
        """
        if not self.enabled:
            return None

        try:
            key = self._make_vessel_key(user_email, vessel_id)
            value = self.redis_client.get(key)

            if value:
                return value.decode() == "true"

            return None

        except Exception as e:
            logger.warning(f"Error getting vessel access from cache: {str(e)}")
            return None

    def set_vessel_access(
        self, user_email: str, vessel_id: str, allowed: bool
    ) -> bool:
        """
        Cache a vessel access check result

        Args:
            user_email: User's email
            vessel_id: Vessel ID
            allowed: Whether access is allowed

        Returns:
            True if caching succeeded, False otherwise
        """
        if not self.enabled:
            return False

        try:
            key = self._make_vessel_key(user_email, vessel_id)
            value = "true" if allowed else "false"
            self.redis_client.setex(key, self.ttl_seconds, value)
            return True

        except Exception as e:
            logger.warning(f"Error setting vessel access in cache: {str(e)}")
            return False

    def invalidate_user_permissions(self, user_email: str) -> bool:
        """
        Invalidate all cached permissions for a user
        (Call this when user role changes or permissions are updated)

        Args:
            user_email: User's email

        Returns:
            True if invalidation succeeded, False otherwise
        """
        if not self.enabled:
            return False

        try:
            # Find all keys for this user
            pattern = f"perm:{user_email}:*"
            keys = self.redis_client.keys(pattern)

            # Also invalidate vessel access keys
            vessel_pattern = f"vessel:{user_email}:*"
            vessel_keys = self.redis_client.keys(vessel_pattern)

            all_keys = keys + vessel_keys

            if all_keys:
                self.redis_client.delete(*all_keys)

            return True

        except Exception as e:
            logger.warning(f"Error invalidating user permissions: {str(e)}")
            return False

    def invalidate_permission(
        self, user_email: str, resource: str, action: str
    ) -> bool:
        """
        Invalidate a specific permission cache entry

        Args:
            user_email: User's email
            resource: Resource name
            action: Action name

        Returns:
            True if invalidation succeeded, False otherwise
        """
        if not self.enabled:
            return False

        try:
            key = self._make_key(user_email, resource, action)
            self.redis_client.delete(key)
            return True

        except Exception as e:
            logger.warning(f"Error invalidating permission: {str(e)}")
            return False

    def invalidate_vessel_access(self, user_email: str, vessel_id: str) -> bool:
        """
        Invalidate a specific vessel access cache entry

        Args:
            user_email: User's email
            vessel_id: Vessel ID

        Returns:
            True if invalidation succeeded, False otherwise
        """
        if not self.enabled:
            return False

        try:
            key = self._make_vessel_key(user_email, vessel_id)
            self.redis_client.delete(key)
            return True

        except Exception as e:
            logger.warning(f"Error invalidating vessel access: {str(e)}")
            return False

    def clear_all_permissions(self) -> bool:
        """
        Clear all permission-related cache entries
        (Use with caution - call when permissions are globally updated)

        Returns:
            True if clearing succeeded, False otherwise
        """
        if not self.enabled:
            return False

        try:
            # Clear all permission keys
            perm_keys = self.redis_client.keys("perm:*")
            vessel_keys = self.redis_client.keys("vessel:*")

            all_keys = perm_keys + vessel_keys

            if all_keys:
                self.redis_client.delete(*all_keys)

            return True

        except Exception as e:
            logger.warning(f"Error clearing all permissions: {str(e)}")
            return False

    def get_stats(self) -> dict:
        """
        Get cache statistics

        Returns:
            Dictionary with cache stats
        """
        if not self.enabled:
            return {"enabled": False, "reason": "Redis not available"}

        try:
            perm_keys = self.redis_client.keys("perm:*")
            vessel_keys = self.redis_client.keys("vessel:*")

            return {
                "enabled": True,
                "permission_cache_entries": len(perm_keys),
                "vessel_cache_entries": len(vessel_keys),
                "total_entries": len(perm_keys) + len(vessel_keys),
                "ttl_seconds": self.ttl_seconds,
            }

        except Exception as e:
            logger.warning(f"Error getting cache stats: {str(e)}")
            return {"enabled": False, "error": str(e)}


# Singleton instance
permission_cache: Optional[PermissionCache] = None


def init_permission_cache(
    redis_client: Optional["redis.Redis"] = None, ttl_seconds: int = 3600
) -> PermissionCache:
    """
    Initialize the permission cache singleton

    Args:
        redis_client: Redis client instance
        ttl_seconds: Cache TTL in seconds

    Returns:
        PermissionCache instance
    """
    global permission_cache
    permission_cache = PermissionCache(redis_client, ttl_seconds)
    return permission_cache


def get_permission_cache() -> PermissionCache:
    """
    Get the permission cache singleton

    Returns:
        PermissionCache instance (or dummy if not initialized)
    """
    global permission_cache
    if permission_cache is None:
        permission_cache = PermissionCache()
    return permission_cache