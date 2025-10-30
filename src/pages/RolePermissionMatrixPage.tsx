import React, { useState, useEffect } from 'react';
import { Shield, Plus, Save, Copy, Download } from 'lucide-react';
import { ApiService } from '../api';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'document' | 'room' | 'user' | 'approval' | 'admin' | 'report';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

interface RolePermission {
  role_id: string;
  role_name: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export const RolePermissionMatrixPage: React.FC = () => {
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<RolePermission | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [showNewRole, setShowNewRole] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permsData] = await Promise.all([
        ApiService.getRolePermissions(),
        ApiService.getAvailablePermissions()
      ]);
      setRoles(rolesData || []);
      setAllPermissions(permsData || []);
      if (rolesData && rolesData.length > 0) {
        setSelectedRole(rolesData[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Failed to load roles and permissions');
    } finally {
      setLoading(false);
    }
  };

  const createNewRole = async () => {
    if (!newRoleName.trim()) {
      setMessage('Please enter a role name');
      return;
    }

    try {
      setLoading(true);
      const newRole: RolePermission = {
        role_id: 'role_' + Date.now(),
        role_name: newRoleName,
        permissions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await ApiService.createRole(newRole);
      setRoles([...roles, newRole]);
      setSelectedRole(newRole);
      setNewRoleName('');
      setShowNewRole(false);
      setMessage('Role created successfully');
    } catch (error) {
      console.error('Error creating role:', error);
      setMessage('Failed to create role');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    if (!selectedRole) return;

    const newPermissions = selectedRole.permissions.includes(permissionId)
      ? selectedRole.permissions.filter(p => p !== permissionId)
      : [...selectedRole.permissions, permissionId];

    setSelectedRole({
      ...selectedRole,
      permissions: newPermissions
    });
  };

  const saveRolePermissions = async () => {
    if (!selectedRole) return;

    try {
      setLoading(true);
      await ApiService.updateRolePermissions(selectedRole.role_id, {
        ...selectedRole,
        updatedAt: new Date().toISOString()
      });
      setMessage('Permissions saved successfully');
    } catch (error) {
      console.error('Error saving permissions:', error);
      setMessage('Failed to save permissions');
    } finally {
      setLoading(false);
    }
  };

  const deleteRole = async (roleId: string) => {
    try {
      setLoading(true);
      await ApiService.deleteRole(roleId);
      const newRoles = roles.filter(r => r.role_id !== roleId);
      setRoles(newRoles);
      setSelectedRole(newRoles.length > 0 ? newRoles[0] : null);
      setMessage('Role deleted successfully');
    } catch (error) {
      console.error('Error deleting role:', error);
      setMessage('Failed to delete role');
    } finally {
      setLoading(false);
    }
  };

  const duplicateRole = async (roleId: string) => {
    try {
      setLoading(true);
      const roleToClone = roles.find(r => r.role_id === roleId);
      if (roleToClone) {
        const newRole: RolePermission = {
          role_id: 'role_' + Date.now(),
          role_name: `${roleToClone.role_name} (Copy)`,
          permissions: [...roleToClone.permissions],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await ApiService.createRole(newRole);
        setRoles([...roles, newRole]);
        setSelectedRole(newRole);
        setMessage('Role duplicated successfully');
      }
    } catch (error) {
      console.error('Error duplicating role:', error);
      setMessage('Failed to duplicate role');
    } finally {
      setLoading(false);
    }
  };

  const grantAllPermissions = async (category: string) => {
    if (!selectedRole) return;

    const categoryPerms = allPermissions
      .filter(p => !filterCategory || p.category === category)
      .map(p => p.id);

    const newPermissions = Array.from(new Set([
      ...selectedRole.permissions,
      ...categoryPerms
    ]));

    setSelectedRole({
      ...selectedRole,
      permissions: newPermissions
    });
    setMessage(`Granted all ${category} permissions`);
  };

  const revokeAllPermissions = () => {
    if (!selectedRole) return;
    setSelectedRole({
      ...selectedRole,
      permissions: []
    });
    setMessage('All permissions revoked');
  };

  const exportMatrix = async () => {
    try {
      const data = {
        roles,
        permissions: allPermissions,
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `role-permission-matrix-${Date.now()}.json`;
      a.click();
      setMessage('Matrix exported successfully');
    } catch (error) {
      console.error('Error exporting matrix:', error);
      setMessage('Failed to export matrix');
    }
  };

  const filteredPermissions = allPermissions.filter(p => {
    if (filterCategory && p.category !== filterCategory) return false;
    if (filterRiskLevel && p.risk_level !== filterRiskLevel) return false;
    return true;
  });

  const categories = Array.from(new Set(allPermissions.map(p => p.category)));
  const riskLevels = Array.from(new Set(allPermissions.map(p => p.risk_level)));

  const getRiskColor = (level: string): string => {
    const colors: Record<string, string> = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-orange-100 text-orange-800',
      'critical': 'bg-red-100 text-red-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  const getRiskBgColor = (level: string): string => {
    const colors: Record<string, string> = {
      'low': 'hover:bg-green-50',
      'medium': 'hover:bg-yellow-50',
      'high': 'hover:bg-orange-50',
      'critical': 'hover:bg-red-50'
    };
    return colors[level] || 'hover:bg-gray-50';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Role & Permission Matrix</h1>
                <p className="text-slate-400 mt-1">Manage user roles and their permissions</p>
              </div>
            </div>
            <button
              onClick={exportMatrix}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Matrix
            </button>
          </div>
          {message && (
            <div className="p-3 bg-green-900 text-green-200 rounded-lg">
              {message}
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-6">
          {/* Role Selector */}
          <div className="col-span-1 space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Roles</h3>
              
              <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
                {roles.map((role) => (
                  <div key={role.role_id} className="space-y-1">
                    <button
                      onClick={() => setSelectedRole(role)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition ${
                        selectedRole?.role_id === role.role_id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <div className="font-medium">{role.role_name}</div>
                      <div className="text-xs opacity-75">{role.permissions.length} perms</div>
                    </button>
                    {selectedRole?.role_id === role.role_id && (
                      <div className="flex gap-1 px-1">
                        <button
                          onClick={() => duplicateRole(role.role_id)}
                          className="flex-1 px-2 py-1 bg-slate-600 text-white text-xs rounded hover:bg-slate-500 flex items-center justify-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Clone
                        </button>
                        <button
                          onClick={() => deleteRole(role.role_id)}
                          className="flex-1 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {showNewRole ? (
                <div className="p-3 bg-slate-700 rounded-lg space-y-2">
                  <input
                    type="text"
                    placeholder="Role name..."
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-600 text-white rounded border border-slate-500 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={createNewRole}
                      disabled={loading}
                      className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setShowNewRole(false)}
                      className="flex-1 px-2 py-1 bg-slate-600 text-white rounded text-sm hover:bg-slate-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewRole(true)}
                  className="w-full px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Role
                </button>
              )}
            </div>
          </div>

          {/* Permissions */}
          <div className="col-span-3 space-y-6">
            {selectedRole && (
              <>
                {/* Quick Actions */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                  <div className="flex gap-2 flex-wrap">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => grantAllPermissions(cat)}
                        className="px-3 py-2 bg-slate-700 text-slate-300 rounded text-sm hover:bg-blue-600 hover:text-white transition"
                      >
                        Grant all {cat}
                      </button>
                    ))}
                    <button
                      onClick={revokeAllPermissions}
                      className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      Revoke all
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Filters</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">Category</label>
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 text-sm"
                      >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">Risk Level</label>
                      <select
                        value={filterRiskLevel}
                        onChange={(e) => setFilterRiskLevel(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 text-sm"
                      >
                        <option value="">All Levels</option>
                        {riskLevels.map(level => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Permission List */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Permissions ({selectedRole.permissions.length}/{allPermissions.length})
                    </h3>
                    <button
                      onClick={saveRolePermissions}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredPermissions.map((permission) => (
                      <label
                        key={permission.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border border-slate-600 cursor-pointer transition ${
                          selectedRole.permissions.includes(permission.id)
                            ? 'bg-slate-700 border-blue-500'
                            : `bg-slate-700 ${getRiskBgColor(permission.risk_level)}`
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRole.permissions.includes(permission.id)}
                          onChange={() => togglePermission(permission.id)}
                          className="mt-1 w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white">{permission.name}</div>
                          <div className="text-sm text-slate-400">{permission.description}</div>
                          <div className="flex gap-2 mt-1">
                            <span className="inline-block px-2 py-1 bg-slate-600 text-slate-300 text-xs rounded">
                              {permission.category}
                            </span>
                            <span className={`inline-block px-2 py-1 text-xs rounded ${getRiskColor(permission.risk_level)}`}>
                              {permission.risk_level}
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};