/**
 * Weather Service
 * Handles fetching and caching weather data for STS operations
 * 
 * Uses weatherapi.com free API
 * Consider upgrade for production use
 */

export interface WeatherData {
  temperature: number; // Celsius
  temperatureF: number; // Fahrenheit
  feelsLike: number; // Celsius
  windSpeed: number; // knots
  windSpeedKph: number; // km/h
  windDirection: string; // Cardinal direction (N, NE, E, etc)
  windDirectionDegrees: number; // 0-360
  humidity: number; // percentage
  visibility: number; // km
  waveHeight?: number; // meters (approximated)
  seaState: string; // calm, slight, moderate, rough, very_rough
  conditions: string; // Weather condition text
  precipitation: number; // mm
  isRaining: boolean;
  optimalForSTS: boolean;
  optimalPercentage: number; // 0-100
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export class WeatherService {
  private static readonly API_BASE = 'https://api.weatherapi.com/v1';
  private static readonly API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
  private static cache: Map<string, {data: WeatherData; timestamp: number}> = new Map();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get weather for coordinates
   * Implements caching to avoid excessive API calls
   */
  static async getWeather(coords: Coordinates): Promise<WeatherData> {
    const cacheKey = `${coords.latitude},${coords.longitude}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // If no API key, return mock data
      if (!this.API_KEY) {
        console.warn('Weather API key not configured, using mock data');
        return this.getMockWeather();
      }

      const response = await fetch(
        `${this.API_BASE}/current.json?key=${this.API_KEY}&q=${coords.latitude},${coords.longitude}&aqi=no`
      );

      if (!response.ok) {
        console.error('Weather API error:', response.status);
        return this.getMockWeather();
      }

      const jsonData = await response.json();
      const weatherData = this.parseWeatherResponse(jsonData);

      // Cache the result
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      return weatherData;
    } catch (error) {
      console.error('Weather fetch error:', error);
      return this.getMockWeather();
    }
  }

  /**
   * Parse WeatherAPI response to our format
   */
  private static parseWeatherResponse(data: any): WeatherData {
    const current = data.current;
    const location = data.location;

    // Convert wind speed from km/h to knots
    const windSpeedKnots = current.wind_kph / 1.852;

    // Estimate wave height from wind speed and fetch (simplified)
    const waveHeight = Math.min(current.wind_kph / 20, 4);
    const seaState = this.calculateSeaState(current.wind_kph, waveHeight);

    // Calculate STS optimality
    const optimality = this.calculateSTSOptimality({
      windSpeedKnots,
      visibility: current.vis_km,
      waveHeight,
      isRaining: current.will_it_rain === 1,
      temperature: current.temp_c
    });

    return {
      temperature: current.temp_c,
      temperatureF: current.temp_f,
      feelsLike: current.feelslike_c,
      windSpeed: windSpeedKnots,
      windSpeedKph: current.wind_kph,
      windDirection: current.wind_dir,
      windDirectionDegrees: current.wind_degree,
      humidity: current.humidity,
      visibility: current.vis_km,
      waveHeight: waveHeight,
      seaState: seaState,
      conditions: current.condition.text,
      precipitation: current.precip_mm,
      isRaining: current.will_it_rain === 1,
      optimalForSTS: optimality.optimal,
      optimalPercentage: optimality.percentage
    };
  }

  /**
   * Calculate sea state from wind speed and wave height
   */
  private static calculateSeaState(windKph: number, waveHeight: number): string {
    if (windKph < 5 || waveHeight < 0.5) return 'calm';
    if (windKph < 15 || waveHeight < 1.25) return 'slight';
    if (windKph < 25 || waveHeight < 2.5) return 'moderate';
    if (windKph < 35 || waveHeight < 4) return 'rough';
    return 'very_rough';
  }

  /**
   * Calculate STS operation optimality (0-100 score)
   * Based on maritime industry standards for STS operations
   */
  private static calculateSTSOptimality(conditions: {
    windSpeedKnots: number;
    visibility: number;
    waveHeight: number;
    isRaining: boolean;
    temperature: number;
  }): {optimal: boolean; percentage: number} {
    let score = 100;

    // Wind Assessment (Critical)
    // STS ops typically require <20 knots, marginal 20-30 knots
    if (conditions.windSpeedKnots > 35) {
      score -= 100; // Stop operations
    } else if (conditions.windSpeedKnots > 30) {
      score -= 40; // Marginal conditions
    } else if (conditions.windSpeedKnots > 20) {
      score -= 20; // Monitor
    } else if (conditions.windSpeedKnots > 15) {
      score -= 10; // Good conditions degrading
    }

    // Visibility Assessment
    // Minimum safe visibility ~5km for manifold operations
    if (conditions.visibility < 2) {
      score -= 50; // Hazardous
    } else if (conditions.visibility < 5) {
      score -= 30; // Marginal
    } else if (conditions.visibility < 10) {
      score -= 10; // Acceptable
    }

    // Wave Height Assessment
    // Typically max 3-4m for STS operations
    if (conditions.waveHeight > 4) {
      score -= 40;
    } else if (conditions.waveHeight > 3) {
      score -= 20;
    } else if (conditions.waveHeight > 2) {
      score -= 10;
    }

    // Precipitation
    if (conditions.isRaining) {
      score -= 15;
    }

    // Temperature extremes (operational comfort)
    if (conditions.temperature < 5 || conditions.temperature > 40) {
      score -= 5;
    }

    return {
      optimal: score >= 80,
      percentage: Math.max(0, Math.round(score))
    };
  }

  /**
   * Get mock weather data (for testing or API unavailability)
   */
  private static getMockWeather(): WeatherData {
    return {
      temperature: 28,
      temperatureF: 82,
      feelsLike: 30,
      windSpeed: 12,
      windSpeedKph: 22,
      windDirection: 'NE',
      windDirectionDegrees: 45,
      humidity: 65,
      visibility: 10,
      waveHeight: 0.8,
      seaState: 'slight',
      conditions: 'Partly Cloudy',
      precipitation: 0,
      isRaining: false,
      optimalForSTS: true,
      optimalPercentage: 85
    };
  }

  /**
   * Clear cache manually if needed
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get weather for common port locations
   */
  static async getWeatherByPortName(portName: string): Promise<WeatherData> {
    const ports: Record<string, Coordinates> = {
      'fujairah': { latitude: 25.1242, longitude: 56.3569 },
      'dubai': { latitude: 25.2048, longitude: 55.2708 },
      'singapore': { latitude: 1.3521, longitude: 103.8198 },
      'rotterdam': { latitude: 51.9225, longitude: 4.4792 },
      'shanghai': { latitude: 31.2304, longitude: 121.4737 },
      'hamburg': { latitude: 53.5511, longitude: 9.9937 },
    };

    const coords = ports[portName.toLowerCase()];
    if (!coords) {
      throw new Error(`Port ${portName} not found in database`);
    }

    return this.getWeather(coords);
  }
}

export default WeatherService;