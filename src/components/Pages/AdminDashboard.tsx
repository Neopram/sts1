import React, { useState, useEffect } from 'react';
import { BarChart, Users, Lock, Activity } from 'lucide-react';
import { Button } from '../Common/Button';
import { Card } from '../Common/Card';
import { Table } from '../Common/Table';
import { Alert } from '../Common/Alert';
import { Loading } from '../Common/Loading';
import { ApiService } from '../../api';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalDocuments: number;
  totalOperations: number;
  systemHealth: number;
}

interface SystemLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  status: string;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [statsRes, logsRes] = await Promise.all([
        ApiService.staticGet('/admin/stats'),
        ApiService.staticGet('/admin/system-logs?limit=10'),
      ]);

      setStats((statsRes as any).stats || (statsRes as any));
      setLogs((logsRes as any).logs || []);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Error cargando datos del admin'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loading message="Cargando panel de administración..." />;
  }

  const columns = [
    { key: 'timestamp', label: 'Hora', header: 'Hora', accessor: 'timestamp' },
    { key: 'action', label: 'Acción', header: 'Acción', accessor: 'action' },
    { key: 'user', label: 'Usuario', header: 'Usuario', accessor: 'user' },
    { key: 'status', label: 'Estado', header: 'Estado', accessor: 'status' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <BarChart className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">
          Panel de Administración
        </h1>
      </div>

      {error && <Alert variant="error" title="Error" message={error} />}

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Usuarios Totales</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.totalUsers || 0}
              </p>
            </div>
            <Users className="w-12 h-12 text-blue-600 opacity-20" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Usuarios Activos</p>
              <p className="text-3xl font-bold text-green-600">
                {stats?.activeUsers || 0}
              </p>
            </div>
            <Activity className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">
                Documentos
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.totalDocuments || 0}
              </p>
            </div>
            <Lock className="w-12 h-12 text-purple-600 opacity-20" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">
                Salud del Sistema
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.systemHealth || 0}%
              </p>
            </div>
            <BarChart className="w-12 h-12 text-orange-600 opacity-20" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button variant="primary">Gestionar Usuarios</Button>
        <Button variant="secondary">
          Configurar Sistema
        </Button>
        <Button variant="warning">Ver Seguridad</Button>
        <Button variant="success">Backup</Button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Registros del Sistema
        </h2>

        {logs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No hay registros
          </p>
        ) : (
          <Table
            columns={columns}
            data={logs}
            keyField="id"
          />
        )}
      </div>

      <Button variant="primary" onClick={fetchDashboardData}>
        Actualizar
      </Button>
    </div>
  );
};

export default AdminDashboard;