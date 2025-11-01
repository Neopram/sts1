/**
 * Two-Factor Authentication Panel - Phase 2
 * Setup and management of TOTP-based 2FA
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  QrCode,
  Copy,
  Check,
  AlertCircle,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import ApiService from '../api';

interface TwoFAStatus {
  enabled: boolean;
  method?: string;
  verified: boolean;
  backup_codes_count: number;
  enabled_at?: string;
}

interface SetupData {
  secret: string;
  qr_code: string;
  provisioning_uri: string;
  backup_codes: string[];
  instructions: string[];
}

type Step = 'status' | 'setup' | 'verify' | 'backup-codes';

const TwoFactorAuthPanel: React.FC = () => {
  const [status, setStatus] = useState<TwoFAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [step, setStep] = useState<Step>('status');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load status on mount
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await ApiService.get2FAStatus?.();
      setStatus(data);
      setStep('status');
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to load 2FA status'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartSetup = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const data = await ApiService.setup2FA?.();
      setSetupData(data.setup);
      setStep('setup');
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to start 2FA setup'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async () => {
    if (!setupData) return;

    if (verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
      setMessage({
        type: 'error',
        text: 'Please enter a valid 6-digit code'
      });
      return;
    }

    try {
      setVerifying(true);
      setMessage(null);

      await ApiService.verify2FASetup?.(setupData.secret, verificationCode, setupData.backup_codes);

      setMessage({
        type: 'success',
        text: '2FA has been successfully enabled!'
      });
      setStep('backup-codes');
      setTimeout(() => loadStatus(), 2000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Invalid code. Please try again.'
      });
      setVerificationCode('');
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!password) {
      setMessage({
        type: 'error',
        text: 'Password required to disable 2FA'
      });
      return;
    }

    if (!window.confirm('Are you sure you want to disable 2FA? Your account will be less secure.')) {
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      await ApiService.disable2FA?.(password);

      setMessage({
        type: 'success',
        text: '2FA has been disabled'
      });
      setPassword('');
      setTimeout(() => loadStatus(), 1000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to disable 2FA'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && step === 'status') {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading 2FA settings...</span>
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
          {message.type === 'info' && <Shield className="w-5 h-5 text-blue-600" />}
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

      {/* Status View */}
      {step === 'status' && status && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                Two-Factor Authentication
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Add an extra layer of security to your account
              </p>
            </div>
            <div className={`px-4 py-2 rounded-full font-medium ${
              status.enabled
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}>
              {status.enabled ? '✅ Enabled' : '⚠️ Disabled'}
            </div>
          </div>

          {status.enabled ? (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-green-800 dark:text-green-200">
                  ✅ 2FA is enabled on your account
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Method: {status.method?.toUpperCase()}
                </p>
                {status.enabled_at && (
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Enabled on {new Date(status.enabled_at).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-blue-800 dark:text-blue-200">
                  <strong>Backup Codes:</strong> {status.backup_codes_count} remaining
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {status.backup_codes_count === 0
                    ? '⚠️ No backup codes available. Please regenerate them.'
                    : 'Use these codes if you lose access to your authenticator app.'}
                </p>
              </div>

              {/* Disable 2FA */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Disable 2FA</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Enter your password to disable 2FA
                </p>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-500"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <button
                    onClick={handleDisable2FA}
                    disabled={loading || !password}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {loading ? 'Disabling...' : 'Disable 2FA'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleStartSetup}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <QrCode className="w-5 h-5" />
              {loading ? 'Starting Setup...' : 'Enable 2FA'}
            </button>
          )}
        </div>
      )}

      {/* Setup View */}
      {step === 'setup' && setupData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Set Up 2FA</h3>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Instructions:</h4>
            <ol className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
              {setupData.instructions.map((instr, idx) => (
                <li key={idx}>{instr}</li>
              ))}
            </ol>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Scan QR Code</h4>
            {setupData.qr_code && (
              <img
                src={setupData.qr_code}
                alt="2FA QR Code"
                className="w-64 h-64 p-4 bg-white rounded-lg border-2 border-gray-200"
              />
            )}
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-4 text-center max-w-xs">
              Or enter this code manually:
            </p>
            <div className="mt-2 font-mono text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 p-3 rounded flex items-center gap-2">
              <span>{setupData.secret}</span>
              <button
                onClick={() => copyToClipboard(setupData.secret)}
                className="text-blue-600 hover:text-blue-800"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Verification Code Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter 6-Digit Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              placeholder="000000"
              className="w-full px-4 py-3 text-center text-2xl letter-spacing border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              From your authenticator app
            </p>
          </div>

          {/* Verify Button */}
          <button
            onClick={handleVerifySetup}
            disabled={verifying || verificationCode.length !== 6}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            {verifying ? 'Verifying...' : 'Verify & Enable 2FA'}
          </button>

          <button
            onClick={() => {
              setSetupData(null);
              setVerificationCode('');
              setStep('status');
              loadStatus();
            }}
            className="w-full bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Backup Codes View */}
      {step === 'backup-codes' && setupData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Save Backup Codes</h3>

          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200 font-semibold">
              ⚠️ Important: Save these codes in a secure location
            </p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              You can use these codes if you lose access to your authenticator app. Each code can only be used once.
            </p>
          </div>

          {/* Backup Codes Grid */}
          <div className="relative bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-2">
              {setupData.backup_codes.map((code, idx) => (
                <div
                  key={idx}
                  className="font-mono text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 p-3 rounded border border-gray-200 dark:border-gray-600"
                >
                  {code}
                </div>
              ))}
            </div>
          </div>

          {/* Copy All Button */}
          <button
            onClick={() => {
              const allCodes = setupData.backup_codes.join('\n');
              copyToClipboard(allCodes);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy All Codes'}
          </button>

          {/* Finish Button */}
          <button
            onClick={() => {
              setStep('status');
              loadStatus();
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Setup Complete
          </button>
        </div>
      )}

      {/* Security Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          <strong>🔒 Pro Tip:</strong> 2FA significantly enhances your account security. We recommend enabling it immediately.
        </p>
      </div>
    </div>
  );
};

export default TwoFactorAuthPanel;