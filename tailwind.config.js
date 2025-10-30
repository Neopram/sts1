/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./sts-clearance-app.tsx",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // PALETA MARINA PROFESIONAL
        primary: {
          50: '#f0f7ff',   // Cielo claro
          100: '#e0efff',
          200: '#bae6ff',
          300: '#7ddbff',
          400: '#3ecfff',
          500: '#00bfff',  // Azul cielo marítimo
          600: '#0099cc',  // Azul profundo
          700: '#006699',  // Azul marino
          800: '#004466',  // Azul marino oscuro
          900: '#002233',  // Casi negro azulado
        },
        // GRISES SOFISTICADOS
        secondary: {
          50: '#fafbfc',   // Blanco puro con toque
          100: '#f3f6f9',
          200: '#e8ecf1',
          300: '#d9e2ec',
          400: '#b8c5d6',
          500: '#8b9ab5',
          600: '#647089',
          700: '#475569',
          800: '#2d3748',
          900: '#1a202c',
        },
        // VERDE AGUA (Éxito)
        success: {
          50: '#f0fdf7',
          100: '#d4f8ef',
          200: '#a8ede0',
          300: '#7ce1d0',
          400: '#51d5c2',
          500: '#26c9b4',  // Turquesa marino
          600: '#1aa890',
          700: '#14886c',
          800: '#0f6a54',
          900: '#0a4c3c',
        },
        // NARANJA CÁLIDO (Advertencia)
        warning: {
          50: '#fffbf0',
          100: '#ffecd9',
          200: '#ffd9a8',
          300: '#ffc66b',
          400: '#ffb340',
          500: '#ff9e1b',  // Naranja marítimo
          600: '#e68a0f',
          700: '#cc7708',
          800: '#b26504',
          900: '#805702',
        },
        // ROJO MARÍTIMO (Peligro)
        danger: {
          50: '#fef5f5',
          100: '#fde2e2',
          200: '#fac3c3',
          300: '#f59c9c',
          400: '#f07070',
          500: '#e8453c',  // Rojo señalización
          600: '#d4342e',
          700: '#b8261f',
          800: '#8b1e18',
          900: '#5a1410',
        },
        // GRIS NEUTRO (Contexto)
        neutral: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        // ACENTOS PREMIUM
        accent: {
          gold: '#d4af37',    // Dorado profesional
          slate: '#64748b',   // Pizarra
          navy: '#001a4d',    // Azul marino oscuro
        },
        // COLORES ESPECÍFICOS DEL HTML
        html: {
          location: '#ff6b6b',      // Rojo ubicación
          date: '#4ecdc4',          // Turquesa fecha
          payment: '#95e1d3',       // Aqua pago
          active: '#6ab04c',        // Verde activo
          approved: '#27ae60',      // Verde aprobado
          review: '#f39c12',        // Naranja revisión
          missing: '#e74c3c',       // Rojo faltante
          badge: '#3498db',         // Azul badge
          header: '#2c3e50',        // Gris oscuro header
          lighter: '#c3cfe2',       // Gris claro
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.4px' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.2px' }],
        'base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0px' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.2px' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.4px' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.6px' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.8px' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-1px' }],
      },
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0em',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
      },
      borderRadius: {
        'xs': '0.25rem',
        'sm': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        // SOMBRAS SOFISTICADAS
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'base': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        // SOMBRAS CON TINTA
        'card': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 16px rgba(0, 0, 0, 0.12)',
        'button': '0 1px 3px rgba(0, 0, 0, 0.12)',
        'button-hover': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'modal': '0 25px 50px rgba(0, 0, 0, 0.15)',
        'elevation-1': '0 2px 4px rgba(0, 0, 0, 0.1)',
        'elevation-2': '0 4px 8px rgba(0, 0, 0, 0.12)',
        'elevation-3': '0 8px 16px rgba(0, 0, 0, 0.15)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      // DURACIÓN DE TRANSICIONES
      transitionDuration: {
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '500': '500ms',
        '700': '700ms',
        '1000': '1000ms',
      },
      // TIMING FUNCTIONS
      transitionTimingFunction: {
        'in': 'cubic-bezier(0.4, 0, 1, 1)',
        'out': 'cubic-bezier(0, 0, 0.2, 1)',
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      // KEYFRAMES ADICIONALES + HTML STYLE
      keyframes: {
        'fade-in': {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        'slide-up': {
          'from': { transform: 'translateY(10px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          'from': { transform: 'translateY(-10px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        // HTML STYLE ANIMATIONS
        'slide-in': {
          'from': { opacity: '0', transform: 'translateX(-20px)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-custom': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'scale-in': {
          'from': { transform: 'scale(0.95)', opacity: '0' },
          'to': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'slide-in': 'slide-in 0.5s ease',
        'pulse-custom': 'pulse-custom 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scale-in': 'scale-in 0.3s ease-out',
      },
      // NUEVOS GRADIENTES DEL HTML
      backgroundImage: {
        'gradient-html-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-html-header': 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
        'gradient-html-vessel': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'gradient-html-weather': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-html-light': 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      },
    },
  },
  plugins: [],
}
