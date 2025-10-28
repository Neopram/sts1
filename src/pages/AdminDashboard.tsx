import React, { useState, useEffect } from 'react';
import { Users, Activity, FileText, AlertCircle, TrendingUp, BarChart3, Settings, Trash2 } from 'lucide-react';
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
  company: string;
  created_at: string;
  is_active: boolean;
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
        const statsData = await ApiService.get('/api/v1/admin/stats');
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
        const usersData = await ApiService.get('/api/v1/users');
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
                    <td className="px-6 py-3 text-sm">
                      <button className="text-red-600 hover:text-red-700 transition">
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
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Operations monitoring coming soon</p>
        </div>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Compliance reports coming soon</p>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;