import React from 'react';
import { Download, X, ExternalLink } from 'lucide-react';

interface SimplePDFViewerProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
  onDownload: () => void;
}

/**
 * Simple PDF Viewer Component
 * Uses iframe for reliable PDF display across all browsers
 * No external dependencies required
 */
export const SimplePDFViewer: React.FC<SimplePDFViewerProps> = ({
  fileUrl,
  fileName,
  onClose,
  onDownload
}) => {
  // Convert S3 URLs to proper download URLs if needed
  const getDisplayUrl = () => {
    if (fileUrl.startsWith('s3://')) {
      // For S3 URLs, we'd need a backend endpoint to serve them
      // For now, use download URL
      return fileUrl;
    }
    return fileUrl;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl flex flex-col w-full max-w-5xl max-h-[90vh] mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">{fileName}</h2>
            <p className="text-xs text-gray-500 truncate">{fileUrl}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg ml-2 flex-shrink-0"
            title="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 p-3 bg-gray-100 border-b">
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            title="Download PDF"
          >
            <Download size={16} />
            Download
          </button>
          <a
            href={getDisplayUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
            title="Open in new tab"
          >
            <ExternalLink size={16} />
            Open
          </a>
        </div>

        {/* PDF Display Area */}
        <div className="flex-1 overflow-hidden bg-gray-200">
          <iframe
            src={`${getDisplayUrl()}#toolbar=1&navpanes=0&scrollbar=1`}
            className="w-full h-full border-none"
            title={fileName}
            onError={(e) => {
              console.error('PDF viewer error:', e);
            }}
          />
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimplePDFViewer;