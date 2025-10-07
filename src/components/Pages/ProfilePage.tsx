import React, { useState } from 'react';
import {
  User,
  Camera,
  Shield,
  Key,
  Calendar,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface ProfileData {
  name: string;
  email: string;
  role: string;
  company: string;
  phone: string;
  location: string;
  timezone: string;
  bio: string;
  avatar: string | null;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ProfilePage: React.FC = () => {
  const { user } = useApp();
  
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'broker',
    company: '',
    phone: '',
    location: '',
    timezone: 'UTC',
    bio: '',
    avatar: null
  });
  
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const tabs = [
    {
      id: 'personal',
      title: 'Personal Information',
      icon: <User className="w-4 h-4" />
    },
    {
      id: 'security',
      title: 'Security',
      icon: <Shield className="w-4 h-4" />
    },
    {
      id: 'preferences',
      title: 'Preferences',
      icon: <Calendar className="w-4 h-4" />
    }
  ];

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ];

  const handleProfileChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: keyof PasswordData, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // In a real app, this would send the data to the backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    
    setSaving(true);
    try {
      // In a real app, this would send the password change request to the backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to change password. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const renderPersonalTab = () => (
    <div className="space-y-8">
      {/* Avatar Section */}
      <div className="card">
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-secondary-200 flex items-center justify-center overflow-hidden">
              {avatarPreview || profileData.avatar ? (
                <img
                  src={avatarPreview || profileData.avatar || ''}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-secondary-400" />
              )}
            </div>
            <button
              onClick={() => setShowAvatarModal(true)}
              className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors duration-200"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-medium text-secondary-900 mb-2">Profile Picture</h3>
            <p className="text-sm text-secondary-600 mb-6">
              Upload a profile picture to personalize your account. Supported formats: JPG, PNG, GIF (max 5MB).
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAvatarModal(true)}
                className="btn-primary"
              >
                Change Picture
              </button>
              {avatarPreview && (
                <button
                  onClick={() => setAvatarPreview(null)}
                  className="btn-secondary"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-secondary-900">Personal Information</h3>
          <div className="flex space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setProfileData({
                      name: user?.name || '',
                      email: user?.email || '',
                      role: user?.role || 'broker',
                      company: '',
                      phone: '',
                      location: '',
                      timezone: 'UTC',
                      bio: '',
                      avatar: null
                    });
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-primary"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => handleProfileChange('name', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-secondary-50 disabled:text-secondary-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => handleProfileChange('email', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-secondary-50 disabled:text-secondary-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Role
            </label>
            <input
              type="text"
              value={profileData.role}
              disabled
              className="w-full px-3 py-2 border border-secondary-300 rounded-xl bg-secondary-50 text-secondary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Company
            </label>
            <input
              type="text"
              value={profileData.company}
              onChange={(e) => handleProfileChange('company', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-secondary-50 disabled:text-secondary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => handleProfileChange('phone', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-secondary-50 disabled:text-secondary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={profileData.location}
              onChange={(e) => handleProfileChange('location', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-secondary-50 disabled:text-secondary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Timezone
            </label>
            <select
              value={profileData.timezone}
              onChange={(e) => handleProfileChange('timezone', e.target.value)}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-secondary-50 disabled:text-secondary-500"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-6">
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Bio
          </label>
          <textarea
            value={profileData.bio}
            onChange={(e) => handleProfileChange('bio', e.target.value)}
            disabled={!isEditing}
            rows={4}
            className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-secondary-50 disabled:text-secondary-500"
            placeholder="Tell us a bit about yourself..."
          />
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-8">
      {/* Password Change */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-secondary-900">Change Password</h3>
            <p className="text-sm text-secondary-600 mt-1">
              Update your password to keep your account secure.
            </p>
          </div>
          <button
            onClick={() => setIsChangingPassword(!isChangingPassword)}
            className="btn-primary"
          >
            {isChangingPassword ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {isChangingPassword && (
          <div className="border-t border-secondary-200 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <Key className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <Key className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
                </div>
                <p className="text-xs text-secondary-500 mt-1">
                  Must be at least 8 characters long
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <Key className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleChangePassword}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Two-Factor Authentication */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-secondary-900">Two-Factor Authentication</h3>
            <p className="text-sm text-secondary-600 mt-1">
              Add an extra layer of security to your account.
            </p>
          </div>
          <button className="btn-success">
            Enable 2FA
          </button>
        </div>
      </div>

      {/* Login Sessions */}
      <div className="card">
        <h3 className="text-lg font-medium text-secondary-900 mb-6">Active Sessions</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-success-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-secondary-900">Current Session</p>
                <p className="text-xs text-secondary-500">Windows 10 • Chrome • Localhost</p>
              </div>
            </div>
            <span className="text-xs text-secondary-500">Active now</span>
          </div>
        </div>
        <button className="mt-4 text-sm text-danger-600 hover:text-danger-800 font-medium">
          Sign out from all other devices
        </button>
      </div>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="space-y-8">
      {/* Notification Preferences */}
      <div className="card">
        <h3 className="text-lg font-medium text-secondary-900 mb-6">Notification Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-secondary-900">Email Notifications</p>
              <p className="text-sm text-secondary-600">Receive notifications via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-secondary-900">Push Notifications</p>
              <p className="text-sm text-secondary-600">Receive push notifications in browser</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-secondary-900">SMS Notifications</p>
              <p className="text-sm text-secondary-600">Receive notifications via SMS</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="card">
        <h3 className="text-lg font-medium text-secondary-900 mb-6">Privacy Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-secondary-900">Profile Visibility</p>
              <p className="text-sm text-secondary-600">Make your profile visible to other users</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-secondary-900">Activity Status</p>
              <p className="text-sm text-secondary-600">Show when you're online</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Data Export */}
      <div className="card">
        <h3 className="text-lg font-medium text-secondary-900 mb-6">Data & Export</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-secondary-900">Export My Data</p>
              <p className="text-sm text-secondary-600">Download all your data in JSON format</p>
            </div>
            <button className="btn-primary">
              Export Data
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-secondary-900">Delete Account</p>
              <p className="text-sm text-secondary-600">Permanently delete your account and all data</p>
            </div>
            <button className="btn-danger">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal':
        return renderPersonalTab();
      case 'security':
        return renderSecurityTab();
      case 'preferences':
        return renderPreferencesTab();
      default:
        return renderPersonalTab();
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900">Profile Settings</h1>
          <p className="mt-2 text-secondary-600">
            Manage your personal information, security settings, and preferences.
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-6 rounded-xl ${
            message.type === 'success' 
              ? 'bg-success-50 border border-success-200 text-success-800' 
              : 'bg-danger-50 border border-danger-200 text-danger-800'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-2" />
              )}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-50 border border-blue-200 text-blue-700'
                      : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="mr-3">{tab.icon}</span>
                    <div className="font-medium">{tab.title}</div>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Avatar Upload Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[50] p-6">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-secondary-900">
                  Upload Profile Picture
                </h3>
                <button
                  onClick={() => setShowAvatarModal(false)}
                  className="text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Choose File
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-secondary-500 mt-1">
                    JPG, PNG, GIF up to 5MB
                  </p>
                </div>
                
                {avatarPreview && (
                  <div className="text-center">
                    <img
                      src={avatarPreview}
                      alt="Preview"
                      className="w-32 h-32 rounded-full mx-auto object-cover"
                    />
                  </div>
                )}
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowAvatarModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowAvatarModal(false);
                      // In a real app, this would upload the avatar
                    }}
                    className="btn-primary"
                  >
                    Upload
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
