import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language } from '../i18n';
import ApiService from '../api';

interface User {
  email: string;
  role: 'owner' | 'charterer' | 'broker' | 'viewer' | 'seller' | 'buyer' | 'admin';
  name: string;
  company?: string;
  vesselImos?: string[]; // IMOs of vessels this user owns/charters
}

interface Room {
  id: string;
  title: string;
  location: string;
  sts_eta: string;
  status?: 'active' | 'completed' | 'scheduled';
  created_by?: string;
  description?: string;
  type?: 'room' | 'sts_operation';  // ARMONÍA ABSOLUTA: Tipo de operación
  sts_code?: string;  // ARMONÍA ABSOLUTA: Código STS (solo para STS Operations)
}

// Permission matrix for role-based access
const PERMISSION_MATRIX = {
  admin: {
    create_operation: true,
    view_all_operations: true,
    edit_operation: true,
    delete_operation: true,
    approve_documents: true,
    manage_users: true,
    view_analytics: true,
  },
  broker: {
    create_operation: true,
    view_all_operations: true,
    edit_operation: true,
    delete_operation: true,
    approve_documents: true,
    manage_users: false,
    view_analytics: true,
  },
  owner: {
    create_operation: false,
    view_all_operations: false,
    edit_operation: false,
    delete_operation: false,
    approve_documents: true,
    manage_users: false,
    view_analytics: false,
  },
  charterer: {
    create_operation: false,
    view_all_operations: false,
    edit_operation: false,
    delete_operation: false,
    approve_documents: true,
    manage_users: false,
    view_analytics: true,
  },
  seller: {
    create_operation: false,
    view_all_operations: false,
    edit_operation: false,
    delete_operation: false,
    approve_documents: false,
    manage_users: false,
    view_analytics: false,
  },
  buyer: {
    create_operation: false,
    view_all_operations: false,
    edit_operation: false,
    delete_operation: false,
    approve_documents: false,
    manage_users: false,
    view_analytics: false,
  },
  viewer: {
    create_operation: false,
    view_all_operations: false,
    edit_operation: false,
    delete_operation: false,
    approve_documents: false,
    manage_users: false,
    view_analytics: false,
  },
};

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
  hasPermission: (resource: string, action: string) => boolean;
  canAccessRoom: (roomId: string) => boolean;
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

// Valid language values
const VALID_LANGUAGES: Language[] = ['en', 'es'];

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // FIX: Validate language from localStorage (prevent invalid states)
  const [language, setLanguage] = useState<Language>(() => {
    const savedLang = localStorage.getItem('app-language');
    // Only use saved language if it's in VALID_LANGUAGES
    if (savedLang && VALID_LANGUAGES.includes(savedLang as Language)) {
      return savedLang as Language;
    }
    return 'en'; // Safe default
  });

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`[LOGIN] Attempting login for ${email}`);
      
      // Use ApiService for authentication
      const userData = await ApiService.login(email, password);
      console.log(`[LOGIN] Authentication successful for ${userData.email}, role: ${userData.role}`);
      
      setUser(userData);
      
      // Store authentication token if provided
      if (userData.token) {
        localStorage.setItem('auth-token', userData.token);
        ApiService.setToken(userData.token);
        console.log('[LOGIN] Token stored in localStorage');
      }

      // Load rooms after successful login - WAIT for completion
      console.log('[LOGIN] Loading rooms...');
      await loadRooms();
      console.log('[LOGIN] Rooms loaded, ready to navigate');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      console.error('[LOGIN] Error:', err);
      throw err;  // Re-throw to let component handle it
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
      
      // ARMONÍA ABSOLUTA: Use unified endpoint that returns both Rooms and STS Operations
      try {
        const operationsData = await ApiService.getUnifiedOperations(true, 0, 100);
        
        if (Array.isArray(operationsData)) {
          console.log(`[ROOMS] Loaded ${operationsData.length} operations from backend`);
          
          // Map unified operations to Room interface format
          const mappedRooms: Room[] = operationsData.map((op: any) => ({
            id: op.id,
            title: op.title,
            location: op.location,
            sts_eta: op.sts_eta ? (typeof op.sts_eta === 'string' ? op.sts_eta : op.sts_eta.toString()) : '',
            status: op.status || 'active',
            created_by: op.created_by,
            description: op.description,
            type: op.type || 'room',  // 'room' or 'sts_operation'
            sts_code: op.sts_code || undefined,
          }));
          
          setRooms(mappedRooms);
          
          // FIX: Avoid race condition - determine room to select before setState
          const savedRoomId = localStorage.getItem('current-room');
          let roomToSelect: string | null = null;
          
          if (savedRoomId && mappedRooms.find(r => r.id === savedRoomId)) {
            roomToSelect = savedRoomId;
            console.log(`[ROOMS] Will restore saved room: ${savedRoomId}`);
          } else if (mappedRooms.length > 0) {
            roomToSelect = mappedRooms[0].id;
            console.log(`[ROOMS] Will auto-select first room: ${mappedRooms[0].title} (${roomToSelect})`);
          }
          
          // Only setCurrentRoomId if we determined one AND it's different from current
          if (roomToSelect) {
            setCurrentRoomId(roomToSelect);
            localStorage.setItem('current-room', roomToSelect);
          }
        }
      } catch (unifiedError) {
        // Fallback to legacy endpoint if unified fails
        console.warn('[ROOMS] Unified operations endpoint failed, falling back to legacy:', unifiedError);
        const roomsData = await ApiService.getRooms();
        if (Array.isArray(roomsData)) {
          console.log(`[ROOMS] Loaded ${roomsData.length} rooms from legacy endpoint`);
          
          const mappedRooms: Room[] = roomsData.map((room: any) => ({
            ...room,
            type: 'room' as const,  // Legacy rooms are always type 'room'
          }));
          setRooms(mappedRooms);
          
          // FIX: Same race condition fix for fallback
          if (mappedRooms.length > 0) {
            const savedRoomId = localStorage.getItem('current-room');
            let roomToSelect: string | null = null;
            
            if (savedRoomId && mappedRooms.find(r => r.id === savedRoomId)) {
              roomToSelect = savedRoomId;
            } else {
              roomToSelect = mappedRooms[0].id;
            }
            
            setCurrentRoomId(roomToSelect);
            localStorage.setItem('current-room', roomToSelect);
            console.log(`[ROOMS] Auto-selected first room (legacy): ${mappedRooms[0].title}`);
          }
        }
      }
      
    } catch (err) {
      console.error('[ROOMS] Error loading operations:', err);
      setError('Failed to load operations');
      
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

  /**
   * FIX: Improved hasPermission with better validation and clarity
   * Maps resource:action combinations to permission matrix keys
   */
  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false;
    
    // Admin has all permissions (fast path)
    if (user.role === 'admin') return true;
    
    // Validate role exists in permission matrix
    const rolePermissions = PERMISSION_MATRIX[user.role as keyof typeof PERMISSION_MATRIX];
    if (!rolePermissions) {
      console.warn(`[AUTH] Unknown role: ${user.role}`);
      return false; // Default deny for unknown roles
    }
    
    // Map "resource:action" → "permission_key"
    const permissionMap: Record<string, keyof typeof PERMISSION_MATRIX['admin']> = {
      'rooms:create': 'create_operation',
      'rooms:read': 'view_all_operations',
      'rooms:update': 'edit_operation',
      'rooms:delete': 'delete_operation',
      'documents:approve': 'approve_documents',
      'documents:read': 'view_all_operations',
      'documents:upload': 'view_all_operations',
      'users:create': 'manage_users',
      'users:read': 'manage_users',
      'users:update': 'manage_users',
      'users:delete': 'manage_users',
      'analytics:read': 'view_analytics',
      'vessels:read': 'view_all_operations',
    };
    
    // Look up permission in map
    const permissionKey = permissionMap[`${resource}:${action}`];
    
    if (permissionKey) {
      return rolePermissions[permissionKey] || false;
    }
    
    // Log unknown permissions for debugging
    console.warn(`[AUTH] Unknown permission: ${resource}:${action}`);
    
    // Default deny for unmapped permissions
    return false;
  };

  const canAccessRoom = (roomId: string): boolean => {
    // Admin and Broker can access all rooms
    if (user?.role === 'admin' || user?.role === 'broker') return true;
    
    // Other roles can only access rooms they're invited to
    const room = rooms.find(r => r.id === roomId);
    return !!room;
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
    logout,
    hasPermission,
    canAccessRoom
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};