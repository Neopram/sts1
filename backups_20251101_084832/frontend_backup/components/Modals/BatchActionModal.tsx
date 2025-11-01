import React, { useState } from 'react';
import { BaseModal } from '../Common/BaseModal';
import { Button } from '../Common/Button';
import { Select } from '../Common/Select';
import { Input } from '../Common/Input';
import { Alert } from '../Common/Alert';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { ApiService } from '../../api';

type ActionType =
  | 'approve'
  | 'reject'
  | 'archive'
  | 'delete'
  | 'export'
  | 'assign';

interface BatchActionResult {
  id: string;
  status: 'success' | 'error' | 'pending';
  message: string;
}

interface BatchActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  entityType: 'document' | 'user' | 'operation';
}

export const BatchActionModal: React.FC<BatchActionModalProps> = ({
  isOpen,
  onClose,
  selectedIds,
  entityType,
}) => {
  const [action, setAction] = useState<ActionType>('approve');
  const [comments, setComments] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<BatchActionResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const actionOptions = [
    { value: 'approve', label: 'Aprobar' },
    { value: 'reject', label: 'Rechazar' },
    { value: 'archive', label: 'Archivar' },
    { value: 'delete', label: 'Eliminar' },
    { value: 'export', label: 'Exportar' },
    { value: 'assign', label: 'Asignar' },
  ];

  const handleExecuteAction = async () => {
    if (selectedIds.length === 0) {
      return;
    }

    setIsProcessing(true);
    setResults([]);

    try {
      const payload: Record<string, any> = {
        ids: selectedIds,
        action: action,
      };

      if (comments) payload.comments = comments;
      if (assignTo) payload.assign_to = assignTo;

      const response = await ApiService.staticPost(
        `/batch-actions/${entityType}`,
        payload
      );

      setResults((response as any).results || []);
      setShowResults(true);
    } catch (err: any) {
      setResults([
        {
          id: 'error',
          status: 'pending',
          message:
            err.response?.data?.detail ||
            'Error ejecutando acción en lote',
        },
      ]);
      setShowResults(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <CheckCircle className="w-5 h-5 text-green-600" />
        );
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return (
          <AlertCircle className="w-5 h-5 text-yellow-600" />
        );
    }
  };

  const successCount = results.filter(
    (r) => r.status === 'success'
  ).length;
  const errorCount = results.filter(
    (r) => r.status === 'error'
  ).length;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Acciones en Lote (${selectedIds.length} elementos)`}
      size="md"
    >
      {!showResults ? (
        <div className="space-y-4">
          <Alert
            variant="info"
            title="Acción en lote"
            message={`Aplicarás esta acción a ${selectedIds.length} elemento(s)`}
          />

          <Select
            label="Selecciona una acción"
            options={actionOptions}
            value={action}
            onChange={(e) =>
              setAction((e as any).target.value as ActionType)
            }
          />

          {(action === 'reject' || action === 'approve') && (
            <>
              <label className="block text-sm font-semibold text-gray-700">
                Comentarios
              </label>
              <textarea
                placeholder="Añade comentarios..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </>
          )}

          {action === 'assign' && (
            <Input
              label="Asignar a (ID de usuario)"
              placeholder="Ingresa ID del usuario..."
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
            />
          )}

          <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm text-yellow-800">
            ⚠️ Esta acción afectará a {selectedIds.length} elemento(s) y
            no se puede deshacer fácilmente.
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleExecuteAction}
              disabled={isProcessing}
            >
              {isProcessing ? 'Procesando...' : 'Ejecutar'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Exitosos</p>
              <p className="text-2xl font-bold text-green-600">
                {successCount}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Errores</p>
              <p className="text-2xl font-bold text-red-600">
                {errorCount}
              </p>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {results.map((result) => (
              <div
                key={result.id}
                className="flex items-start space-x-2 p-3 bg-gray-50 rounded"
              >
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">
                    {result.id}
                  </p>
                  <p className="text-sm text-gray-600">
                    {result.message}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button variant="primary" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </BaseModal>
  );
};