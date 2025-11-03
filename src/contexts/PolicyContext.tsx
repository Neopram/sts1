/**
 * 🔐 POLICY CONTEXT - Sistema RBAC Definitivo
 * 
 * Centraliza TODA lógica de permisos y control de acceso
 * - Mínimo privilegio por defecto
 * - Extensible para operaciones + tenant (multi-tenant ready)
 * - Auditable: cada can() genera log en desarrollo
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useApp } from './AppContext';

// ============================================
// TIPOS Y ENUMS
// ============================================

export type UserRole = 'admin' | 'broker' | 'charterer' | 'owner' | 'viewer' | 'seller' | 'buyer';

export type ResourceAction = 
  // Operations (STS Sessions)
  | 'create_operation' 
  | 'view_operation' 
  | 'edit_operation' 
  | 'delete_operation'
  // Documents
  | 'view_documents'
  | 'upload_document'
  | 'approve_document'
  | 'delete_document'
  // Approvals
  | 'approve'
  | 'reject'
  // Messages
  | 'send_message'
  | 'send_private_message'
  // Management
  | 'manage_users'
  | 'manage_operations'
  // Views
  | 'view_analytics'
  | 'view_admin_dashboard'
  | 'view_all_operations';

/**
 * Permission Matrix: LA FUENTE DE LA VERDAD
 * Basada en principio de mínimo privilegio (deny by default)
 */
const ROLE_PERMISSIONS: Record<UserRole, Set<ResourceAction>> = {
  // 👑 ADMIN: Acceso total
  admin: new Set([
    'create_operation', 'view_operation', 'edit_operation', 'delete_operation',
    'view_documents', 'upload_document', 'approve_document', 'delete_document',
    'approve', 'reject',
    'send_message', 'send_private_message',
    'manage_users', 'manage_operations',
    'view_analytics', 'view_admin_dashboard', 'view_all_operations'
  ]),
  
  // 🤝 BROKER: Puede crear operaciones, ver todas, gestionar documentos
  broker: new Set([
    'create_operation', 'view_operation', 'edit_operation', 'delete_operation',
    'view_documents', 'upload_document', 'approve_document',
    'approve', 'reject',
    'send_message', 'send_private_message',
    'view_analytics', 'view_all_operations'
  ]),
  
  // 📦 CHARTERER (Trading Company): Crear operaciones, responder docs
  charterer: new Set([
    'create_operation', 'view_operation', 'edit_operation',
    'view_documents', 'upload_document', 'approve_document',
    'approve', 'reject',
    'send_message', 'send_private_message',
    'view_analytics'
  ]),
  
  // ⛴️ OWNER (Shipowner): Crear operaciones, responder docs
  owner: new Set([
    'create_operation', 'view_operation', 'edit_operation',
    'view_documents', 'upload_document', 'approve_document',
    'approve', 'reject',
    'send_message', 'send_private_message'
  ]),
  
  // 👁️ VIEWER: Solo lectura
  viewer: new Set([
    'view_operation',
    'view_documents',
    'send_message',
    'view_analytics'
  ]),
  
  // 🛍️ SELLER: Muy limitado (comercio side)
  seller: new Set([
    'view_operation',
    'send_message'
  ]),
  
  // 🛒 BUYER: Muy limitado
  buyer: new Set([
    'view_operation',
    'send_message'
  ])
};

/**
 * Route Access Matrix: Qué rutas puede acceder cada rol
 * Formato: { role: [routes_permitidas] }
 */
const ROLE_ROUTE_ACCESS: Record<UserRole, string[]> = {
  admin: [
    '/', '/overview', '/documents', '/missing', '/approval', '/activity', '/history', '/messages',
    '/chat', '/rooms/:roomId', '/users', '/vessels',
    '/settings', '/profile', '/notifications', '/help',
    '/admin-dashboard', '/role-permission-matrix', '/dashboard-customization',
    '/regional-operations', '/sanctions-checker', '/approval-matrix',
    '/advanced-filtering', '/performance-dashboard',
    '/create-operation' // ← Nueva ruta
  ],
  
  broker: [
    '/', '/overview', '/documents', '/missing', '/approval', '/activity', '/history', '/messages',
    '/chat', '/rooms/:roomId',
    '/settings', '/profile', '/notifications', '/help',
    '/regional-operations', '/sanctions-checker',
    '/advanced-filtering', '/performance-dashboard',
    '/create-operation' // ← Brokers pueden crear operaciones
  ],
  
  charterer: [
    '/', '/overview', '/documents', '/missing', '/approval', '/activity', '/history', '/messages',
    '/chat', '/rooms/:roomId',
    '/settings', '/profile', '/notifications', '/help',
    '/create-operation' // ← Pueden crear operaciones
  ],
  
  owner: [
    '/', '/overview', '/documents', '/missing', '/approval', '/activity', '/history', '/messages',
    '/chat', '/rooms/:roomId',
    '/settings', '/profile', '/notifications', '/help',
    '/create-operation' // ← Pueden crear operaciones
  ],
  
  viewer: [
    '/', '/overview', '/documents', '/activity', '/history', '/messages',
    '/chat',
    '/settings', '/profile', '/notifications', '/help'
  ],
  
  seller: [
    '/', '/messages', '/chat',
    '/settings', '/profile', '/help'
  ],
  
  buyer: [
    '/', '/messages', '/chat',
    '/settings', '/profile', '/help'
  ]
};

interface PolicyContextType {
  // Verificar permiso de acción
  can: (action: ResourceAction) => boolean;
  
  // Verificar acceso a ruta
  canAccessRoute: (route: string) => boolean;
  
  // Verificar si es admin
  isAdmin: () => boolean;
  
  // Verificar si puede crear operaciones
  canCreateOperation: () => boolean;
  
  // Verificar si puede ver todas las operaciones
  canViewAllOperations: () => boolean;
  
  // Verificar si puede gestionar usuarios
  canManageUsers: () => boolean;
  
  // Verificar si puede ver analytics
  canViewAnalytics: () => boolean;
  
  // Obtener rol actual
  getCurrentRole: () => UserRole | null;
  
  // Obtener lista de permisos (para debugging)
  getPermissions: () => ResourceAction[];
}

const PolicyContext = createContext<PolicyContextType | undefined>(undefined);

/**
 * Hook: Usar policy context
 */
export const usePolicy = () => {
  const context = useContext(PolicyContext);
  if (!context) {
    throw new Error('usePolicy must be used within PolicyProvider');
  }
  return context;
};

/**
 * Provider Component
 */
interface PolicyProviderProps {
  children: ReactNode;
}

export const PolicyProvider: React.FC<PolicyProviderProps> = ({ children }) => {
  const { user } = useApp();
  
  const policy = useMemo((): PolicyContextType => {
    const role = user?.role as UserRole | null;
    
    // Si no hay usuario, negar todo
    if (!role) {
      return {
        can: () => false,
        canAccessRoute: () => false,
        isAdmin: () => false,
        canCreateOperation: () => false,
        canViewAllOperations: () => false,
        canManageUsers: () => false,
        canViewAnalytics: () => false,
        getCurrentRole: () => null,
        getPermissions: () => [],
      };
    }
    
    const permissions = ROLE_PERMISSIONS[role];
    const allowedRoutes = ROLE_ROUTE_ACCESS[role];
    
    return {
      can: (action: ResourceAction) => {
        const hasPermission = permissions.has(action);
        
        // Log en desarrollo
        if (!hasPermission && process.env.NODE_ENV === 'development') {
          console.warn(`[POLICY] Acceso denegado: ${role} no puede ${action}`);
        }
        
        return hasPermission;
      },
      
      canAccessRoute: (route: string) => {
        // Permitir ruta exacta o con parámetros dinámicos
        const allowed = allowedRoutes.some(allowedRoute => {
          if (allowedRoute === route) return true;
          // Manejar rutas con parámetros: /rooms/:roomId
          const routePattern = allowedRoute.replace(/:\w+/g, '[^/]+');
          return new RegExp(`^${routePattern}$`).test(route);
        });
        
        if (!allowed && process.env.NODE_ENV === 'development') {
          console.warn(`[POLICY] Acceso a ruta denegado: ${role} no puede acceder a ${route}`);
        }
        
        return allowed;
      },
      
      isAdmin: () => role === 'admin',
      
      canCreateOperation: () => permissions.has('create_operation'),
      
      canViewAllOperations: () => permissions.has('view_all_operations'),
      
      canManageUsers: () => permissions.has('manage_users'),
      
      canViewAnalytics: () => permissions.has('view_analytics'),
      
      getCurrentRole: () => role,
      
      getPermissions: () => Array.from(permissions),
    };
  }, [user]);
  
  return (
    <PolicyContext.Provider value={policy}>
      {children}
    </PolicyContext.Provider>
  );
};

export default PolicyContext;