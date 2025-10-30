import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
  hover?: boolean;
  elevation?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'html-gradient';
  role?: string;
  'aria-label'?: string;
  gradient?: 'primary' | 'header' | 'vessel' | 'weather' | 'light';
  animated?: boolean;
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

const variantClasses: Record<'default' | 'primary' | 'success' | 'warning' | 'danger' | 'html-gradient', string> = {
  default: 'bg-white border-secondary-200/60',
  primary: 'bg-primary-50/30 border-primary-200/50',
  success: 'bg-success-50/30 border-success-200/50',
  warning: 'bg-warning-50/30 border-warning-200/50',
  danger: 'bg-danger-50/30 border-danger-200/50',
  'html-gradient': 'bg-white border-0 shadow-lg',
};

const gradientClasses: Record<'primary' | 'header' | 'vessel' | 'weather' | 'light', string> = {
  primary: 'bg-gradient-html-primary text-white',
  header: 'bg-gradient-html-header text-white',
  vessel: 'bg-gradient-html-vessel text-white',
  weather: 'bg-gradient-html-weather text-white',
  light: 'bg-gradient-html-light text-secondary-900',
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
  gradient,
  animated = false,
}) => {
  const useGradient = gradient && gradientClasses[gradient];
  
  return (
    <div
      role={role}
      aria-label={ariaLabel}
      className={`
        rounded-2xl transition-all duration-300 ease-smooth
        ${useGradient ? gradientClasses[gradient] : variantClasses[variant]}
        ${border && !useGradient ? 'border' : ''}
        ${paddingClasses[padding]}
        ${elevationClasses[elevation]}
        ${hover ? 'hover:shadow-card-hover hover:border-secondary-300/80 cursor-pointer group hover:-translate-y-1' : ''}
        ${animated ? 'animate-fade-in' : ''}
        ${className || ''}
      `}
    >
      {children}
    </div>
  );
};

export default Card;