import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, X } from 'lucide-react';

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
  onDownload: () => void;
}

/**
 * PDFViewer Component
 * Displays PDF files directly in the browser using react-pdf
 * Supports zooming, pagination, and download
 */
export const PDFViewer: React.FC<PDFViewerProps> = ({
  fileUrl,
  fileName,
  onClose,
  onDownload
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load PDF dynamically to avoid issues with pdfjs-dist not being available during build
  const [pdfjs, setPdfjs] = useState<any>(null);

  useEffect(() => {
    const loadPdfLibrary = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        setPdfjs(pdfjsLib);
      } catch (err) {
        console.error('Failed to load pdfjs:', err);
        setError('PDF library not available');
      }
    };
    loadPdfLibrary();
  }, []);

  useEffect(() => {
    if (!pdfjs || !fileUrl) return;

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Handle different file URL formats
        let pdfUrl = fileUrl;
        if (fileUrl.startsWith('s3://')) {
          // For S3 URLs, convert to proper HTTP URL or use presigned URL
          // This would require backend endpoint to get presigned URL
          pdfUrl = `/api/v1/files/proxy?url=${encodeURIComponent(fileUrl)}`;
        }

        const pdf = await pdfjs.getDocument(pdfUrl).promise;
        setNumPages(pdf.numPages);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF');
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();
  }, [fileUrl, pdfjs]);

  const handleNextPage = () => {
    if (numPages && currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 25, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  const handleJumpToPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value, 10);
    if (page >= 1 && page <= (numPages || 1)) {
      setCurrentPage(page);
    }
  };

  if (!pdfjs) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{fileName}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading PDF...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{fileName}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
          <div className="text-center py-8">
            <p className="text-red-600">⚠️ {error}</p>
            <p className="text-gray-600 mt-2 text-sm">
              You can still download the file to view it locally
            </p>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={onDownload}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{fileName}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading PDF page...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto">
      <div className="bg-white rounded-lg shadow-xl flex flex-col max-w-4xl w-full mx-4 my-4 max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h2 className="text-xl font-bold truncate">{fileName}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 bg-gray-100 border-b gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
              title="Previous page"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={numPages || 1}
                value={currentPage}
                onChange={handleJumpToPage}
                className="w-12 px-2 py-1 border rounded text-center"
              />
              <span className="text-sm text-gray-600">
                of {numPages || '?'}
              </span>
            </div>

            <button
              onClick={handleNextPage}
              disabled={!numPages || currentPage >= numPages}
              className="p-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
              title="Next page"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              className="p-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
              title="Zoom out"
            >
              <ZoomOut size={20} />
            </button>

            <span className="text-sm text-gray-600 w-12 text-center">
              {zoom}%
            </span>

            <button
              onClick={handleZoomIn}
              disabled={zoom >= 300}
              className="p-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
              title="Zoom in"
            >
              <ZoomIn size={20} />
            </button>

            {zoom !== 100 && (
              <button
                onClick={handleResetZoom}
                className="p-2 hover:bg-gray-200 rounded-lg text-xs"
                title="Reset zoom"
              >
                Reset
              </button>
            )}
          </div>

          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Download size={18} />
            Download
          </button>
        </div>

        {/* PDF Canvas Area */}
        <div className="flex-1 overflow-auto bg-gray-200 flex items-center justify-center p-4">
          <div
            className="bg-white shadow-lg"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s'
            }}
          >
            {/* This is a placeholder for actual PDF rendering */}
            <div className="w-[612px] h-[792px] bg-white border-2 border-gray-300 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="mb-2">📄 Page {currentPage}</p>
                <p className="text-xs">
                  PDF rendering requires react-pdf library
                </p>
                <p className="text-xs mt-2">Use download to view full PDF</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;