import React, { useState, useEffect } from 'react';
import { Users, Activity, FileText, AlertCircle, TrendingUp, BarChart3, Settings, Trash2, X, Edit2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import ApiService from '../api';

interface DashboardStats {
  total_users: number;
  total_operations: number;
  total_documents: number;
  active_operations: number;
  pending_approvals: number;
  users_by_role: Record<string, number>;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  company?: string;
  created_at: string;
  is_active?: boolean;
}

interface FeatureFlag {
  key: string;
  enabled: boolean;
}

/**
 * AdminDashboard Component
 * 
 * Admin-only interface for:
 * 1. System overview and statistics
 * 2. User management
 * 3. Operation monitoring
 * 4. Compliance and audit
 */
export const AdminDashboard: React.FC = () => {
  const { user, hasPermission } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'operations' | 'compliance'>('overview');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  
  // Feature flags state
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [loadingFlags, setLoadingFlags] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  
  // User edit modal state
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', role: '' });

  // Handle user deletion
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    try {
      setDeletingUserId(userId);
      await ApiService.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      console.log('User deleted successfully');
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert(`Failed to delete user: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeletingUserId(null);
    }
  };

  // Handle user edit
  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setEditFormData({ name: user.name, role: user.role });
  };

  const handleSaveUserEdit = async () => {
    if (!editingUser) return;
    try {
      await ApiService.updateUser(editingUser.id, editFormData);
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...editFormData } : u));
      setEditingUser(null);
      console.log('User updated successfully');
    } catch (err) {
      console.error('Failed to update user:', err);
      alert(`Failed to update user: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Load feature flags
  const loadFeatureFlags = async () => {
    try {
      setLoadingFlags(true);
      const flags = await ApiService.getFeatureFlags();
      setFeatureFlags(flags);
    } catch (err) {
      console.error('Failed to load feature flags:', err);
    } finally {
      setLoadingFlags(false);
    }
  };

  // Toggle feature flag
  const handleToggleFlag = async (key: string, currentState: boolean) => {
    try {
      await ApiService.updateFeatureFlag(key, !currentState);
      setFeatureFlags(flags => flags.map(f => f.key === key ? { ...f, enabled: !currentState } : f));
      console.log(`Feature flag ${key} toggled`);
    } catch (err) {
      console.error('Failed to update feature flag:', err);
      alert(`Failed to update feature flag: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Clear cache
  const handleClearCache = async () => {
    if (!window.confirm('Are you sure you want to clear the system cache? This may impact performance temporarily.')) {
      return;
    }
    try {
      setClearingCache(true);
      await ApiService.clearSystemCache();
      console.log('System cache cleared successfully');
      alert('System cache cleared successfully');
    } catch (err) {
      console.error('Failed to clear cache:', err);
      alert(`Failed to clear cache: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setClearingCache(false);
    }
  };

  // Check permissions
  if (!hasPermission('manage_users') && user?.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={24} />
          <div>
            <h2 className="font-semibold text-red-900">Access Denied</h2>
            <p className="text-red-800">You do not have permission to access the admin dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const statsData = await ApiService.getAdminStats();
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersData = await ApiService.getUsers();
        setUsers(usersData);
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    };

    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">System overview and management</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          <BarChart3 size={20} />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'users'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          <Users size={20} />
          Users ({stats?.total_users || 0})
        </button>
        <button
          onClick={() => setActiveTab('operations')}
          className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'operations'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          <Activity size={20} />
          Operations ({stats?.total_operations || 0})
        </button>
        <button
          onClick={() => setActiveTab('compliance')}
          className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'compliance'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          <FileText size={20} />
          Compliance
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-600">Loading statistics...</div>
          ) : stats ? (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Users */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Total Users</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_users}</p>
                    </div>
                    <Users className="text-blue-600" size={32} />
                  </div>
                </div>

                {/* Active Operations */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Active Operations</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.active_operations}</p>
                    </div>
                    <Activity className="text-green-600" size={32} />
                  </div>
                </div>

                {/* Total Operations */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Total Operations</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_operations}</p>
                    </div>
                    <TrendingUp className="text-purple-600" size={32} />
                  </div>
                </div>

                {/* Pending Approvals */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Pending Approvals</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pending_approvals}</p>
                    </div>
                    <AlertCircle className="text-orange-600" size={32} />
                  </div>
                </div>
              </div>

              {/* Users by Role */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Users by Role</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(stats.users_by_role).map(([role, count]) => (
                    <div key={role} className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                      <p className="text-gray-600 text-sm capitalize">{role}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-red-600">{error || 'Failed to load statistics'}</div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-sm text-gray-900">{u.email}</td>
                    <td className="px-6 py-3 text-sm text-gray-900">{u.name}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{u.company}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        u.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm flex gap-2">
                      <button 
                        onClick={() => handleEditUser(u)}
                        className="text-blue-600 hover:text-blue-700 transition"
                        title="Edit user"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={deletingUserId === u.id}
                        className="text-red-600 hover:text-red-700 transition disabled:opacity-50"
                        title="Delete user"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Operations Tab */}
      {activeTab === 'operations' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">All Operations (Rooms)</h2>
            <div className="text-sm text-gray-600 mb-4">
              Total operations: {stats?.total_operations || 0}
            </div>
            <p className="text-gray-600">Operations list integration in development...</p>
            <p className="text-sm text-gray-500 mt-2">
              This tab will display all rooms with real-time status updates, vessel information, and operational metrics.
            </p>
          </div>
        </div>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {/* Load flags on tab open */}
          {!featureFlags.length && !loadingFlags && (
            <button 
              onClick={loadFeatureFlags}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Load Feature Flags
            </button>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feature Flags */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings size={20} className="text-blue-600" />
                Feature Flags
              </h2>
              {loadingFlags ? (
                <p className="text-sm text-gray-600">Loading flags...</p>
              ) : featureFlags.length > 0 ? (
                <div className="space-y-2">
                  {featureFlags.map(flag => (
                    <div key={flag.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700 capitalize">{flag.key}</span>
                      <button
                        onClick={() => handleToggleFlag(flag.key, flag.enabled)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                          flag.enabled
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        }`}
                      >
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No feature flags loaded</p>
              )}
            </div>

            {/* System Health */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle size={20} className="text-green-600" />
                System Health
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Healthy
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Database</span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Connected
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Cache</span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Connected
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Audit & Compliance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-purple-600" />
              Compliance & Audit
            </h2>
            <div className="space-y-3">
              <button className="w-full px-4 py-2 border border-gray-300 text-left rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700">
                Export Audit Log
              </button>
              <button className="w-full px-4 py-2 border border-gray-300 text-left rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700">
                Generate Compliance Report
              </button>
              <button 
                onClick={handleClearCache}
                disabled={clearingCache}
                className="w-full px-4 py-2 border border-red-300 text-left rounded-lg hover:bg-red-50 text-sm font-medium text-red-700 disabled:opacity-50"
              >
                {clearingCache ? 'Clearing Cache...' : 'Clear System Cache'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                  <option value="seller">Seller</option>
                  <option value="buyer">Buyer</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUserEdit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;