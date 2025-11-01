/**
 * Performance & Optimization Utilities - Phase 2.7
 * Comprehensive performance monitoring, caching, and optimization strategies
 */

import React from 'react';

// ===== CACHING SYSTEM =====

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  hits: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number = 100;
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, value: T, ttl: number = this.defaultTTL): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
      hits: 0
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.value as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  invalidatePattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalHits: Array.from(this.cache.values()).reduce((sum, e) => sum + e.hits, 0)
    };
  }
}

export const cacheManager = new CacheManager();

// ===== PERFORMANCE MONITORING =====

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  category: string;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 1000;
  private timers: Map<string, number> = new Map();

  startTimer(label: string): void {
    this.timers.set(label, performance.now());
  }

  endTimer(label: string, category: string = 'general', metadata?: Record<string, any>): PerformanceMetric | null {
    const startTime = this.timers.get(label);
    if (!startTime) {
      console.warn(`Timer "${label}" not found`);
      return null;
    }

    const duration = performance.now() - startTime;
    const metric: PerformanceMetric = {
      name: label,
      duration,
      timestamp: Date.now(),
      category,
      metadata
    };

    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    this.timers.delete(label);
    return metric;
  }

  recordMetric(name: string, duration: number, category: string = 'general', metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      category,
      metadata
    };
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  getMetrics(category?: string): PerformanceMetric[] {
    if (!category) return this.metrics;
    return this.metrics.filter(m => m.category === category);
  }

  getAverageTime(name: string): number {
    const relevant = this.metrics.filter(m => m.name === name);
    if (relevant.length === 0) return 0;
    return relevant.reduce((sum, m) => sum + m.duration, 0) / relevant.length;
  }

  getSlowOperations(threshold: number = 1000): PerformanceMetric[] {
    return this.metrics.filter(m => m.duration > threshold);
  }

  getSummary() {
    return {
      totalMetrics: this.metrics.length,
      avgDuration: this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length || 0,
      slowOperations: this.getSlowOperations().length,
      categories: Array.from(new Set(this.metrics.map(m => m.category)))
    };
  }

  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

// ===== LAZY LOADING UTILITIES =====

/**
 * Lazy load images with intersection observer
 */
export function useLazyImage(ref: React.RefObject<HTMLImageElement>) {
  React.useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
}

/**
 * Virtualize long lists for performance
 */
export interface VirtualListItem {
  id: string | number;
  height: number;
}

export class VirtualListManager {
  private itemHeight: number = 50;
  private containerHeight: number = 600;
  private items: VirtualListItem[] = [];
  private scrollPosition: number = 0;

  constructor(itemHeight: number = 50, containerHeight: number = 600) {
    this.itemHeight = itemHeight;
    this.containerHeight = containerHeight;
  }

  setItems(items: VirtualListItem[]): void {
    this.items = items;
  }

  setScrollPosition(position: number): void {
    this.scrollPosition = position;
  }

  getVisibleRange(): { start: number; end: number } {
    const start = Math.floor(this.scrollPosition / this.itemHeight);
    const end = Math.ceil((this.scrollPosition + this.containerHeight) / this.itemHeight);
    return { start: Math.max(0, start), end: Math.min(this.items.length, end + 1) };
  }

  getVisibleItems(): VirtualListItem[] {
    const { start, end } = this.getVisibleRange();
    return this.items.slice(start, end);
  }

  getOffsetY(index: number): number {
    return index * this.itemHeight;
  }
}

// ===== DEBOUNCE & THROTTLE =====

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// ===== MEMORY OPTIMIZATION =====

export class MemoryOptimizer {
  private intervals: NodeJS.Timeout[] = [];

  /**
   * Start auto-cleanup of old cache entries
   */
  startAutoCleanup(interval: number = 5 * 60 * 1000): void {
    const timer = setInterval(() => {
      performanceMonitor.clear();
      console.log('Auto-cleanup: Performance metrics cleared');
    }, interval);
    this.intervals.push(timer);
  }

  /**
   * Stop auto-cleanup
   */
  stopAutoCleanup(): void {
    this.intervals.forEach(timer => clearInterval(timer));
    this.intervals = [];
  }

  /**
   * Get memory usage estimate
   */
  async getMemoryUsage(): Promise<any> {
    if ((performance as any).memory) {
      return {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  /**
   * Force garbage collection (if available)
   */
  async forceGarbageCollection(): Promise<void> {
    if (global.gc) {
      global.gc();
    }
  }
}

export const memoryOptimizer = new MemoryOptimizer();

// ===== REQUEST DEDUPLICATION =====

class RequestDeduplicator {
  private pendingRequests: Map<string, Promise<any>> = new Map();

  async deduplicate<T>(key: string, request: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    const promise = request().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  clear(): void {
    this.pendingRequests.clear();
  }
}

export const requestDeduplicator = new RequestDeduplicator();

// ===== API OPTIMIZATION =====

export interface QueryOptions {
  cache?: boolean;
  cacheTTL?: number;
  deduplicate?: boolean;
  timeout?: number;
}

/**
 * Optimized API request with caching and deduplication
 */
export async function optimizedFetch<T>(
  url: string,
  options: QueryOptions = {}
): Promise<T> {
  const cacheKey = `fetch:${url}`;
  const defaultOptions: QueryOptions = {
    cache: true,
    cacheTTL: 5 * 60 * 1000,
    deduplicate: true,
    timeout: 30000
  };
  const finalOptions = { ...defaultOptions, ...options };

  // Check cache first
  if (finalOptions.cache) {
    const cached = cacheManager.get<T>(cacheKey);
    if (cached !== null) {
      console.log(`Cache hit for: ${url}`);
      return cached;
    }
  }

  // Define the actual request
  const makeRequest = async (): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout for: ${url}`));
      }, finalOptions.timeout || 30000);

      fetch(url)
        .then(res => res.json())
        .then(data => {
          clearTimeout(timeout);
          if (finalOptions.cache) {
            cacheManager.set(cacheKey, data, finalOptions.cacheTTL);
          }
          resolve(data);
        })
        .catch(err => {
          clearTimeout(timeout);
          reject(err);
        });
    });
  };

  // Use deduplication if enabled
  if (finalOptions.deduplicate) {
    return requestDeduplicator.deduplicate(cacheKey, makeRequest);
  }

  return makeRequest();
}

// ===== BUNDLE SIZE MONITORING =====

export class BundleSizeMonitor {
  /**
   * Log estimated bundle size
   */
  logBundleSize(): void {
    const perfData = performance.getEntriesByType('navigation')[0] as any;
    if (perfData) {
      console.log(`Total Load Time: ${perfData.loadEventEnd - perfData.loadEventStart}ms`);
      console.log(`DOM Content Loaded: ${perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart}ms`);
    }

    // Resource timings
    const resources = performance.getEntriesByType('resource');
    let totalSize = 0;
    resources.forEach(resource => {
      const size = (resource as any).transferSize || 0;
      totalSize += size;
    });
    console.log(`Total Resource Size: ${(totalSize / 1024).toFixed(2)} KB`);
  }

  /**
   * Get slow resources
   */
  getSlowResources(threshold: number = 1000): PerformanceResourceTiming[] {
    return performance.getEntriesByType('resource').filter(
      resource => resource.duration > threshold
    ) as PerformanceResourceTiming[];
  }
}

export const bundleSizeMonitor = new BundleSizeMonitor();

// ===== DATABASE QUERY OPTIMIZATION PATTERNS =====

export interface QueryOptimizationTip {
  issue: string;
  solution: string;
  impact: 'low' | 'medium' | 'high';
}

export class QueryOptimizationGuide {
  static readonly TIPS: QueryOptimizationTip[] = [
    {
      issue: 'N+1 Query Problem',
      solution: 'Use JOINs or batch loading instead of fetching related records in a loop',
      impact: 'high'
    },
    {
      issue: 'Missing Database Indexes',
      solution: 'Create indexes on frequently filtered/sorted columns (id, created_at, status)',
      impact: 'high'
    },
    {
      issue: 'Fetching Unused Columns',
      solution: 'Use SELECT specific_columns instead of SELECT *',
      impact: 'medium'
    },
    {
      issue: 'Large Result Sets Without Pagination',
      solution: 'Implement LIMIT/OFFSET pagination for large tables',
      impact: 'high'
    },
    {
      issue: 'Complex Subqueries',
      solution: 'Use CTEs (Common Table Expressions) or denormalization',
      impact: 'medium'
    },
    {
      issue: 'Slow Full Text Searches',
      solution: 'Use database FULLTEXT indexes or dedicated search engines (Elasticsearch)',
      impact: 'medium'
    },
    {
      issue: 'Transaction Deadlocks',
      solution: 'Keep transactions short, order operations consistently',
      impact: 'high'
    }
  ];

  static getTipsByImpact(impact: 'low' | 'medium' | 'high'): QueryOptimizationTip[] {
    return this.TIPS.filter(tip => tip.impact === impact);
  }

  static getAllTips(): QueryOptimizationTip[] {
    return this.TIPS;
  }
}

// ===== REAL TIME PERFORMANCE DASHBOARD =====

export interface PerformanceDashboardData {
  cacheStats: any;
  performanceSummary: any;
  memoryUsage: any;
  slowOperations: PerformanceMetric[];
  queryOptimizationTips: QueryOptimizationTip[];
}

export async function getPerformanceDashboardData(): Promise<PerformanceDashboardData> {
  return {
    cacheStats: cacheManager.getStats(),
    performanceSummary: performanceMonitor.getSummary(),
    memoryUsage: await memoryOptimizer.getMemoryUsage(),
    slowOperations: performanceMonitor.getSlowOperations(),
    queryOptimizationTips: QueryOptimizationGuide.getTipsByImpact('high')
  };
}

export default {
  cacheManager,
  performanceMonitor,
  memoryOptimizer,
  requestDeduplicator,
  bundleSizeMonitor,
  debounce,
  throttle,
  optimizedFetch,
  QueryOptimizationGuide,
  getPerformanceDashboardData
};