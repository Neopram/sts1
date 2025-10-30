"""
Weather service for STS Clearance system
Handles marine weather data integration from Open-Meteo API (free, no API key required)
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Optional

import aiohttp
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.models import WeatherData

logger = logging.getLogger(__name__)


class WeatherService:
    """Service for fetching and caching marine weather data using Open-Meteo"""

    def __init__(self):
        # Open-Meteo API - completely free, no API key required
        self.base_url = "https://api.open-meteo.com/v1/forecast"
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
        """Fetch weather data from Open-Meteo API (free, no API key required)"""
        try:
            params = {
                'latitude': latitude,
                'longitude': longitude,
                'current': 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation',
                'timezone': 'UTC',
                'wind_speed_unit': 'kmh',
                'temperature_unit': 'celsius'
            }

            async with aiohttp.ClientSession() as client_session:
                async with client_session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        current = data.get('current', {})

                        # Convert wind speed from km/h to knots for marine compatibility
                        wind_speed_kph = current.get('wind_speed_10m', 0)
                        wind_speed_knots = wind_speed_kph / 1.852

                        # Interpret WMO weather code
                        weather_code = current.get('weather_code', 0)
                        weather_desc = self._get_weather_description(weather_code)

                        # Estimate wave height from wind speed (simplified marine model)
                        wave_height = min(wind_speed_kph / 20, 4)
                        
                        weather_info = {
                            'temperature': current.get('temperature_2m'),
                            'humidity': current.get('relative_humidity_2m'),
                            'wind_speed': wind_speed_knots,  # in knots
                            'wind_speed_kph': wind_speed_kph,  # in km/h
                            'wind_direction': current.get('wind_direction_10m'),
                            'wind_direction_cardinal': self._degrees_to_cardinal(current.get('wind_direction_10m', 0)),
                            'visibility': 10,  # Default good visibility
                            'pressure': current.get('pressure'),
                            'weather_main': weather_desc,
                            'weather_description': weather_desc,
                            'wave_height': wave_height,
                            'sea_state': self._calculate_sea_state(wind_speed_kph, wave_height),
                            'precipitation': current.get('precipitation', 0),
                            'is_raining': self._is_raining_code(weather_code),
                            'marine_conditions': self._assess_marine_conditions(current),
                            'sts_optimality': self._calculate_sts_optimality(wind_speed_knots, wave_height, current.get('temperature_2m', 20)),
                            'last_updated': datetime.utcnow().isoformat()
                        }

                        return weather_info

        except Exception as e:
            logger.error(f"Error fetching weather from Open-Meteo API: {e}")

        return None

    def _assess_marine_conditions(self, current: Dict) -> str:
        """Assess marine conditions based on weather data"""
        try:
            wind_speed_kph = current.get('wind_speed_10m', 0)
            precipitation = current.get('precipitation', 0)
            weather_code = current.get('weather_code', 0)

            # Beaufort scale for wind (in km/h)
            if wind_speed_kph < 1:
                wind_condition = "calm"
            elif wind_speed_kph < 6:
                wind_condition = "light"
            elif wind_speed_kph < 12:
                wind_condition = "moderate"
            elif wind_speed_kph < 20:
                wind_condition = "fresh"
            elif wind_speed_kph < 31:
                wind_condition = "strong"
            else:
                wind_condition = "storm"

            # Precipitation assessment
            if self._is_raining_code(weather_code):
                precip_condition = "raining"
            else:
                precip_condition = "dry"

            # Overall marine conditions
            if wind_condition in ["storm", "strong"]:
                return "hazardous"
            elif wind_condition == "fresh" or precip_condition == "raining":
                return "challenging"
            elif wind_condition == "moderate":
                return "fair"
            else:
                return "favorable"

        except Exception as e:
            logger.error(f"Error assessing marine conditions: {e}")
            return "unknown"

    def _get_weather_description(self, code: int) -> str:
        """Convert WMO Weather code to description"""
        weather_codes = {
            0: "Clear sky",
            1: "Mainly clear",
            2: "Partly cloudy",
            3: "Overcast",
            45: "Foggy",
            48: "Depositing rime fog",
            51: "Light drizzle",
            53: "Moderate drizzle",
            55: "Dense drizzle",
            61: "Slight rain",
            63: "Moderate rain",
            65: "Heavy rain",
            71: "Slight snow",
            73: "Moderate snow",
            75: "Heavy snow",
            77: "Snow grains",
            80: "Slight rain showers",
            81: "Moderate rain showers",
            82: "Violent rain showers",
            85: "Slight snow showers",
            86: "Heavy snow showers",
            95: "Thunderstorm",
            96: "Thunderstorm with slight hail",
            99: "Thunderstorm with heavy hail",
        }
        return weather_codes.get(code, "Unknown")

    def _is_raining_code(self, code: int) -> bool:
        """Check if weather code indicates rain"""
        return code >= 51 and code <= 82

    def _calculate_sea_state(self, wind_kph: float, wave_height: float) -> str:
        """Calculate sea state from wind speed and wave height"""
        if wind_kph < 5 or wave_height < 0.5:
            return "calm"
        elif wind_kph < 15 or wave_height < 1.25:
            return "slight"
        elif wind_kph < 25 or wave_height < 2.5:
            return "moderate"
        elif wind_kph < 35 or wave_height < 4:
            return "rough"
        return "very_rough"

    def _degrees_to_cardinal(self, degrees: float) -> str:
        """Convert degrees to cardinal direction"""
        directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", 
                     "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
        index = int((degrees + 11.25) / 22.5) % 16
        return directions[index]

    def _calculate_sts_optimality(self, wind_knots: float, wave_height: float, temperature: float) -> Dict:
        """Calculate STS operation optimality score (0-100)"""
        score = 100

        # Wind Assessment (Critical)
        if wind_knots > 35:
            score = 0  # Stop operations
        elif wind_knots > 30:
            score -= 40  # Marginal conditions
        elif wind_knots > 20:
            score -= 20  # Monitor
        elif wind_knots > 15:
            score -= 10  # Good conditions degrading

        # Wave Height Assessment
        if wave_height > 4:
            score -= 40
        elif wave_height > 3:
            score -= 20
        elif wave_height > 2:
            score -= 10

        # Temperature extremes
        if temperature < 5 or temperature > 40:
            score -= 5

        return {
            "optimal": score >= 80,
            "percentage": max(0, score)
        }

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
