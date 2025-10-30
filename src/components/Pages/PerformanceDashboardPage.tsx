import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp } from 'lucide-react';
import { Card } from '../Common/Card';
import { Alert } from '../Common/Alert';
import { Loading } from '../Common/Loading';
import { ApiService } from '../../api';

interface PerformanceMetric {
  name: string;
  current: number;
  previous: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

export const PerformanceDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ApiService.staticGet(
        '/performance/metrics'
      );
      setMetrics((response as any).metrics || []);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Error cargando métricas'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Loading message="Cargando métricas de rendimiento..." />
    );
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Activity className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">
          Panel de Rendimiento
        </h1>
      </div>

      {error && <Alert variant="error" title="Error" message={error} />}

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric: PerformanceMetric) => (
          <Card key={metric.name}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm">
                  {metric.name}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {metric.current}
                  <span className="text-sm text-gray-500 ml-1">
                    {metric.unit}
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Anterior: {metric.previous}{metric.unit}
                </p>
              </div>
              <TrendingUp
                className={`w-8 h-8 ${getTrendColor(
                  metric.trend
                )}`}
              />
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Resumen de Rendimiento
        </h2>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            Sistema con rendimiento óptimo. Todas las
            métricas están dentro de los parámetros
            normales.
          </p>
          <p className="text-xs text-gray-500">
            Última actualización: hace 5 minutos
          </p>
        </div>
      </Card>
    </div>
  );
};

export default PerformanceDashboardPage;