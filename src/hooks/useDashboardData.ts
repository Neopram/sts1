import { useEffect, useState, useCallback } from 'react';
import ApiService from '../api';
import { useApp } from '../contexts/AppContext';

export interface DashboardDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para obtener datos del dashboard específico del rol del usuario
 * Maneja loading, errores y caché automáticamente
 */
export const useDashboardData = <T,>(
  endpoint: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
    onError?: (error: string) => void;
    onSuccess?: (data: T) => void;
  }
): DashboardDataState<T> => {
  const { user } = useApp();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user || options?.enabled === false) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Debug log only in development
      if (import.meta.env.DEV) {
        console.log(`[DashboardData] Fetching ${endpoint} for role: ${user.role}`);
      }
      const response = await ApiService.staticGet(endpoint);
      
      setData(response as T);
      options?.onSuccess?.(response as T);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to load dashboard data';
      setError(errorMsg);
      options?.onError?.(errorMsg);
      console.error(`[DashboardData] Error fetching ${endpoint}:`, err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, user, options?.enabled, options?.onSuccess, options?.onError]);

  // Fetch on mount and on endpoint change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refetch if interval specified
  useEffect(() => {
    if (!options?.refetchInterval) return;

    const interval = setInterval(fetchData, options.refetchInterval);
    return () => clearInterval(interval);
  }, [fetchData, options?.refetchInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
};

/**
 * Hook para obtener datos de múltiples endpoints en paralelo
 */
export const useDashboardDataMultiple = <T extends Record<string, any>>(
  endpoints: Record<keyof T, string>,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
): {
  data: Partial<T> | null;
  loading: boolean;
  errors: Record<keyof T, string | null>;
  refetch: () => Promise<void>;
} => {
  const { user } = useApp();
  const [data, setData] = useState<Partial<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<keyof T, string | null>>({} as any);

  const fetchAllData = useCallback(async () => {
    if (!user || options?.enabled === false) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const promises = Object.entries(endpoints).map(async ([key, endpoint]) => {
        try {
          const response = await ApiService.staticGet(endpoint);
          return { key, data: response, error: null };
        } catch (err: any) {
          const errorMsg = err.response?.data?.detail || err.message || `Failed to load ${key}`;
          return { key, data: null, error: errorMsg };
        }
      });

      const results = await Promise.all(promises);
      
      const newData: Partial<T> = {};
      const newErrors: Record<string, string | null> = {};

      results.forEach(({ key, data: result, error }) => {
        (newData as any)[key] = result;
        newErrors[key] = error;
      });

      setData(newData);
      setErrors(newErrors as any);
    } finally {
      setLoading(false);
    }
  }, [endpoints, user]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (!options?.refetchInterval) return;
    const interval = setInterval(fetchAllData, options.refetchInterval);
    return () => clearInterval(interval);
  }, [fetchAllData, options?.refetchInterval]);

  return {
    data,
    loading,
    errors,
    refetch: fetchAllData,
  };
};

/**
 * Hook para validar acceso a dashboard según rol
 */
export const useDashboardAccess = (requiredRole: string | string[]) => {
  const { user } = useApp();
  
  const hasAccess = (() => {
    if (!user) return false;
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }
    return user.role === requiredRole;
  })();

  return {
    hasAccess,
    userRole: user?.role,
  };
};