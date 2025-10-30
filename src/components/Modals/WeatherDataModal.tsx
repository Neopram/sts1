import React, { useState, useEffect } from 'react';
import { BaseModal } from '../Common/BaseModal';
import { Button } from '../Common/Button';
import { Input } from '../Common/Input';
import { Alert } from '../Common/Alert';
import { Loading } from '../Common/Loading';
import { Cloud, Wind, Droplets, Eye, Gauge } from 'lucide-react';
import { ApiService } from '../../api';

interface WeatherData {
  location: string;
  temperature: number;
  description: string;
  windSpeed: number;
  humidity: number;
  visibility: number;
  pressure: number;
  timestamp: string;
}

interface WeatherDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationId?: string;
}

export const WeatherDataModal: React.FC<WeatherDataModalProps> = ({
  isOpen,
  onClose,
  operationId,
}) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState('');

  const handleFetchWeather = async () => {
    if (!location.trim()) {
      setError('Por favor ingresa una ubicación');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await ApiService.staticGet(
        `/weather?location=${encodeURIComponent(location)}`
      );
      setWeatherData((response as any).weather || (response as any));
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Error obteniendo datos meteorológicos'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && operationId) {
      // Auto-fetch weather for operation if available
      const fetchOperationWeather = async () => {
        try {
          const response = await ApiService.staticGet(
            `/operations/${operationId}/weather`
          );
          setWeatherData((response as any).weather || (response as any));
        } catch (_err) {
          // Silently fail, user can manually search
        }
      };
      fetchOperationWeather();
    }
  }, [isOpen, operationId]);

  if (isLoading && !weatherData) {
    return (
      <BaseModal isOpen={isOpen} onClose={onClose} title="Datos Meteorológicos">
        <Loading message="Cargando datos..." />
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Datos Meteorológicos"
      size="md"
    >
      {error && <Alert variant="error" title="Error" message={error} />}

      <div className="space-y-4">
        <div className="flex space-x-2">
          <Input
            placeholder="Ingresa ubicación (ej: Madrid, España)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyPress={(e) =>
              e.key === 'Enter' && handleFetchWeather()
            }
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleFetchWeather}
            disabled={isLoading}
          >
            Buscar
          </Button>
        </div>

        {weatherData && (
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
            <h3 className="text-xl font-semibold text-blue-900 mb-4">
              {weatherData.location}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Cloud className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-gray-600">
                    Condición
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-800">
                  {weatherData.description}
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Gauge className="w-5 h-5 text-orange-600" />
                  <span className="text-sm text-gray-600">
                    Temperatura
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-800">
                  {weatherData.temperature}°C
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Wind className="w-5 h-5 text-cyan-600" />
                  <span className="text-sm text-gray-600">
                    Velocidad del viento
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-800">
                  {weatherData.windSpeed} km/h
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Droplets className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-gray-600">
                    Humedad
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-800">
                  {weatherData.humidity}%
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Eye className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-gray-600">
                    Visibilidad
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-800">
                  {weatherData.visibility} km
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Gauge className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-600">
                    Presión
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-800">
                  {weatherData.pressure} mb
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              Actualizado: {new Date(weatherData.timestamp).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end mt-6">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </BaseModal>
  );
};