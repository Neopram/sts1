import React from 'react';
import { Loader } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white shadow-button hover:shadow-button-hover',
  secondary: 'bg-secondary-100 hover:bg-secondary-200 active:bg-secondary-300 text-secondary-800 border border-secondary-300',
  danger: 'bg-danger-600 hover:bg-danger-700 active:bg-danger-800 text-white shadow-button hover:shadow-button-hover',
  success: 'bg-success-600 hover:bg-success-700 active:bg-success-800 text-white shadow-button hover:shadow-button-hover',
  warning: 'bg-warning-600 hover:bg-warning-700 active:bg-warning-800 text-white shadow-button hover:shadow-button-hover',
  ghost: 'bg-transparent hover:bg-secondary-100 active:bg-secondary-200 text-secondary-700',
};

const sizeClasses: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string> = {
  xs: 'px-2.5 py-1.5 text-xs font-bold',
  sm: 'px-3.5 py-2 text-sm font-semibold',
  md: 'px-4.5 py-2.5 text-sm font-semibold',
  lg: 'px-6 py-3 text-base font-semibold',
  xl: 'px-8 py-4 text-lg font-bold',
};

const iconSizes: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string> = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-4.5 h-4.5',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
};

/**
 * Premium Button Component with Professional Styling
 * 
 * Ejemplos de uso:
 * <Button variant="primary" size="md">Guardar</Button>
 * <Button variant="danger" size="sm" icon={<Trash />}>Eliminar</Button>
 * <Button variant="ghost" isLoading>Cargando...</Button>
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  disabled,
  className,
  'aria-label': ariaLabel,
  ...props
}) => {
  const isDisabled = disabled || isLoading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-label={ariaLabel}
      className={`
        inline-flex items-center justify-center gap-2.5 font-semibold rounded-lg 
        transition-all duration-200 ease-smooth
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        active:scale-95
        disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isLoading ? 'opacity-75' : ''}
        ${className || ''}
      `}
    >
      {isLoading ? (
        <Loader className={`animate-spin ${iconSizes[size]}`} aria-hidden="true" />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className={`flex-shrink-0 ${iconSizes[size]}`} aria-hidden="true">
              {icon}
            </span>
          )}
          {children && <span>{children}</span>}
          {icon && iconPosition === 'right' && (
            <span className={`flex-shrink-0 ${iconSizes[size]}`} aria-hidden="true">
              {icon}
            </span>
          )}
        </>
      )}
    </button>
  );
};

export default Button;