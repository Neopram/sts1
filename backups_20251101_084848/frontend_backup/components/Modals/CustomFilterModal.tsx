import React, { useState } from 'react';
import { BaseModal } from '../Common/BaseModal';
import { Button } from '../Common/Button';
import { Input } from '../Common/Input';
import { Select } from '../Common/Select';
import { Alert } from '../Common/Alert';
import { X, Plus } from 'lucide-react';
import { ApiService } from '../../api';

interface FilterCondition {
  field: string;
  operator: 'eq' | 'contains' | 'gt' | 'lt' | 'between';
  value: string;
  value2?: string;
}

interface CustomFilter {
  name: string;
  conditions: FilterCondition[];
  isPublic: boolean;
}

interface CustomFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter?: (filter: CustomFilter) => void;
}

export const CustomFilterModal: React.FC<CustomFilterModalProps> = ({
  isOpen,
  onClose,
  onApplyFilter,
}) => {
  const [filter, setFilter] = useState<CustomFilter>({
    name: '',
    conditions: [
      { field: 'status', operator: 'eq', value: '' },
    ],
    isPublic: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fieldOptions = [
    { value: 'status', label: 'Estado' },
    { value: 'type', label: 'Tipo' },
    { value: 'createdDate', label: 'Fecha de Creación' },
    { value: 'owner', label: 'Propietario' },
    { value: 'priority', label: 'Prioridad' },
  ];

  const operatorOptions = [
    { value: 'eq', label: 'Es igual a' },
    { value: 'contains', label: 'Contiene' },
    { value: 'gt', label: 'Mayor que' },
    { value: 'lt', label: 'Menor que' },
    { value: 'between', label: 'Entre' },
  ];

  const addCondition = () => {
    setFilter({
      ...filter,
      conditions: [
        ...filter.conditions,
        { field: 'status', operator: 'eq', value: '' },
      ],
    });
  };

  const removeCondition = (index: number) => {
    setFilter({
      ...filter,
      conditions: filter.conditions.filter((_, i) => i !== index),
    });
  };

  const updateCondition = (
    index: number,
    key: string,
    value: string
  ) => {
    const newConditions = [...filter.conditions];
    (newConditions[index] as any)[key] = value;
    setFilter({ ...filter, conditions: newConditions });
  };

  const handleSaveFilter = async () => {
    if (!filter.name.trim()) {
      setError('Por favor ingresa un nombre para el filtro');
      return;
    }

    if (filter.conditions.some((c) => !c.value)) {
      setError(
        'Por favor completa todos los valores de los filtros'
      );
      return;
    }

    setError(null);

    try {
      await ApiService.staticPost('/custom-filters', filter);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Error guardando filtro'
      );
    }
  };

  const handleApplyFilter = () => {
    if (onApplyFilter) {
      onApplyFilter(filter);
    }
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Filtro Personalizado"
      size="md"
    >
      {error && <Alert variant="error" title="Error" message={error} />}
      {success && (
        <Alert
          variant="success"
          title="Éxito"
          message="Filtro guardado correctamente"
        />
      )}

      <div className="space-y-4">
        <Input
          label="Nombre del Filtro"
          placeholder="Ej: Documentos pendientes de validación"
          value={filter.name}
          onChange={(e) =>
            setFilter({ ...filter, name: e.target.value })
          }
        />

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Condiciones
          </label>

          {filter.conditions.map((condition, index) => (
            <div
              key={index}
              className="flex items-end space-x-2 p-3 bg-gray-50 rounded-lg"
            >
              <Select
                label={index === 0 ? 'Campo' : ''}
                options={fieldOptions}
                value={condition.field}
                onChange={(e) =>
                  updateCondition(index, 'field', (e as any).target.value)
                }
              />

              <Select
                label={index === 0 ? 'Operador' : ''}
                options={operatorOptions}
                value={condition.operator}
                onChange={(e) =>
                  updateCondition(
                    index,
                    'operator',
                    (e as any).target.value
                  )
                }
              />

              <Input
                label={index === 0 ? 'Valor' : ''}
                placeholder="Valor"
                value={condition.value}
                onChange={(e) =>
                  updateCondition(index, 'value', e.target.value)
                }
              />

              {condition.operator === 'between' && (
                <Input
                  placeholder="Valor 2"
                  value={condition.value2 || ''}
                  onChange={(e) =>
                    updateCondition(
                      index,
                      'value2',
                      e.target.value
                    )
                  }
                />
              )}

              <button
                onClick={() => removeCondition(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}

          <Button
            variant="secondary"
            size="sm"
            onClick={addCondition}
          >
            <Plus className="w-4 h-4 mr-2" /> Añadir condición
          </Button>
        </div>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={filter.isPublic}
            onChange={(e) =>
              setFilter({
                ...filter,
                isPublic: e.target.checked,
              })
            }
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-700">
            Hacer público para otros usuarios
          </span>
        </label>
      </div>

      <div className="flex justify-end space-x-2 mt-6">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleApplyFilter}>
          Aplicar
        </Button>
        <Button variant="success" onClick={handleSaveFilter}>
          Guardar
        </Button>
      </div>
    </BaseModal>
  );
};