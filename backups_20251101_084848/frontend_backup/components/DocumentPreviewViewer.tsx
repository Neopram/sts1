import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { loadPdfLib } from '../utils/pdfLoader';

interface DocumentPreviewViewerProps {
  fileBlob: Blob | null;
  loading?: boolean;
  error?: string | null;
  onError?: (error: string) => void;
}

export const DocumentPreviewViewer: React.FC<DocumentPreviewViewerProps> = ({
  fileBlob,
  loading = false,
  error = null,
  onError
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isRendering, setIsRendering] = useState(false);

  // Load PDF
  useEffect(() => {
    if (!fileBlob) {
      console.log('No fileBlob provided');
      return;
    }

    let isMounted = true;

    const loadPdf = async () => {
      try {
        console.log('Loading PDF.js library...');
        const pdfjs = await loadPdfLib();
        if (!isMounted) return;

        console.log('Loading PDF from blob...');
        const arrayBuffer = await fileBlob.arrayBuffer();
        if (!isMounted) return;
        
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        if (!isMounted) return;
        
        console.log('PDF loaded successfully, pages:', pdf.numPages);
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        setPdfError(null);
      } catch (err) {
        if (!isMounted) return;
        const errorMsg = err instanceof Error ? err.message : 'Failed to load PDF';
        console.error('PDF load error:', errorMsg);
        setPdfError(errorMsg);
        if (onError) onError(errorMsg);
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [fileBlob]);

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || isRendering) {
      return;
    }

    const renderPage = async () => {
      setIsRendering(true);
      try {
        console.log('Rendering page', currentPage);
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });

        console.log('Viewport:', { width: viewport.width, height: viewport.height, scale });

        const canvas = canvasRef.current;
        if (!canvas) {
          console.error('Canvas ref is null');
          return;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        console.log('Canvas dimensions set:', { width: canvas.width, height: canvas.height });

        const renderContext = {
          canvasContext: canvas.getContext('2d'),
          viewport: viewport
        };

        await page.render(renderContext).promise;
        console.log('Page rendered successfully');
      } catch (err) {
        console.error('Failed to render page:', err);
      } finally {
        setIsRendering(false);
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale, isRendering]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (numPages && currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-secondary-600">Loading document preview...</p>
        </div>
      </div>
    );
  }

  const displayError = error || pdfError;

  if (displayError) {
    return (
      <div className="bg-danger-50 border border-danger-200 rounded-xl p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-danger-500" />
          <div>
            <p className="text-danger-800 font-medium">{displayError}</p>
            <p className="text-danger-700 text-sm mt-1">Please try downloading the document again or contact support if the issue persists.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!fileBlob) {
    return (
      <div className="bg-secondary-50 border border-secondary-200 rounded-xl p-12 text-center">
        <p className="text-secondary-600">No document loaded</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-secondary-50 rounded-xl">
      {/* Toolbar */}
      <div className="bg-white border-b border-secondary-200 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-sm font-medium text-secondary-900 min-w-[100px] text-center">
            {currentPage} / {numPages || '?'}
          </div>

          <button
            onClick={handleNextPage}
            disabled={!numPages || currentPage === numPages}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setScale(Math.max(0.8, scale - 0.2))}
            className="px-3 py-1 text-sm bg-secondary-100 hover:bg-secondary-200 rounded-lg transition-colors duration-200"
            title="Zoom out"
          >
            −
          </button>

          <div className="text-sm font-medium text-secondary-900 min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </div>

          <button
            onClick={() => setScale(Math.min(2.0, scale + 0.2))}
            className="px-3 py-1 text-sm bg-secondary-100 hover:bg-secondary-200 rounded-lg transition-colors duration-200"
            title="Zoom in"
          >
            +
          </button>
        </div>
      </div>

      {/* PDF Canvas Viewer */}
      <div className="flex-1 overflow-auto flex justify-center items-start p-4">
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 relative inline-block">
          {isRendering && (
            <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-lg z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-secondary-600 text-sm">Rendering page...</p>
              </div>
            </div>
          )}
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              backgroundColor: '#f5f5f5'
            }}
          />
        </div>
      </div>
    </div>
  );
};