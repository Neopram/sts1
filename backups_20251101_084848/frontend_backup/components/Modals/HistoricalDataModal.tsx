import React, { useState, useEffect } from 'react';
import { BaseModal } from '../Common/BaseModal';
import { Button } from '../Common/Button';
import { Table } from '../Common/Table';
import { Badge } from '../Common/Badge';
import { Alert } from '../Common/Alert';
import { Loading } from '../Common/Loading';
import { Calendar } from 'lucide-react';
import { ApiService } from '../../api';

interface HistoricalRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changedFields: Record<string, { old: string; new: string }>;
  changedBy: string;
  timestamp: string;
  details?: string;
}

interface HistoricalDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  entityType: 'document' | 'user' | 'room' | 'operation';
}

export const HistoricalDataModal: React.FC<HistoricalDataModalProps> = ({
  isOpen,
  onClose,
  entityId,
  entityType,
}) => {
  const [records, setRecords] = useState<HistoricalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && entityId) {
      fetchHistory();
    }
  }, [isOpen, entityId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ApiService.staticGet(
        `/history/${entityType}/${entityId}`
      );
      setRecords((response as any).records || []);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Error cargando historial'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger'> = {
      created: 'success',
      updated: 'warning',
      deleted: 'danger',
      approved: 'success',
      rejected: 'danger',
    };
    return (
      <Badge variant={variants[action] || 'warning'}>
        {action}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <BaseModal isOpen={isOpen} onClose={onClose} title="Historial">
        <Loading message="Cargando historial..." />
      </BaseModal>
    );
  }

  const columns = [
    { key: 'timestamp', label: 'Fecha', header: 'Fecha', accessor: 'timestamp' },
    { key: 'action', label: 'Acción', header: 'Acción', accessor: 'action', render: getActionBadge },
    { key: 'changedBy', label: 'Usuario', header: 'Usuario', accessor: 'changedBy' },
    { key: 'details', label: 'Detalles', header: 'Detalles', accessor: 'details' },
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial - ${entityType}`}
      size="lg"
    >
      {error && <Alert variant="error" title="Error" message={error} />}

      {records.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
          No hay registros de historial
        </div>
      ) : (
        <>
          <div className="max-h-96 overflow-y-auto">
            <Table
              columns={columns}
              data={records}
              keyField="id"
            />
          </div>
        </>
      )}

      <div className="flex justify-end mt-6">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </BaseModal>
  );
};