import React, { useState, useEffect } from 'react';
import { BaseModal } from '../Common/BaseModal';
import { Button } from '../Common/Button';
import { Alert } from '../Common/Alert';
import { Badge } from '../Common/Badge';
import { Loading } from '../Common/Loading';
import { ChevronDown, Check, X } from 'lucide-react';
import { ApiService } from '../../api';

interface ApprovalStep {
  id: string;
  name: string;
  role: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  timestamp?: string;
  comments?: string;
}

interface ApprovalWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  currentStep?: number;
}

export const ApprovalWorkflowModal: React.FC<ApprovalWorkflowModalProps> = ({
  isOpen,
  onClose,
  documentId,
}) => {
  const [steps, setSteps] = useState<ApprovalStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState('');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && documentId) {
      fetchWorkflow();
    }
  }, [isOpen, documentId]);

  const fetchWorkflow = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ApiService.staticGet(
        `/documents/${documentId}/approval-workflow`
      );
      setSteps((response as any).steps || []);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Error cargando flujo de aprobación'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (stepId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await ApiService.staticPost(
        `/documents/${documentId}/approve-step`,
        {
          step_id: stepId,
          comments: comments,
        }
      );

      await fetchWorkflow();
      setComments('');
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Error aprobando paso'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (stepId: string) => {
    if (!comments.trim()) {
      setError('Por favor proporciona un comentario para rechazar');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await ApiService.staticPost(
        `/documents/${documentId}/reject-step`,
        {
          step_id: stepId,
          comments: comments,
        }
      );

      await fetchWorkflow();
      setComments('');
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Error rechazando paso'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger'> = {
      approved: 'success',
      pending: 'warning',
      rejected: 'danger',
    };
    return <Badge variant={variants[status] || 'warning'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <BaseModal isOpen={isOpen} onClose={onClose} title="Flujo de Aprobación">
        <Loading message="Cargando flujo..." />
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Flujo de Aprobación de Documento"
      size="lg"
    >
      {error && <Alert variant="error" title="Error" message={error} />}

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="border rounded-lg overflow-hidden"
          >
            <button
              onClick={() =>
                setExpandedStep(
                  expandedStep === step.id ? null : step.id
                )
              }
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition"
            >
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-gray-700">
                  Paso {index + 1}
                </span>
                <span className="text-gray-600">{step.name}</span>
                <span className="text-sm text-gray-500">
                  ({step.role})
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(step.approvalStatus)}
                <ChevronDown
                  className={`w-4 h-4 transform transition ${
                    expandedStep === step.id ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {expandedStep === step.id && (
              <div className="border-t p-4 space-y-3">
                {step.timestamp && (
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Timestamp:</span>{' '}
                    {step.timestamp}
                  </p>
                )}

                {step.comments && (
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="text-sm font-semibold text-blue-900">
                      Comentarios:
                    </p>
                    <p className="text-sm text-blue-800">
                      {step.comments}
                    </p>
                  </div>
                )}

                {step.approvalStatus === 'pending' && (
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">
                      Comentarios
                    </label>
                    <textarea
                      placeholder="Añade tus comentarios..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex space-x-2">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleApprove(step.id)}
                        disabled={isLoading}
                      >
                        <Check className="w-4 h-4 mr-1" /> Aprobar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleReject(step.id)}
                        disabled={isLoading}
                      >
                        <X className="w-4 h-4 mr-1" /> Rechazar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-6">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </BaseModal>
  );
};