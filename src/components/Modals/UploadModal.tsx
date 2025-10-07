import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Eye,
  Trash2
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { DocumentType } from '../../types/api';
import ApiService from '../../api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess
}) => {
  const { currentRoomId } = useApp();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragAreaRef = useRef<HTMLDivElement>(null);

  // Load document types
  const loadDocumentTypes = async () => {
    try {
      const types = await ApiService.getDocumentTypes();
      setDocumentTypes(types);
    } catch (err) {
      console.error('Error loading document types:', err);
      setError('Failed to load document types. Please try again.');
    }
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please select a PDF, Word document, image, or text file.');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size too large. Please select a file smaller than 10MB.');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview URL for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragAreaRef.current) {
      dragAreaRef.current.classList.add('border-blue-500', 'bg-blue-50');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragAreaRef.current) {
      dragAreaRef.current.classList.remove('border-blue-500', 'bg-blue-50');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragAreaRef.current) {
      dragAreaRef.current.classList.remove('border-blue-500', 'bg-blue-50');
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Remove selected file
  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentRoomId || !selectedFile || !documentType) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload document
      await ApiService.uploadDocument(
        currentRoomId,
        documentType,
        selectedFile,
        notes || undefined,
        expiresOn || undefined
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Show success message
      setSuccess('Document uploaded successfully!');
      
      // Reset form
      setTimeout(() => {
        setSelectedFile(null);
        setDocumentType('');
        setNotes('');
        setExpiresOn('');
        setPreviewUrl(null);
        setUploadProgress(0);
        setSuccess(null);
        
        if (onUploadSuccess) {
          onUploadSuccess();
        }
        
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Error uploading document:', err);
      setError('Failed to upload document. Please try again.');
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  // Load document types on mount
  useEffect(() => {
    if (isOpen) {
      loadDocumentTypes();
    }
  }, [isOpen]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <h2 className="text-xl font-semibold text-secondary-900">Upload Document</h2>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 bg-danger-50 border border-danger-200 rounded-xl p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-danger-400 mr-2" />
              <span className="text-danger-800">{error}</span>
            </div>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="mx-6 mt-4 bg-success-50 border border-success-200 rounded-xl p-6">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
              <span className="text-success-800">{success}</span>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploadProgress > 0 && (
          <div className="mx-6 mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-secondary-700">Upload Progress</span>
              <span className="text-sm text-secondary-500">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-secondary-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-200 duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Document File *
            </label>
            
            {!selectedFile ? (
              <div
                ref={dragAreaRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="border-2 border-dashed border-secondary-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors duration-200 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-secondary-400 mx-auto mb-6" />
                <p className="text-lg font-medium text-secondary-900 mb-2">
                  Drop your file here, or click to browse
                </p>
                <p className="text-sm text-secondary-500">
                  Supports PDF, Word, Excel, images, and text files (max 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                />
              </div>
            ) : (
              <div className="border border-secondary-200 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="font-medium text-secondary-900">{selectedFile.name}</p>
                      <p className="text-sm text-secondary-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {previewUrl && (
                      <button
                        type="button"
                        onClick={() => window.open(previewUrl, '_blank')}
                        className="p-2 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button
                      type="button"
                      onClick={removeFile}
                      className="p-2 text-danger-400 hover:text-danger-600 transition-colors duration-200"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Image Preview */}
                {previewUrl && selectedFile.type.startsWith('image/') && (
                  <div className="mt-4">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="max-w-full h-32 object-contain rounded border"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Document Type Selection */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Document Type *
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              required
              className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select document type</option>
              {documentTypes.map((type) => (
                <option key={type.code} value={type.code}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any additional notes about this document..."
            />
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Expires On (Optional)
            </label>
            <input
              type="date"
              value={expiresOn}
              onChange={(e) => setExpiresOn(e.target.value)}
              className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-secondary-500 mt-1">
              Leave blank if the document doesn't expire
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex gap-6 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-secondary-300 rounded-xl text-secondary-700 hover:bg-secondary-50 transition-colors duration-200"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={loading || !selectedFile || !documentType}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};