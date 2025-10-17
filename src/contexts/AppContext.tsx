import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language } from '../i18n';
import ApiService from '../api';

interface User {
  email: string;
  role: 'owner' | 'charterer' | 'broker' | 'viewer';
  name: string;
  vesselImos?: string[]; // IMOs of vessels this user owns/charters
}

interface Room {
  id: string;
  title: string;
  location: string;
  sts_eta: string;
}

interface AppContextType {
  user: User | null;
  currentRoomId: string | null;
  setCurrentRoomId: (roomId: string) => void;
  rooms: Room[];
  loading: boolean;
  error: string | null;
  language: Language;
  setLanguage: (lang: Language) => void;
  refreshData: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    // Load language from localStorage or default to English
    const savedLang = localStorage.getItem('app-language');
    return (savedLang as Language) || 'en';
  });

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use ApiService for authentication
      const userData = await ApiService.login(email, password);
      setUser(userData);
      
      // Store authentication token if provided
      if (userData.token) {
        localStorage.setItem('auth-token', userData.token);
        ApiService.setToken(userData.token);
      }

      // Load rooms after successful login
      await loadRooms();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint if user is authenticated
      if (user && localStorage.getItem('auth-token')) {
        try {
          await ApiService.logout();
        } catch (err) {
          console.warn('Backend logout failed, continuing with local cleanup:', err);
        }
      }
    } catch (err) {
      console.warn('Logout error, continuing with local cleanup:', err);
    } finally {
      // Clear all application state
      setUser(null);
      setCurrentRoomId(null);
      setRooms([]);
      setError(null);
      
      // Clear all stored authentication data
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user-data');
      localStorage.removeItem('current-room');
      localStorage.removeItem('app-language');
      
      // Clear API service token
      ApiService.clearToken();
      
      // Emit logout event for other components
      window.dispatchEvent(new CustomEvent('app:logout'));
      
      // Redirect to login or refresh page
      window.location.href = '/';
    }
  };

  const loadRooms = async () => {
    try {
      setLoading(true);
      
      // Try to get rooms from backend
      const roomsData = await ApiService.getRooms();
      if (Array.isArray(roomsData)) {
        setRooms(roomsData);
        
        // Set first room as current if available and no room is selected
        if (roomsData.length > 0 && !currentRoomId) {
          setCurrentRoomId(roomsData[0].id);
        }
      }
      
    } catch (err) {
      console.error('Error loading rooms:', err);
      setError('Failed to load rooms');
      
      // Set empty rooms on error
      setRooms([]);
      setCurrentRoomId(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    if (user) {
      try {
        setLoading(true);
        await loadRooms();
        // Emit refresh event for other components
        window.dispatchEvent(new CustomEvent('app:refresh'));
      } catch (err) {
        console.error('Error refreshing data:', err);
        setError('Failed to refresh data');
      } finally {
        setLoading(false);
      }
    }
  };

  const setLanguageAndPersist = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app-language', lang);
  };

  // Auto-login on app start if token exists
  useEffect(() => {
    const autoLogin = async () => {
      const token = localStorage.getItem('auth-token');
      if (token && !user) {
        // Try to validate token and restore user session
        try {
          const userData = await ApiService.validateToken();
          setUser(userData);
          await loadRooms();
        } catch (err) {
          // Token invalid, clear it and show login
          localStorage.removeItem('auth-token');
        }
      }
    };

    autoLogin();
  }, []);

  const value: AppContextType = {
    user,
    currentRoomId,
    setCurrentRoomId,
    rooms,
    loading,
    error,
    language,
    setLanguage: setLanguageAndPersist,
    refreshData,
    login,
    logout
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};