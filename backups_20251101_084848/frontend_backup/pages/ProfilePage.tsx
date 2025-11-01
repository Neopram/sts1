import React, { useState, useRef } from 'react';
import { 
  User, 
  Shield, 
  Settings, 
  Activity, 
  Camera, 
  Edit3, 
  Save, 
  X,
  Eye,
  Lock,
  Smartphone,
  Mail,
  Globe,
  Bell,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
  Monitor
} from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';

import { useNotifications } from '../contexts/NotificationContext';

const ProfilePage: React.FC = () => {
  const { 
    profile, 
    securitySettings, 
    preferences, 
    activities, 
    isLoading, 
    error,
    updateProfile, 
    updatePreferences, 
    changePassword, 
    enableTwoFactor, 
    disableTwoFactor, 
    uploadAvatar,
    clearError
  } = useProfile();
  

  const { addNotification } = useNotifications();
  
  // State
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'activity'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Form states
  const [profileForm, setProfileForm] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    department: profile?.department || '',
    position: profile?.position || '',
    location: profile?.location || '',
    timezone: profile?.timezone || '',
    bio: profile?.bio || ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [preferencesForm, setPreferencesForm] = useState({
    language: preferences?.language || 'en',
    theme: preferences?.theme || 'light',
    emailNotifications: preferences?.notifications.email || true,
    pushNotifications: preferences?.notifications.push || true,
    smsNotifications: preferences?.notifications.sms || false,
    notificationFrequency: preferences?.notifications.frequency || 'immediate',
    profileVisibility: preferences?.privacy.profileVisibility || 'team',
    showEmail: preferences?.privacy.showEmail || true,
    showPhone: preferences?.privacy.showPhone || false
  } as {
    language: string;
    theme: 'light' | 'dark' | 'auto';
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    notificationFrequency: 'immediate' | 'hourly' | 'daily';
    profileVisibility: 'public' | 'private' | 'team';
    showEmail: boolean;
    showPhone: boolean;
  });
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Update form when profile changes
  React.useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        department: profile.department || '',
        position: profile.position || '',
        location: profile.location || '',
        timezone: profile.timezone || '',
        bio: profile.bio || ''
      });
    }
  }, [profile]);
  
  React.useEffect(() => {
    if (preferences) {
      setPreferencesForm({
        language: preferences.language || 'en',
        theme: preferences.theme || 'light',
        emailNotifications: preferences.notifications.email || true,
        pushNotifications: preferences.notifications.push || true,
        smsNotifications: preferences.notifications.sms || false,
        notificationFrequency: preferences.notifications.frequency || 'immediate',
        profileVisibility: preferences.privacy.profileVisibility || 'team',
        showEmail: preferences.privacy.showEmail || true,
        showPhone: preferences.privacy.showPhone || false
      });
    }
  }, [preferences]);
  
  // Handle profile form submission
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateProfile(profileForm);
      setIsEditing(false);
      addNotification({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully',
        priority: 'medium',
        category: 'system'
      });
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update profile. Please try again.',
        priority: 'high',
        category: 'system'
      });
    }
  };
  
  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addNotification({
        type: 'error',
        title: 'Password Mismatch',
        message: 'New password and confirmation do not match',
        priority: 'high',
        category: 'security'
      });
      return;
    }
    
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setShowPasswordForm(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      addNotification({
        type: 'success',
        title: 'Password Changed',
        message: 'Your password has been changed successfully',
        priority: 'medium',
        category: 'security'
      });
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Password Change Failed',
        message: 'Failed to change password. Please try again.',
        priority: 'high',
        category: 'security'
      });
    }
  };
  
  // Handle preferences update
  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const updatedPreferences = {
        language: preferencesForm.language,
        theme: preferencesForm.theme,
        notifications: {
          email: preferencesForm.emailNotifications,
          push: preferencesForm.pushNotifications,
          sms: preferencesForm.smsNotifications,
          frequency: preferencesForm.notificationFrequency
        },
        privacy: {
          profileVisibility: preferencesForm.profileVisibility,
          showEmail: preferencesForm.showEmail,
          showPhone: preferencesForm.showPhone
        }
      };
      
      await updatePreferences(updatedPreferences);
      addNotification({
        type: 'success',
        title: 'Preferences Updated',
        message: 'Your preferences have been updated successfully',
        priority: 'medium',
        category: 'system'
      });
    } catch (err) {
              addNotification({
          type: 'error',
          title: 'Update Failed',
          message: 'Failed to update preferences. Please try again.',
          priority: 'high',
          category: 'system'
        });
    }
  };
  
  // Handle avatar upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleAvatarUpload = async () => {
    if (avatarFile) {
      try {
        await uploadAvatar(avatarFile);
        setAvatarFile(null);
        setAvatarPreview(null);
        addNotification({
          type: 'success',
          title: 'Avatar Updated',
          message: 'Your profile picture has been updated successfully',
          priority: 'medium',
          category: 'system'
        });
      } catch (err) {
        addNotification({
          type: 'success',
          title: 'Upload Failed',
          message: 'Failed to upload avatar. Please try again.',
          priority: 'high',
          category: 'system'
        });
      }
    }
  };
  
  // Handle 2FA toggle
  const handleTwoFactorToggle = async () => {
    if (securitySettings?.twoFactorEnabled) {
      await disableTwoFactor();
      addNotification({
        type: 'success',
        title: '2FA Disabled',
        message: 'Two-factor authentication has been disabled',
        priority: 'medium',
        category: 'security'
      });
    } else {
      await enableTwoFactor();
      addNotification({
        type: 'success',
        title: '2FA Enabled',
        message: 'Two-factor authentication has been enabled',
        priority: 'medium',
        category: 'security'
      });
    }
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login': return <User className="w-4 h-4" />;
      case 'logout': return <User className="w-4 h-4" />;
      case 'document_view': return <Eye className="w-4 h-4" />;
      case 'document_edit': return <Edit3 className="w-4 h-4" />;
      case 'vessel_access': return <Globe className="w-4 h-4" />;
      case 'settings_change': return <Settings className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };
  
  // Get activity color
  const getActivityColor = (type: string) => {
    switch (type) {
      case 'login': return 'text-green-600 bg-green-100';
      case 'logout': return 'text-gray-600 bg-gray-100';
      case 'document_view': return 'text-blue-600 bg-blue-100';
      case 'document_edit': return 'text-yellow-600 bg-yellow-100';
      case 'vessel_access': return 'text-purple-600 bg-purple-100';
      case 'settings_change': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  
  if (!profile || !securitySettings || !preferences) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
            <p className="mt-2 text-gray-600">Manage your account settings and preferences</p>
          </div>
          
          {activeTab === 'profile' && (
            <div className="flex space-x-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleProfileSubmit}
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-800">{error}</span>
            <button
              onClick={clearError}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'security'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Shield className="w-4 h-4 inline mr-2" />
              Security
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'preferences'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Preferences
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'activity'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Activity
            </button>
          </nav>
        </div>
      </div>
      
      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Avatar Section */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Picture</h3>
              
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <img
                    src={avatarPreview || profile.avatar || `https://ui-avatars.com/api/?name=${profile.name}&size=150&background=0D9488&color=fff`}
                    alt={profile.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                
                {avatarFile && (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAvatarUpload}
                      disabled={isLoading}
                      className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isLoading ? 'Uploading...' : 'Upload'}
                    </button>
                    <button
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              
              <div className="mt-6 space-y-3">
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Last updated: {formatDate(profile.updatedAt)}</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>Member since: {formatDate(profile.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Profile Form */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
              
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={profileForm.department}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, department: e.target.value }))}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position
                    </label>
                    <input
                      type="text"
                      value={profileForm.position}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, position: e.target.value }))}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={profileForm.location}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, location: e.target.value }))}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timezone
                    </label>
                    <select
                      value={profileForm.timezone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, timezone: e.target.value }))}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    >
                      <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                      <option value="UTC">UTC (GMT+0)</option>
                      <option value="America/New_York">America/New_York (GMT-5)</option>
                      <option value="Europe/London">Europe/London (GMT+0)</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                    disabled={!isEditing}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Password Section */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Password & Security</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Lock className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Password</p>
                    <p className="text-xs text-gray-500">
                      Last changed: {formatDate(securitySettings.lastPasswordChange)}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Change Password
                </button>
              </div>
              
              {showPasswordForm && (
                <form onSubmit={handlePasswordChange} className="p-4 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Password *
                      </label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password *
                      </label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password *
                      </label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4 flex space-x-3">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isLoading ? 'Changing...' : 'Change Password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
          
          {/* Two-Factor Authentication */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Smartphone className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">2FA Status</p>
                  <p className="text-xs text-gray-500">
                    {securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleTwoFactorToggle}
                disabled={isLoading}
                className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
                  securitySettings.twoFactorEnabled
                    ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
                    : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                } disabled:opacity-50`}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : securitySettings.twoFactorEnabled ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Disable 2FA
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Enable 2FA
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Security Information */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Security Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Password Expiry</span>
                </div>
                <p className="text-sm text-gray-600">
                  {formatDate(securitySettings.passwordExpiryDate)}
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <AlertCircle className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Login Attempts</span>
                </div>
                <p className="text-sm text-gray-600">
                  {securitySettings.loginAttempts} failed attempts
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          <form onSubmit={handlePreferencesSubmit}>
            {/* Language & Theme */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Appearance & Language</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    value={preferencesForm.language}
                    onChange={(e) => setPreferencesForm(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </label>
                  <select
                    value={preferencesForm.theme}
                    onChange={(e) => setPreferencesForm(prev => ({ ...prev, theme: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Notifications */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Email Notifications</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferencesForm.emailNotifications}
                    onChange={(e) => setPreferencesForm(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Bell className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Push Notifications</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferencesForm.pushNotifications}
                    onChange={(e) => setPreferencesForm(prev => ({ ...prev, pushNotifications: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">SMS Notifications</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferencesForm.smsNotifications}
                    onChange={(e) => setPreferencesForm(prev => ({ ...prev, smsNotifications: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notification Frequency
                  </label>
                  <select
                    value={preferencesForm.notificationFrequency}
                    onChange={(e) => setPreferencesForm(prev => ({ ...prev, notificationFrequency: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Privacy */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Visibility
                  </label>
                  <select
                    value={preferencesForm.profileVisibility}
                    onChange={(e) => setPreferencesForm(prev => ({ ...prev, profileVisibility: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="public">Public</option>
                    <option value="team">Team Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Show Email Address</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferencesForm.showEmail}
                    onChange={(e) => setPreferencesForm(prev => ({ ...prev, showEmail: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Show Phone Number</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferencesForm.showPhone}
                    onChange={(e) => setPreferencesForm(prev => ({ ...prev, showPhone: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-5 h-5 mr-2" />
                {isLoading ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(activity.timestamp)}</span>
                      </span>
                      
                      {activity.ipAddress && (
                        <span className="flex items-center space-x-1">
                          <Monitor className="w-3 h-3" />
                          <span>{activity.ipAddress}</span>
                        </span>
                      )}
                      
                      {activity.location && (
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{activity.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 text-center">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Download className="w-4 h-4 mr-2" />
                Export Activity Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
