/**
 * Design System Application Utilities
 * Helper functions and utilities for applying design system styles
 */

export const designSystem = {
  colors: {
    primary: '#3b82f6',
    secondary: '#6b7280',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
  typography: {
    h1: 'text-4xl font-bold',
    h2: 'text-3xl font-bold',
    h3: 'text-2xl font-bold',
    h4: 'text-xl font-bold',
    body: 'text-base',
    small: 'text-sm',
  },
  components: {
    card: 'rounded-xl shadow-md border border-gray-200',
    cardHeader: 'px-6 py-4 border-b border-gray-200',
    cardBody: 'px-6 py-4',
    button: 'px-4 py-2 rounded-lg font-medium transition-all duration-200',
    input: 'px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500',
  },
};

export const compose = {
  standardCard: `${designSystem.components.card} bg-white`,
  modalOverlay: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
  modalContent: `${designSystem.components.card} max-w-lg w-full`,
};

/**
 * Apply design system to a component
 */
export function applyDesignSystem(element: HTMLElement | null, className: string): void {
  if (element) {
    element.classList.add(className);
  }
}

/**
 * Get color value from design system
 */
export function getColor(colorName: keyof typeof designSystem.colors): string {
  return designSystem.colors[colorName];
}

/**
 * Merge design system classes
 */
export function mergeDesignClasses(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}