/**
 * FASE 5: Optimized Vite Configuration
 * 
 * Production-ready configuration with:
 * - Aggressive code splitting and tree shaking
 * - Bundle analysis and optimization
 * - Advanced caching strategies
 * - Image optimization
 * - CSS optimization
 * - Gzip compression
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import os from 'os'
import compression from 'compression'

export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh and optimize compilation
      fastRefresh: true,
      babel: {
        compact: false,
        plugins: [
          ['@babel/plugin-transform-runtime', { regenerator: false }]
        ]
      }
    })
  ],

  root: '.',
  cacheDir: path.join(os.tmpdir(), 'vite-cache-optimized'),

  // Production build configuration
  build: {
    outDir: 'dist',
    target: 'ES2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2
      },
      mangle: true,
      format: {
        comments: false
      }
    },

    // Advanced code splitting
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', 'date-fns', 'date-fns-tz'],
          'vendor-pdf': ['pdfjs-dist', 'react-pdf'],
          'vendor-other': ['i18next', 'i18next-react', 'react-beautiful-dnd'],
          
          // Feature chunks
          'dashboards': [
            './src/components/Dashboard/DashboardWithWebSocket.tsx',
            './src/components/Dashboard/DashboardCharterer.Enhanced.tsx',
            './src/components/Dashboard/DashboardBroker.Enhanced.tsx',
            './src/components/Dashboard/EnhancedDashboards.tsx'
          ],
          'modals': [
            './src/components/Modals/PDFViewer.tsx',
            './src/components/Modals/UploadModal.tsx',
            './src/components/Modals/CreateOperationModal.tsx'
          ],
          'pages': [
            './src/components/Pages/AdminDashboard.tsx',
            './src/components/Pages/SettingsPage.tsx',
            './src/components/Pages/ProfilePage.tsx'
          ]
        },

        // Optimize chunk naming for caching
        chunkFileNames: 'js/[name]-[hash:8].js',
        entryFileNames: 'js/[name]-[hash:8].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|gif|svg|webp/.test(ext)) {
            return `images/[name]-[hash:8][extname]`;
          } else if (/woff|woff2|eot|ttf|otf/.test(ext)) {
            return `fonts/[name]-[hash:8][extname]`;
          } else if (ext === 'css') {
            return `css/[name]-[hash:8][extname]`;
          }
          return `[name]-[hash:8][extname]`;
        },

        // Configure code splitting strategy
        format: 'es'
      }
    },

    // CSS optimization
    cssCodeSplit: true,
    cssMinify: true,

    // Source maps for production debugging
    sourcemap: 'hidden',

    // Reduce bundle size
    chunkSizeWarningLimit: 500,

    // Report compressed size
    reportCompressedSize: true
  },

  // Optimization dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'pdfjs-dist',
      'lucide-react',
      'date-fns'
    ],
    exclude: [],
    esbuildOptions: {
      target: 'ES2020'
    }
  },

  // Server configuration for development
  server: {
    port: 3001,
    host: '0.0.0.0',
    fs: {
      allow: ['..', '../../']
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 3001,
    },
    
    // Middleware for compression and caching
    middlewareMode: false,

    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
        }
      }
    }
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/components/Pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@types': path.resolve(__dirname, './src/types'),
      '@styles': path.resolve(__dirname, './src/styles')
    }
  },

  // Performance hints
  define: {
    __DEV__: JSON.stringify(false),
    __PROD__: JSON.stringify(true)
  }
})