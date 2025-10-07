import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Interfaces
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  phone?: string;
  department?: string;
  position?: string;
  location?: string;
  timezone?: string;
  bio?: string;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  lastPasswordChange: Date;
  passwordExpiryDate: Date;
  loginAttempts: number;
  lockedUntil?: Date;
}

export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    frequency: 'immediate' | 'hourly' | 'daily';
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'team';
    showEmail: boolean;
    showPhone: boolean;
  };
}

export interface UserActivity {
  id: string;
  type: 'login' | 'logout' | 'document_view' | 'document_edit' | 'vessel_access' | 'settings_change';
  description: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}

export interface ProfileContextType {
  // State
  profile: UserProfile | null;
  securitySettings: SecuritySettings | null;
  preferences: UserPreferences | null;
  activities: UserActivity[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateSecuritySettings: (updates: Partial<SecuritySettings>) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  enableTwoFactor: () => Promise<void>;
  disableTwoFactor: () => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  getActivities: (limit?: number) => Promise<void>;
  clearError: () => void;
}

// Create context
const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// Hook
export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

// Provider props
interface ProfileProviderProps {
  children: ReactNode;
}

// Provider component
export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  // State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with sample data
  useEffect(() => {
    const initializeProfile = () => {
      // Sample profile data
      const sampleProfile: UserProfile = {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@stsclearance.com',
        role: 'Port Manager',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        phone: '+971 50 123 4567',
        department: 'Port Operations',
        position: 'Senior Port Manager',
        location: 'Dubai, UAE',
        timezone: 'Asia/Dubai',
        bio: 'Experienced maritime professional with 15+ years in port operations and vessel management.',
        lastLogin: new Date(),
        createdAt: new Date('2023-01-15'),
        updatedAt: new Date()
      };

      const sampleSecurity: SecuritySettings = {
        twoFactorEnabled: false,
        lastPasswordChange: new Date('2024-01-01'),
        passwordExpiryDate: new Date('2024-07-01'),
        loginAttempts: 0
      };

      const samplePreferences: UserPreferences = {
        language: 'en',
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          sms: false,
          frequency: 'immediate'
        },
        privacy: {
          profileVisibility: 'team',
          showEmail: true,
          showPhone: false
        }
      };

      const sampleActivities: UserActivity[] = [
        {
          id: '1',
          type: 'login',
          description: 'Successfully logged in from Dubai, UAE',
          timestamp: new Date(),
          ipAddress: '192.168.1.100',
          userAgent: 'Chrome/120.0.0.0',
          location: 'Dubai, UAE'
        },
        {
          id: '2',
          type: 'document_view',
          description: 'Viewed vessel clearance document VCL-2024-001',
          timestamp: new Date(Date.now() - 3600000),
          ipAddress: '192.168.1.100',
          userAgent: 'Chrome/120.0.0.0'
        },
        {
          id: '3',
          type: 'vessel_access',
          description: 'Accessed vessel tracking for MSC OSCAR',
          timestamp: new Date(Date.now() - 7200000),
          ipAddress: '192.168.1.100',
          userAgent: 'Chrome/120.0.0.0'
        },
        {
          id: '4',
          type: 'settings_change',
          description: 'Updated notification preferences',
          timestamp: new Date(Date.now() - 86400000),
          ipAddress: '192.168.1.100',
          userAgent: 'Chrome/120.0.0.0'
        }
      ];

      setProfile(sampleProfile);
      setSecuritySettings(sampleSecurity);
      setPreferences(samplePreferences);
      setActivities(sampleActivities);
    };

    initializeProfile();
  }, []);

  // Actions
  const updateProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (profile) {
        const updatedProfile = { ...profile, ...updates, updatedAt: new Date() };
        setProfile(updatedProfile);
        
        // Dispatch profile update event
        window.dispatchEvent(new CustomEvent('profile:updated', { detail: updatedProfile }));
      }
    } catch (err) {
      setError('Failed to update profile');
      console.error('Profile update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSecuritySettings = async (updates: Partial<SecuritySettings>): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (securitySettings) {
        const updatedSecurity = { ...securitySettings, ...updates };
        setSecuritySettings(updatedSecurity);
        
        // Dispatch security update event
        window.dispatchEvent(new CustomEvent('security:updated', { detail: updatedSecurity }));
      }
    } catch (err) {
      setError('Failed to update security settings');
      console.error('Security update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (preferences) {
        const updatedPreferences = { ...preferences, ...updates };
        setPreferences(updatedPreferences);
        
        // Dispatch preferences update event
        window.dispatchEvent(new CustomEvent('preferences:updated', { detail: updatedPreferences }));
      }
    } catch (err) {
      setError('Failed to update preferences');
      console.error('Preferences update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (_currentPassword: string, _newPassword: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate API call with password validation
      console.log('Changing password for user...', { currentPassword: '***', newPassword: '***' });
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (securitySettings) {
        const updatedSecurity = {
          ...securitySettings,
          lastPasswordChange: new Date()
        };
        setSecuritySettings(updatedSecurity);
        
        // Dispatch password change event
        window.dispatchEvent(new CustomEvent('password:changed'));
      }
    } catch (err) {
      setError('Failed to change password');
      console.error('Password change error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const enableTwoFactor = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (securitySettings) {
        const updatedSecurity = { ...securitySettings, twoFactorEnabled: true };
        setSecuritySettings(updatedSecurity);
        
        // Dispatch 2FA enable event
        window.dispatchEvent(new CustomEvent('2fa:enabled'));
      }
    } catch (err) {
      setError('Failed to enable two-factor authentication');
      console.error('2FA enable error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const disableTwoFactor = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (securitySettings) {
        const updatedSecurity = { ...securitySettings, twoFactorEnabled: false };
        setSecuritySettings(updatedSecurity);
        
        // Dispatch 2FA disable event
        window.dispatchEvent(new CustomEvent('2fa:disabled'));
      }
    } catch (err) {
      setError('Failed to disable two-factor authentication');
      console.error('2FA disable error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadAvatar = async (file: File): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate file upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create preview URL
      const avatarUrl = URL.createObjectURL(file);
      
      if (profile) {
        const updatedProfile = { ...profile, avatar: avatarUrl, updatedAt: new Date() };
        setProfile(updatedProfile);
        
        // Dispatch avatar update event
        window.dispatchEvent(new CustomEvent('avatar:updated', { detail: avatarUrl }));
      }
    } catch (err) {
      setError('Failed to upload avatar');
      console.error('Avatar upload error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivities = async (limit: number = 50): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate API call with limit parameter
      console.log('Loading activities with limit:', limit);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Activities are already loaded in useEffect
      // In a real app, this would fetch from API with pagination
    } catch (err) {
      setError('Failed to load activities');
      console.error('Activities load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  // Context value
  const value: ProfileContextType = {
    profile,
    securitySettings,
    preferences,
    activities,
    isLoading,
    error,
    updateProfile,
    updateSecuritySettings,
    updatePreferences,
    changePassword,
    enableTwoFactor,
    disableTwoFactor,
    uploadAvatar,
    getActivities,
    clearError
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};
