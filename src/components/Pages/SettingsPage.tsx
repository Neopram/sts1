import React, { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Palette,
  Shield,
  Database,
  Download,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import ApiService from '../../api';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const SettingsPage: React.FC = () => {
  const { user } = useApp();

  const [activeSection, setActiveSection] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [_loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const settings = await ApiService.getUserSettings();

        // Update state with loaded settings
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
          setAppearanceSettings(prev => ({ ...prev, ...settings.appearance_settings }));
        }

        if (settings.security_settings) {
          setSecuritySettings(prev => ({ ...prev, ...settings.security_settings }));
        }

        if (settings.data_settings) {
          setDataSettings(prev => ({ ...prev, ...settings.data_settings }));
        }

      } catch (error) {
        console.error('Error loading settings:', error);
        setMessage({ type: 'error', text: 'Failed to load settings. Using defaults.' });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);
  
  // Profile settings
  const [profileSettings, setProfileSettings] = useState({
    displayName: user?.name || '',
    email: user?.email || '',
    timezone: 'UTC',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  });
  
  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    documentUpdates: true,
    approvalRequests: true,
    systemAlerts: true,
    weeklyDigest: false
  });
  
  // Appearance settings
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: 'light',
    primaryColor: 'blue',
    fontSize: 'medium',
    compactMode: false,
    showAnimations: true
  });
  
  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    loginNotifications: true,
    suspiciousActivityAlerts: true,
    sessionTimeout: 30,
    requirePasswordForChanges: true
  });
  
  // Data settings
  const [dataSettings, setDataSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    retainBackups: 30,
    exportFormat: 'json',
    dataRetention: 'indefinite'
  });

  const sections: SettingsSection[] = [
    {
      id: 'profile',
      title: 'Profile',
      description: 'Manage your personal information and preferences',
      icon: <User className="w-5 h-5" />
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Configure how you receive notifications',
      icon: <Bell className="w-5 h-5" />
    },
    {
      id: 'appearance',
      title: 'Appearance',
      description: 'Customize the look and feel of the application',
      icon: <Palette className="w-5 h-5" />
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Manage your account security settings',
      icon: <Shield className="w-5 h-5" />
    },
    {
      id: 'data',
      title: 'Data & Export',
      description: 'Configure data backup and export options',
      icon: <Database className="w-5 h-5" />
    }
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'pt', name: 'Português' },
    { code: 'ar', name: 'العربية' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日本語' }
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

  const themes = [
    { value: 'light', name: 'Light' },
    { value: 'dark', name: 'Dark' },
    { value: 'auto', name: 'Auto (System)' }
  ];

  const colors = [
    { value: 'blue', name: 'Blue', class: 'bg-blue-500' },
    { value: 'green', name: 'Green', class: 'bg-success-500' },
    { value: 'purple', name: 'Purple', class: 'bg-purple-500' },
    { value: 'red', name: 'Red', class: 'bg-danger-500' },
    { value: 'orange', name: 'Orange', class: 'bg-orange-500' }
  ];

  const handleProfileChange = (field: string, value: string) => {
    setProfileSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (field: string, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleAppearanceChange = (field: string, value: string | boolean) => {
    setAppearanceSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSecurityChange = (field: string, value: boolean | number) => {
    setSecuritySettings(prev => ({ ...prev, [field]: value }));
  };

  const handleDataChange = (field: string, value: string | boolean | number) => {
    setDataSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = async (section: string) => {
    setSaving(true);
    try {
      // Prepare settings data based on section
      let settingsData: any = {};

      switch (section) {
        case 'profile':
          settingsData = {
            display_name: profileSettings.displayName,
            timezone: profileSettings.timezone,
            language: profileSettings.language,
            date_format: profileSettings.dateFormat,
            time_format: profileSettings.timeFormat,
          };
          break;
        case 'notifications':
          settingsData = {
            notification_settings: notificationSettings,
          };
          break;
        case 'appearance':
          settingsData = {
            appearance_settings: appearanceSettings,
          };
          break;
        case 'security':
          settingsData = {
            security_settings: securitySettings,
          };
          break;
        case 'data':
          settingsData = {
            data_settings: dataSettings,
          };
          break;
      }

      // Save to API
      await ApiService.updateUserSettings(settingsData);

      setMessage({ type: 'success', text: `${sections.find(s => s.id === section)?.title} settings saved successfully!` });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: `Failed to save ${sections.find(s => s.id === section)?.title} settings. Please try again.` });
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      // Get data from API
      const exportData = await ApiService.exportUserData();

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sts-clearance-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Data exported successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error exporting data:', error);
      setMessage({ type: 'error', text: 'Failed to export data. Please try again.' });
    }
  };

  const renderProfileSection = () => (
    <div className="space-y-8">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-secondary-900">Personal Information</h3>
          <button
            onClick={() => handleSaveSettings('profile')}
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 gap-6">
          <div>
            <label className="form-label">
              Display Name
            </label>
            <input
              type="text"
              value={profileSettings.displayName}
              onChange={(e) => handleProfileChange('displayName', e.target.value)}
              className="form-input"
            />
          </div>
          
          <div>
            <label className="form-label">
              Email Address
            </label>
            <input
              type="email"
              value={profileSettings.email}
              disabled
              className="w-full px-3 py-2 border border-secondary-300 rounded-xl bg-secondary-50 text-secondary-500"
            />
          </div>
          
          <div>
            <label className="form-label">
              Language
            </label>
            <select
              value={profileSettings.language}
              onChange={(e) => handleProfileChange('language', e.target.value)}
              className="form-input"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="form-label">
              Timezone
            </label>
            <select
              value={profileSettings.timezone}
              onChange={(e) => handleProfileChange('timezone', e.target.value)}
              className="form-input"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="form-label">
              Date Format
            </label>
            <select
              value={profileSettings.dateFormat}
              onChange={(e) => handleProfileChange('dateFormat', e.target.value)}
              className="form-input"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          
          <div>
            <label className="form-label">
              Time Format
            </label>
            <select
              value={profileSettings.timeFormat}
              onChange={(e) => handleProfileChange('timeFormat', e.target.value)}
              className="form-input"
            >
              <option value="12h">12-hour (AM/PM)</option>
              <option value="24h">24-hour</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-8">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-secondary-900">Notification Preferences</h3>
          <button
            onClick={() => handleSaveSettings('notifications')}
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="space-y-8">
          <div>
            <h4 className="text-md font-medium text-secondary-900 mb-6">Notification Channels</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-secondary-900">Email Notifications</p>
                  <p className="text-sm text-secondary-600">Receive notifications via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailNotifications}
                    onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-secondary-900">Push Notifications</p>
                  <p className="text-sm text-secondary-600">Receive push notifications in browser</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.pushNotifications}
                    onChange={(e) => handleNotificationChange('pushNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-secondary-900">SMS Notifications</p>
                  <p className="text-sm text-secondary-600">Receive notifications via SMS</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.smsNotifications}
                    onChange={(e) => handleNotificationChange('smsNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-md font-medium text-secondary-900 mb-6">Notification Types</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-secondary-900">Document Updates</p>
                  <p className="text-sm text-secondary-600">When documents are uploaded or modified</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.documentUpdates}
                    onChange={(e) => handleNotificationChange('documentUpdates', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-secondary-900">Approval Requests</p>
                  <p className="text-sm text-secondary-600">When documents need your approval</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.approvalRequests}
                    onChange={(e) => handleNotificationChange('approvalRequests', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-secondary-900">System Alerts</p>
                  <p className="text-sm text-secondary-600">Important system notifications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.systemAlerts}
                    onChange={(e) => handleNotificationChange('systemAlerts', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-secondary-900">Weekly Digest</p>
                  <p className="text-sm text-secondary-600">Summary of weekly activities</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.weeklyDigest}
                    onChange={(e) => handleNotificationChange('weeklyDigest', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSection = () => (
    <div className="space-y-8">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-secondary-900">Appearance Settings</h3>
          <button
            onClick={() => handleSaveSettings('appearance')}
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-3">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-6">
              {themes.map((theme) => (
                <label key={theme.value} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value={theme.value}
                    checked={appearanceSettings.theme === theme.value}
                    onChange={(e) => handleAppearanceChange('theme', e.target.value)}
                    className="sr-only peer"
                  />
                  <div className="p-3 border-2 border-secondary-200 rounded-xl peer-checked:border-blue-500 peer-checked:bg-blue-50 hover:border-secondary-300 transition-colors duration-200">
                    <div className="text-center">
                      <div className={`w-8 h-8 mx-auto mb-2 rounded ${
                        theme.value === 'light' ? 'bg-secondary-100' :
                        theme.value === 'dark' ? 'bg-gray-800' :
                        'bg-gradient-to-r from-gray-100 to-gray-800'
                      }`}></div>
                      <span className="text-sm font-medium text-secondary-900">{theme.name}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-3">
              Primary Color
            </label>
            <div className="grid grid-cols-5 gap-6">
              {colors.map((color) => (
                <label key={color.value} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="primaryColor"
                    value={color.value}
                    checked={appearanceSettings.primaryColor === color.value}
                    onChange={(e) => handleAppearanceChange('primaryColor', e.target.value)}
                    className="sr-only peer"
                  />
                  <div className={`p-3 border-2 border-secondary-200 rounded-xl peer-checked:border-blue-500 peer-checked:ring-2 peer-checked:ring-blue-200 hover:border-secondary-300 transition-colors duration-200`}>
                    <div className="text-center">
                      <div className={`w-8 h-8 mx-auto mb-2 rounded ${color.class}`}></div>
                      <span className="text-sm font-medium text-secondary-900">{color.name}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 gap-6">
            <div>
              <label className="form-label">
                Font Size
              </label>
              <select
                value={appearanceSettings.fontSize}
                onChange={(e) => handleAppearanceChange('fontSize', e.target.value)}
                className="form-input"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="xlarge">Extra Large</option>
              </select>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-secondary-900">Compact Mode</p>
                  <p className="text-sm text-secondary-600">Reduce spacing for more content</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={appearanceSettings.compactMode}
                    onChange={(e) => handleAppearanceChange('compactMode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-secondary-900">Show Animations</p>
                  <p className="text-sm text-secondary-600">Enable smooth transitions</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={appearanceSettings.showAnimations}
                    onChange={(e) => handleAppearanceChange('showAnimations', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySection = () => (
    <div className="space-y-8">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-secondary-900">Security Settings</h3>
          <button
            onClick={() => handleSaveSettings('security')}
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-secondary-900">Two-Factor Authentication</p>
                <p className="text-sm text-secondary-600">Add an extra layer of security to your account</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={securitySettings.twoFactorAuth}
                  onChange={(e) => handleSecurityChange('twoFactorAuth', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-secondary-900">Login Notifications</p>
                <p className="text-sm text-secondary-600">Get notified of new login attempts</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={securitySettings.loginNotifications}
                  onChange={(e) => handleSecurityChange('loginNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-secondary-900">Suspicious Activity Alerts</p>
                <p className="text-sm text-secondary-600">Get alerts for unusual account activity</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={securitySettings.suspiciousActivityAlerts}
                  onChange={(e) => handleSecurityChange('suspiciousActivityAlerts', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-secondary-900">Require Password for Changes</p>
                <p className="text-sm text-secondary-600">Ask for password when modifying sensitive settings</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={securitySettings.requirePasswordForChanges}
                  onChange={(e) => handleSecurityChange('requirePasswordForChanges', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
          
          <div>
            <label className="form-label">
              Session Timeout (minutes)
            </label>
            <select
              value={securitySettings.sessionTimeout}
              onChange={(e) => handleSecurityChange('sessionTimeout', parseInt(e.target.value))}
              className="form-input"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={480}>8 hours</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDataSection = () => (
    <div className="space-y-8">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-secondary-900">Data & Export Settings</h3>
          <button
            onClick={() => handleSaveSettings('data')}
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-secondary-900">Auto Backup</p>
                <p className="text-sm text-secondary-600">Automatically backup your data</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={dataSettings.autoBackup}
                  onChange={(e) => handleDataChange('autoBackup', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 gap-6">
            <div>
              <label className="form-label">
                Backup Frequency
              </label>
              <select
                value={dataSettings.backupFrequency}
                onChange={(e) => handleDataChange('backupFrequency', e.target.value)}
                className="form-input"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            <div>
              <label className="form-label">
                Retain Backups (days)
              </label>
              <select
                value={dataSettings.retainBackups}
                onChange={(e) => handleDataChange('retainBackups', parseInt(e.target.value))}
                className="form-input"
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={365}>1 year</option>
              </select>
            </div>
            
            <div>
              <label className="form-label">
                Export Format
              </label>
              <select
                value={dataSettings.exportFormat}
                onChange={(e) => handleDataChange('exportFormat', e.target.value)}
                className="form-input"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="xml">XML</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            
            <div>
              <label className="form-label">
                Data Retention
              </label>
              <select
                value={dataSettings.dataRetention}
                onChange={(e) => handleDataChange('dataRetention', e.target.value)}
                className="form-input"
              >
                <option value="1year">1 year</option>
                <option value="3years">3 years</option>
                <option value="5years">5 years</option>
                <option value="indefinite">Indefinite</option>
              </select>
            </div>
          </div>
          
          <div className="pt-4 border-t border-secondary-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-md font-medium text-secondary-900">Export Your Data</h4>
                <p className="text-sm text-secondary-600">Download all your settings and preferences</p>
              </div>
              <button
                onClick={handleExportData}
                className="btn-success flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSection();
      case 'notifications':
        return renderNotificationsSection();
      case 'appearance':
        return renderAppearanceSection();
      case 'security':
        return renderSecuritySection();
      case 'data':
        return renderDataSection();
      default:
        return renderProfileSection();
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900">Settings</h1>
          <p className="mt-2 text-secondary-600">
            Manage your account settings, preferences, and application configuration.
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
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-colors duration-200 ${
                    activeSection === section.id
                      ? 'bg-blue-50 border border-blue-200 text-blue-700'
                      : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="mr-3">{section.icon}</span>
                    <div>
                      <div className="font-medium">{section.title}</div>
                      <div className="text-sm opacity-75">{section.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {renderSectionContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
