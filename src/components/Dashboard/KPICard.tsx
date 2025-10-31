import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  status?: 'success' | 'warning' | 'critical' | 'info';
  onClick?: () => void;
  subtitle?: string;
}

const STATUS_COLORS = {
  success: { bg: 'rgba(39, 174, 96, 0.1)', border: '#27ae60', text: '#27ae60' },
  warning: { bg: 'rgba(243, 156, 18, 0.1)', border: '#f39c12', text: '#f39c12' },
  critical: { bg: 'rgba(231, 76, 60, 0.1)', border: '#e74c3c', text: '#e74c3c' },
  info: { bg: 'rgba(52, 152, 219, 0.1)', border: '#3498db', text: '#3498db' },
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  trend,
  trendValue,
  status = 'info',
  onClick,
  subtitle,
}) => {
  const colors = STATUS_COLORS[status];

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        border: `2px solid ${colors.border}`,
        borderRadius: '12px',
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        backgroundColor: colors.bg,
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
        }
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '100px',
          height: '100px',
          background: `${colors.text}15`,
          borderRadius: '50%',
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* Header with icon */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <span style={{ fontSize: '24px' }}>{icon}</span>
          {trend && trendValue !== undefined && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: '600',
                color: trend === 'up' ? '#27ae60' : trend === 'down' ? '#e74c3c' : '#7f8c8d',
              }}
            >
              {trend === 'up' && <TrendingUp size={14} />}
              {trend === 'down' && <TrendingDown size={14} />}
              <span>{trendValue}%</span>
            </div>
          )}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '13px',
            fontWeight: '500',
            color: '#7f8c8d',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {title}
        </div>

        {/* Value */}
        <div
          style={{
            fontSize: '28px',
            fontWeight: '700',
            color: colors.text,
            marginBottom: subtitle ? '8px' : '0',
          }}
        >
          {value}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div
            style={{
              fontSize: '12px',
              color: '#95a5a6',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;