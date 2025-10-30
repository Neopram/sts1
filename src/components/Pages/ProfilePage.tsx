import React, { useState, useEffect } from 'react';
import {
  User,
  Camera,
  Shield,
  Calendar,
  X,
  CheckCircle,
  AlertCircle,
  Download
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import ApiService from '../../api';

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

  // Demo user data for when no user is authenticated
  const demoUser = {
    name: 'Demo User',
    email: 'demo@sts.com',
    role: 'owner'
  };

  const currentUser = user || demoUser;

  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [profileData, setProfileData] = useState<ProfileData>({
    name: currentUser.name || '',
    email: currentUser.email || '',
    role: currentUser.role || 'broker',
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

  const [preferencesData, setPreferencesData] = useState({
    theme: 'light',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    emailNotifications: true,
    pushNotifications: false,
    weeklyDigest: true
  });

  const [loading, setLoading] = useState(true);

  // Load profile data on component mount
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const apiService = new ApiService();
      const response = await apiService.getUserProfile();

      if (response.data) {
        const profile = response.data;
        setProfileData({
          name: profile.name || '',
          email: profile.email || '',
          role: profile.role || 'broker',
          company: profile.company || '',
          phone: profile.phone || '',
          location: profile.location || '',
          timezone: profile.timezone || 'UTC',
          bio: profile.bio || '',
          avatar: profile.avatar_url || null
        });

        // Load preferences from profile
        if (profile.preferences) {
          setPreferencesData({
            theme: profile.preferences.theme || 'light',
            language: profile.preferences.language || 'en',
            dateFormat: profile.preferences.dateFormat || 'MM/DD/YYYY',
            timeFormat: profile.preferences.timeFormat || '12h',
            emailNotifications: profile.preferences.emailNotifications ?? true,
            pushNotifications: profile.preferences.pushNotifications ?? false,
            weeklyDigest: profile.preferences.weeklyDigest ?? true
          });
        }
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
      setMessage({ type: 'error', text: 'Failed to load profile data. Please refresh the page.' });
    } finally {
      setLoading(false);
    }
  };

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
      const apiService = new ApiService();
      const updateData = {
        name: profileData.name,
        company: profileData.company,
        phone: profileData.phone,
        location: profileData.location,
        timezone: profileData.timezone,
        bio: profileData.bio,
        preferences: preferencesData
      };

      await apiService.updateUserProfile(updateData);

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
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
      const apiService = new ApiService();
      await apiService.changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        confirm_password: passwordData.confirmPassword
      });

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
      console.error('Failed to change password:', error);
      setMessage({ type: 'error', text: 'Failed to change password. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarPreview) return;

    // Convert data URL to File object
    const response = await fetch(avatarPreview);
    const blob = await response.blob();
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

    setSaving(true);
    try {
      const apiService = new ApiService();
      await apiService.uploadAvatar(file);

      setMessage({ type: 'success', text: 'Avatar uploaded successfully!' });
      setShowAvatarModal(false);
      setAvatarPreview(null);

      // Reload profile data to get updated avatar URL
      await loadProfileData();

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      setMessage({ type: 'error', text: 'Failed to upload avatar. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setSaving(true);
    try {
      const apiService = new ApiService();
      await apiService.deleteAvatar();

      setMessage({ type: 'success', text: 'Avatar deleted successfully!' });
      setProfileData(prev => ({ ...prev, avatar: null }));

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to delete avatar:', error);
      setMessage({ type: 'error', text: 'Failed to delete avatar. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesChange = (field: string, value: any) => {
    setPreferencesData(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const apiService = new ApiService();
      await apiService.updateUserProfile({
        preferences: preferencesData
      });

      setMessage({ type: 'success', text: 'Preferences updated successfully!' });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to update preferences:', error);
      setMessage({ type: 'error', text: 'Failed to update preferences. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-secondary-500">Loading...</div>
        </div>
      );
    }

    switch (activeTab) {
      case 'personal':
        return (
          <div className="space-y-8">
            {/* Avatar Section */}
            <div className="card bg-white rounded-2xl border border-secondary-100 p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-secondary-100 to-secondary-200 flex items-center justify-center overflow-hidden border-2 border-secondary-200">
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
                    className="absolute bottom-0 right-0 bg-gradient-to-r from-primary-600 to-primary-500 text-white p-2.5 rounded-full hover:from-primary-700 hover:to-primary-600 transition-all duration-200 shadow-lg hover:shadow-xl"
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
                    {profileData.avatar && (
                      <button
                        onClick={handleDeleteAvatar}
                        disabled={saving}
                        className="btn-secondary disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <div className="card bg-white rounded-2xl border border-secondary-100 p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-secondary-900">Personal Information</h3>
                <div className="flex space-x-3">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          loadProfileData(); // Reload original data
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
                    className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 disabled:bg-secondary-50 disabled:text-secondary-500 hover:border-secondary-300"
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
                    className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 disabled:bg-secondary-50 disabled:text-secondary-500 hover:border-secondary-300"
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
                    className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 disabled:bg-secondary-50 disabled:text-secondary-500 hover:border-secondary-300"
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
                    className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 disabled:bg-secondary-50 disabled:text-secondary-500 hover:border-secondary-300"
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
                    className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 disabled:bg-secondary-50 disabled:text-secondary-500 hover:border-secondary-300"
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
                    className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 disabled:bg-secondary-50 disabled:text-secondary-500 hover:border-secondary-300"
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
                  className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 disabled:bg-secondary-50 disabled:text-secondary-500 hover:border-secondary-300"
                  placeholder="Tell us a bit about yourself..."
                />
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-8">
            {/* Password Change Section */}
            <div className="card bg-white rounded-2xl border border-secondary-100 p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-secondary-900">Change Password</h3>
                  <p className="text-sm text-secondary-600 mt-1">
                    Update your password to keep your account secure.
                  </p>
                </div>
                {!isChangingPassword && (
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="btn-primary"
                  >
                    Change Password
                  </button>
                )}
              </div>

              {isChangingPassword && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Current Password *
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                      className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 hover:border-secondary-300"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      New Password *
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 hover:border-secondary-300"
                      required
                    />
                    <p className="text-xs text-secondary-500 mt-1">
                      Must be at least 8 characters long.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                      className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 hover:border-secondary-300"
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleChangePassword}
                      disabled={saving}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Security Settings */}
            <div className="card bg-white rounded-2xl border border-secondary-100 p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
              <h3 className="text-lg font-medium text-secondary-900 mb-6">Security Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-secondary-900">Two-Factor Authentication</h4>
                    <p className="text-sm text-secondary-600">Add an extra layer of security to your account</p>
                  </div>
                  <button className="btn-secondary">
                    Enable 2FA
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-secondary-900">Login Notifications</h4>
                    <p className="text-sm text-secondary-600">Get notified when someone logs into your account</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-8">
            {/* Preferences Form */}
            <div className="card bg-white rounded-2xl border border-secondary-100 p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-secondary-900">User Preferences</h3>
                <button
                  onClick={handleSavePreferences}
                  disabled={saving}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Theme
                  </label>
                  <select
                    value={preferencesData.theme}
                    onChange={(e) => handlePreferencesChange('theme', e.target.value)}
                    className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 hover:border-secondary-300"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Language
                  </label>
                  <select
                    value={preferencesData.language}
                    onChange={(e) => handlePreferencesChange('language', e.target.value)}
                    className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 hover:border-secondary-300"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Date Format
                  </label>
                  <select
                    value={preferencesData.dateFormat}
                    onChange={(e) => handlePreferencesChange('dateFormat', e.target.value)}
                    className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 hover:border-secondary-300"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Time Format
                  </label>
                  <select
                    value={preferencesData.timeFormat}
                    onChange={(e) => handlePreferencesChange('timeFormat', e.target.value)}
                    className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 hover:border-secondary-300"
                  >
                    <option value="12h">12 Hour</option>
                    <option value="24h">24 Hour</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <h4 className="font-medium text-secondary-900">Notifications</h4>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-secondary-900">Email Notifications</label>
                    <p className="text-sm text-secondary-600">Receive notifications via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferencesData.emailNotifications}
                      onChange={(e) => handlePreferencesChange('emailNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-secondary-900">Push Notifications</label>
                    <p className="text-sm text-secondary-600">Receive push notifications in your browser</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferencesData.pushNotifications}
                      onChange={(e) => handlePreferencesChange('pushNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-secondary-900">Weekly Digest</label>
                    <p className="text-sm text-secondary-600">Receive a weekly summary of your activity</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferencesData.weeklyDigest}
                      onChange={(e) => handlePreferencesChange('weeklyDigest', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Data Export Section */}
            <div className="card bg-white rounded-2xl border border-secondary-100 p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
              <h3 className="text-lg font-medium text-secondary-900 mb-6">Data Export</h3>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-secondary-900">Export Your Data</h4>
                  <p className="text-sm text-secondary-600">Download a copy of all your data</p>
                </div>
                <button className="btn-secondary flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Export Data</span>
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Gradient */}
        <div className="mb-8 bg-gradient-to-r from-secondary-50 via-white to-secondary-50 p-8 rounded-2xl border border-secondary-100 shadow-sm">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-secondary-900 to-primary-700 bg-clip-text text-transparent">Profile Settings</h1>
          <p className="mt-3 text-lg text-secondary-600 font-medium">
            Manage your personal information, security settings, and preferences.
          </p>
        </div>

        {/* Message Display - Enhanced */}
        {message && (
          <div className={`mb-6 p-6 rounded-xl border-l-4 shadow-md transition-all duration-300 ${
            message.type === 'success'
              ? 'bg-success-50 border-l-success-600 border border-success-200 text-success-800'
              : 'bg-danger-50 border-l-danger-600 border border-danger-200 text-danger-800'
          }`}>
            <div className="flex items-center gap-3">
              {message.type === 'success' ? (
                <CheckCircle className="w-6 h-6 flex-shrink-0 text-success-600" />
              ) : (
                <AlertCircle className="w-6 h-6 flex-shrink-0 text-danger-600" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation - Enhanced */}
          <div className="lg:col-span-1">
            <nav className="sticky top-4 space-y-2 bg-white rounded-2xl p-4 border border-secondary-100 shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-5 py-4 rounded-xl transition-all duration-300 font-semibold flex items-center gap-3 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg'
                      : 'text-secondary-600 hover:bg-secondary-50 hover:text-primary-600 hover:shadow-md'
                  }`}
                >
                  <span className={`${activeTab === tab.id ? 'text-white' : 'text-secondary-400'}`}>{tab.icon}</span>
                  <div className="font-semibold">{tab.title}</div>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[50] p-6 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-secondary-100">
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
                    className="w-full px-4 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 hover:border-secondary-300"
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
                    onClick={handleUploadAvatar}
                    disabled={saving}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Uploading...' : 'Upload'}
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
