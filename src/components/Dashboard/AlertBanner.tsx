import React from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type AlertType = 'critical' | 'warning' | 'info' | 'success';

interface AlertBannerProps {
  type: AlertType;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
  dismissible?: boolean;
}

const ALERT_CONFIG = {
  critical: {
    icon: AlertTriangle,
    bg: 'rgba(231, 76, 60, 0.1)',
    border: '#e74c3c',
    textColor: '#c0392b',
    iconColor: '#e74c3c',
  },
  warning: {
    icon: AlertCircle,
    bg: 'rgba(243, 156, 18, 0.1)',
    border: '#f39c12',
    textColor: '#d68910',
    iconColor: '#f39c12',
  },
  info: {
    icon: Info,
    bg: 'rgba(52, 152, 219, 0.1)',
    border: '#3498db',
    textColor: '#2980b9',
    iconColor: '#3498db',
  },
  success: {
    icon: AlertCircle,
    bg: 'rgba(39, 174, 96, 0.1)',
    border: '#27ae60',
    textColor: '#229954',
    iconColor: '#27ae60',
  },
};

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type,
  title,
  message,
  action,
  onClose,
  dismissible = true,
}) => {
  const config = ALERT_CONFIG[type];
  const Icon = config.icon;

  return (
    <div
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
      }}
    >
      {/* Icon */}
      <div style={{ flexShrink: 0 }}>
        <Icon size={20} color={config.iconColor} />
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: '600',
            color: config.textColor,
            marginBottom: '4px',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: '13px',
            color: config.textColor,
            opacity: 0.9,
            marginBottom: action ? '8px' : '0',
            lineHeight: '1.5',
          }}
        >
          {message}
        </div>

        {/* Action button */}
        {action && (
          <button
            onClick={action.onClick}
            style={{
              background: config.border,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Close button */}
      {dismissible && (
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} color={config.textColor} />
        </button>
      )}
    </div>
  );
};

export default AlertBanner;