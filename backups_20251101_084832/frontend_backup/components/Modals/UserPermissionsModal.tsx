import React, { useState, useEffect } from 'react';
import { BaseModal } from '../Common/BaseModal';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';
import { Alert } from '../Common/Alert';
import { Loading } from '../Common/Loading';
import { CheckCircle, XCircle } from 'lucide-react';
import { ApiService } from '../../api';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  isGranted: boolean;
}

interface UserPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  readOnly?: boolean;
}

export const UserPermissionsModal: React.FC<UserPermissionsModalProps> = ({
  isOpen,
  onClose,
  userId,
  readOnly = false,
}) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (isOpen && userId) {
      fetchPermissions();
    }
  }, [isOpen, userId]);

  const fetchPermissions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ApiService.staticGet(
        `/users/${userId}/permissions`
      );
      setPermissions((response as any).permissions || []);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Error cargando permisos'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = async (permissionId: string) => {
    const updatedPermissions = permissions.map((p) =>
      p.id === permissionId ? { ...p, isGranted: !p.isGranted } : p
    );
    setPermissions(updatedPermissions);

    setIsSaving(true);
    setError(null);

    try {
      const permission = updatedPermissions.find(
        (p) => p.id === permissionId
      );
      await ApiService.staticPut(
        `/users/${userId}/permissions/${permissionId}`,
        { granted: permission?.isGranted }
      );
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Error actualizando permiso'
      );
      // Revert change
      fetchPermissions();
    } finally {
      setIsSaving(false);
    }
  };

  const categories = Array.from(
    new Set(permissions.map((p) => p.category))
  );
  const filteredPermissions =
    selectedCategory === 'all'
      ? permissions
      : permissions.filter((p) => p.category === selectedCategory);

  if (isLoading) {
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="Permisos del Usuario"
      >
        <Loading message="Cargando permisos..." />
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Permisos del Usuario"
      size="lg"
    >
      {error && <Alert variant="error" title="Error" message={error} />}

      <div className="space-y-4">
        <div className="flex space-x-2 pb-4 border-b overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredPermissions.map((permission) => (
            <div
              key={permission.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
            >
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800">
                  {permission.name}
                </h4>
                <p className="text-sm text-gray-600">
                  {permission.description}
                </p>
              </div>

              {!readOnly ? (
                <button
                  onClick={() => togglePermission(permission.id)}
                  disabled={isSaving}
                  className="ml-4"
                >
                  {permission.isGranted ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-gray-400" />
                  )}
                </button>
              ) : (
                <Badge
                  variant={
                    permission.isGranted ? 'success' : 'danger'
                  }
                >
                  {permission.isGranted ? 'Otorgado' : 'Denegado'}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2 mt-6">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        {!readOnly && (
          <Button
            variant="primary"
            onClick={onClose}
            disabled={isSaving}
          >
            Guardar
          </Button>
        )}
      </div>
    </BaseModal>
  );
};