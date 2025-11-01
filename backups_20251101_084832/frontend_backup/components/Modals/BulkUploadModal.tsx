import React, { useState } from 'react';
import { BaseModal, Button, Alert } from '../Common';
import ApiService from '../../api';
import { Upload, X, CheckCircle } from 'lucide-react';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const newFileUploads: FileUpload[] = newFiles.map((file) => ({
      file,
      progress: 0,
      status: 'pending',
    }));
    setFiles([...files, ...newFileUploads]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (files.length === 0) {
      setError('Por favor selecciona al menos un archivo');
      return;
    }

    setIsUploading(true);
    setError(null);

    for (let i = 0; i < files.length; i++) {
      const fileUpload = files[i];
      if (fileUpload.status === 'success') continue;

      const formData = new FormData();
      formData.append('file', fileUpload.file);

      try {
        setFiles((prev) => {
          const updated = [...prev];
          updated[i].status = 'uploading';
          return updated;
        });

        await ApiService.uploadDocument('default', 'document', fileUpload.file);

        setFiles((prev) => {
          const updated = [...prev];
          updated[i].status = 'success';
          updated[i].progress = 100;
          return updated;
        });
      } catch (err: any) {
        setFiles((prev) => {
          const updated = [...prev];
          updated[i].status = 'error';
          updated[i].error = 'Error en la subida';
          return updated;
        });
      }
    }

    setIsUploading(false);

    if (files.every((f) => f.status === 'success')) {
      onSuccess?.();
      setTimeout(() => {
        setFiles([]);
        onClose();
      }, 1000);
    }
  };

  const successCount = files.filter((f) => f.status === 'success').length;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Subida en Lote de Documentos"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isUploading}>
            Cerrar
          </Button>
          {files.length > 0 && (
            <Button
              variant="primary"
              onClick={handleUploadAll}
              isLoading={isUploading}
            >
              Subir Todos ({files.length})
            </Button>
          )}
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
          <label htmlFor="bulk-upload" className="block">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
              <Upload size={32} className="mx-auto mb-2 text-gray-400" />
              <p className="text-gray-600 font-medium">Arrastra archivos aqui</p>
              <p className="text-gray-400 text-sm">o haz clic para seleccionar</p>
              <input
                id="bulk-upload"
                type="file"
                multiple
                onChange={handleFilesSelected}
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.png"
              />
            </div>
          </label>
        </div>

        {files.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">
              Archivos ({successCount}/{files.length} completados)
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {files.map((fileUpload, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-grow">
                    <p className="text-sm font-medium text-gray-900">
                      {fileUpload.file.name}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${fileUpload.progress}%` }}
                      />
                    </div>
                  </div>

                  {fileUpload.status === 'success' && (
                    <CheckCircle
                      size={20}
                      className="text-green-600 ml-2"
                    />
                  )}

                  {fileUpload.status !== 'success' && (
                    <button
                      onClick={() => handleRemoveFile(idx)}
                      disabled={isUploading}
                      className="ml-2 text-gray-400 hover:text-red-600"
                    >
                      <X size={20} />
                    </button>
                  )}

                  {fileUpload.status === 'error' && (
                    <p className="text-red-600 text-xs ml-2">{fileUpload.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
};

export default BulkUploadModal;