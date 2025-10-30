import React from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  className?: string;
  animated?: boolean;
  dot?: boolean;
  'aria-label'?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-secondary-100 text-secondary-800 border border-secondary-200',
  primary: 'bg-primary-100/80 text-primary-800 border border-primary-200',
  success: 'bg-success-100/80 text-success-800 border border-success-200',
  warning: 'bg-warning-100/80 text-warning-800 border border-warning-200',
  danger: 'bg-danger-100/80 text-danger-800 border border-danger-200',
  info: 'bg-primary-100/80 text-primary-800 border border-primary-200',
};

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'px-2 py-0.5 text-xs font-bold',
  sm: 'px-2.5 py-1 text-xs font-bold',
  md: 'px-3 py-1.5 text-sm font-bold',
  lg: 'px-4 py-2 text-base font-bold',
};

const dotSizeClasses: Record<BadgeSize, string> = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

/**
 * Premium Badge Component for Status & Labels
 * 
 * Ejemplos:
 * <Badge variant="success">Activo</Badge>
 * <Badge variant="danger" icon={<AlertIcon />}>Crítico</Badge>
 * <Badge dot animated variant="warning">En proceso</Badge>
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  icon,
  className,
  animated = false,
  dot = false,
  'aria-label': ariaLabel,
}) => {
  return (
    <span
      className={`
        inline-flex items-center justify-center gap-1.5 font-bold rounded-full
        transition-all duration-200 ease-smooth
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${animated ? 'animate-pulse' : ''}
        ${className || ''}
      `}
      aria-label={ariaLabel}
    >
      {dot && (
        <span
          className={`
            rounded-full flex-shrink-0
            ${dotSizeClasses[size]}
            ${animated ? 'animate-pulse-glow' : ''}
            ${
              variant === 'success' ? 'bg-success-500' :
              variant === 'warning' ? 'bg-warning-500' :
              variant === 'danger' ? 'bg-danger-500' :
              variant === 'primary' || variant === 'info' ? 'bg-primary-500' :
              'bg-secondary-400'
            }
          `}
        />
      )}
      {icon && (
        <span className="flex-shrink-0 inline-flex items-center">
          {icon}
        </span>
      )}
      {children && <span className="leading-none">{children}</span>}
    </span>
  );
};

export default Badge;