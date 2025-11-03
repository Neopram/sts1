/**
 * Protected Route Component
 * Ensures only authenticated users can access protected routes
 * Redirects to login if user is not authenticated
 * 
 * FIX: Improved loading messages with context-aware messaging
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Loading } from './Common/Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Get appropriate loading message based on authentication state
 */
const getLoadingMessage = (user: any, loading: boolean): string => {
  if (loading && !user) {
    return 'Authenticating...';
  }
  if (loading && user) {
    return 'Initializing dashboard...';
  }
  return 'Loading application...';
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useApp();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <Loading message={getLoadingMessage(user, loading)} />
      </div>
    );
  }

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated, render the protected component
  return <>{children}</>;
};