import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { Button } from '../Common/Button';
import { Input } from '../Common/Input';
import { Badge } from '../Common/Badge';
import { Alert } from '../Common/Alert';
import { Loading } from '../Common/Loading';
import { ApiService } from '../../api';

interface SanctionResult {
  imo: string;
  vesselName: string;
  status: 'clear' | 'flagged' | 'banned';
  lastUpdated: string;
  details?: string;
}

export const SanctionsCheckerPage: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState<SanctionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchInput.trim()) {
      setError('Por favor ingresa un IMO');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await ApiService.staticGet(
        `/sanctions/check?query=${encodeURIComponent(searchInput)}`
      );
      setResults([(response as any) || {}]);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Error verificando sanciones'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      clear: { icon: CheckCircle, color: 'text-green-600', variant: 'success' as const },
      flagged: { icon: AlertTriangle, color: 'text-yellow-600', variant: 'warning' as const },
      banned: { icon: Shield, color: 'text-red-600', variant: 'danger' as const },
    };
    return colors[status as keyof typeof colors] || colors.clear;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Shield className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">
          Verificador de Sanciones
        </h1>
      </div>

      {error && <Alert variant="error" title="Error" message={error} />}

      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Buscar Buque
        </h2>

        <div className="flex space-x-2">
          <Input
            placeholder="Ingresa IMO del buque..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button
            variant="primary"
            onClick={handleSearch}
            disabled={isLoading}
          >
            <Search className="w-4 h-4 mr-2" />
            Buscar
          </Button>
        </div>
      </div>

      {isLoading && <Loading message="Verificando sanciones..." />}

      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Resultados
          </h2>

          {results.map((result) => {
            const { icon: Icon, color } = getStatusColor(
              result.status
            );
            return (
              <div
                key={result.imo}
                className="p-4 border-2 border-gray-200 rounded-lg mb-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <Icon className={`w-8 h-8 ${color}`} />
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {result.vesselName}
                      </h3>
                      <p className="text-gray-600">IMO: {result.imo}</p>
                      <p className="text-sm text-gray-500">
                        Actualizado: {result.lastUpdated}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={getStatusColor(result.status).variant}
                  >
                    {result.status.toUpperCase()}
                  </Badge>
                </div>

                {result.details && (
                  <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-700">
                    {result.details}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SanctionsCheckerPage;