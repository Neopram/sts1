"""
Cache management router
Provides endpoints for monitoring and managing response cache
"""

from fastapi import APIRouter
from app.middleware.caching import get_cache_stats, clear_cache

router = APIRouter(prefix="/api/v1/cache", tags=["cache"])

@router.get("/stats")
async def get_cache_statistics():
    """Get response cache statistics"""
    return get_cache_stats()

@router.post("/clear")
async def clear_response_cache():
    """Clear response cache"""
    clear_cache()
    return {"message": "Response cache cleared successfully"}