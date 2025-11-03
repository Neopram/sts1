/**
 * 🛡️ ROUTE GUARD - Protección de rutas basada en RBAC
 * 
 * Comprueba permisos de acceso a rutas dinámicamente
 * Maneja redireccionamiento inteligente según contexto
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { usePolicy } from '../contexts/PolicyContext';
import { Loading } from './Common/Loading';

interface RouteGuardProps {
  children: React.ReactNode;
  fallbackRoute?: string;
}

/**
 * Componente que protege rutas basado en RBAC
 * - Si el usuario no está autenticado → /login
 * - Si el usuario no tiene permiso → fallbackRoute (default: /overview)
 * - Si carga → loading spinner
 * - Si OK → renderiza children
 */
export const RouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  fallbackRoute = '/overview' 
}) => {
  const { user, loading } = useApp();
  const { canAccessRoute } = usePolicy();
  const location = useLocation();
  
  // Si está cargando autenticación
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <Loading message="Verifying access permissions..." />
      </div>
    );
  }
  
  // Si no está autenticado
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Si no tiene acceso a esta ruta
  if (!canAccessRoute(location.pathname)) {
    console.warn(`[ACCESS DENIED] User ${user.email} (${user.role}) cannot access ${location.pathname}`);
    return (
      <Navigate to={fallbackRoute} replace state={{ 
        error: 'You do not have permission to access this page.' 
      }} />
    );
  }
  
  // Tiene acceso, renderizar
  return <>{children}</>;
};

export default RouteGuard;