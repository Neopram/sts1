import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { Card } from '../Common/Card';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';
import { Alert } from '../Common/Alert';
import { Loading } from '../Common/Loading';
import { ApiService } from '../../api';

interface RolePermission {
  roleId: string;
  roleName: string;
  permissions: {
    name: string;
    granted: boolean;
    category: string;
  }[];
}

export const RolePermissionMatrixPage: React.FC = () => {
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRolePermissions();
  }, []);

  const fetchRolePermissions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ApiService.staticGet(
        '/role-permissions'
      );
      setRoles((response as any).roles || []);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Error cargando permisos de roles'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Loading message="Cargando matriz de permisos..." />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Shield className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">
          Matriz de Permisos por Rol
        </h1>
      </div>

      {error && <Alert variant="error" title="Error" message={error} />}

      {roles.map((role) => (
        <Card key={role.roleId}>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {role.roleName}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {role.permissions.map((perm) => (
              <div
                key={perm.name}
                className="flex items-center space-x-2 p-2 bg-gray-50 rounded"
              >
                <div
                  className={`w-4 h-4 rounded ${
                    perm.granted
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">
                    {perm.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {perm.category}
                  </p>
                </div>
                <Badge
                  variant={perm.granted ? 'success' : 'danger'}
                  size="sm"
                >
                  {perm.granted ? '✓' : '✗'}
                </Badge>
              </div>
            ))}
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
          >
            Editar Permisos
          </Button>
        </Card>
      ))}

      <Button variant="primary">
        Añadir Nuevo Rol
      </Button>
    </div>
  );
};

export default RolePermissionMatrixPage;