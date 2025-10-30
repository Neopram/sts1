import React, { useState, useEffect } from 'react';
import { Cloud, Droplets, Wind, Eye } from 'lucide-react';
import WeatherService, { WeatherData, Coordinates } from '../../services/WeatherService';

interface WeatherConditionsProps {
  coordinates: Coordinates;
  locationName?: string;
  onOptimalityChange?: (percentage: number) => void;
}

/**
 * WeatherConditions Component
 * Displays real-time weather data for STS operation location
 * Updates every 5 minutes
 * 
 * Shows:
 * - Current conditions and temperature
 * - Wind speed and direction
 * - Visibility and sea state
 * - STS Operability percentage
 */
export const WeatherConditions: React.FC<WeatherConditionsProps> = ({
  coordinates,
  locationName = 'Operation Location',
  onOptimalityChange
}) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /**
   * Load weather data
   */
  const loadWeather = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await WeatherService.getWeather(coordinates);
      setWeather(data);
      setLastUpdated(new Date());
      onOptimalityChange?.(data.optimalPercentage);
    } catch (err) {
      console.error('Failed to load weather:', err);
      setError('Unable to load weather data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load weather on mount and set interval for updates
  useEffect(() => {
    loadWeather();
    const interval = setInterval(loadWeather, 5 * 60 * 1000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, [coordinates]);

  if (loading && !weather) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span className="ml-3">Loading weather data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800 font-semibold mb-2">⚠ Weather Data Error</div>
        <div className="text-red-700 text-sm">{error}</div>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  // Determine condition icon emoji
  const getConditionEmoji = (): string => {
    if (weather.isRaining) return '🌧️';
    if (weather.conditions.toLowerCase().includes('cloud')) return '☁️';
    if (weather.conditions.toLowerCase().includes('clear') ||
        weather.conditions.toLowerCase().includes('sunny')) return '☀️';
    if (weather.conditions.toLowerCase().includes('storm')) return '⛈️';
    if (weather.conditions.toLowerCase().includes('fog')) return '🌫️';
    return '🌤️';
  };

  // Determine wind risk level
  const getWindRisk = (): {level: string; color: string; message: string} => {
    if (weather.windSpeed > 30) {
      return {
        level: 'HIGH',
        color: 'text-red-600',
        message: 'Strong winds - Operations restricted'
      };
    }
    if (weather.windSpeed > 20) {
      return {
        level: 'MEDIUM',
        color: 'text-yellow-600',
        message: 'Moderate winds - Monitor'
      };
    }
    return {
      level: 'LOW',
      color: 'text-green-600',
      message: 'Favorable winds'
    };
  };

  const windRisk = getWindRisk();

  return (
    <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-purple-700 text-white p-6 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold">🌤️ WEATHER CONDITIONS</h3>
        {lastUpdated && (
          <div className="text-xs opacity-75">
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Location and Main Condition */}
      <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">{locationName}</div>
          <div className="text-3xl">{getConditionEmoji()}</div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="opacity-80">Temperature</div>
            <div className="font-bold text-lg">
              {weather.temperature}°C / {weather.temperatureF}°F
            </div>
          </div>
          <div>
            <div className="opacity-80">Feels Like</div>
            <div className="font-bold text-lg">{weather.feelsLike}°C</div>
          </div>
          <div>
            <div className="opacity-80">Condition</div>
            <div className="font-bold">{weather.conditions}</div>
          </div>
        </div>
      </div>

      {/* Weather Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {/* Wind */}
        <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-lg p-3 border border-white border-opacity-20">
          <div className="flex items-center gap-2 mb-2">
            <Wind className="w-4 h-4" />
            <span className="text-xs opacity-80 uppercase">Wind</span>
          </div>
          <div className="font-bold text-lg">{weather.windSpeed.toFixed(1)}</div>
          <div className="text-xs opacity-80">knots {weather.windDirection}</div>
          <div className="text-xs opacity-90 mt-1">{weather.windSpeedKph.toFixed(0)} km/h</div>
        </div>

        {/* Visibility */}
        <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-lg p-3 border border-white border-opacity-20">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4" />
            <span className="text-xs opacity-80 uppercase">Visibility</span>
          </div>
          <div className="font-bold text-lg">{weather.visibility.toFixed(1)}</div>
          <div className="text-xs opacity-80">kilometers</div>
        </div>

        {/* Humidity */}
        <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-lg p-3 border border-white border-opacity-20">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4" />
            <span className="text-xs opacity-80 uppercase">Humidity</span>
          </div>
          <div className="font-bold text-lg">{weather.humidity}</div>
          <div className="text-xs opacity-80">percent</div>
        </div>

        {/* Sea State */}
        <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-lg p-3 border border-white border-opacity-20">
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="w-4 h-4" />
            <span className="text-xs opacity-80 uppercase">Sea State</span>
          </div>
          <div className="font-bold text-lg">
            {weather.waveHeight?.toFixed(1) || '--'}m
          </div>
          <div className="text-xs opacity-80 capitalize">{weather.seaState}</div>
        </div>
      </div>

      {/* Wind Risk Assessment */}
      <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-lg p-4 mb-6 border border-white border-opacity-20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold opacity-90">Wind Assessment</span>
          <span className={`font-bold ${windRisk.color}`}>{windRisk.level}</span>
        </div>
        <div className="text-sm opacity-90">{windRisk.message}</div>
      </div>

      {/* STS Operability Score */}
      <div className="bg-white bg-opacity-95 text-gray-900 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold">STS Operability Assessment</span>
          <span className={`text-2xl font-bold ${
            weather.optimalPercentage >= 80 ? 'text-green-600' : 
            weather.optimalPercentage >= 60 ? 'text-yellow-600' : 
            'text-red-600'
          }`}>
            {weather.optimalPercentage}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all ${
              weather.optimalPercentage >= 80
                ? 'bg-green-500'
                : weather.optimalPercentage >= 60
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{width: `${weather.optimalPercentage}%`}}
          />
        </div>

        {/* Status Message */}
        <div className="mt-3 text-sm">
          {weather.optimalForSTS ? (
            <div className="text-green-700 font-semibold">
              ✓ Weather window confirmed for STS operation
            </div>
          ) : (
            <div className="text-red-700 font-semibold">
              ⚠ Marginal conditions - Monitor weather developments
            </div>
          )}
        </div>
      </div>

      {/* Operational Recommendations */}
      <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-3 text-sm">
        <div className="font-semibold mb-2">📋 Operational Recommendations:</div>
        <ul className="space-y-1 text-xs opacity-90">
          {weather.windSpeed > 20 && <li>• Monitor wind patterns closely</li>}
          {weather.visibility < 5 && <li>• Reduce cargo transfer rate</li>}
          {weather.waveHeight && weather.waveHeight > 2.5 && <li>• Increase vessel spacing</li>}
          {weather.isRaining && <li>• Prepare emergency procedures</li>}
          {weather.optimalPercentage >= 80 && <li>• ✓ Conditions favorable - proceed with operation</li>}
        </ul>
      </div>
    </div>
  );
};

export default WeatherConditions;