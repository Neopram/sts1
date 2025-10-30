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

  // Initialize profile data from backend
  useEffect(() => {
    const initializeProfile = async () => {
      try {
        setIsLoading(true);
        
        // Get auth token from localStorage
        const token = localStorage.getItem('auth-token');
        if (!token) {
          setError('No authentication token found');
          setIsLoading(false);
          return;
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch profile data
        const profileResponse = await fetch('/api/v1/profile/me', { headers });
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          const profile: UserProfile = {
            id: profileData.id,
            name: profileData.name,
            email: profileData.email,
            role: profileData.role,
            avatar: profileData.avatar_url,
            phone: profileData.phone,
            department: profileData.department,
            position: profileData.position,
            location: profileData.location,
            timezone: profileData.timezone,
            bio: profileData.bio,
            lastLogin: new Date(profileData.last_login || new Date()),
            createdAt: new Date(profileData.created_at),
            updatedAt: new Date()
          };
          setProfile(profile);
        }

        // Fetch security settings
        const securityResponse = await fetch('/api/v1/profile/security-settings', { headers });
        if (securityResponse.ok) {
          const securityData = await securityResponse.json();
          const security: SecuritySettings = {
            twoFactorEnabled: securityData.two_factor_enabled,
            lastPasswordChange: securityData.last_password_change ? new Date(securityData.last_password_change) : new Date(),
            passwordExpiryDate: securityData.password_expiry_date ? new Date(securityData.password_expiry_date) : new Date(),
            loginAttempts: securityData.login_attempts,
            lockedUntil: securityData.locked_until ? new Date(securityData.locked_until) : undefined
          };
          setSecuritySettings(security);
        }

        // Fetch preferences
        const preferencesResponse = await fetch('/api/v1/profile/preferences', { headers });
        if (preferencesResponse.ok) {
          const preferencesData = await preferencesResponse.json();
          const preferences: UserPreferences = {
            language: preferencesData.language || 'en',
            theme: preferencesData.theme || 'light',
            notifications: preferencesData.notifications || {
              email: true,
              push: true,
              sms: false,
              frequency: 'immediate'
            },
            privacy: preferencesData.privacy || {
              profileVisibility: 'team',
              showEmail: true,
              showPhone: false
            }
          };
          setPreferences(preferences);
        }

        // Fetch activities
        const activitiesResponse = await fetch('/api/v1/profile/activities?limit=50', { headers });
        if (activitiesResponse.ok) {
          const activitiesData = await activitiesResponse.json();
          const activities: UserActivity[] = activitiesData.map((activity: any) => ({
            id: activity.id,
            type: activity.action as any,
            description: activity.description || activity.action,
            timestamp: new Date(activity.timestamp),
            ipAddress: activity.ip_address,
            userAgent: activity.user_agent,
            location: activity.location
          }));
          setActivities(activities);
        }

        setIsLoading(false);
      } catch (err) {
        setError('Failed to initialize profile');
        console.error('Profile initialization error:', err);
        setIsLoading(false);
      }
    };

    initializeProfile();
  }, []);

  // Actions
  const updateProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth-token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/v1/profile/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: updates.name,
          email: updates.email,
          phone: updates.phone,
          department: updates.department,
          position: updates.position,
          location: updates.location,
          timezone: updates.timezone,
          bio: updates.bio
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.statusText}`);
      }

      await response.json();
      if (profile) {
        const updatedProfile: UserProfile = {
          ...profile,
          ...updates,
          updatedAt: new Date()
        };
        setProfile(updatedProfile);
        
        // Dispatch profile update event
        window.dispatchEvent(new CustomEvent('profile:updated', { detail: updatedProfile }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
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
      
      const token = localStorage.getItem('auth-token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/v1/profile/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      if (preferences) {
        const updatedPreferences: UserPreferences = { ...preferences, ...updates };
        setPreferences(updatedPreferences);
        
        // Dispatch preferences update event
        window.dispatchEvent(new CustomEvent('preferences:updated', { detail: updatedPreferences }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
      console.error('Preferences update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth-token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/v1/profile/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: newPassword
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to change password');
      }

      if (securitySettings) {
        const updatedSecurity: SecuritySettings = {
          ...securitySettings,
          lastPasswordChange: new Date()
        };
        setSecuritySettings(updatedSecurity);
        
        // Dispatch password change event
        window.dispatchEvent(new CustomEvent('password:changed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
      console.error('Password change error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const enableTwoFactor = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth-token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/v1/profile/enable-2fa', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to enable two-factor authentication');
      }

      if (securitySettings) {
        const updatedSecurity: SecuritySettings = { ...securitySettings, twoFactorEnabled: true };
        setSecuritySettings(updatedSecurity);
        
        // Dispatch 2FA enable event
        window.dispatchEvent(new CustomEvent('2fa:enabled'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable two-factor authentication');
      console.error('2FA enable error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const disableTwoFactor = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth-token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/v1/profile/disable-2fa', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to disable two-factor authentication');
      }

      if (securitySettings) {
        const updatedSecurity: SecuritySettings = { ...securitySettings, twoFactorEnabled: false };
        setSecuritySettings(updatedSecurity);
        
        // Dispatch 2FA disable event
        window.dispatchEvent(new CustomEvent('2fa:disabled'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable two-factor authentication');
      console.error('2FA disable error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadAvatar = async (file: File): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth-token');
      if (!token) throw new Error('No authentication token');

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/v1/profile/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload avatar');
      }

      const data = await response.json();
      
      if (profile) {
        const updatedProfile: UserProfile = { ...profile, avatar: data.avatar_url, updatedAt: new Date() };
        setProfile(updatedProfile);
        
        // Dispatch avatar update event
        window.dispatchEvent(new CustomEvent('avatar:updated', { detail: data.avatar_url }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
      console.error('Avatar upload error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivities = async (limit: number = 50): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth-token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`/api/v1/profile/activities?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const activitiesData = await response.json();
        const activities: UserActivity[] = activitiesData.map((activity: any) => ({
          id: activity.id,
          type: activity.action as any,
          description: activity.description || activity.action,
          timestamp: new Date(activity.timestamp),
          ipAddress: activity.ip_address,
          userAgent: activity.user_agent,
          location: activity.location
        }));
        setActivities(activities);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities');
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
