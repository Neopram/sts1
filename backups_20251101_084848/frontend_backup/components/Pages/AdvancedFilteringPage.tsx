import React, { useState } from 'react';
import { Sliders } from 'lucide-react';
import { Button } from '../Common/Button';
import { Input } from '../Common/Input';
import { Select } from '../Common/Select';
import { Card } from '../Common/Card';
import { Table } from '../Common/Table';
import { Badge } from '../Common/Badge';

interface FilterResult {
  id: string;
  name: string;
  type: string;
  status: string;
  createdDate: string;
}

export const AdvancedFilteringPage: React.FC = () => {
  const [filters, setFilters] = useState({
    searchTerm: '',
    type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  const [results, setResults] = useState<FilterResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleFilterChange = (field: string, value: string) => {
    setFilters({ ...filters, [field]: value });
  };

  const handleApplyFilters = () => {
    // Mock results
    setResults([
      {
        id: '1',
        name: 'Documento 1',
        type: 'Certificado',
        status: 'aprobado',
        createdDate: '2024-01-15',
      },
      {
        id: '2',
        name: 'Documento 2',
        type: 'Permiso',
        status: 'pendiente',
        createdDate: '2024-01-20',
      },
    ]);
    setShowResults(true);
  };

  const columns = [
    { key: 'id', label: 'ID', header: 'ID', accessor: 'id' },
    { key: 'name', label: 'Nombre', header: 'Nombre', accessor: 'name' },
    { key: 'type', label: 'Tipo', header: 'Tipo', accessor: 'type' },
    {
      key: 'status',
      label: 'Estado',
      header: 'Estado',
      accessor: 'status',
      render: (status: string) => (
        <Badge
          variant={status === 'aprobado' ? 'success' : 'warning'}
        >
          {status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Sliders className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">
          Filtrado Avanzado
        </h1>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Opciones de Filtro
        </h2>

        <div className="space-y-4">
          <Input
            label="Buscar"
            placeholder="Ingresa término de búsqueda..."
            value={filters.searchTerm}
            onChange={(e) =>
              handleFilterChange('searchTerm', e.target.value)
            }
          />

          <Select
            label="Tipo"
            options={[
              { value: '', label: 'Todos los tipos' },
              {
                value: 'certificado',
                label: 'Certificado',
              },
              { value: 'permiso', label: 'Permiso' },
              { value: 'documento', label: 'Documento' },
            ]}
            value={filters.type}
            onChange={(e) =>
              handleFilterChange('type', (e as any).target.value)
            }
          />

          <Select
            label="Estado"
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'aprobado', label: 'Aprobado' },
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'rechazado', label: 'Rechazado' },
            ]}
            value={filters.status}
            onChange={(e) =>
              handleFilterChange('status', (e as any).target.value)
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha Desde"
              type="date"
              value={filters.dateFrom}
              onChange={(e) =>
                handleFilterChange('dateFrom', (e as any).target.value)
              }
            />
            <Input
              label="Fecha Hasta"
              type="date"
              value={filters.dateTo}
              onChange={(e) =>
                handleFilterChange('dateTo', (e as any).target.value)
              }
            />
          </div>

          <div className="flex space-x-2">
            <Button variant="primary" onClick={handleApplyFilters}>
              Aplicar Filtros
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setFilters({
                  searchTerm: '',
                  type: '',
                  status: '',
                  dateFrom: '',
                  dateTo: '',
                });
                setShowResults(false);
              }}
            >
              Limpiar
            </Button>
          </div>
        </div>
      </Card>

      {showResults && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Resultados ({results.length} encontrados)
          </h2>

          {results.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No se encontraron resultados
            </p>
          ) : (
            <Table columns={columns} data={results} keyField="id" />
          )}
        </Card>
      )}
    </div>
  );
};

export default AdvancedFilteringPage;