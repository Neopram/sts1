/**
 * useTheme Hook
 * Manages dark/light/auto theme switching
 * Persists theme preference to localStorage and applies to DOM
 */

import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'auto';

interface UseThemeReturn {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>('light');
  const [isDark, setIsDark] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialTheme = savedTheme || 'auto';
    setThemeState(initialTheme);

    // Apply theme
    applyTheme(initialTheme, prefersDark);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'auto') {
        applyTheme('auto', e.matches);
      }
    };

    // Support both modern and legacy API
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme]);

  const applyTheme = useCallback((selectedTheme: Theme, prefersDark: boolean) => {
    const htmlElement = document.documentElement;
    let shouldBeDark = false;

    if (selectedTheme === 'auto') {
      shouldBeDark = prefersDark;
    } else {
      shouldBeDark = selectedTheme === 'dark';
    }

    if (shouldBeDark) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }

    setIsDark(shouldBeDark);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(newTheme, prefersDark);

    // Dispatch custom event for other tabs/windows
    window.dispatchEvent(
      new CustomEvent('app-theme-changed', {
        detail: { theme: newTheme }
      })
    );
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  // Listen for theme changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'app-theme' && e.newValue) {
        const newTheme = e.newValue as Theme;
        setThemeState(newTheme);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(newTheme, prefersDark);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [applyTheme]);

  // Listen for theme change events from same tab
  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: Theme }>;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(customEvent.detail.theme, prefersDark);
    };

    window.addEventListener('app-theme-changed', handleThemeChange);
    return () => window.removeEventListener('app-theme-changed', handleThemeChange);
  }, [applyTheme]);

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme
  };
}