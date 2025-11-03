/**
 * 🐛 RBAC DEBUG PANEL
 * 
 * Herramienta de debugging para el sistema RBAC
 * Muestra permisos actuales, rol, rutas permitidas, etc.
 * 
 * Solo visible en desarrollo (NODE_ENV === 'development')
 * 
 * Uso:
 * import { RBACDebugPanel } from './components/Debug/RBACDebugPanel';
 * 
 * En App.tsx o main.tsx:
 * <RBACDebugPanel />
 */

import React, { useState } from 'react';
import { usePolicy } from '../../contexts/PolicyContext';
import { useApp } from '../../contexts/AppContext';
import './RBACDebugPanel.css';

export const RBACDebugPanel: React.FC = () => {
  // Solo mostrar en desarrollo
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  const [isOpen, setIsOpen] = useState(false);
  const policy = usePolicy();
  const { user } = useApp();
  
  const permissions = policy.getPermissions();
  const currentRole = policy.getCurrentRole();
  
  return (
    <>
      {/* Botón flotante */}
      <button
        className="rbac-debug-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle RBAC Debug Panel"
      >
        🔐
      </button>
      
      {/* Panel */}
      {isOpen && (
        <div className="rbac-debug-panel">
          <div className="rbac-debug-header">
            <h3>🔐 RBAC Debug Panel</h3>
            <button
              className="rbac-debug-close"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="rbac-debug-content">
            {/* User Info */}
            {user ? (
              <div className="debug-section">
                <h4>👤 User Information</h4>
                <div className="debug-info">
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Name:</strong> {user.name}</p>
                  <p><strong>Role:</strong> <span className="role-badge">{user.role}</span></p>
                  <p><strong>Company:</strong> {user.company || 'N/A'}</p>
                </div>
              </div>
            ) : (
              <div className="debug-section">
                <p className="debug-warning">⚠️ No user authenticated</p>
              </div>
            )}
            
            {/* Current Permissions */}
            <div className="debug-section">
              <h4>🔑 Current Permissions ({permissions.length})</h4>
              <div className="debug-list">
                {permissions.length > 0 ? (
                  <ul>
                    {permissions.map(perm => (
                      <li key={perm} className="permission-item">
                        <span className="permission-check">✓</span>
                        <code>{perm}</code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="debug-warning">No permissions granted</p>
                )}
              </div>
            </div>
            
            {/* Role Checks */}
            <div className="debug-section">
              <h4>🎯 Role Checks</h4>
              <div className="debug-checks">
                <div className="check-row">
                  <span>Is Admin:</span>
                  <span className={policy.isAdmin() ? 'check-yes' : 'check-no'}>
                    {policy.isAdmin() ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
                <div className="check-row">
                  <span>Can Create Operation:</span>
                  <span className={policy.canCreateOperation() ? 'check-yes' : 'check-no'}>
                    {policy.canCreateOperation() ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
                <div className="check-row">
                  <span>Can View All Operations:</span>
                  <span className={policy.canViewAllOperations() ? 'check-yes' : 'check-no'}>
                    {policy.canViewAllOperations() ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
                <div className="check-row">
                  <span>Can Manage Users:</span>
                  <span className={policy.canManageUsers() ? 'check-yes' : 'check-no'}>
                    {policy.canManageUsers() ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
                <div className="check-row">
                  <span>Can View Analytics:</span>
                  <span className={policy.canViewAnalytics() ? 'check-yes' : 'check-no'}>
                    {policy.canViewAnalytics() ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Test Permissions */}
            <div className="debug-section">
              <h4>🧪 Test Specific Permissions</h4>
              <div className="debug-test">
                <PermissionTester policy={policy} />
              </div>
            </div>
            
            {/* Current Route */}
            <div className="debug-section">
              <h4>📍 Current Route</h4>
              <div className="debug-info">
                <p><code>{window.location.pathname}</code></p>
                <p className="debug-small">
                  {policy.canAccessRoute(window.location.pathname) ? '✓ Access allowed' : '✗ Access denied'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Componente auxiliar para testear permisos específicos
 */
interface PermissionTesterProps {
  policy: ReturnType<typeof usePolicy>;
}

const PermissionTester: React.FC<PermissionTesterProps> = ({ policy }) => {
  const [testPermission, setTestPermission] = useState('create_operation');
  const [testRoute, setTestRoute] = useState(window.location.pathname);
  
  const permissionOptions = [
    'create_operation',
    'view_operation',
    'edit_operation',
    'delete_operation',
    'view_documents',
    'upload_document',
    'approve_document',
    'delete_document',
    'approve',
    'reject',
    'send_message',
    'send_private_message',
    'manage_users',
    'manage_operations',
    'view_analytics',
    'view_admin_dashboard',
    'view_all_operations',
  ];
  
  return (
    <div className="tester">
      <div className="tester-row">
        <select
          value={testPermission}
          onChange={(e) => setTestPermission(e.target.value)}
          className="tester-select"
        >
          {permissionOptions.map(perm => (
            <option key={perm} value={perm}>{perm}</option>
          ))}
        </select>
        <span className={`tester-result ${policy.can(testPermission as any) ? 'yes' : 'no'}`}>
          {policy.can(testPermission as any) ? '✓' : '✗'}
        </span>
      </div>
      
      <div className="tester-row">
        <input
          type="text"
          value={testRoute}
          onChange={(e) => setTestRoute(e.target.value)}
          placeholder="/overview"
          className="tester-input"
        />
        <span className={`tester-result ${policy.canAccessRoute(testRoute) ? 'yes' : 'no'}`}>
          {policy.canAccessRoute(testRoute) ? '✓' : '✗'}
        </span>
      </div>
    </div>
  );
};

export default RBACDebugPanel;