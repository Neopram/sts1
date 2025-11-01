/**
 * Custom hook for API interactions
 * Provides reactive state management for API calls
 */

import { useState, useCallback, useEffect } from 'react';
import ApiService from '../api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<void>;
  reset: () => void;
}

export function useApi<T = any>(
  apiCall: (...args: any[]) => Promise<T>,
  autoExecute: boolean = false,
  ...autoExecuteArgs: any[]
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false
  });

  const execute = useCallback(async (...args: any[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await apiCall(...args);
      setState({
        data,
        loading: false,
        error: null,
        success: true
      });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
    }
  }, [apiCall]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      success: false
    });
  }, []);

  useEffect(() => {
    if (autoExecute) {
      execute(...autoExecuteArgs);
    }
  }, [autoExecute, execute, ...autoExecuteArgs]);

  return {
    ...state,
    execute,
    reset
  };
}

// Specific hooks for common API calls
const api = ApiService;

export function useRooms() {
  return useApi(() => api.getRooms());
}

export function useRoomSummary(roomId: string) {
  return useApi(() => api.getRoomSummary(roomId), !!roomId, roomId);
}

export function useDocuments(roomId: string) {
  return useApi(() => api.getDocuments(roomId), !!roomId, roomId);
}

export function useMessages(roomId: string) {
  return useApi(() => api.getMessages(roomId), !!roomId, roomId);
}

export function useActivities(roomId: string) {
  return useApi(() => api.getActivities(roomId), !!roomId, roomId);
}

export function useNotifications() {
  return useApi(() => api.getNotifications());
}

export function useHealthCheck() {
  return useApi(() => api.healthCheck());
}

export function useCacheStats() {
  return useApi(() => api.getSystemInfo());
}