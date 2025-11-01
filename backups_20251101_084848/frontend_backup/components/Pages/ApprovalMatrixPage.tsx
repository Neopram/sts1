import React, { useState, useEffect } from 'react';
import { Grid } from 'lucide-react';
import { Card } from '../Common/Card';
import { Button } from '../Common/Button';
import { Alert } from '../Common/Alert';
import { Loading } from '../Common/Loading';
import { Badge } from '../Common/Badge';
import { ApiService } from '../../api';

interface ApprovalMatrix {
  id: string;
  documentType: string;
  role: string;
  canApprove: boolean;
  requiredCount: number;
  urgentThreshold: number;
}

export const ApprovalMatrixPage: React.FC = () => {
  const [matrix, setMatrix] = useState<ApprovalMatrix[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovalMatrix();
  }, []);

  const fetchApprovalMatrix = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ApiService.staticGet(
        '/approval-matrix'
      );
      setMatrix((response as any).matrix || []);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Error cargando matriz de aprobación'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Loading message="Cargando matriz de aprobación..." />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Grid className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">
          Matriz de Aprobación
        </h1>
      </div>

      {error && <Alert variant="error" title="Error" message={error} />}

      <Card>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Reglas de Aprobación
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-semibold">
                  Tipo de Documento
                </th>
                <th className="text-left py-2 px-2 font-semibold">
                  Rol
                </th>
                <th className="text-center py-2 px-2 font-semibold">
                  Puede Aprobar
                </th>
                <th className="text-center py-2 px-2 font-semibold">
                  Requeridos
                </th>
                <th className="text-center py-2 px-2 font-semibold">
                  Umbral Urgente
                </th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((item, idx) => (
                <tr
                  key={idx}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="py-3 px-2">
                    <Badge variant="info">
                      {item.documentType}
                    </Badge>
                  </td>
                  <td className="py-3 px-2">
                    <Badge variant="default">
                      {item.role}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-center">
                    {item.canApprove ? (
                      <Badge variant="success">✓ Sí</Badge>
                    ) : (
                      <Badge variant="danger">✗ No</Badge>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="font-semibold">
                      {item.requiredCount}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="text-sm text-gray-600">
                      {item.urgentThreshold} horas
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Button variant="primary">Editar Matriz</Button>
        <Button variant="secondary">
          Exportar Configuración
        </Button>
      </div>
    </div>
  );
};

export default ApprovalMatrixPage;