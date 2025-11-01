/**
 * FASE 5: Lazy Loading & Code Splitting Optimizer
 * 
 * Utilities for optimizing bundle size and implementing intelligent lazy loading:
 * - Dynamic import with preloading strategies
 * - Route-based code splitting
 * - Component lazy loading with error boundaries
 * - Image optimization and lazy loading
 * - Prefetching strategies based on route visibility
 */

import React, { Suspense, ComponentType } from 'react';

export interface LazyLoadConfig {
  preload?: boolean;
  prefetch?: boolean;
  timeout?: number;
  fallback?: React.ReactNode;
}

/**
 * Create a lazy-loaded component with error handling and preloading
 */
export const createLazyComponent = <P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  config: LazyLoadConfig = {}
) => {
  const Component = React.lazy(importFunc);

  // Preload component if requested
  if (config.preload) {
    importFunc().catch(err => console.error('Preload error:', err));
  }

  return Component;
};

/**
 * Prefetch a route before user navigation
 */
export const prefetchRoute = (importFunc: () => Promise<any>) => {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => {
      importFunc().catch(err => console.error('Prefetch error:', err));
    });
  } else {
    setTimeout(() => {
      importFunc().catch(err => console.error('Prefetch error:', err));
    }, 2000);
  }
};

/**
 * Batch lazy load multiple components
 */
export const batchLazyLoad = (
  components: Record<string, () => Promise<{ default: ComponentType<any> }>>
) => {
  return Object.entries(components).reduce((acc, [key, importFunc]) => {
    acc[key] = createLazyComponent(importFunc);
    return acc;
  }, {} as Record<string, ComponentType<any>>);
};

/**
 * Image lazy loading with intersection observer
 */
export const useImageLazyLoad = (ref: React.RefObject<HTMLImageElement>) => {
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              observer.unobserve(img);
            }
          }
        });
      },
      { rootMargin: '50px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [ref]);
};

/**
 * Intelligent prefetching based on predicted next route
 */
export const usePrefetchStrategy = (predictedRoutes: Array<() => Promise<any>>) => {
  React.useEffect(() => {
    predictedRoutes.forEach(importFunc => {
      prefetchRoute(importFunc);
    });
  }, [predictedRoutes]);
};

/**
 * Chunk loading monitor for bundle optimization
 */
export class ChunkLoadMonitor {
  private static chunks: Map<string, { size: number; loaded: boolean }> = new Map();

  static registerChunk(name: string, size: number) {
    this.chunks.set(name, { size, loaded: false });
  }

  static markLoaded(name: string) {
    const chunk = this.chunks.get(name);
    if (chunk) {
      chunk.loaded = true;
    }
  }

  static getMetrics() {
    const total = Array.from(this.chunks.values()).reduce((sum, c) => sum + c.size, 0);
    const loaded = Array.from(this.chunks.values())
      .filter(c => c.loaded)
      .reduce((sum, c) => sum + c.size, 0);
    
    return {
      totalSize: total,
      loadedSize: loaded,
      loadedPercent: (loaded / total) * 100,
      chunks: Array.from(this.chunks.entries()).map(([name, data]) => ({
        name,
        ...data
      }))
    };
  }

  static reset() {
    this.chunks.clear();
  }
}

/**
 * Virtual scroll for large lists (helps with performance)
 */
export class VirtualScrollOptimizer {
  static calculateVisibleItems(
    itemHeight: number,
    containerHeight: number,
    scrollTop: number,
    items: any[]
  ) {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + 2
    );

    return {
      startIndex,
      endIndex,
      visibleItems: items.slice(startIndex, endIndex),
      offsetY: startIndex * itemHeight
    };
  }
}

/**
 * Request animation frame debounce for scroll/resize events
 */
export const rafDebounce = (callback: () => void) => {
  let rafId: number;

  return () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(callback);
  };
};

/**
 * Service worker registration for offline support and caching
 */
export const registerServiceWorker = async (swPath: string = '/sw.js') => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(swPath);
      console.log('Service Worker registered:', registration);
      
      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60000);

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

/**
 * Font loading optimization
 */
export const optimizeFontLoading = () => {
  // Preload critical fonts
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = 'font/woff2';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap';
  document.head.appendChild(link);

  // Font loading strategy
  if ('fonts' in document) {
    Promise.all([
      (document.fonts as any).load('400 1em Inter'),
      (document.fonts as any).load('600 1em Inter'),
      (document.fonts as any).load('700 1em Inter')
    ]).then(() => {
      document.documentElement.classList.add('fonts-loaded');
    });
  }
};

/**
 * Batch DOM updates for better performance
 */
export class DOMBatcher {
  private updates: Array<() => void> = [];
  private scheduled = false;

  batch(update: () => void) {
    this.updates.push(update);
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.scheduled) return;
    this.scheduled = true;

    requestAnimationFrame(() => {
      this.flush();
    });
  }

  private flush() {
    this.updates.forEach(update => update());
    this.updates = [];
    this.scheduled = false;
  }
}

/**
 * Memoization helper for expensive computations
 */
export class MemoCache {
  private cache: Map<string, { value: any; timestamp: number }> = new Map();
  private ttl: number;

  constructor(ttl: number = 60000) {
    this.ttl = ttl;
  }

  get(key: string) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.value;
    }
    this.cache.delete(key);
    return null;
  }

  set(key: string, value: any) {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear() {
    this.cache.clear();
  }
}