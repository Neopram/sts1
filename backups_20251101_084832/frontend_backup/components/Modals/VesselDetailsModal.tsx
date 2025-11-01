import React, { useState, useEffect } from 'react';
import { BaseModal } from '../Common/BaseModal';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';
import { Alert } from '../Common/Alert';
import { Loading } from '../Common/Loading';
import { Ship, Calendar, Flag } from 'lucide-react';
import { ApiService } from '../../api';

interface VesselDetails {
  imo: string;
  name: string;
  flag: string;
  type: string;
  class: string;
  length: number;
  breadth: number;
  buildYear: number;
  owner: string;
  lastInspection?: string;
  sanctionsStatus: 'clear' | 'flagged' | 'banned';
  certifications: string[];
}

interface VesselDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vesselId: string;
}

export const VesselDetailsModal: React.FC<VesselDetailsModalProps> = ({
  isOpen,
  onClose,
  vesselId,
}) => {
  const [vessel, setVessel] = useState<VesselDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && vesselId) {
      fetchVesselDetails();
    }
  }, [isOpen, vesselId]);

  const fetchVesselDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ApiService.staticGet(
        `/vessels/${vesselId}`
      );
      setVessel((response as any).vessel || (response as any));
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Error cargando detalles del buque'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getSanctionsBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger'> = {
      clear: 'success',
      flagged: 'warning',
      banned: 'danger',
    };
    const labels: Record<string, string> = {
      clear: 'Sin Sanciones',
      flagged: 'Señalado',
      banned: 'Prohibido',
    };
    return (
      <Badge variant={variants[status] || 'warning'}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="Detalles del Buque"
      >
        <Loading message="Cargando detalles..." />
      </BaseModal>
    );
  }

  if (!vessel) {
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="Detalles del Buque"
      >
        <Alert
          variant="error"
          title="Error"
          message="No se pudieron cargar los detalles del buque"
        />
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalles del Buque"
      size="lg"
    >
      {error && <Alert variant="error" title="Error" message={error} />}

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">IMO</p>
            <p className="text-lg font-semibold text-gray-800">
              {vessel.imo}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Nombre</p>
            <p className="text-lg font-semibold text-gray-800">
              {vessel.name}
            </p>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Flag className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Bandera</p>
                <p className="font-semibold text-gray-800">
                  {vessel.flag}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Ship className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Tipo</p>
                <p className="font-semibold text-gray-800">
                  {vessel.type}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Clase</p>
              <p className="font-semibold text-gray-800">
                {vessel.class}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Año de construcción</p>
              <p className="font-semibold text-gray-800">
                {vessel.buildYear}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Largo (m)</p>
              <p className="font-semibold text-gray-800">
                {vessel.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Ancho (m)</p>
              <p className="font-semibold text-gray-800">
                {vessel.breadth}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Propietario</p>
            <p className="font-semibold text-gray-800">
              {vessel.owner}
            </p>
          </div>
        </div>

        {vessel.lastInspection && (
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Última inspección</p>
                <p className="font-semibold text-gray-800">
                  {vessel.lastInspection}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <p className="text-sm font-semibold text-gray-600 mb-2">
            Estado de Sanciones
          </p>
          {getSanctionsBadge(vessel.sanctionsStatus)}
        </div>

        {vessel.certifications.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-600 mb-2">
              Certificaciones
            </p>
            <div className="flex flex-wrap gap-2">
              {vessel.certifications.map((cert) => (
                <Badge key={cert} variant="success">
                  {cert}
                </Badge>
              ))}
            </div>
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