/**
 * Premium Badge Component - Status indicators
 * Uso: Estados, etiquetas, tags
 */

import React from 'react';
import { X, Check, AlertCircle, Clock } from 'lucide-react';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'pending';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  onClose?: () => void;
  pulse?: boolean;
}

const variantMap = {
  success: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: 'text-green-600',
    border: 'border-green-200',
  },
  warning: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    icon: 'text-yellow-600',
    border: 'border-yellow-200',
  },
  danger: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: 'text-red-600',
    border: 'border-red-200',
  },
  info: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: 'text-blue-600',
    border: 'border-blue-200',
  },
  neutral: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    icon: 'text-gray-600',
    border: 'border-gray-200',
  },
  pending: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    icon: 'text-purple-600',
    border: 'border-purple-200',
  },
};

const sizeMap = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  icon,
  onClose,
  pulse = false,
}) => {
  const colors = variantMap[variant];
  const sizeClass = sizeMap[size];

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full border
        ${colors.bg} ${colors.text} ${colors.border}
        ${sizeClass} font-medium
        ${pulse ? 'animate-pulse' : ''}
        transition-all duration-200
      `}
    >
      {!icon ? (
        <>
          {variant === 'success' && <Check className="w-3 h-3" />}
          {variant === 'warning' && <AlertCircle className="w-3 h-3" />}
          {variant === 'danger' && <AlertCircle className="w-3 h-3" />}
          {variant === 'pending' && <Clock className="w-3 h-3" />}
        </>
      ) : (
        <div className={colors.icon}>{icon}</div>
      )}
      <span>{label}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-1 p-0.5 hover:bg-white/30 rounded-full transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};