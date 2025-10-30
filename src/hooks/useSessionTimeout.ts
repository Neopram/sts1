/**
 * useSessionTimeout Hook
 * Manages session timeout with warning dialog
 * Tracks user inactivity and auto-logs out
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  onWarning?: () => void;
  onTimeout?: () => void;
}

interface UseSessionTimeoutReturn {
  isWarningVisible: boolean;
  timeRemaining: number;
  dismissWarning: () => void;
  extendSession: () => void;
  resetInactivity: () => void;
}

export function useSessionTimeout(options: UseSessionTimeoutOptions = {}): UseSessionTimeoutReturn {
  const {
    timeoutMinutes = 30,
    warningMinutes = 5,
    onWarning,
    onTimeout
  } = options;

  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningRef = useRef<NodeJS.Timeout>();
  const warningIntervalRef = useRef<NodeJS.Timeout>();
  const inactivityRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  const warningMs = warningMinutes * 60 * 1000;
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningTriggerMs = timeoutMs - warningMs;

  const dismissWarning = useCallback(() => {
    setIsWarningVisible(false);
    if (warningIntervalRef.current) {
      clearInterval(warningIntervalRef.current);
    }
  }, []);

  const extendSession = useCallback(() => {
    dismissWarning();
    resetInactivity();
  }, [dismissWarning]);

  const resetInactivity = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);

    lastActivityRef.current = Date.now();

    // Set inactivity timer
    inactivityRef.current = setTimeout(() => {
      // User has been inactive, set warning timer
      warningRef.current = setTimeout(() => {
        setIsWarningVisible(true);
        onWarning?.();

        // Update remaining time countdown
        let secondsRemaining = warningMinutes * 60;
        warningIntervalRef.current = setInterval(() => {
          secondsRemaining -= 1;
          setTimeRemaining(secondsRemaining);

          if (secondsRemaining <= 0) {
            if (warningIntervalRef.current) {
              clearInterval(warningIntervalRef.current);
            }
          }
        }, 1000);

        // Set logout timer
        timeoutRef.current = setTimeout(() => {
          setIsWarningVisible(false);
          localStorage.removeItem('auth-token');
          onTimeout?.();
          window.location.href = '/login';
        }, warningMs);
      }, warningTriggerMs);
    }, warningTriggerMs);
  }, [warningMinutes, warningTriggerMs, warningMs, onWarning, onTimeout]);

  // Track user activity
  useEffect(() => {
    const handleUserActivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      // Only reset if more than 5 seconds have passed (debounce)
      if (timeSinceLastActivity > 5000) {
        resetInactivity();
      }
    };

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity);
    });

    // Initial setup
    resetInactivity();

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
      if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
    };
  }, [resetInactivity]);

  return {
    isWarningVisible,
    timeRemaining,
    dismissWarning,
    extendSession,
    resetInactivity
  };
}