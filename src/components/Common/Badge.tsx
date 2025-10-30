import React from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'location' | 'date' | 'payment' | 'active' | 'approved' | 'review' | 'missing';
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
  default: 'bg-secondary-100/85 text-secondary-800 border border-secondary-300',
  primary: 'bg-primary-100/85 text-primary-800 border border-primary-300',
  success: 'bg-success-100/85 text-success-800 border border-success-300',
  warning: 'bg-warning-100/85 text-warning-800 border border-warning-300',
  danger: 'bg-danger-100/85 text-danger-800 border border-danger-300',
  info: 'bg-primary-100/85 text-primary-800 border border-primary-300',
  // HTML STYLE BADGES
  location: 'bg-html-location/20 text-html-location border border-html-location/40',
  date: 'bg-html-date/20 text-html-date border border-html-date/40',
  payment: 'bg-html-payment/30 text-html-header border border-html-payment/50',
  active: 'bg-html-active/20 text-html-active border border-html-active/40',
  approved: 'bg-html-approved/20 text-html-approved border border-html-approved/40',
  review: 'bg-html-review/20 text-html-review border border-html-review/40',
  missing: 'bg-html-missing/20 text-html-missing border border-html-missing/40',
};

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'px-2 py-1 text-xs font-bold',
  sm: 'px-2.5 py-1.5 text-xs font-bold',
  md: 'px-3.5 py-2 text-sm font-semibold',
  lg: 'px-4.5 py-2.5 text-base font-semibold',
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
  size = 'sm',
  icon,
  className,
  animated = false,
  dot = false,
  'aria-label': ariaLabel,
}) => {
  return (
    <span
      className={`
        inline-flex items-center justify-center gap-1.5 font-semibold rounded-full
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