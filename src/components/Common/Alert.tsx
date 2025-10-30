import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  onClose?: () => void;
  actions?: React.ReactNode;
  role?: string;
  'aria-live'?: 'polite' | 'assertive';
  closeable?: boolean;
}

const variantClasses: Record<AlertVariant, string> = {
  info: 'bg-primary-50/80 border-primary-200 text-primary-900',
  success: 'bg-success-50/80 border-success-200 text-success-900',
  warning: 'bg-warning-50/80 border-warning-200 text-warning-900',
  error: 'bg-danger-50/80 border-danger-200 text-danger-900',
};

const iconColorClasses: Record<AlertVariant, string> = {
  info: 'text-primary-600',
  success: 'text-success-600',
  warning: 'text-warning-600',
  error: 'text-danger-600',
};

const iconComponents: Record<AlertVariant, React.ReactNode> = {
  info: <Info size={20} />,
  success: <CheckCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  error: <AlertCircle size={20} />,
};

/**
 * Premium Alert Component with Accessibility
 * 
 * Ejemplos:
 * <Alert variant="success" title="Éxito" message="Operación completada" />
 * <Alert variant="error" message="Error al guardar" onClose={() => {}} />
 * <Alert variant="warning" message="Acción irreversible" closeable />
 */
export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  message,
  onClose,
  actions,
  role,
  'aria-live': ariaLive,
  closeable = true,
}) => {
  const alertRole = role || variant === 'error' ? 'alert' : 'status';
  const ariaLiveValue = ariaLive || (variant === 'error' ? 'assertive' : 'polite');

  return (
    <div
      role={alertRole}
      aria-live={ariaLiveValue}
      aria-atomic="true"
      className={`
        border rounded-lg px-5 py-4 flex gap-4
        ${variantClasses[variant]}
        shadow-sm transition-all duration-300 ease-smooth
        animate-slide-down
      `}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 pt-0.5 ${iconColorClasses[variant]}`}>
        {iconComponents[variant]}
      </div>

      {/* Content */}
      <div className="flex-grow min-w-0">
        {title && (
          <h3 className="font-bold text-sm mb-1 leading-tight">
            {title}
          </h3>
        )}
        <p className="text-sm leading-relaxed break-words">
          {message}
        </p>
        {actions && (
          <div className="mt-3 flex flex-wrap gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* Close Button */}
      {onClose && closeable && (
        <button
          onClick={onClose}
          aria-label={`Cerrar ${variant === 'error' ? 'alerta de error' : 'mensaje'}`}
          className="
            flex-shrink-0 inline-flex items-center justify-center
            rounded-lg p-1.5 
            opacity-60 hover:opacity-100
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
            transition-all duration-200 ease-smooth
          "
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};

export default Alert;