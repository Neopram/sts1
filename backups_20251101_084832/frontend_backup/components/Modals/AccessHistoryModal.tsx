import React, { useState, useEffect } from 'react';
import { BaseModal } from '../Common/BaseModal';
import { Button } from '../Common/Button';
import { Table } from '../Common/Table';
import { Badge } from '../Common/Badge';
import { Alert } from '../Common/Alert';
import { Loading } from '../Common/Loading';
import { LogIn } from 'lucide-react';
import { ApiService } from '../../api';

interface AccessLog {
  id: string;
  userId: string;
  userName: string;
  loginTime: string;
  logoutTime?: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failed';
}

interface AccessHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export const AccessHistoryModal: React.FC<AccessHistoryModalProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (isOpen) {
      fetchAccessLogs();
    }
  }, [isOpen, userId]);

  const fetchAccessLogs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = userId
        ? `/users/${userId}/access-history`
        : '/access-history';
      const response = await ApiService.staticGet(endpoint);
      setLogs((response as any).logs || []);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Error cargando historial de acceso'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === 'success' ? 'success' : 'danger'}>
        {status === 'success' ? 'Exitoso' : 'Fallido'}
      </Badge>
    );
  };

  const filteredLogs =
    filter === 'all'
      ? logs
      : logs.filter((log) => log.status === filter);

  if (isLoading) {
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="Historial de Acceso"
      >
        <Loading message="Cargando historial..." />
      </BaseModal>
    );
  }

  const columns = [
    { key: 'userName', label: 'Usuario', header: 'Usuario', accessor: 'userName' },
    {
      key: 'loginTime',
      label: 'Hora de acceso',
      header: 'Hora de acceso',
      accessor: 'loginTime',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      key: 'ipAddress',
      label: 'Dirección IP',
      header: 'Dirección IP',
      accessor: 'ipAddress',
    },
    {
      key: 'status',
      label: 'Estado',
      header: 'Estado',
      accessor: 'status',
      render: getStatusBadge,
    },
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Historial de Acceso"
      size="lg"
    >
      {error && <Alert variant="error" title="Error" message={error} />}

      <div className="space-y-4">
        <div className="flex space-x-2">
          {['all', 'success', 'failed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {f === 'all'
                ? 'Todos'
                : f === 'success'
                  ? 'Exitosos'
                  : 'Fallidos'}
            </button>
          ))}
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <LogIn className="w-12 h-12 mx-auto mb-2 opacity-50" />
            No hay registros de acceso
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table columns={columns} data={filteredLogs} keyField="id" />
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