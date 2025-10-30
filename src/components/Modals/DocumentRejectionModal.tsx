import React, { useState } from 'react';
import { BaseModal, Button, Alert } from '../Common';
import ApiService from '../../api';
import { AlertCircle } from 'lucide-react';

interface DocumentRejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  onSuccess?: () => void;
}

/**
 * Modal para rechazar documentos con razón y comentarios
 */
export const DocumentRejectionModal: React.FC<DocumentRejectionModalProps> = ({
  isOpen,
  onClose,
  documentId,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('La razon del rechazo es requerida');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await ApiService.staticPost(`/documents/${documentId}/reject`, {
        reason,
        comments,
      });

      onSuccess?.();
      setReason('');
      setComments('');
      onClose();
    } catch (err: any) {
      setError('Error al rechazar documento');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Rechazar Documento"
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
            variant="danger"
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            Rechazar
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

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Razón del Rechazo *
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar razón...</option>
            <option value="incomplete">Documento Incompleto</option>
            <option value="invalid">Documento Inválido</option>
            <option value="expired">Documento Expirado</option>
            <option value="illegible">Documento Ilegible</option>
            <option value="incorrect_format">Formato Incorrecto</option>
            <option value="other">Otro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Comentarios Adicionales
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Proporciona detalles adicionales..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-3">
          <AlertCircle size={20} className="text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            El usuario será notificado sobre el rechazo y podrá subir un nuevo documento.
          </p>
        </div>
      </div>
    </BaseModal>
  );
};

export default DocumentRejectionModal;