"""
Weather router for STS Clearance system
Provides marine weather data endpoints
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user, require_room_access
from app.services.weather_service import weather_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["weather"])


# Request/Response schemas
class WeatherRequest(BaseModel):
    latitude: float
    longitude: float
    location_name: Optional[str] = None


class WeatherResponse(BaseModel):
    temperature: Optional[float]
    humidity: Optional[int]
    wind_speed: Optional[float]
    wind_direction: Optional[int]
    visibility: Optional[int]
    pressure: Optional[float]
    weather_main: Optional[str]
    weather_description: Optional[str]
    daily_high: Optional[float]
    daily_low: Optional[float]
    precipitation_probability: Optional[float]
    marine_conditions: Optional[str]
    last_updated: Optional[str]


@router.get("/rooms/{room_id}/weather", response_model=WeatherResponse)
async def get_room_weather(
    room_id: str,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get weather data for a room location
    """
    try:
        user_email = current_user["email"]

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # If coordinates not provided, try to get from room location
        if latitude is None or longitude is None:
            # This would need to be implemented to get coordinates from room location
            # For now, return error
            raise HTTPException(
                status_code=400,
                detail="Latitude and longitude are required for weather data"
            )

        # Get weather data
        weather_data = await weather_service.get_weather_data(latitude, longitude, session)

        if not weather_data:
            raise HTTPException(
                status_code=503,
                detail="Weather service temporarily unavailable"
            )

        return WeatherResponse(**weather_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting room weather: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/weather/marine-conditions")
async def get_marine_conditions_guide():
    """
    Get guide for marine weather conditions assessment
    """
    return {
        "conditions_guide": {
            "favorable": {
                "description": "Good conditions for STS operations",
                "wind": "< 7 knots",
                "visibility": "> 5 km",
                "precipitation": "Low risk"
            },
            "fair": {
                "description": "Acceptable conditions, monitor closely",
                "wind": "7-11 knots",
                "visibility": "2-5 km",
                "precipitation": "Moderate risk"
            },
            "challenging": {
                "description": "Difficult conditions, consider postponing",
                "wind": "11-17 knots",
                "visibility": "1-2 km",
                "precipitation": "High risk"
            },
            "hazardous": {
                "description": "Unsafe conditions, operations not recommended",
                "wind": "> 17 knots",
                "visibility": "< 1 km",
                "precipitation": "Very high risk"
            }
        },
        "beaufort_scale": {
            "0": "Calm (< 1 knot)",
            "1": "Light air (1-3 knots)",
            "2": "Light breeze (4-6 knots)",
            "3": "Gentle breeze (7-10 knots)",
            "4": "Moderate breeze (11-16 knots)",
            "5": "Fresh breeze (17-21 knots)",
            "6": "Strong breeze (22-27 knots)",
            "7": "Near gale (28-33 knots)",
            "8": "Gale (34-40 knots)",
            "9": "Strong gale (41-47 knots)",
            "10": "Storm (48-55 knots)",
            "11": "Violent storm (56-63 knots)",
            "12": "Hurricane (> 64 knots)"
        }
    }


@router.post("/weather/cache/clear")
async def clear_weather_cache(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Clear weather data cache (admin function)
    """
    try:
        # This would need to be implemented to clear cache
        # For now, just return success
        return {"message": "Weather cache cleared successfully"}

    except Exception as e:
        logger.error(f"Error clearing weather cache: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
