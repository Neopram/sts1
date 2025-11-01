// Import pdf.js from npm package
import * as pdfjsLib from 'pdfjs-dist';

// Import the worker as a URL
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure the worker
const initPdfWorker = () => {
  // Use the worker from the npm package imported via Vite
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  console.log('PDF.js worker configured from npm package:', pdfWorkerUrl);
};

let initialized = false;

export const loadPdfLib = (): Promise<typeof pdfjsLib> => {
  return new Promise((resolve, reject) => {
    try {
      if (!initialized) {
        initPdfWorker();
        initialized = true;
      }
      console.log('PDF.js library ready');
      resolve(pdfjsLib);
    } catch (err) {
      console.error('Failed to initialize PDF.js:', err);
      reject(err);
    }
  });
};

export { pdfjsLib };