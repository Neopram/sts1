/**
 * useI18n Hook
 * Hook for using i18n in React components
 */

import { useEffect, useState, useCallback } from 'react';
import I18nManager, { LanguageConfig } from '../utils/i18nManager';

interface UseI18nReturn {
  t: (key: string, defaultValue?: string, interpolation?: Record<string, any>) => string;
  tn: (key: string, count: number, defaultValue?: string) => string;
  language: string;
  setLanguage: (languageCode: string) => void;
  supportedLanguages: LanguageConfig[];
  formatDate: (date: Date | number, format?: 'short' | 'long' | 'full') => string;
  formatTime: (date: Date | number) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency?: string) => string;
  isRTL: boolean;
}

/**
 * Hook to use i18n in components
 * @returns i18n functions and state
 */
export function useI18n(): UseI18nReturn {
  const manager = I18nManager.getInstance();
  const [language, setLanguageState] = useState(manager.getLanguage());
  const [supportedLanguages, setSupportedLanguages] = useState<LanguageConfig[]>(
    manager.getSupportedLanguages()
  );
  const [isRTL, setIsRTL] = useState(manager.isRTL());

  useEffect(() => {
    const handleLanguageChange = () => {
      setLanguageState(manager.getLanguage());
      setIsRTL(manager.isRTL());
    };

    window.addEventListener('i18n:languageChanged', handleLanguageChange);

    return () => {
      window.removeEventListener('i18n:languageChanged', handleLanguageChange);
    };
  }, []);

  const t = useCallback(
    (key: string, defaultValue?: string, interpolation?: Record<string, any>) => {
      return manager.t(key, defaultValue, interpolation);
    },
    []
  );

  const tn = useCallback((key: string, count: number, defaultValue?: string) => {
    return manager.tn(key, count, defaultValue);
  }, []);

  const setLanguage = useCallback((languageCode: string) => {
    manager.setLanguage(languageCode);
    setLanguageState(languageCode);
  }, []);

  const formatDate = useCallback((date: Date | number, format?: 'short' | 'long' | 'full') => {
    return manager.formatDate(date, format);
  }, []);

  const formatTime = useCallback((date: Date | number) => {
    return manager.formatTime(date);
  }, []);

  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => {
    return manager.formatNumber(value, options);
  }, []);

  const formatCurrency = useCallback((value: number, currency?: string) => {
    return manager.formatCurrency(value, currency);
  }, []);

  return {
    t,
    tn,
    language,
    setLanguage,
    supportedLanguages,
    formatDate,
    formatTime,
    formatNumber,
    formatCurrency,
    isRTL,
  };
}

export default useI18n;