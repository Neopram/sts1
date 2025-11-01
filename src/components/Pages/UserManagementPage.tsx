import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Shield,
  Mail,
  Building,
  Calendar,
  Key,
  X,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import ApiService from '../../api';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../Common/Button';
import { Card } from '../Common/Card';
import { Loading } from '../Common/Loading';
import { Alert } from '../Common/Alert';
import { BaseModal } from '../Common/BaseModal';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  company?: string;
  is_active?: boolean;
  created_at: string;
  last_login?: string;
}

const ROLES = [
  'admin',
  'broker',
  'owner',
  'charterer',
  'seller',
  'buyer',
  'inspector',
  'viewer',
];

export const UserManagementPage: React.FC = () => {
  const { user, hasPermission } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    email: '',
    name: '',
    role: 'buyer',
    company: '',
    password: '',
    confirmPassword: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    role: '',
    company: '',
    is_active: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Check permissions
  useEffect(() => {
    if (!hasPermission('users', 'read')) {
      setError('You do not have permission to access user management');
      setLoading(false);
    }
  }, [hasPermission]);

  // Load users
  useEffect(() => {
    if (hasPermission('users', 'read')) {
      loadUsers();
    }
  }, [roleFilter, hasPermission]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ApiService.getUsers(100, 0, roleFilter !== 'all' ? roleFilter : undefined);
      // Handle both array and object with users property
      const usersList = Array.isArray(response) ? response : response.users || response.data || [];
      setUsers(usersList);
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Memoized filtered users
  const filteredUsers = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        u.email.toLowerCase().includes(searchLower) ||
        u.name.toLowerCase().includes(searchLower) ||
        (u.company && u.company.toLowerCase().includes(searchLower));
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.is_active) ||
        (statusFilter === 'inactive' && !u.is_active);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Generate random password
  const generatePassword = (): string => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  // Create user
  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.name || !createForm.role) {
      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: { type: 'error', message: 'Please fill in all required fields' },
        })
      );
      return;
    }

    if (createForm.password && createForm.password !== createForm.confirmPassword) {
      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: { type: 'error', message: 'Passwords do not match' },
        })
      );
      return;
    }

    try {
      setActionLoading(true);
      // Use provided password or generate a random one
      const password = createForm.password || generatePassword();
      
      await ApiService.createUser({
        email: createForm.email,
        name: createForm.name,
        role: createForm.role,
        company: createForm.company || undefined,
        password: password,
      });

      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: { type: 'success', message: 'User created successfully' },
        })
      );

      setShowCreateModal(false);
      setCreateForm({
        email: '',
        name: '',
        role: 'buyer',
        company: '',
        password: '',
        confirmPassword: '',
      });
      await loadUsers();
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: { type: 'error', message: err.message || 'Failed to create user' },
        })
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Edit user
  const handleEditUser = async () => {
    if (!selectedUser || !editForm.name || !editForm.role) {
      return;
    }

    try {
      setActionLoading(true);
      await ApiService.updateUser(selectedUser.id, {
        name: editForm.name,
        role: editForm.role,
        company: editForm.company || undefined,
        is_active: editForm.is_active,
      });

      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: { type: 'success', message: 'User updated successfully' },
        })
      );

      setShowEditModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: { type: 'error', message: err.message || 'Failed to update user' },
        })
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      await ApiService.deleteUser(selectedUser.id);

      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: { type: 'success', message: 'User deleted successfully' },
        })
      );

      setShowDeleteModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: { type: 'error', message: err.message || 'Failed to delete user' },
        })
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      await ApiService.resetUserPassword(selectedUser.id);

      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: {
            type: 'success',
            message: `Password reset email sent to ${selectedUser.email}`,
          },
        })
      );

      setShowResetPasswordModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: { type: 'error', message: err.message || 'Failed to reset password' },
        })
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      role: user.role,
      company: user.company || '',
      is_active: user.is_active ?? true,
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // Open reset password modal
  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    setShowResetPasswordModal(true);
  };

  // Memoized role badge color getter
  const getRoleBadgeColor = useCallback((role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      broker: 'bg-blue-100 text-blue-800',
      owner: 'bg-purple-100 text-purple-800',
      charterer: 'bg-green-100 text-green-800',
      seller: 'bg-yellow-100 text-yellow-800',
      buyer: 'bg-orange-100 text-orange-800',
      inspector: 'bg-indigo-100 text-indigo-800',
      viewer: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  }, []);

  if (!hasPermission('users', 'read')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-white to-primary-50/30 p-6">
        <Alert
          type="error"
          title="Access Denied"
          message="You do not have permission to access user management"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-white to-primary-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-secondary-900 mb-2 flex items-center gap-3">
                <Users className="w-8 h-8" />
                User Management
              </h1>
              <p className="text-secondary-600">Manage users, roles, and permissions</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={loadUsers} variant="ghost" size="sm" isLoading={loading}>
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              {hasPermission('users', 'create') && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  variant="primary"
                  icon={<Plus className="w-4 h-4" />}
                >
                  Create User
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card padding="md" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Roles</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </Card>

        {/* Users Table */}
        {loading ? (
          <Loading message="Loading users..." />
        ) : error ? (
          <Alert type="error" title="Error" message={error} />
        ) : (
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary-50 border-b border-secondary-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-secondary-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-secondary-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <Mail className="w-5 h-5 text-primary-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-secondary-900">{u.name}</div>
                              <div className="text-sm text-secondary-500">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                              u.role
                            )}`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {u.company || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              u.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {hasPermission('users', 'update') && (
                              <>
                                <button
                                  onClick={() => openEditModal(u)}
                                  className="text-blue-600 hover:text-blue-900 transition"
                                  title="Edit user"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openResetPasswordModal(u)}
                                  className="text-yellow-600 hover:text-yellow-900 transition"
                                  title="Reset password"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {hasPermission('users', 'delete') && (
                              <button
                                onClick={() => openDeleteModal(u)}
                                className="text-red-600 hover:text-red-900 transition"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Create User Modal */}
        <BaseModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setCreateForm({
              email: '',
              name: '',
              role: 'buyer',
              company: '',
              password: '',
              confirmPassword: '',
            });
          }}
          title="Create New User"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Full Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Role *
              </label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Company</label>
              <input
                type="text"
                value={createForm.company}
                onChange={(e) => setCreateForm({ ...createForm, company: e.target.value })}
                className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Company Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Password (Optional - user will receive reset email if not provided)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-4 py-2 pr-10 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Leave empty for auto-generated password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {createForm.password && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={createForm.confirmPassword}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, confirmPassword: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Confirm password"
                />
              </div>
            )}
            <div className="flex gap-3 justify-end pt-4">
              <Button
                onClick={() => setShowCreateModal(false)}
                variant="ghost"
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateUser} variant="primary" isLoading={actionLoading}>
                Create User
              </Button>
            </div>
          </div>
        </BaseModal>

        {/* Edit User Modal */}
        <BaseModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          title="Edit User"
          size="lg"
        >
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Email</label>
                <input
                  type="email"
                  value={selectedUser.email}
                  disabled
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg bg-secondary-50 text-secondary-500"
                />
                <p className="text-xs text-secondary-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Role *</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Company</label>
                <input
                  type="text"
                  value={editForm.company}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) =>
                      setEditForm({ ...editForm, is_active: e.target.checked })
                    }
                    className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-secondary-700">Active</span>
                </label>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  onClick={() => setShowEditModal(false)}
                  variant="ghost"
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleEditUser} variant="primary" isLoading={actionLoading}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </BaseModal>

        {/* Delete User Modal */}
        <BaseModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedUser(null);
          }}
          title="Delete User"
          size="md"
        >
          {selectedUser && (
            <div className="space-y-4">
              <Alert
                type="error"
                title="Warning"
                message={`Are you sure you want to delete ${selectedUser.name} (${selectedUser.email})? This action cannot be undone.`}
              />
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  onClick={() => setShowDeleteModal(false)}
                  variant="ghost"
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleDeleteUser} variant="danger" isLoading={actionLoading}>
                  Delete User
                </Button>
              </div>
            </div>
          )}
        </BaseModal>

        {/* Reset Password Modal */}
        <BaseModal
          isOpen={showResetPasswordModal}
          onClose={() => {
            setShowResetPasswordModal(false);
            setSelectedUser(null);
          }}
          title="Reset Password"
          size="md"
        >
          {selectedUser && (
            <div className="space-y-4">
              <Alert
                type="info"
                title="Reset Password"
                message={`A password reset email will be sent to ${selectedUser.email}. The user will need to set a new password using the link in the email.`}
              />
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  onClick={() => setShowResetPasswordModal(false)}
                  variant="ghost"
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResetPassword}
                  variant="primary"
                  isLoading={actionLoading}
                >
                  Send Reset Email
                </Button>
              </div>
            </div>
          )}
        </BaseModal>
      </div>
    </div>
  );
};

export default UserManagementPage;

