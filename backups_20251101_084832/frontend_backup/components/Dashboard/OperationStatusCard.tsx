import React from 'react';
import { CheckCircle, AlertCircle, Clock, Zap } from 'lucide-react';

interface OperationStatusCardProps {
  operationId: string;
  vesselName: string;
  status: 'completed' | 'active' | 'planned' | 'delayed' | 'error';
  progress: number; // 0-100
  cargoType?: string;
  volume?: string;
  documentationStatus: 'complete' | 'incomplete' | 'pending';
  completedDocs: number;
  totalDocs: number;
  nextAction?: string;
  dueDate?: string;
  onClick?: () => void;
}

const STATUS_CONFIG = {
  completed: { icon: CheckCircle, color: '#27ae60', bg: '#e8f8f5', label: '✓ Completed' },
  active: { icon: Zap, color: '#3498db', bg: '#ebf5fb', label: '⏳ Active' },
  planned: { icon: Clock, color: '#f39c12', bg: '#fef5e7', label: '📋 Planned' },
  delayed: { icon: AlertCircle, color: '#e67e22', bg: '#fdeaa8', label: '⚠️ Delayed' },
  error: { icon: AlertCircle, color: '#e74c3c', bg: '#fadbd8', label: '❌ Error' },
};

const DOC_STATUS_CONFIG = {
  complete: { icon: '✅', color: '#27ae60' },
  incomplete: { icon: '⚠️', color: '#f39c12' },
  pending: { icon: '❌', color: '#e74c3c' },
};

export const OperationStatusCard: React.FC<OperationStatusCardProps> = ({
  operationId,
  vesselName,
  status,
  progress,
  cargoType,
  volume,
  documentationStatus,
  completedDocs,
  totalDocs,
  nextAction,
  dueDate,
  onClick,
}) => {
  const config = STATUS_CONFIG[status];
  const docConfig = DOC_STATUS_CONFIG[documentationStatus];

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        border: `1px solid ${config.color}33`,
        backgroundColor: config.bg,
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '13px', color: '#7f8c8d', fontWeight: '600', marginBottom: '4px' }}>
            {operationId}
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#2c3e50' }}>
            {vesselName}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: '600',
            color: config.color,
            background: `${config.color}22`,
            padding: '6px 12px',
            borderRadius: '8px',
          }}
        >
          <config.icon size={16} />
          {config.label}
        </div>
      </div>

      {/* Cargo info */}
      {(cargoType || volume) && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '12px' }}>
          {cargoType && (
            <div>
              <span style={{ color: '#7f8c8d', fontWeight: '500' }}>Cargo:</span>
              <span style={{ color: '#2c3e50', marginLeft: '6px', fontWeight: '600' }}>{cargoType}</span>
            </div>
          )}
          {volume && (
            <div>
              <span style={{ color: '#7f8c8d', fontWeight: '500' }}>Volume:</span>
              <span style={{ color: '#2c3e50', marginLeft: '6px', fontWeight: '600' }}>{volume}</span>
            </div>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: '500', color: '#7f8c8d' }}>Progress</span>
          <span style={{ fontSize: '12px', fontWeight: '600', color: config.color }}>{progress}%</span>
        </div>
        <div
          style={{
            width: '100%',
            height: '6px',
            background: 'rgba(0, 0, 0, 0.05)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: config.color,
              transition: 'width 0.3s ease',
              borderRadius: '3px',
            }}
          />
        </div>
      </div>

      {/* Documentation status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#7f8c8d' }}>Documentation:</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: docConfig.color }}>
            {docConfig.icon} {completedDocs}/{totalDocs}
          </span>
        </div>
      </div>

      {/* Footer info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#95a5a6' }}>
        {nextAction && (
          <div>
            <span style={{ fontWeight: '500' }}>Next:</span> {nextAction}
          </div>
        )}
        {dueDate && (
          <div>
            <span style={{ fontWeight: '500' }}>Due:</span> {dueDate}
          </div>
        )}
      </div>
    </div>
  );
};

export default OperationStatusCard;