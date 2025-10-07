// Utilidad para aplicar el sistema de diseño de manera consistente
import { designSystem, compose } from '../styles/design-system';

// Mapeo de clases antiguas a nuevas
export const classMapping = {
  // Colores de texto
  'text-gray-900': designSystem.colors.textPrimary,
  'text-gray-800': designSystem.colors.textSecondary,
  'text-gray-700': designSystem.colors.textSecondary,
  'text-gray-600': designSystem.colors.textMuted,
  'text-gray-500': designSystem.colors.textLight,
  'text-gray-400': designSystem.colors.textDisabled,
  
  // Fondos
  'bg-gray-50': designSystem.colors.bgSecondary,
  'bg-gray-100': designSystem.colors.bgMuted,
  'bg-white': designSystem.colors.bgPrimary,
  
  // Estados de error
  'bg-red-50': designSystem.colors.danger.bg,
  'border-red-200': designSystem.colors.danger.border,
  'text-red-800': designSystem.colors.danger.text,
  'text-red-400': designSystem.colors.danger.icon,
  'text-red-500': designSystem.colors.danger.icon,
  
  // Estados de éxito
  'bg-green-50': designSystem.colors.success.bg,
  'border-green-200': designSystem.colors.success.border,
  'text-green-800': designSystem.colors.success.text,
  'text-green-500': designSystem.colors.success.icon,
  
  // Estados de advertencia
  'bg-yellow-50': designSystem.colors.warning.bg,
  'border-yellow-200': designSystem.colors.warning.border,
  'text-yellow-800': designSystem.colors.warning.text,
  'text-yellow-500': designSystem.colors.warning.icon,
  
  // Botones
  'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors': designSystem.components.btnPrimary,
  'px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors': designSystem.components.btnSecondary,
  'px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors': designSystem.components.btnSuccess,
  'px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors': designSystem.components.btnDanger,
  
  // Cards
  'bg-white rounded-lg shadow-sm border border-gray-200': designSystem.components.card,
  'bg-white rounded-lg shadow-sm border border-gray-200 p-6': `${designSystem.components.card} ${designSystem.spacing.cardPadding}`,
  
  // Headers
  'text-2xl font-bold text-gray-900': designSystem.typography.h2,
  'text-3xl font-bold text-gray-900': designSystem.typography.h1,
  'text-lg font-medium text-gray-900': designSystem.typography.h4,
  
  // Espaciado
  'space-y-6': designSystem.spacing.sectionContainer,
  'space-y-4': designSystem.spacing.cardContainer,
  'gap-3': designSystem.spacing.buttonGroup,
  'gap-4': designSystem.spacing.formFields,
  'gap-6': designSystem.spacing.cardGrid,
  
  // Grids
  'grid grid-cols-1 md:grid-cols-2': designSystem.spacing.grid2,
  'grid grid-cols-1 md:grid-cols-3': designSystem.spacing.grid3,
  'grid grid-cols-1 md:grid-cols-4': designSystem.spacing.grid4,
  
  // Z-index
  'z-50': designSystem.zIndex.modal,
  'z-40': designSystem.zIndex.overlay,
  
  // Transiciones
  'transition-colors': designSystem.transitions.colors,
  'transition-all duration-200': designSystem.transitions.normal,
  'transition-shadow duration-200': designSystem.transitions.shadow
};

// Función para aplicar el mapeo automáticamente
export const applyDesignSystem = (className: string): string => {
  let newClassName = className;
  
  // Aplicar mapeos
  Object.entries(classMapping).forEach(([oldClass, newClass]) => {
    newClassName = newClassName.replace(new RegExp(oldClass, 'g'), newClass);
  });
  
  return newClassName;
};

// Componentes preconfigurados
export const StandardComponents = {
  // Página estándar
  Page: ({ children, title, description }: { children: React.ReactNode, title: string, description?: string }) => (
    <div className={compose.page}>
      <div className={compose.pageContainer}>
        <div className={compose.pageHeader}>
          <h1 className={compose.pageTitle}>{title}</h1>
          {description && <p className={compose.pageDescription}>{description}</p>}
        </div>
        <div className={compose.pageContent}>
          {children}
        </div>
      </div>
    </div>
  ),
  
  // Card estándar
  Card: ({ children, title, actions }: { children: React.ReactNode, title?: string, actions?: React.ReactNode }) => (
    <div className={compose.standardCard}>
      {title && (
        <div className={designSystem.components.cardHeader}>
          <div className="flex items-center justify-between">
            <h3 className={designSystem.typography.h4}>{title}</h3>
            {actions}
          </div>
        </div>
      )}
      <div className={designSystem.components.cardBody}>
        {children}
      </div>
    </div>
  ),
  
  // Modal estándar
  Modal: ({ children, isOpen, onClose, title }: { children: React.ReactNode, isOpen: boolean, onClose: () => void, title: string }) => {
    if (!isOpen) return null;
    return (
      <div className={compose.modalOverlay}>
        <div className={compose.modalContent}>
          <div className={designSystem.components.cardHeader}>
            <div className="flex items-center justify-between">
              <h2 className={designSystem.typography.h3}>{title}</h2>
              <button onClick={onClose} className="p-2 text-secondary-400 hover:text-secondary-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className={designSystem.components.cardBody}>
            {children}
          </div>
        </div>
      </div>
    );
  }
};
