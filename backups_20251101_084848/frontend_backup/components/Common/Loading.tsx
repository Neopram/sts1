import React from 'react';
import { Loader } from 'lucide-react';

interface LoadingProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullscreen?: boolean;
  message?: string;
  variant?: 'default' | 'spinner' | 'dots' | 'skeleton';
  overlay?: boolean;
  'aria-label'?: string;
}

const sizeClasses: Record<NonNullable<LoadingProps['size']>, string> = {
  xs: 'w-4 h-4',
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

const spinnerSizeClasses: Record<NonNullable<LoadingProps['size']>, string> = {
  xs: 'w-2 h-2',
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

/**
 * Premium Loading Component with Multiple Variants
 * 
 * Ejemplos:
 * <Loading message="Cargando..." />
 * <Loading variant="dots" fullscreen />
 * <Loading size="lg" message="Procesando" />
 */
export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  fullscreen = false,
  message,
  variant = 'default',
  overlay = true,
  'aria-label': ariaLabel,
}) => {
  const defaultAriaLabel = ariaLabel || 'Cargando contenido';

  const spinnerContent = (
    <div className="flex flex-col items-center justify-center gap-4 animate-fade-in">
      {/* Spinner variants */}
      {variant === 'default' && (
        <div className="relative">
          <div className={`
            ${sizeClasses[size]} 
            border-4 border-secondary-200 border-t-primary-600 rounded-full 
            animate-spin
          `} />
        </div>
      )}

      {variant === 'spinner' && (
        <Loader className={`${sizeClasses[size]} animate-spin text-primary-600`} />
      )}

      {variant === 'dots' && (
        <div className="flex gap-2 items-end">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`
                ${spinnerSizeClasses[size]} bg-primary-600 rounded-full
                animate-bounce
              `}
              style={{
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      )}

      {variant === 'skeleton' && (
        <div className="w-full space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-4 bg-gradient-to-r from-secondary-200 to-secondary-100 rounded animate-shimmer"
            />
          ))}
        </div>
      )}

      {/* Message */}
      {message && (
        <p className="text-secondary-600 text-sm font-medium text-center px-4">
          {message}
        </p>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={defaultAriaLabel}
        className={`
          fixed inset-0 z-50 flex items-center justify-center
          ${overlay ? 'bg-black/20 backdrop-blur-sm' : 'bg-white/50'}
          transition-all duration-300 ease-smooth
          animate-fade-in
        `}
      >
        <div className="bg-white rounded-2xl shadow-modal p-8 max-w-md w-full mx-4">
          {spinnerContent}
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={defaultAriaLabel}
      className="w-full h-full flex items-center justify-center"
    >
      {spinnerContent}
    </div>
  );
};

export default Loading;