// Design System Unificado para STS Clearance Hub
// Este archivo define TODAS las clases y estilos consistentes

export const designSystem = {
  // COLORES PRINCIPALES
  colors: {
    // Texto
    textPrimary: 'text-secondary-900',
    textSecondary: 'text-secondary-800', 
    textMuted: 'text-secondary-600',
    textLight: 'text-secondary-500',
    textDisabled: 'text-secondary-400',
    
    // Fondos
    bgPrimary: 'bg-white',
    bgSecondary: 'bg-secondary-50',
    bgMuted: 'bg-secondary-100',
    bgDisabled: 'bg-secondary-200',
    
    // Estados
    success: {
      bg: 'bg-success-50',
      border: 'border-success-200',
      text: 'text-success-800',
      icon: 'text-success-500',
      button: 'bg-success-600 hover:bg-success-700'
    },
    warning: {
      bg: 'bg-warning-50',
      border: 'border-warning-200', 
      text: 'text-warning-800',
      icon: 'text-warning-500',
      button: 'bg-warning-600 hover:bg-warning-700'
    },
    danger: {
      bg: 'bg-danger-50',
      border: 'border-danger-200',
      text: 'text-danger-800', 
      icon: 'text-danger-500',
      button: 'bg-danger-600 hover:bg-danger-700'
    },
    primary: {
      bg: 'bg-primary-50',
      border: 'border-primary-200',
      text: 'text-primary-800',
      icon: 'text-primary-500',
      button: 'bg-primary-600 hover:bg-primary-700'
    }
  },

  // ESPACIADO ESTANDARIZADO
  spacing: {
    // Contenedores principales
    pageContainer: 'space-y-8',
    sectionContainer: 'space-y-6', 
    cardContainer: 'space-y-4',
    
    // Márgenes
    pageHeader: 'mb-8',
    sectionHeader: 'mb-6',
    cardHeader: 'mb-4',
    elementMargin: 'mb-3',
    
    // Padding
    pagePadding: 'px-4 sm:px-6 lg:px-8 py-8',
    cardPadding: 'p-6',
    cardPaddingSmall: 'p-4',
    buttonPadding: 'px-6 py-3',
    buttonPaddingSmall: 'px-4 py-2',
    buttonPaddingXSmall: 'px-3 py-1.5',
    
    // Gaps
    buttonGroup: 'gap-4',
    cardGrid: 'gap-6',
    formFields: 'gap-4',
    iconText: 'gap-3',
    
    // Grids responsivos
    grid1: 'grid grid-cols-1',
    grid2: 'grid grid-cols-1 md:grid-cols-2',
    grid3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    grid4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    grid5: 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5'
  },

  // TIPOGRAFÍA UNIFICADA
  typography: {
    // Headers
    h1: 'text-3xl font-bold text-secondary-900',
    h2: 'text-2xl font-semibold text-secondary-900', 
    h3: 'text-xl font-semibold text-secondary-900',
    h4: 'text-lg font-medium text-secondary-900',
    h5: 'text-base font-medium text-secondary-900',
    
    // Body text
    bodyLarge: 'text-lg text-secondary-700 leading-relaxed',
    body: 'text-base text-secondary-600 leading-relaxed',
    bodySmall: 'text-sm text-secondary-600',
    bodyXSmall: 'text-xs text-secondary-500',
    
    // Labels y forms
    label: 'text-sm font-medium text-secondary-700',
    labelSmall: 'text-xs font-medium text-secondary-600',
    placeholder: 'placeholder-secondary-400',
    
    // Enlaces y botones
    link: 'text-primary-600 hover:text-primary-800 font-medium',
    linkMuted: 'text-secondary-500 hover:text-secondary-700'
  },

  // COMPONENTES ESTANDARIZADOS
  components: {
    // Cards
    card: 'bg-white rounded-xl shadow-card border border-secondary-200/50 overflow-hidden',
    cardHeader: 'px-6 py-4 border-b border-secondary-200/50 bg-secondary-50/50',
    cardBody: 'px-6 py-6',
    cardFooter: 'px-6 py-4 border-t border-secondary-200/50 bg-secondary-50/50',
    
    // Botones
    btnPrimary: 'btn btn-primary',
    btnSecondary: 'btn btn-secondary', 
    btnSuccess: 'btn btn-success',
    btnWarning: 'btn btn-warning',
    btnDanger: 'btn btn-danger',
    
    // Inputs
    input: 'form-input',
    inputError: 'form-input border-danger-300 focus:ring-danger-500 focus:border-danger-500',
    select: 'form-select',
    textarea: 'form-textarea',
    
    // Estados
    loading: 'loading-spinner',
    disabled: 'opacity-50 cursor-not-allowed',
    hover: 'hover:shadow-card-hover transition-shadow duration-200'
  },

  // Z-INDEX JERARQUÍA
  zIndex: {
    base: 'z-0',
    dropdown: 'z-[10]',
    sticky: 'z-[20]',
    overlay: 'z-[40]',
    modal: 'z-[50]',
    popover: 'z-[55]', 
    notification: 'z-[60]',
    tooltip: 'z-[65]',
    topModal: 'z-[70]'
  },

  // TRANSICIONES ESTANDARIZADAS
  transitions: {
    fast: 'transition-all duration-150 ease-in-out',
    normal: 'transition-all duration-200 ease-in-out', 
    slow: 'transition-all duration-300 ease-in-out',
    colors: 'transition-colors duration-200 ease-in-out',
    shadow: 'transition-shadow duration-200 ease-in-out',
    transform: 'transition-transform duration-200 ease-in-out'
  },

  // ESTADOS INTERACTIVOS
  states: {
    hover: 'hover:bg-secondary-50 transition-colors duration-200',
    focus: 'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:outline-none',
    active: 'active:bg-secondary-100',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
    loading: 'opacity-75 cursor-wait'
  },

  // RESPONSIVE BREAKPOINTS
  responsive: {
    mobile: 'block sm:hidden',
    tablet: 'hidden sm:block lg:hidden', 
    desktop: 'hidden lg:block',
    mobileUp: 'sm:block',
    tabletUp: 'md:block',
    desktopUp: 'lg:block'
  }
} as const;

// UTILIDADES DE COMPOSICIÓN
export const compose = {
  // Páginas principales
  page: `min-h-screen ${designSystem.colors.bgSecondary}`,
  pageContainer: `max-w-7xl mx-auto ${designSystem.spacing.pagePadding}`,
  pageContent: designSystem.spacing.pageContainer,
  
  // Headers de página
  pageHeader: `${designSystem.spacing.pageHeader}`,
  pageTitle: designSystem.typography.h1,
  pageDescription: `${designSystem.typography.body} mt-2`,
  
  // Cards estándar
  standardCard: designSystem.components.card,
  cardWithHeader: `${designSystem.components.card}`,
  
  // Botones estándar
  primaryButton: `${designSystem.components.btnPrimary} ${designSystem.transitions.colors}`,
  secondaryButton: `${designSystem.components.btnSecondary} ${designSystem.transitions.colors}`,
  
  // Modales estándar
  modalOverlay: `fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${designSystem.zIndex.modal} p-4`,
  modalContent: `bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden`,
  
  // Estados de error
  errorContainer: `${designSystem.colors.danger.bg} ${designSystem.colors.danger.border} border rounded-xl p-4`,
  errorText: `${designSystem.colors.danger.text} font-medium`,
  
  // Estados de éxito
  successContainer: `${designSystem.colors.success.bg} ${designSystem.colors.success.border} border rounded-xl p-4`,
  successText: `${designSystem.colors.success.text} font-medium`
} as const;
