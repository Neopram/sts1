import React, { ReactNode } from 'react';
import { useApp } from '../../contexts/AppContext';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface DashboardBaseProps {
  children: ReactNode;
  title: string;
  icon?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const ROLE_COLORS: Record<string, { gradient: string; icon: string }> = {
  admin: { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: '👨‍💼' },
  owner: { gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', icon: '👑' },
  broker: { gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', icon: '💼' },
  seller: { gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', icon: '📦' },
  buyer: { gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', icon: '🛒' },
  charterer: { gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', icon: '⛵' },
  viewer: { gradient: 'linear-gradient(135deg, #ffa502 0%, #ff6348 100%)', icon: '👁️' },
};

export const DashboardBase: React.FC<DashboardBaseProps> = ({
  children,
  title,
  icon,
  subtitle,
  actions,
}) => {
  const { user, logout } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const roleColor = user?.role ? ROLE_COLORS[user.role.toLowerCase()] : ROLE_COLORS.viewer;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '1600px',
          margin: '0 auto',
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'calc(100vh - 40px)',
        }}
      >
        {/* Header */}
        <header
          style={{
            background: roleColor.gradient,
            color: 'white',
            padding: '20px 30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* Left side - Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '28px' }}>{icon || roleColor.icon}</span>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px' }}>
                {title}
              </div>
              {subtitle && (
                <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          {/* Right side - User & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Actions (desktop) */}
            {actions && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {actions}
              </div>
            )}

            {/* User Menu */}
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(255, 255, 255, 0.25)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    color: 'white',
                    fontSize: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                  }}
                >
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div style={{ color: 'white', display: 'none', '@media (min-width: 768px)': { display: 'block' } }}>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>
                    {user.name || user.email}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8, textTransform: 'capitalize', marginTop: '2px' }}>
                    {user.role}
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            padding: '30px',
            overflowY: 'auto',
            background: '#f8f9fa',
          }}
        >
          {children}
        </main>

        {/* Footer */}
        <footer
          style={{
            background: '#fff',
            borderTop: '1px solid #e0e6ed',
            padding: '15px 30px',
            fontSize: '12px',
            color: '#7f8c8d',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>© 2024 STS Clearance Hub. All rights reserved.</div>
          <div>v1.0.0 | {new Date().toLocaleDateString()}</div>
        </footer>
      </div>
    </div>
  );
};