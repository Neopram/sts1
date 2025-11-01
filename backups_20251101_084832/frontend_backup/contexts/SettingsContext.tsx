import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Interfaces
export interface SystemSettings {
  id: string;
  appName: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  maintenanceMode: boolean;
  debugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  maxFileSize: number;
  allowedFileTypes: string[];
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    expiryDays: number;
  };
  updatedAt: Date;
  updatedBy: string;
}

export interface UserPermissions {
  id: string;
  role: string;
  permissions: {
    documents: {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
      approve: boolean;
    };
    vessels: {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
      track: boolean;
    };
    users: {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
      manageRoles: boolean;
    };
    system: {
      viewSettings: boolean;
      editSettings: boolean;
      viewLogs: boolean;
      manageBackups: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DataManagement {
  id: string;
  backupSchedule: 'daily' | 'weekly' | 'monthly';
  lastBackup: Date;
  backupRetention: number;
  dataRetention: {
    documents: number;
    logs: number;
    userActivity: number;
    notifications: number;
  };
  autoCleanup: boolean;
  exportFormats: string[];
  maxExportSize: number;
}

export interface NotificationSettings {
  id: string;
  systemNotifications: {
    maintenance: boolean;
    security: boolean;
    updates: boolean;
    errors: boolean;
  };
  userNotifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    inApp: boolean;
  };
  notificationChannels: {
    email: {
      enabled: boolean;
      smtp: {
        host: string;
        port: number;
        secure: boolean;
        username: string;
      };
    };
    sms: {
      enabled: boolean;
      provider: string;
      apiKey: string;
    };
    push: {
      enabled: boolean;
      service: string;
      apiKey: string;
    };
  };
}

export interface SettingsContextType {
  // State
  systemSettings: SystemSettings | null;
  userPermissions: UserPermissions | null;
  dataManagement: DataManagement | null;
  notificationSettings: NotificationSettings | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  updateSystemSettings: (updates: Partial<SystemSettings>) => Promise<void>;
  updateUserPermissions: (updates: Partial<UserPermissions>) => Promise<void>;
  updateDataManagement: (updates: Partial<DataManagement>) => Promise<void>;
  updateNotificationSettings: (updates: Partial<NotificationSettings>) => Promise<void>;
  toggleMaintenanceMode: () => Promise<void>;
  toggleDebugMode: () => Promise<void>;
  updatePasswordPolicy: (policy: Partial<SystemSettings['passwordPolicy']>) => Promise<void>;
  createBackup: () => Promise<void>;
  restoreBackup: (backupId: string) => Promise<void>;
  exportData: (format: string, filters: any) => Promise<void>;
  clearError: () => void;
}

// Create context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Hook
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// Provider props
interface SettingsProviderProps {
  children: ReactNode;
}

// Provider component
export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  // State
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [dataManagement, setDataManagement] = useState<DataManagement | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with sample data
  useEffect(() => {
    const initializeSettings = () => {
      // Sample system settings
      const sampleSystem: SystemSettings = {
        id: '1',
        appName: 'STS Clearance Hub',
        version: '2.1.0',
        environment: 'production',
        maintenanceMode: false,
        debugMode: false,
        logLevel: 'info',
        maxFileSize: 10485760, // 10MB
        allowedFileTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.png'],
        sessionTimeout: 3600, // 1 hour
        maxLoginAttempts: 5,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          expiryDays: 90
        },
        updatedAt: new Date(),
        updatedBy: 'admin@stsclearance.com'
      };

      // Sample user permissions
      const samplePermissions: UserPermissions = {
        id: '1',
        role: 'Port Manager',
        permissions: {
          documents: {
            view: true,
            create: true,
            edit: true,
            delete: false,
            approve: true
          },
          vessels: {
            view: true,
            create: true,
            edit: true,
            delete: false,
            track: true
          },
          users: {
            view: true,
            create: false,
            edit: false,
            delete: false,
            manageRoles: false
          },
          system: {
            viewSettings: true,
            editSettings: false,
            viewLogs: false,
            manageBackups: false
          }
        },
        createdAt: new Date('2023-01-15'),
        updatedAt: new Date()
      };

      // Sample data management
      const sampleDataManagement: DataManagement = {
        id: '1',
        backupSchedule: 'daily',
        lastBackup: new Date(Date.now() - 86400000), // 1 day ago
        backupRetention: 30,
        dataRetention: {
          documents: 2555, // 7 years
          logs: 90,
          userActivity: 365,
          notifications: 30
        },
        autoCleanup: true,
        exportFormats: ['PDF', 'Excel', 'CSV', 'JSON'],
        maxExportSize: 104857600 // 100MB
      };

      // Sample notification settings
      const sampleNotificationSettings: NotificationSettings = {
        id: '1',
        systemNotifications: {
          maintenance: true,
          security: true,
          updates: true,
          errors: true
        },
        userNotifications: {
          email: true,
          push: true,
          sms: false,
          inApp: true
        },
        notificationChannels: {
          email: {
            enabled: true,
            smtp: {
              host: 'smtp.gmail.com',
              port: 587,
              secure: false,
              username: 'noreply@stsclearance.com'
            }
          },
          sms: {
            enabled: false,
            provider: 'Twilio',
            apiKey: '***'
          },
          push: {
            enabled: true,
            service: 'Firebase',
            apiKey: '***'
          }
        }
      };

      setSystemSettings(sampleSystem);
      setUserPermissions(samplePermissions);
      setDataManagement(sampleDataManagement);
      setNotificationSettings(sampleNotificationSettings);
    };

    initializeSettings();
  }, []);

  // Actions
  const updateSystemSettings = async (updates: Partial<SystemSettings>): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (systemSettings) {
        const updatedSettings = { 
          ...systemSettings, 
          ...updates, 
          updatedAt: new Date(),
          updatedBy: 'current-user@stsclearance.com'
        };
        setSystemSettings(updatedSettings);
        
        // Dispatch settings update event
        window.dispatchEvent(new CustomEvent('settings:updated', { detail: updatedSettings }));
      }
    } catch (err) {
      setError('Failed to update system settings');
      console.error('System settings update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserPermissions = async (updates: Partial<UserPermissions>): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (userPermissions) {
        const updatedPermissions = { ...userPermissions, ...updates, updatedAt: new Date() };
        setUserPermissions(updatedPermissions);
        
        // Dispatch permissions update event
        window.dispatchEvent(new CustomEvent('permissions:updated', { detail: updatedPermissions }));
      }
    } catch (err) {
      setError('Failed to update user permissions');
      console.error('Permissions update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDataManagement = async (updates: Partial<DataManagement>): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (dataManagement) {
        const updatedDataManagement = { ...dataManagement, ...updates };
        setDataManagement(updatedDataManagement);
        
        // Dispatch data management update event
        window.dispatchEvent(new CustomEvent('dataManagement:updated', { detail: updatedDataManagement }));
      }
    } catch (err) {
      setError('Failed to update data management settings');
      console.error('Data management update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateNotificationSettings = async (updates: Partial<NotificationSettings>): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (notificationSettings) {
        const updatedNotificationSettings = { ...notificationSettings, ...updates };
        setNotificationSettings(updatedNotificationSettings);
        
        // Dispatch notification settings update event
        window.dispatchEvent(new CustomEvent('notificationSettings:updated', { detail: updatedNotificationSettings }));
      }
    } catch (err) {
      setError('Failed to update notification settings');
      console.error('Notification settings update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMaintenanceMode = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (systemSettings) {
        const updatedSettings = { 
          ...systemSettings, 
          maintenanceMode: !systemSettings.maintenanceMode,
          updatedAt: new Date(),
          updatedBy: 'current-user@stsclearance.com'
        };
        setSystemSettings(updatedSettings);
        
        // Dispatch maintenance mode toggle event
        window.dispatchEvent(new CustomEvent('maintenance:toggled', { detail: updatedSettings.maintenanceMode }));
      }
    } catch (err) {
      setError('Failed to toggle maintenance mode');
      console.error('Maintenance mode toggle error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDebugMode = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (systemSettings) {
        const updatedSettings = { 
          ...systemSettings, 
          debugMode: !systemSettings.debugMode,
          updatedAt: new Date(),
          updatedBy: 'current-user@stsclearance.com'
        };
        setSystemSettings(updatedSettings);
        
        // Dispatch debug mode toggle event
        window.dispatchEvent(new CustomEvent('debug:toggled', { detail: updatedSettings.debugMode }));
      }
    } catch (err) {
      setError('Failed to toggle debug mode');
      console.error('Debug mode toggle error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePasswordPolicy = async (policy: Partial<SystemSettings['passwordPolicy']>): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (systemSettings) {
        const updatedSettings = { 
          ...systemSettings, 
          passwordPolicy: { ...systemSettings.passwordPolicy, ...policy },
          updatedAt: new Date(),
          updatedBy: 'current-user@stsclearance.com'
        };
        setSystemSettings(updatedSettings);
        
        // Dispatch password policy update event
        window.dispatchEvent(new CustomEvent('passwordPolicy:updated', { detail: updatedSettings.passwordPolicy }));
      }
    } catch (err) {
      setError('Failed to update password policy');
      console.error('Password policy update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createBackup = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate backup creation
      console.log('Creating system backup...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      if (dataManagement) {
        const updatedDataManagement = { 
          ...dataManagement, 
          lastBackup: new Date()
        };
        setDataManagement(updatedDataManagement);
        
        // Dispatch backup created event
        window.dispatchEvent(new CustomEvent('backup:created', { detail: new Date() }));
      }
    } catch (err) {
      setError('Failed to create backup');
      console.error('Backup creation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const restoreBackup = async (backupId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate backup restoration
      console.log('Restoring backup:', backupId);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Dispatch backup restored event
      window.dispatchEvent(new CustomEvent('backup:restored', { detail: backupId }));
    } catch (err) {
      setError('Failed to restore backup');
      console.error('Backup restoration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async (format: string, filters: any): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate data export
      console.log('Exporting data in format:', format, 'with filters:', filters);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Dispatch data export event
      window.dispatchEvent(new CustomEvent('data:exported', { detail: { format, filters } }));
    } catch (err) {
      setError('Failed to export data');
      console.error('Data export error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  // Context value
  const value: SettingsContextType = {
    systemSettings,
    userPermissions,
    dataManagement,
    notificationSettings,
    isLoading,
    error,
    updateSystemSettings,
    updateUserPermissions,
    updateDataManagement,
    updateNotificationSettings,
    toggleMaintenanceMode,
    toggleDebugMode,
    updatePasswordPolicy,
    createBackup,
    restoreBackup,
    exportData,
    clearError
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
