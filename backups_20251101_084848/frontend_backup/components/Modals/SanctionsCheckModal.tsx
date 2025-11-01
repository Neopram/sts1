import React, { useState } from 'react';
import { BaseModal, Button, Input, Alert, Loading, Badge } from '../Common';
import ApiService from '../../api';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface SanctionsCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SanctionResult {
  imo: string;
  name: string;
  is_sanctioned: boolean;
  lists: string[];
  timestamp?: string;
}

/**
 * Modal para verificar sanciones de buques
 */
export const SanctionsCheckModal: React.FC<SanctionsCheckModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState<SanctionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [bulkInput, setBulkInput] = useState('');

  const handleSingleCheck = async () => {
    if (!searchInput.trim()) {
      setError('Por favor ingresa un IMO o nombre de buque');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await ApiService.staticGet(`/sanctions/check?query=${encodeURIComponent(searchInput)}`);
      setResults([(response as any)]);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Error verificando sanciones'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkCheck = async () => {
    const imoList = bulkInput
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line);

    if (imoList.length === 0) {
      setError('Por favor ingresa al menos un IMO');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await ApiService.staticPost('/sanctions/bulk-check', {
        imo_list: imoList,
      });
      setResults((response as any).results || [(response as any)]);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Error en verificación en lote'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const sanctionedCount = results.filter((r) => r.is_sanctioned).length;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Verificador de Sanciones"
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="space-y-4">
        {error && (
          <Alert
            variant="error"
            message={error}
            onClose={() => setError(null)}
          />
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('single')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'single'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Búsqueda Individual
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'bulk'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Búsqueda en Lote
          </button>
        </div>

        {/* Single Search */}
        {activeTab === 'single' && (
          <div className="space-y-3">
            <Input
              label="IMO o Nombre del Buque"
              placeholder="Ej: 9123456 o VESSEL NAME"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) =>
                e.key === 'Enter' && handleSingleCheck()
              }
            />
            <Button
              variant="primary"
              fullWidth
              onClick={handleSingleCheck}
              isLoading={isLoading}
            >
              Verificar
            </Button>
          </div>
        )}

        {/* Bulk Search */}
        {activeTab === 'bulk' && (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              IMOs (uno por línea)
            </label>
            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder="9123456&#10;9234567&#10;9345678"
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              variant="primary"
              fullWidth
              onClick={handleBulkCheck}
              isLoading={isLoading}
            >
              Verificar Todos
            </Button>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold text-gray-900 mb-4">
              Resultados ({results.length})
            </h3>

            {sanctionedCount > 0 && (
              <Alert
                variant="warning"
                title="Buques Sancionados"
                message={`Se encontraron ${sanctionedCount} buque(s) en listas de sanciones`}
              />
            )}

            <div className="space-y-3 mt-4">
              {results.map((result) => (
                <div
                  key={result.imo}
                  className="p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {result.name} (IMO: {result.imo})
                      </p>
                      {result.lists && result.lists.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {result.lists.map((list, i) => (
                            <Badge key={i} variant="danger" size="sm">
                              {list}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {result.is_sanctioned ? (
                      <AlertTriangle className="text-red-600" />
                    ) : (
                      <CheckCircle className="text-green-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading && <Loading message="Verificando sanciones..." />}
      </div>
    </BaseModal>
  );
};

export default SanctionsCheckModal;