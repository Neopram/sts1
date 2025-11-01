import React, { useState, useEffect } from 'react';
import { BaseModal } from '../Common/BaseModal';
import { Button } from '../Common/Button';
import { Alert } from '../Common/Alert';
import { Loading } from '../Common/Loading';
import { Bell, ToggleRight } from 'lucide-react';
import { ApiService } from '../../api';

interface AlertConfig {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'in_app';
  trigger: string;
  enabled: boolean;
  recipients?: string[];
  frequency?: string;
}

interface AlertConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlertConfigurationModal: React.FC<AlertConfigurationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen]);

  const fetchAlerts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ApiService.staticGet(
        '/alert-configurations'
      );
      setAlerts((response as any).alerts || []);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Error cargando configuraciones'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAlert = async (alertId: string, enabled: boolean) => {
    const updatedAlerts = alerts.map((a) =>
      a.id === alertId ? { ...a, enabled } : a
    );
    setAlerts(updatedAlerts);

    try {
      await ApiService.staticPut(
        `/alert-configurations/${alertId}`,
        { enabled }
      );
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Error actualizando alerta'
      );
      fetchAlerts();
    }
  };

  if (isLoading) {
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="Configurar Alertas"
      >
        <Loading message="Cargando alertas..." />
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurar Alertas"
      size="lg"
    >
      {error && <Alert variant="error" title="Error" message={error} />}

      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            No hay alertas configuradas
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">
                      {alert.name}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Tipo: {alert.type} | Disparador: {alert.trigger}
                    </p>
                    {alert.frequency && (
                      <p className="text-sm text-gray-600">
                        Frecuencia: {alert.frequency}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() =>
                      toggleAlert(alert.id, !alert.enabled)
                    }
                    className={`ml-4 p-2 rounded transition ${
                      alert.enabled
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <ToggleRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
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