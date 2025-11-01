import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showPasswordToggle?: boolean;
  counter?: boolean;
  'aria-label'?: string;
}

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-base',
  lg: 'px-5 py-3 text-lg',
};

/**
 * Premium Input Component with Validation & Accessibility
 * 
 * Ejemplos:
 * <Input label="Correo" type="email" required />
 * <Input label="Contraseña" type="password" showPasswordToggle />
 * <Input label="Bio" counter maxLength={200} />
 */
export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon,
  fullWidth = true,
  size = 'md',
  showPasswordToggle = false,
  counter = false,
  className,
  type = 'text',
  maxLength,
  value,
  required,
  disabled,
  id,
  'aria-label': ariaLabel,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const charCount = typeof value === 'string' ? value.length : 0;
  const isPasswordInput = type === 'password';
  const displayType = isPasswordInput && showPassword ? 'text' : type;

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-secondary-800 mb-2"
        >
          {label}
          {required && <span className="text-danger-500 ml-1.5" aria-label="requerido">*</span>}
        </label>
      )}

      <div className="relative group">
        {icon && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary-400 flex-shrink-0 pointer-events-none">
            {React.cloneElement(icon as React.ReactElement, { size: 18 })}
          </div>
        )}

        <input
          {...props}
          id={inputId}
          type={displayType}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          required={required}
          aria-label={ariaLabel || label}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined}
          aria-invalid={!!error}
          className={`
            w-full rounded-lg border transition-all duration-200 ease-smooth
            bg-white text-secondary-900 placeholder-secondary-400
            shadow-sm
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
            disabled:bg-secondary-100 disabled:text-secondary-500 disabled:cursor-not-allowed
            hover:border-secondary-400
            ${sizeClasses[size]}
            ${icon ? 'pl-11' : ''}
            ${showPasswordToggle && isPasswordInput ? 'pr-11' : ''}
            ${error 
              ? 'border-danger-500 focus-visible:ring-danger-500/20 focus-visible:border-danger-500' 
              : 'border-secondary-300 focus-visible:ring-primary-500/20 focus-visible:border-primary-500'
            }
            ${className || ''}
          `}
        />

        {showPasswordToggle && isPasswordInput && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-secondary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md p-1"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      <div className="mt-2 flex items-start justify-between gap-2 min-h-5">
        <div className="flex-1">
          {error && (
            <div id={`${inputId}-error`} className="flex items-center gap-1.5 text-danger-600 text-sm font-medium">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {helperText && !error && (
            <p id={`${inputId}-help`} className="text-secondary-500 text-sm">
              {helperText}
            </p>
          )}
        </div>

        {counter && maxLength && (
          <span className={`text-xs font-medium flex-shrink-0 ${charCount > maxLength * 0.8 ? 'text-warning-600' : 'text-secondary-400'}`}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
};

export default Input;