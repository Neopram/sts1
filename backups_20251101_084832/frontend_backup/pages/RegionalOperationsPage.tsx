import React, { useState, useEffect } from 'react';
import { Activity, Ship, AlertCircle, TrendingUp, Filter } from 'lucide-react';
import ApiService from '../api';

interface RegionalSummary {
  region: string;
  total_operations: number;
  active_operations: number;
  user_operations: number;
  upcoming_operations: number;
  critical_operations: number;
}

interface RegionalOperation {
  id: string;
  title: string;
  location: string;
  region: string;
  sts_eta?: string;
  status: string;
  vessel_count: number;
  user_vessels: number;
  last_activity?: string;
  priority: string;
}

interface RegionalDashboard {
  user_summary: {
    total_vessels: number;
    active_operations: number;
    upcoming_operations: number;
    regions_covered: number;
    role: string;
  };
  regional_summary: RegionalSummary[];
  operations: RegionalOperation[];
  upcoming_deadlines: any[];
  recent_activity: any[];
}

/**
 * Regional Operations Dashboard
 * 
 * Displays multi-regional operations view with:
 * - Regional summary statistics
 * - Operations by region
 * - Vessel tracking
 * - Approval status
 */
const RegionalOperationsPage: React.FC = () => {
  const [dashboard, setDashboard] = useState<RegionalDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        const data = await ApiService.getRegionalDashboard();
        setDashboard(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load regional dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="text-center py-12 text-gray-600">Loading regional dashboard...</div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={24} />
          <div>
            <h2 className="font-semibold text-red-900">Error Loading Dashboard</h2>
            <p className="text-red-800">{error || 'Failed to load regional dashboard'}</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredOps = dashboard.operations.filter(op => {
    if (selectedRegion && op.region !== selectedRegion) return false;
    if (statusFilter && op.status !== statusFilter) return false;
    return true;
  });

  const regions = [...new Set(dashboard.regional_summary.map(r => r.region))];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Regional Operations</h1>
        <p className="text-gray-600">Multi-region operations overview and management</p>
      </div>

      {/* User Summary */}
      {dashboard.user_summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Total Vessels</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{dashboard.user_summary.total_vessels}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Active Operations</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{dashboard.user_summary.active_operations}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Upcoming</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{dashboard.user_summary.upcoming_operations}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Regions Covered</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">{dashboard.user_summary.regions_covered}</p>
          </div>
        </div>
      )}

      {/* Regional Summary Cards */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">By Region</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dashboard.regional_summary.map(region => (
            <div key={region.region} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{region.region}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {region.total_operations} total operations
                  </p>
                </div>
                {region.critical_operations > 0 && (
                  <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                    {region.critical_operations} Critical
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Activity className="text-green-600" size={16} />
                  <span className="text-sm text-gray-600">
                    {region.active_operations} active
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-blue-600" size={16} />
                  <span className="text-sm text-gray-600">
                    {region.upcoming_operations} upcoming
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Regions</option>
            {regions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <span className="text-sm text-gray-600 ml-auto">
            {filteredOps.length} operations
          </span>
        </div>
      </div>

      {/* Operations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Operation</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Region</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vessels</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ETA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOps.map(op => (
                <tr key={op.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{op.title}</p>
                      <p className="text-sm text-gray-600">{op.location}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{op.region}</td>
                  <td className="px-6 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      op.status === 'active' ? 'bg-green-100 text-green-800' :
                      op.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {op.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Ship size={14} className="text-blue-600" />
                      <span>{op.vessel_count}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      op.priority === 'high' ? 'bg-red-100 text-red-800' :
                      op.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {op.priority}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {op.sts_eta ? new Date(op.sts_eta).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOps.length === 0 && (
          <div className="p-8 text-center text-gray-600">
            No operations match your filters
          </div>
        )}
      </div>

      {/* Upcoming Deadlines */}
      {dashboard.upcoming_deadlines && dashboard.upcoming_deadlines.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Deadlines</h2>
          <div className="space-y-3">
            {dashboard.upcoming_deadlines.slice(0, 5).map((deadline, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <AlertCircle className="text-orange-600 flex-shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="font-medium text-gray-900">{deadline.title}</p>
                  <p className="text-sm text-gray-600">{deadline.deadline}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionalOperationsPage;