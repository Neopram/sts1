/**
 * Enhanced Settings Page Component - Phase 1 MVP
 * Includes: Theme switching, Password change, Timezone/Language switching,
 * Session timeout, Input validation, CSV export, Dark mode application
 */

import React, { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Palette,
  Shield,
  Database,
  Download,
  CheckCircle,
  AlertCircle,
  Moon,
  Sun,
  Lock,
  Eye,
  EyeOff,
  LogOut
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  getUserTimezone,
  setUserTimezone,
  getUserDateFormat,
  setUserDateFormat,
  getUserTimeFormat,
  setUserTimeFormat,
  getSupportedTimezones,
  formatDateTime
} from '../../utils/dateFormatting';
import ApiService from '../../api';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface PasswordFormData {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const SettingsPage: React.FC = () => {
  const { user, logout } = useApp();
  const { theme, isDark, setTheme, toggleTheme } = useTheme();
  const { currentLanguage, setLanguage: changeLanguage } = useLanguage();

  // Active section state
  const [activeSection, setActiveSection] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [_loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile settings
  const [profileSettings, setProfileSettings] = useState({
    displayName: user?.name || '',
    email: user?.email || '',
    timezone: getUserTimezone(),
    language: currentLanguage?.code || 'en',
    dateFormat: getUserDateFormat(),
    timeFormat: getUserTimeFormat()
  });

  // Password change form
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    documentUpdates: true,
    approvalRequests: true,
    systemAlerts: true,
    weeklyDigest: false
  });

  // Appearance settings
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: theme,
    fontSize: 'medium',
    compactMode: false,
    showAnimations: true
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 30
  });

  // Data settings
  const [dataSettings, setDataSettings] = useState({
    exportFormat: 'json'
  });

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const settings = await ApiService.getUserSettings();

        if (settings) {
          if (settings.display_name) {
            setProfileSettings(prev => ({ ...prev, displayName: settings.display_name }));
          }
          if (settings.timezone) {
            setProfileSettings(prev => ({ ...prev, timezone: settings.timezone }));
          }
          if (settings.language) {
            setProfileSettings(prev => ({ ...prev, language: settings.language }));
          }
          if (settings.date_format) {
            setProfileSettings(prev => ({ ...prev, dateFormat: settings.date_format }));
          }
          if (settings.time_format) {
            setProfileSettings(prev => ({ ...prev, timeFormat: settings.time_format }));
          }

          if (settings.notification_settings) {
            setNotificationSettings(prev => ({ ...prev, ...settings.notification_settings }));
          }

          if (settings.appearance_settings) {
            setAppearanceSettings(prev => ({
              ...prev,
              ...settings.appearance_settings,
              theme: theme // Don't override current theme
            }));
          }

          if (settings.security_settings) {
            setSecuritySettings(prev => ({ ...prev, ...settings.security_settings }));
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setMessage({ type: 'error', text: 'Failed to load settings. Using defaults.' });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [theme]);

  const sections: SettingsSection[] = [
    {
      id: 'profile',
      title: 'Profile',
      description: 'Manage your personal information',
      icon: <User className="w-5 h-5" />
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Configure notification preferences',
      icon: <Bell className="w-5 h-5" />
    },
    {
      id: 'appearance',
      title: 'Appearance',
      description: 'Customize look and feel',
      icon: <Palette className="w-5 h-5" />
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Manage security settings',
      icon: <Shield className="w-5 h-5" />
    },
    {
      id: 'data',
      title: 'Data & Export',
      description: 'Export your data',
      icon: <Database className="w-5 h-5" />
    }
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' }
  ];

  const timezones = getSupportedTimezones();

  const themes = [
    { value: 'light', name: 'Light', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', name: 'Dark', icon: <Moon className="w-4 h-4" /> },
    { value: 'auto', name: 'Auto', icon: <Palette className="w-4 h-4" /> }
  ];

  // Save profile settings
  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const updateData = {
        display_name: profileSettings.displayName,
        timezone: profileSettings.timezone,
        language: profileSettings.language,
        date_format: profileSettings.dateFormat,
        time_format: profileSettings.timeFormat
      };

      await ApiService.updateUserSettings(updateData);

      // Apply timezone and language to app
      setUserTimezone(profileSettings.timezone);
      setUserDateFormat(profileSettings.dateFormat as any);
      setUserTimeFormat(profileSettings.timeFormat as any);
      
      if (profileSettings.language !== currentLanguage?.code) {
        changeLanguage(profileSettings.language as any);
      }

      setMessage({ type: 'success', text: 'Profile settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save profile settings' });
    } finally {
      setSaving(false);
    }
  };

  // Save notification settings
  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      setMessage(null);

      await ApiService.updateUserSettings({
        notification_settings: notificationSettings
      });

      setMessage({ type: 'success', text: 'Notification settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save notification settings' });
    } finally {
      setSaving(false);
    }
  };

  // Save appearance settings
  const handleSaveAppearance = async () => {
    try {
      setSaving(true);
      setMessage(null);

      // Apply theme immediately
      if (appearanceSettings.theme !== theme) {
        setTheme(appearanceSettings.theme as any);
      }

      await ApiService.updateUserSettings({
        appearance_settings: appearanceSettings
      });

      setMessage({ type: 'success', text: 'Appearance settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save appearance settings' });
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    try {
      if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        setMessage({ type: 'error', text: 'All password fields are required' });
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setMessage({ type: 'error', text: 'New passwords do not match' });
        return;
      }

      if (passwordForm.newPassword.length < 8) {
        setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
        return;
      }

      setSaving(true);
      setMessage(null);

      await ApiService.changePassword(
        passwordForm.oldPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword
      );

      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  // Save security settings
  const handleSaveSecurity = async () => {
    try {
      setSaving(true);
      setMessage(null);

      localStorage.setItem('session-timeout', String(securitySettings.sessionTimeout));

      await ApiService.updateUserSettings({
        security_settings: securitySettings
      });

      setMessage({ type: 'success', text: 'Security settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save security settings' });
    } finally {
      setSaving(false);
    }
  };

  // Export data as CSV
  const handleExportCSV = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const blob = await ApiService.exportUserDataCSV();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `user_settings_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      setMessage({ type: 'success', text: 'Data exported successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to export data' });
    } finally {
      setSaving(false);
    }
  };

  // Export data as JSON
  const handleExportJSON = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const data = await ApiService.exportUserData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `user_settings_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      setMessage({ type: 'success', text: 'Data exported successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to export data' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your account settings and preferences</p>
        </div>

        {/* Success/Error Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            )}
            <span className={message.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
              {message.text}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-2 sticky top-8">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    activeSection === section.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-l-4 border-blue-500'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {section.icon}
                  <div>
                    <div className="font-medium">{section.title}</div>
                    <div className="text-xs opacity-75 hidden sm:block">{section.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h2>

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={profileSettings.displayName}
                    onChange={(e) => setProfileSettings(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Your full name"
                  />
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profileSettings.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Timezone
                  </label>
                  <select
                    value={profileSettings.timezone}
                    onChange={(e) => setProfileSettings(prev => ({ ...prev, timezone: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {timezones.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language
                  </label>
                  <select
                    value={profileSettings.language}
                    onChange={(e) => setProfileSettings(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {languages.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date Format
                  </label>
                  <select
                    value={profileSettings.dateFormat}
                    onChange={(e) => setProfileSettings(prev => ({ ...prev, dateFormat: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                {/* Time Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time Format
                  </label>
                  <select
                    value={profileSettings.timeFormat}
                    onChange={(e) => setProfileSettings(prev => ({ ...prev, timeFormat: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="12h">12-hour (12:00 PM)</option>
                    <option value="24h">24-hour (13:00)</option>
                  </select>
                </div>

                {/* Preview */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Preview: {profileSettings.displayName || 'Your Name'}</p>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Profile Settings'}
                </button>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Settings</h2>

                <div className="space-y-4">
                  {[
                    { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive email notifications' },
                    { key: 'documentUpdates', label: 'Document Updates', description: 'Get notified about document changes' },
                    { key: 'approvalRequests', label: 'Approval Requests', description: 'Receive approval request notifications' },
                    { key: 'systemAlerts', label: 'System Alerts', description: 'Important system notifications' },
                    { key: 'weeklyDigest', label: 'Weekly Digest', description: 'Get a weekly summary' }
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings[item.key as keyof typeof notificationSettings] as boolean}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          [item.key]: e.target.checked
                        }))}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSaveNotifications}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Notification Settings'}
                </button>
              </div>
            )}

            {/* Appearance Section */}
            {activeSection === 'appearance' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Appearance Settings</h2>

                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Theme
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {themes.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setAppearanceSettings(prev => ({ ...prev, theme: t.value as any }))}
                        className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                          appearanceSettings.theme === t.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {t.icon}
                        <span className="font-medium text-sm text-gray-900 dark:text-white">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Font Size
                  </label>
                  <select
                    value={appearanceSettings.fontSize}
                    onChange={(e) => setAppearanceSettings(prev => ({ ...prev, fontSize: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                {/* Compact Mode */}
                <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Compact Mode</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Reduce spacing for more content</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={appearanceSettings.compactMode}
                    onChange={(e) => setAppearanceSettings(prev => ({ ...prev, compactMode: e.target.checked }))}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </div>

                {/* Animations */}
                <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Enable Animations</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Show animations and transitions</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={appearanceSettings.showAnimations}
                    onChange={(e) => setAppearanceSettings(prev => ({ ...prev, showAnimations: e.target.checked }))}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </div>

                <button
                  onClick={handleSaveAppearance}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Appearance Settings'}
                </button>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    <span className="font-medium">Tip:</span> Use Ctrl+Shift+T to quickly toggle dark mode
                  </p>
                </div>
              </div>
            )}

            {/* Security Section */}
            {activeSection === 'security' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Security Settings</h2>

                {/* Change Password */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h3>

                  <div className="space-y-4">
                    {/* Old Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordForm.oldPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, oldPassword: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter your current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-400"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter a new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-400"
                        >
                          {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Minimum 8 characters, must include uppercase, lowercase, number, and special character
                      </p>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          placeholder="Confirm your new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-400"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleChangePassword}
                    disabled={saving}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {saving ? 'Updating...' : 'Change Password'}
                  </button>
                </div>

                {/* Session Timeout */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Session Timeout</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="480"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      You'll be logged out after {securitySettings.sessionTimeout} minutes of inactivity
                    </p>
                  </div>

                  <button
                    onClick={handleSaveSecurity}
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Security Settings'}
                  </button>
                </div>
              </div>
            )}

            {/* Data & Export Section */}
            {activeSection === 'data' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data & Export</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Export as JSON */}
                  <button
                    onClick={handleExportJSON}
                    disabled={saving}
                    className="p-6 border-2 border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left disabled:opacity-50"
                  >
                    <Download className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Export as JSON</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Download all your data in JSON format</p>
                    <div className="mt-4 text-sm font-medium text-blue-600 dark:text-blue-400">
                      {saving ? 'Exporting...' : 'Export Now'}
                    </div>
                  </button>

                  {/* Export as CSV */}
                  <button
                    onClick={handleExportCSV}
                    disabled={saving}
                    className="p-6 border-2 border-green-200 dark:border-green-800 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-left disabled:opacity-50"
                  >
                    <Download className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Export as CSV</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Download your data in CSV format for spreadsheets</p>
                    <div className="mt-4 text-sm font-medium text-green-600 dark:text-green-400">
                      {saving ? 'Exporting...' : 'Export Now'}
                    </div>
                  </button>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-900 dark:text-amber-200">
                    <span className="font-medium">Note:</span> Exported data includes your profile, settings, and preferences. Keep this file secure as it contains sensitive information.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;