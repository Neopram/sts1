import React, { useState } from 'react';
import { Bell, Lock, Eye, FileText, Info, Save, AlertCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface NotificationSettings {
  email_on_document_approval: boolean;
  email_on_operation_update: boolean;
  email_on_message: boolean;
  email_on_access_request: boolean;
  daily_digest: boolean;
}

interface PrivacySettings {
  show_email_publicly: boolean;
  show_company_info: boolean;
  allow_notifications: boolean;
}

interface GeneralSettings {
  timezone: string;
  language: string;
  theme: 'light' | 'dark';
}

/**
 * SettingsPage Component
 * 
 * Complete settings management with tabs for:
 * 1. General Settings - Timezone, Language, Theme
 * 2. Notifications - Email preferences
 * 3. Privacy - Data sharing preferences
 * 4. Data - Account data management
 */
export const SettingsPage: React.FC = () => {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'privacy' | 'data'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // General Settings
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    timezone: localStorage.getItem('timezone') || 'UTC',
    language: localStorage.getItem('language') || 'en',
    theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_on_document_approval: localStorage.getItem('notify_doc_approval') === 'true',
    email_on_operation_update: localStorage.getItem('notify_op_update') === 'true',
    email_on_message: localStorage.getItem('notify_message') === 'true',
    email_on_access_request: localStorage.getItem('notify_access_request') === 'true',
    daily_digest: localStorage.getItem('notify_daily_digest') === 'true',
  });

  // Privacy Settings
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    show_email_publicly: localStorage.getItem('show_email_publicly') === 'true',
    show_company_info: localStorage.getItem('show_company_info') === 'true',
    allow_notifications: localStorage.getItem('allow_notifications') !== 'false',
  });

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage (in production, would save to backend)
      if (activeTab === 'general') {
        localStorage.setItem('timezone', generalSettings.timezone);
        localStorage.setItem('language', generalSettings.language);
        localStorage.setItem('theme', generalSettings.theme);
      } else if (activeTab === 'notifications') {
        localStorage.setItem('notify_doc_approval', String(notificationSettings.email_on_document_approval));
        localStorage.setItem('notify_op_update', String(notificationSettings.email_on_operation_update));
        localStorage.setItem('notify_message', String(notificationSettings.email_on_message));
        localStorage.setItem('notify_access_request', String(notificationSettings.email_on_access_request));
        localStorage.setItem('notify_daily_digest', String(notificationSettings.daily_digest));
      } else if (activeTab === 'privacy') {
        localStorage.setItem('show_email_publicly', String(privacySettings.show_email_publicly));
        localStorage.setItem('show_company_info', String(privacySettings.show_company_info));
        localStorage.setItem('allow_notifications', String(privacySettings.allow_notifications));
      }

      setSaveMessage({ type: 'success', text: 'Settings saved successfully' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save settings' });
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account preferences and application settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'general'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          <Info size={20} />
          General
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'notifications'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          <Bell size={20} />
          Notifications
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'privacy'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          <Eye size={20} />
          Privacy
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'data'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          <FileText size={20} />
          Data
        </button>
      </div>

      {/* Success/Error Message */}
      {saveMessage && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          saveMessage.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <AlertCircle size={20} />
          {saveMessage.text}
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {/* General Settings Tab */}
        {activeTab === 'general' && (
          <div className="p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">General Preferences</h2>

            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                value={generalSettings.timezone}
                onChange={(e) =>
                  setGeneralSettings({ ...generalSettings, timezone: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="UTC">UTC</option>
                <option value="EST">Eastern Standard Time (EST)</option>
                <option value="CST">Central Standard Time (CST)</option>
                <option value="MST">Mountain Standard Time (MST)</option>
                <option value="PST">Pacific Standard Time (PST)</option>
                <option value="GMT">Greenwich Mean Time (GMT)</option>
                <option value="CET">Central European Time (CET)</option>
                <option value="IST">Indian Standard Time (IST)</option>
                <option value="SGT">Singapore Time (SGT)</option>
                <option value="JST">Japan Standard Time (JST)</option>
                <option value="AEST">Australian Eastern Standard Time</option>
              </select>
              <p className="text-sm text-gray-600 mt-1">Times will be displayed in your selected timezone</p>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                value={generalSettings.language}
                onChange={(e) =>
                  setGeneralSettings({ ...generalSettings, language: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="es">Spanish (Español)</option>
                <option value="fr">French (Français)</option>
                <option value="de">German (Deutsch)</option>
                <option value="pt">Portuguese (Português)</option>
                <option value="zh">Chinese (中文)</option>
                <option value="ja">Japanese (日本語)</option>
              </select>
              <p className="text-sm text-gray-600 mt-1">Interface language preference</p>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={generalSettings.theme === 'light'}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        theme: e.target.value as 'light' | 'dark',
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">Light Mode</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={generalSettings.theme === 'dark'}
                    onChange={(e) =>
                      setGeneralSettings({
                        ...generalSettings,
                        theme: e.target.value as 'light' | 'dark',
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">Dark Mode</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Preferences</h2>

            <div className="space-y-4">
              {/* Document Approval */}
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={notificationSettings.email_on_document_approval}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      email_on_document_approval: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">Document Approval Notifications</p>
                  <p className="text-sm text-gray-600">Notify me when documents are approved or rejected</p>
                </div>
              </label>

              {/* Operation Update */}
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={notificationSettings.email_on_operation_update}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      email_on_operation_update: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">Operation Updates</p>
                  <p className="text-sm text-gray-600">Notify me when operation details change</p>
                </div>
              </label>

              {/* Messages */}
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={notificationSettings.email_on_message}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      email_on_message: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">New Messages</p>
                  <p className="text-sm text-gray-600">Notify me when I receive new messages</p>
                </div>
              </label>

              {/* Access Request */}
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={notificationSettings.email_on_access_request}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      email_on_access_request: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">Access Requests</p>
                  <p className="text-sm text-gray-600">Notify me when someone requests access</p>
                </div>
              </label>

              {/* Daily Digest */}
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={notificationSettings.daily_digest}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      daily_digest: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">Daily Digest</p>
                  <p className="text-sm text-gray-600">Receive a daily summary of activities</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Privacy Settings</h2>

            <div className="space-y-4">
              {/* Show Email Publicly */}
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={privacySettings.show_email_publicly}
                  onChange={(e) =>
                    setPrivacySettings({
                      ...privacySettings,
                      show_email_publicly: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">Display Email Address</p>
                  <p className="text-sm text-gray-600">Allow other users to see your email address</p>
                </div>
              </label>

              {/* Show Company Info */}
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={privacySettings.show_company_info}
                  onChange={(e) =>
                    setPrivacySettings({
                      ...privacySettings,
                      show_company_info: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">Display Company Information</p>
                  <p className="text-sm text-gray-600">Allow other users to see your company details</p>
                </div>
              </label>

              {/* Allow Notifications */}
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={privacySettings.allow_notifications}
                  onChange={(e) =>
                    setPrivacySettings({
                      ...privacySettings,
                      allow_notifications: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">Allow Notifications</p>
                  <p className="text-sm text-gray-600">Allow push and email notifications</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div className="p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Data</h2>

            {/* Current User Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Your Account Information</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Email:</span> {user?.email}</p>
                <p><span className="font-medium">Name:</span> {user?.name}</p>
                <p><span className="font-medium">Role:</span> {user?.role}</p>
                <p><span className="font-medium">Company:</span> {user?.company || 'Not specified'}</p>
              </div>
            </div>

            {/* Export Data */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Export Your Data</h3>
              <p className="text-gray-600 mb-4">Download a copy of your account data in JSON format</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                Export Account Data
              </button>
            </div>

            {/* Delete Account */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-red-600 mb-3">Danger Zone</h3>
              <p className="text-gray-600 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium">
                Delete Account
              </button>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-blue-400"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;