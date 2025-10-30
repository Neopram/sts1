// Standard spacing and alignment classes for consistent UI
export const spacing = {
  // Page containers
  pageContainer: 'space-y-8',
  sectionContainer: 'space-y-6',
  cardContainer: 'space-y-4',
  
  // Grid spacing
  gridGap: 'gap-6',
  gridGapLarge: 'gap-8',
  
  // Button spacing
  buttonGroup: 'gap-4',
  buttonGroupSmall: 'gap-3',
  
  // Form spacing
  formField: 'space-y-4',
  formSection: 'space-y-6',
  
  // Modal spacing
  modalContent: 'space-y-6',
  modalActions: 'gap-3',
  
  // List spacing
  listItem: 'space-y-4',
  listItemSmall: 'space-y-3',
  
  // Header spacing
  pageHeader: 'mb-8',
  sectionHeader: 'mb-6',
  cardHeader: 'mb-4',
  
  // Padding
  cardPadding: 'p-6',
  cardPaddingSmall: 'p-4',
  modalPadding: 'p-6',
  
  // Margins
  sectionMargin: 'mb-8',
  cardMargin: 'mb-6',
  elementMargin: 'mb-4',
  
  // Flex alignment
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex items-center justify-between',
  flexStart: 'flex items-center justify-start',
  flexEnd: 'flex items-center justify-end',
  
  // Grid layouts
  gridCols1: 'grid grid-cols-1',
  gridCols2: 'grid grid-cols-1 md:grid-cols-2',
  gridCols3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  gridCols4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  
  // Button sizes
  buttonPrimary: 'px-6 py-3',
  buttonSecondary: 'px-4 py-2',
  buttonSmall: 'px-3 py-1.5',
  buttonLarge: 'px-8 py-4',
  
  // Input sizes
  inputStandard: 'px-4 py-2',
  inputLarge: 'px-4 py-3',
  
  // Border radius
  borderRadius: 'rounded-lg',
  borderRadiusSmall: 'rounded-md',
  borderRadiusLarge: 'rounded-xl',
  
  // Shadows
  shadowCard: 'shadow-sm',
  shadowHover: 'hover:shadow-md',
  shadowModal: 'shadow-xl',
  
  // Transitions
  transition: 'transition-all duration-200',
  transitionColors: 'transition-colors duration-200',
  transitionShadow: 'transition-shadow duration-200'
} as const;

export const colors = {
  // Status colors
  statusSuccess: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: 'text-green-500'
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: 'text-yellow-500'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: 'text-red-500'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'text-blue-500'
  },
  
  // Button colors
  primary: {
    bg: 'bg-blue-600',
    hover: 'hover:bg-blue-700',
    text: 'text-white'
  },
  secondary: {
    bg: 'bg-gray-100',
    hover: 'hover:bg-gray-200',
    text: 'text-gray-700',
    border: 'border-gray-300'
  },
  success: {
    bg: 'bg-green-600',
    hover: 'hover:bg-green-700',
    text: 'text-white'
  },
  danger: {
    bg: 'bg-red-600',
    hover: 'hover:bg-red-700',
    text: 'text-white'
  }
} as const;

export const typography = {
  // Headings
  h1: 'text-3xl font-bold text-gray-900',
  h2: 'text-2xl font-bold text-gray-900',
  h3: 'text-xl font-semibold text-gray-900',
  h4: 'text-lg font-medium text-gray-900',
  
  // Body text
  body: 'text-gray-700',
  bodySmall: 'text-sm text-gray-600',
  bodyLarge: 'text-lg text-gray-700',
  
  // Labels
  label: 'text-sm font-medium text-gray-700',
  labelSmall: 'text-xs font-medium text-gray-600',
  
  // Links
  link: 'text-blue-600 hover:text-blue-800',
  linkSmall: 'text-sm text-blue-600 hover:text-blue-800'
} as const;
