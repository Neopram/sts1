import React, { useState } from 'react';
import { BaseModal } from '../Common/BaseModal';
import { Button } from '../Common/Button';
import { Input } from '../Common/Input';
import { Select } from '../Common/Select';
import { Alert } from '../Common/Alert';
import { FileText, Download } from 'lucide-react';
import { ApiService } from '../../api';

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [reportType, setReportType] = useState('summary');
  const [format, setFormat] = useState('pdf');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reportTypes = [
    { value: 'summary', label: 'Resumen Ejecutivo' },
    { value: 'detailed', label: 'Detallado' },
    { value: 'documents', label: 'Documentos' },
    { value: 'approvals', label: 'Aprobaciones' },
    { value: 'users', label: 'Usuarios' },
    { value: 'operations', label: 'Operaciones' },
  ];

  const formats = [
    { value: 'pdf', label: 'PDF' },
    { value: 'excel', label: 'Excel' },
    { value: 'csv', label: 'CSV' },
  ];

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      setError('Por favor selecciona fecha de inicio y fin');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await ApiService.staticPost(
      '/reports/generate',
      {
        report_type: reportType,
        format: format,
        start_date: startDate,
        end_date: endDate,
      }
    ) as any;

      const url = window.URL.createObjectURL(
        new Blob([(response as any).data])
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `report-${reportType}-${new Date().getTime()}.${format}`
      );
      document.body.appendChild(link);
      link.click();
      link.parentElement?.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Error generando reporte'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Generar Reporte"
      size="md"
    >
      {error && <Alert variant="error" title="Error" message={error} />}
      {success && (
        <Alert
          variant="success"
          title="Éxito"
          message="Reporte generado y descargado"
        />
      )}

      <div className="space-y-4">
        <Select
          label="Tipo de Reporte"
          options={reportTypes}
          value={reportType}
          onChange={(e) => setReportType((e as any).target.value)}
        />

        <Select
          label="Formato de Salida"
          options={formats}
          value={format}
          onChange={(e) => setFormat((e as any).target.value)}
        />

        <Input
          label="Fecha de Inicio"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate((e as any).target.value)}
        />

        <Input
          label="Fecha de Fin"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate((e as any).target.value)}
        />

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex space-x-2 text-sm text-blue-800">
            <FileText className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Información</p>
              <p>
                El reporte incluirá todos los registros en el
                rango de fechas seleccionado.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2 mt-6">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isGenerating}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleGenerateReport}
          disabled={isGenerating}
        >
          <Download className="w-4 h-4 mr-2" />
          {isGenerating ? 'Generando...' : 'Generar'}
        </Button>
      </div>
    </BaseModal>
  );
};