"""
Weather service for STS Clearance system
Handles marine weather data integration from external APIs
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import aiohttp
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.models import WeatherData

logger = logging.getLogger(__name__)


class WeatherService:
    """Service for fetching and caching marine weather data"""

    def __init__(self):
        self.api_key = "your_openweather_api_key_here"  # Should come from env
        self.base_url = "https://api.openweathermap.org/data/2.5"
        self.cache_duration = timedelta(hours=1)  # Cache weather data for 1 hour

    async def get_weather_data(self, latitude: float, longitude: float, session: AsyncSession) -> Optional[Dict]:
        """
        Get weather data for a location, using cache if available

        Args:
            latitude: Location latitude
            longitude: Location longitude
            session: Database session

        Returns:
            Weather data dictionary or None if failed
        """
        try:
            # Check cache first
            cached_data = await self._get_cached_weather(latitude, longitude, session)
            if cached_data:
                return cached_data

            # Fetch from API
            weather_data = await self._fetch_weather_from_api(latitude, longitude)

            if weather_data:
                # Cache the data
                await self._cache_weather_data(latitude, longitude, weather_data, session)
                return weather_data

        except Exception as e:
            logger.error(f"Error getting weather data for {latitude}, {longitude}: {e}")

        return None

    async def _get_cached_weather(self, latitude: float, longitude: float, session: AsyncSession) -> Optional[Dict]:
        """Get cached weather data if still valid"""
        try:
            cutoff_time = datetime.utcnow() - self.cache_duration

            result = await session.execute(
                select(WeatherData)
                .where(
                    WeatherData.latitude == latitude,
                    WeatherData.longitude == longitude,
                    WeatherData.created_at >= cutoff_time
                )
                .order_by(WeatherData.created_at.desc())
                .limit(1)
            )

            weather_record = result.scalar_one_or_none()
            if weather_record:
                return weather_record.data

        except Exception as e:
            logger.error(f"Error checking weather cache: {e}")

        return None

    async def _fetch_weather_from_api(self, latitude: float, longitude: float) -> Optional[Dict]:
        """Fetch weather data from OpenWeatherMap API"""
        try:
            params = {
                'lat': latitude,
                'lon': longitude,
                'appid': self.api_key,
                'units': 'metric',  # Celsius
                'exclude': 'minutely,hourly'  # Only current, daily
            }

            async with aiohttp.ClientSession() as client_session:
                async with client_session.get(f"{self.base_url}/onecall", params=params) as response:
                    if response.status == 200:
                        data = await response.json()

                        # Extract relevant marine weather data
                        current = data.get('current', {})
                        daily = data.get('daily', [{}])[0] if data.get('daily') else {}

                        weather_info = {
                            'temperature': current.get('temp'),
                            'humidity': current.get('humidity'),
                            'wind_speed': current.get('wind_speed'),
                            'wind_direction': current.get('wind_deg'),
                            'visibility': current.get('visibility'),
                            'pressure': current.get('pressure'),
                            'weather_main': current.get('weather', [{}])[0].get('main') if current.get('weather') else None,
                            'weather_description': current.get('weather', [{}])[0].get('description') if current.get('weather') else None,
                            'daily_high': daily.get('temp', {}).get('max'),
                            'daily_low': daily.get('temp', {}).get('min'),
                            'precipitation_probability': daily.get('pop', 0) * 100,
                            'marine_conditions': self._assess_marine_conditions(current, daily),
                            'last_updated': datetime.utcnow().isoformat()
                        }

                        return weather_info

        except Exception as e:
            logger.error(f"Error fetching weather from API: {e}")

        return None

    def _assess_marine_conditions(self, current: Dict, daily: Dict) -> str:
        """Assess marine conditions based on weather data"""
        try:
            wind_speed = current.get('wind_speed', 0)
            visibility = current.get('visibility', 10000)  # meters
            pop = daily.get('pop', 0)  # precipitation probability

            # Beaufort scale for wind
            if wind_speed < 1:
                wind_condition = "calm"
            elif wind_speed < 4:
                wind_condition = "light"
            elif wind_speed < 7:
                wind_condition = "moderate"
            elif wind_speed < 11:
                wind_condition = "fresh"
            elif wind_speed < 17:
                wind_condition = "strong"
            else:
                wind_condition = "storm"

            # Visibility assessment
            if visibility < 1000:
                visibility_condition = "poor"
            elif visibility < 5000:
                visibility_condition = "moderate"
            else:
                visibility_condition = "good"

            # Precipitation risk
            if pop > 0.7:
                precip_condition = "high_risk"
            elif pop > 0.3:
                precip_condition = "moderate_risk"
            else:
                precip_condition = "low_risk"

            # Overall marine conditions
            if wind_condition in ["storm", "strong"] or visibility_condition == "poor":
                return "hazardous"
            elif wind_condition == "fresh" or precip_condition == "high_risk":
                return "challenging"
            elif wind_condition == "moderate" or precip_condition == "moderate_risk":
                return "fair"
            else:
                return "favorable"

        except Exception as e:
            logger.error(f"Error assessing marine conditions: {e}")
            return "unknown"

    async def _cache_weather_data(self, latitude: float, longitude: float, data: Dict, session: AsyncSession):
        """Cache weather data in database"""
        try:
            weather_record = WeatherData(
                latitude=latitude,
                longitude=longitude,
                data=data
            )
            session.add(weather_record)
            await session.commit()

        except Exception as e:
            logger.error(f"Error caching weather data: {e}")

    async def get_weather_for_location(self, location_name: str, session: AsyncSession) -> Optional[Dict]:
        """
        Get weather for a named location (requires geocoding)

        Args:
            location_name: Location name (e.g., "Singapore Strait")
            session: Database session

        Returns:
            Weather data or None
        """
        # This would require a geocoding service to convert location names to lat/lon
        # For now, return None - would need to implement geocoding
        logger.warning(f"Location-based weather not implemented for: {location_name}")
        return None


# Global weather service instance
weather_service = WeatherService()
