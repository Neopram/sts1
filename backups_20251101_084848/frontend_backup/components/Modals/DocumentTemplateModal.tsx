import React, { useState, useEffect } from 'react';
import { BaseModal } from '../Common/BaseModal';
import { Button } from '../Common/Button';
import { Select } from '../Common/Select';
import { Input } from '../Common/Input';
import { Alert } from '../Common/Alert';
import { Loading } from '../Common/Loading';
import { FileText, Download } from 'lucide-react';
import { ApiService } from '../../api';

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  createdDate: string;
  lastModified: string;
}

interface DocumentTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate?: (templateId: string) => void;
}

export const DocumentTemplateModal: React.FC<DocumentTemplateModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await ApiService.staticGet('/document-templates');
      setTemplates((response as any).templates || []);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Error cargando plantillas'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = async (templateId: string) => {
    try {
      const response = await ApiService.staticGet(
        `/document-templates/${templateId}/download`
      );
      const url = window.URL.createObjectURL(
        new Blob([(response as any).data])
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `template-${templateId}.docx`);
      document.body.appendChild(link);
      link.click();
      link.parentElement?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Error descargando plantilla'
      );
    }
  };

  const categories = Array.from(
    new Set(templates.map((t) => t.category))
  );

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory =
      selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch = t.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (isLoading) {
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="Plantillas de Documentos"
      >
        <Loading message="Cargando plantillas..." />
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Plantillas de Documentos"
      size="lg"
    >
      {error && <Alert variant="error" title="Error" message={error} />}

      <div className="space-y-4">
        <Input
          placeholder="Buscar plantillas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <Select
          label="Categoría"
          options={[
            { value: 'all', label: 'Todas las categorías' },
            ...categories.map((cat) => ({
              value: cat,
              label: cat,
            })),
          ]}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory((e as any).target.value)}
        />

        {filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            No se encontraron plantillas
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="p-4 bg-gray-50 rounded-lg border hover:border-blue-300 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">
                      {template.name}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {template.description}
                    </p>
                    <div className="flex space-x-4 mt-2 text-xs text-gray-500">
                      <span>v{template.version}</span>
                      <span>
                        Modificado:{' '}
                        {template.lastModified}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        handleDownloadTemplate(template.id)
                      }
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {onSelectTemplate && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          onSelectTemplate(template.id)
                        }
                      >
                        Usar
                      </Button>
                    )}
                  </div>
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