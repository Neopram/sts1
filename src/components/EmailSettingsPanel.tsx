/**
 * Email Settings Panel Component - Phase 2
 * Manages email preferences, verification, and SMTP configuration
 */

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Check,
  AlertCircle,
  Send,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import ApiService from '../api';

interface EmailSettings {
  notifications_enabled: boolean;
  email_frequency: 'immediate' | 'daily' | 'weekly';
  digest_enabled: boolean;
  security_alerts: boolean;
  marketing_emails: boolean;
  verified: boolean;
  verified_at?: string;
}

interface EmailConfig {
  configured: boolean;
  provider: string;
  sender: string;
  rate_limit: {
    per_hour: number;
    per_day: number;
  };
  queue_status: {
    pending: number;
  };
}

const EmailSettingsPanel: React.FC = () => {
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showSmtpDetails, setShowSmtpDetails] = useState(false);
  const [testEmailSent, setTestEmailSent] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [settings, config] = await Promise.all([
        ApiService.getEmailSettings?.() || Promise.reject('Not implemented'),
        ApiService.getEmailConfig?.() || Promise.reject('Not implemented')
      ]);
      
      setEmailSettings(settings);
      setEmailConfig(config);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to load email settings'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!emailSettings) return;

    try {
      setSaving(true);
      setMessage(null);

      await ApiService.updateEmailSettings?.(emailSettings);

      setMessage({
        type: 'success',
        text: 'Email settings saved successfully!'
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to save email settings'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      setSaving(true);
      setMessage(null);

      await ApiService.sendTestEmail?.();

      setTestEmailSent(true);
      setMessage({
        type: 'success',
        text: 'Test email sent! Check your inbox.'
      });
      setTimeout(() => {
        setMessage(null);
        setTestEmailSent(false);
      }, 5000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to send test email'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendVerification = async () => {
    try {
      setSaving(true);
      setMessage(null);

      await ApiService.sendVerificationEmail?.();

      setMessage({
        type: 'success',
        text: 'Verification email sent! Check your inbox.'
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to send verification email'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading email settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : message.type === 'error'
            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
        }`}>
          {message.type === 'success' && <Check className="w-5 h-5 text-green-600" />}
          {message.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
          {message.type === 'info' && <Mail className="w-5 h-5 text-blue-600" />}
          <span className={
            message.type === 'success'
              ? 'text-green-800 dark:text-green-200'
              : message.type === 'error'
              ? 'text-red-800 dark:text-red-200'
              : 'text-blue-800 dark:text-blue-200'
          }>
            {message.text}
          </span>
        </div>
      )}

      {/* Email Configuration Status */}
      {emailConfig && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
                Email Service Status
              </h3>
              <div className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
                <p><strong>Status:</strong> {emailConfig.configured ? '✅ Configured' : '❌ Not Configured'}</p>
                <p><strong>Provider:</strong> {emailConfig.provider}</p>
                <p><strong>From:</strong> {emailConfig.sender}</p>
                <p><strong>Queue:</strong> {emailConfig.queue_status.pending} pending emails</p>
                <p><strong>Rate Limit:</strong> {emailConfig.rate_limit.per_hour} /hour, {emailConfig.rate_limit.per_day} /day</p>
              </div>
            </div>
            <button
              onClick={() => setShowSmtpDetails(!showSmtpDetails)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              {showSmtpDetails ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

      {/* Email Verification */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Verification</h3>
          {emailSettings?.verified && (
            <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Check className="w-5 h-5" />
              Verified
            </span>
          )}
        </div>

        {emailSettings?.verified ? (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-green-800 dark:text-green-200">
              ✅ Your email has been verified
              {emailSettings.verified_at && (
                <span> on {new Date(emailSettings.verified_at).toLocaleDateString()}</span>
              )}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Verify your email address to enable notifications and security alerts.
            </p>
            <button
              onClick={handleSendVerification}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {saving ? 'Sending...' : 'Send Verification Email'}
            </button>
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      {emailSettings && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Preferences</h3>

          {/* Email Notifications Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Receive email notifications</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={emailSettings.notifications_enabled}
                onChange={(e) => setEmailSettings({
                  ...emailSettings,
                  notifications_enabled: e.target.checked
                })}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>
          </div>

          {/* Email Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Frequency
            </label>
            <select
              value={emailSettings.email_frequency}
              onChange={(e) => setEmailSettings({
                ...emailSettings,
                email_frequency: e.target.value as any
              })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="immediate">Immediate</option>
              <option value="daily">Daily Summary</option>
              <option value="weekly">Weekly Summary</option>
            </select>
          </div>

          {/* Digest Notifications */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Digest Email</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Receive weekly digest summary</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={emailSettings.digest_enabled}
                onChange={(e) => setEmailSettings({
                  ...emailSettings,
                  digest_enabled: e.target.checked
                })}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>
          </div>

          {/* Security Alerts */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Security Alerts</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Important security notifications</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={emailSettings.security_alerts}
                onChange={(e) => setEmailSettings({
                  ...emailSettings,
                  security_alerts: e.target.checked
                })}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>
          </div>

          {/* Marketing Emails */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Marketing Emails</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Promotional content and updates</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={emailSettings.marketing_emails}
                onChange={(e) => setEmailSettings({
                  ...emailSettings,
                  marketing_emails: e.target.checked
                })}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>
          </div>
        </div>
      )}

      {/* Test Email */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Test Email Service</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Send a test email to verify your email settings are working correctly.
        </p>
        <button
          onClick={handleSendTestEmail}
          disabled={saving || testEmailSent}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
        >
          {testEmailSent ? (
            <>
              <Check className="w-4 h-4" />
              Test Email Sent!
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" />
              {saving ? 'Sending...' : 'Send Test Email'}
            </>
          )}
        </button>
      </div>

      {/* Save Button */}
      <div className="flex gap-3">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {saving ? 'Saving...' : 'Save Email Settings'}
        </button>
        <button
          onClick={loadSettings}
          disabled={saving}
          className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          <strong>📧 Tip:</strong> Keep your email notifications enabled for important security alerts and document approvals.
        </p>
      </div>
    </div>
  );
};

export default EmailSettingsPanel;