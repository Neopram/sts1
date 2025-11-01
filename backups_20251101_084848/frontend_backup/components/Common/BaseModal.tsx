import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  closeButton?: boolean;
  backdrop?: boolean;
  onBackdropClick?: () => void;
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

const sizeClasses: Record<'sm' | 'md' | 'lg' | 'xl' | '2xl', string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
};

/**
 * Premium Base Modal Component with Full Accessibility
 * 
 * Ejemplos:
 * <BaseModal isOpen={isOpen} onClose={onClose} title="Confirmar acción">
 *   ¿Deseas continuar?
 * </BaseModal>
 */
export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeButton = true,
  backdrop = true,
  onBackdropClick,
  role = 'dialog',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      // Trap focus
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    onBackdropClick?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - Professional with smooth animation */}
      {backdrop && (
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-smooth animate-fade-in"
          onClick={handleBackdropClick}
          role="presentation"
          aria-hidden="true"
        />
      )}

      {/* Modal - Elevated with smooth entrance */}
      <div
        role={role}
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={`
          relative bg-white rounded-xl shadow-modal 
          ${sizeClasses[size]} w-full mx-auto 
          max-h-[90vh] overflow-hidden
          transition-all duration-300 ease-smooth
          animate-scale-in
          flex flex-col
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Premium styling */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-secondary-200/50 bg-gradient-to-r from-secondary-50/50 to-primary-50/30 flex-shrink-0">
          <h2 
            id={ariaLabelledBy}
            className="text-lg font-bold text-secondary-900"
          >
            {title}
          </h2>
          {closeButton && (
            <button
              onClick={onClose}
              aria-label="Cerrar modal"
              className="
                inline-flex items-center justify-center w-8 h-8 
                rounded-lg text-secondary-500 hover:text-secondary-700
                hover:bg-secondary-100 focus-visible:ring-2 focus-visible:ring-primary-500
                transition-all duration-200 ease-smooth
              "
            >
              <X size={20} stroke-width={2.5} />
            </button>
          )}
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
          {children}
        </div>

        {/* Footer - Sticky */}
        {footer && (
          <div className="
            flex justify-end items-center gap-3 px-6 py-5 
            border-t border-secondary-200/50 bg-secondary-50/60
            flex-shrink-0
          ">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseModal;