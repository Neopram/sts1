/**
 * Premium Card Component - Modern glassmorphism design
 * Uso: Contenedor elegante para secciones
 */

import React, { ReactNode } from 'react';

interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: 'blue' | 'purple' | 'green' | 'none';
  shadow?: 'sm' | 'md' | 'lg' | 'xl';
}

export const PremiumCard: React.FC<PremiumCardProps> = ({
  children,
  className = '',
  hover = true,
  gradient = 'none',
  shadow = 'md'
}) => {
  const gradientClass = {
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100/50',
    green: 'bg-gradient-to-br from-green-50 to-green-100/50',
    none: 'bg-white'
  }[gradient];

  const shadowClass = {
    sm: 'shadow-sm',
    md: 'shadow-md hover:shadow-lg',
    lg: 'shadow-lg hover:shadow-xl',
    xl: 'shadow-xl hover:shadow-2xl'
  }[shadow];

  return (
    <div
      className={`
        rounded-2xl border border-gray-200/50 backdrop-blur-sm
        ${gradientClass}
        ${hover ? 'hover:border-gray-300 transition-all duration-300 transform hover:scale-[1.01]' : ''}
        ${shadowClass}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

interface PremiumCardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const PremiumCardHeader: React.FC<PremiumCardHeaderProps> = ({
  title,
  subtitle,
  icon,
  action
}) => (
  <div className="px-6 py-4 border-b border-gray-200/50 flex items-center justify-between">
    <div className="flex items-center gap-3">
      {icon && <div className="text-2xl">{icon}</div>}
      <div>
        <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
    {action && <div>{action}</div>}
  </div>
);

interface PremiumCardBodyProps {
  children: ReactNode;
  noPadding?: boolean;
}

export const PremiumCardBody: React.FC<PremiumCardBodyProps> = ({
  children,
  noPadding = false
}) => (
  <div className={noPadding ? '' : 'px-6 py-4'}>
    {children}
  </div>
);

interface PremiumCardFooterProps {
  children: ReactNode;
  action?: React.ReactNode;
}

export const PremiumCardFooter: React.FC<PremiumCardFooterProps> = ({
  children,
  action
}) => (
  <div className="px-6 py-3 border-t border-gray-200/50 bg-gray-50/50 flex items-center justify-between">
    <div>{children}</div>
    {action && <div>{action}</div>}
  </div>
);