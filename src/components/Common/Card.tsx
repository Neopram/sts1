import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
  hover?: boolean;
  elevation?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  role?: string;
  'aria-label'?: string;
}

const paddingClasses: Record<'none' | 'sm' | 'md' | 'lg', string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const elevationClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'shadow-elevation-1',
  md: 'shadow-card',
  lg: 'shadow-card-hover',
};

const variantClasses: Record<'default' | 'primary' | 'success' | 'warning' | 'danger', string> = {
  default: 'bg-white border-secondary-200/60',
  primary: 'bg-primary-50/30 border-primary-200/50',
  success: 'bg-success-50/30 border-success-200/50',
  warning: 'bg-warning-50/30 border-warning-200/50',
  danger: 'bg-danger-50/30 border-danger-200/50',
};

/**
 * Premium Card Component with Multiple Variants
 * 
 * Ejemplos:
 * <Card padding="md" hover>Contenido</Card>
 * <Card variant="success" elevation="lg">Éxito</Card>
 * <Card padding="lg" role="region" aria-label="Panel de resumen">...</Card>
 */
export const Card: React.FC<CardProps> = ({
  children,
  className,
  padding = 'md',
  border = true,
  hover = false,
  elevation = 'md',
  variant = 'default',
  role,
  'aria-label': ariaLabel,
}) => {
  return (
    <div
      role={role}
      aria-label={ariaLabel}
      className={`
        rounded-xl transition-all duration-300 ease-smooth
        ${variantClasses[variant]}
        ${border ? 'border' : ''}
        ${paddingClasses[padding]}
        ${elevationClasses[elevation]}
        ${hover ? 'hover:shadow-card-hover hover:border-secondary-300/80 cursor-pointer' : ''}
        ${className || ''}
      `}
    >
      {children}
    </div>
  );
};

export default Card;