"""
Simple endpoint-level caching for static endpoints
Avoids middleware complexity that was causing deadlocks
"""

import time
from typing import Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class SimpleEndpointCache:
    """Simple in-memory cache for endpoint responses"""
    
    def __init__(self):
        self.cache: Dict[str, Tuple[dict, float]] = {}  # key -> (data, timestamp)
        self.default_ttl = 300  # 5 minutes
    
    def get(self, key: str, ttl: int = None) -> Optional[dict]:
        """Get cached data if still valid"""
        if key not in self.cache:
            return None
        
        data, timestamp = self.cache[key]
        cache_ttl = ttl or self.default_ttl
        
        # Check if cache is still valid
        if time.time() - timestamp > cache_ttl:
            # Cache expired, remove it
            del self.cache[key]
            return None
        
        return data
    
    def set(self, key: str, data: dict):
        """Cache data with timestamp"""
        self.cache[key] = (data, time.time())
    
    def clear(self):
        """Clear all cached data"""
        self.cache.clear()
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        return {
            "total_entries": len(self.cache),
            "cache_type": "simple_endpoint_cache",
            "status": "working"
        }

# Global simple cache instance
endpoint_cache = SimpleEndpointCache()

def get_cache_stats() -> dict:
    """Get current cache statistics"""
    return endpoint_cache.get_stats()

def clear_cache():
    """Clear all cached responses"""
    endpoint_cache.clear()
    logger.info("Simple endpoint cache cleared")

def cache_response(key: str, data: dict, ttl: int = 300):
    """Cache a response with TTL"""
    endpoint_cache.set(key, data)

def get_cached_response(key: str, ttl: int = 300) -> Optional[dict]:
    """Get cached response if valid"""
    return endpoint_cache.get(key, ttl)