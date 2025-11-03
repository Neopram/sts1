/**
 * 🛡️ ROLE GUARD - Control de visibilidad de UI por rol
 * 
 * Componente que muestra/oculta contenido basado en:
 * - Rol del usuario
 * - Permisos específicos
 * - Lógica personalizada
 */

import React from 'react';
import { usePolicy, ResourceAction, UserRole } from '../contexts/PolicyContext';

interface RoleGuardProps {
  children: React.ReactNode;
  /**
   * Mostrar si el usuario tiene este permiso
   */
  can?: ResourceAction;
  /**
   * Mostrar si el usuario tiene UNO de estos permisos
   */
  canAny?: ResourceAction[];
  /**
   * Mostrar si el usuario tiene TODOS estos permisos
   */
  canAll?: ResourceAction[];
  /**
   * Mostrar si el usuario tiene uno de estos roles
   */
  roles?: UserRole[];
  /**
   * Mostrar solo si es admin
   */
  adminOnly?: boolean;
  /**
   * Elemento alternativo si no cumple condición
   */
  fallback?: React.ReactNode;
}

/**
 * Componente que controla visibilidad de UI
 * 
 * Ejemplos:
 * <RoleGuard can="create_operation">
 *   <button>Create Operation</button>
 * </RoleGuard>
 * 
 * <RoleGuard roles={['admin', 'broker']}>
 *   <AdminPanel />
 * </RoleGuard>
 * 
 * <RoleGuard adminOnly fallback={<div>No access</div>}>
 *   <SecretButton />
 * </RoleGuard>
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  can,
  canAny,
  canAll,
  roles,
  adminOnly,
  fallback
}) => {
  const policy = usePolicy();
  
  let hasAccess = true;
  
  // Verificar rol admin
  if (adminOnly) {
    hasAccess = policy.isAdmin();
  }
  
  // Verificar rol específico
  if (hasAccess && roles) {
    const currentRole = policy.getCurrentRole();
    hasAccess = currentRole ? roles.includes(currentRole) : false;
  }
  
  // Verificar permiso individual
  if (hasAccess && can) {
    hasAccess = policy.can(can);
  }
  
  // Verificar uno de varios permisos
  if (hasAccess && canAny && canAny.length > 0) {
    hasAccess = canAny.some(action => policy.can(action));
  }
  
  // Verificar todos los permisos
  if (hasAccess && canAll && canAll.length > 0) {
    hasAccess = canAll.every(action => policy.can(action));
  }
  
  // Renderizar
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  // Por defecto, no mostrar nada si no tiene acceso
  return null;
};

export default RoleGuard;