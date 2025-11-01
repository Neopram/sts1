import React, { useState } from 'react';
import { BaseModal, Button, Select, Alert } from '../Common';
import ApiService from '../../api';
import { Download } from 'lucide-react';

type ExportType = 'documents' | 'users' | 'activities' | 'operations' | 'approvals';
type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataType: ExportType;
  filters?: Record<string, any>;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  dataType,
}) => {
  const [format, setFormat] = useState<ExportFormat>('excel');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const formatOptions = [
    { value: 'csv', label: 'CSV (Hoja de Calculo)' },
    { value: 'excel', label: 'Excel (.xlsx)' },
    { value: 'pdf', label: 'PDF (Reporte)' },
    { value: 'json', label: 'JSON (Datos Crudos)' },
  ];

  const dataTypeLabels: Record<ExportType, string> = {
    documents: 'Documentos',
    users: 'Usuarios',
    activities: 'Actividades',
    operations: 'Operaciones',
    approvals: 'Aprobaciones',
  };

  const handleExport = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await ApiService.staticGet(
        `/export/${dataType}?format=${format}`
      );

      const url = window.URL.createObjectURL(new Blob([(response as any).data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `${dataType}-export-${new Date().getTime()}.${format}`
      );
      document.body.appendChild(link);
      link.click();
      link.parentElement?.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setFormat('excel');
      }, 1500);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Error al exportar datos. Por favor intenta de nuevo.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="Exportacion Completada"
      >
        <div className="text-center py-8">
          <div className="text-4xl mb-4">✅</div>
          <p className="text-gray-700 font-medium">
            Archivo descargado exitosamente
          </p>
          <p className="text-gray-500 text-sm mt-2">
            {dataTypeLabels[dataType]} en formato {format.toUpperCase()}
          </p>
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Exportar ${dataTypeLabels[dataType]}`}
      size="md"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            isLoading={isLoading}
            icon={!isLoading && <Download size={18} />}
          >
            Descargar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <Alert
            variant="error"
            message={error}
            onClose={() => setError(null)}
          />
        )}

        <Select
          label="Formato de Exportacion"
          options={formatOptions}
          value={format}
          onChange={(value) => setFormat(value as ExportFormat)}
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Formato seleccionado:</strong> {format.toUpperCase()}
          </p>
          <p className="text-xs text-blue-700 mt-2">
            {format === 'excel' &&
              'Descargara un archivo .xlsx compatible con Microsoft Excel'}
            {format === 'csv' &&
              'Descargara un archivo .csv compatible con cualquier programa de hoja de calculo'}
            {format === 'pdf' &&
              'Descargara un reporte en PDF con formato profesional'}
            {format === 'json' &&
              'Descargara los datos crudos en formato JSON para importacion a otros sistemas'}
          </p>
        </div>
      </div>
    </BaseModal>
  );
};

export default ExportModal;