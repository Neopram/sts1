import React, { ReactNode } from 'react';
import { useApp } from '../../contexts/AppContext';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  icon?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title, icon }) => {
  const { user } = useApp();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <header style={{
          background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
          color: 'white',
          padding: '20px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '24px', fontWeight: 'bold' }}>
            {icon && <span>{icon}</span>}
            <span>{title || 'Dashboard'}</span>
          </div>
          
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: '#e74c3c',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: 'white'
              }}>
                {user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div style={{ color: 'white' }}>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>{user.name || user.email}</div>
                <div style={{ fontSize: '12px', opacity: 0.8, textTransform: 'capitalize' }}>{user.role}</div>
              </div>
            </div>
          )}
        </header>

        {/* Main Content */}
        <div style={{ padding: '30px' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;