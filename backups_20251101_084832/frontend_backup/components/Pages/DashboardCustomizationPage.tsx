import React, { useState } from 'react';
import { Palette } from 'lucide-react';
import { Button } from '../Common/Button';
import { Card } from '../Common/Card';
import { Badge } from '../Common/Badge';

interface DashboardWidget {
  id: string;
  name: string;
  enabled: boolean;
  position: number;
}

export const DashboardCustomizationPage: React.FC = () => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([
    {
      id: '1',
      name: 'Estadísticas Generales',
      enabled: true,
      position: 1,
    },
    {
      id: '2',
      name: 'Documentos Pendientes',
      enabled: true,
      position: 2,
    },
    {
      id: '3',
      name: 'Actividad Reciente',
      enabled: true,
      position: 3,
    },
    {
      id: '4',
      name: 'Alertas Importantes',
      enabled: false,
      position: 4,
    },
  ]);

  const toggleWidget = (id: string) => {
    setWidgets(
      widgets.map((w) =>
        w.id === id ? { ...w, enabled: !w.enabled } : w
      )
    );
  };

  const moveWidget = (id: string, direction: 'up' | 'down') => {
    const idx = widgets.findIndex((w) => w.id === id);
    if (
      (direction === 'up' && idx > 0) ||
      (direction === 'down' && idx < widgets.length - 1)
    ) {
      const newWidgets = [...widgets];
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      [newWidgets[idx], newWidgets[newIdx]] = [
        newWidgets[newIdx],
        newWidgets[idx],
      ];
      setWidgets(newWidgets);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Palette className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">
          Personalizar Dashboard
        </h1>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Widgets Disponibles
        </h2>

        <div className="space-y-3">
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className={`p-4 border-2 rounded-lg flex items-center justify-between ${
                widget.enabled
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">
                  {widget.name}
                </h3>
                <Badge
                  variant={widget.enabled ? 'success' : 'default'}
                  size="sm"
                >
                  {widget.enabled ? 'Habilitado' : 'Deshabilitado'}
                </Badge>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => moveWidget(widget.id, 'up')}
                  className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveWidget(widget.id, 'down')}
                  className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  ↓
                </button>
                <button
                  onClick={() => toggleWidget(widget.id)}
                  className={`px-3 py-1 rounded font-medium transition ${
                    widget.enabled
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {widget.enabled ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex space-x-2">
        <Button variant="primary">Guardar Cambios</Button>
        <Button variant="secondary">
          Restaurar Predeterminados
        </Button>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Vista Previa
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {widgets
            .filter((w) => w.enabled)
            .map((widget) => (
              <div
                key={widget.id}
                className="p-4 bg-gray-100 rounded-lg border-2 border-gray-300 text-center"
              >
                <p className="text-gray-600 font-medium">
                  {widget.name}
                </p>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
};

export default DashboardCustomizationPage;