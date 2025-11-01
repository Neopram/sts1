import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Search, RefreshCw, AlertCircle } from 'lucide-react';
import ApiService from '../api';

interface SanctionCheckResult {
  imo: string;
  is_sanctioned: boolean;
  details: any;
  checked_by: string;
  timestamp?: string;
}

interface SanctionsList {
  id: string;
  name: string;
  description: string;
  vessel_count: number;
  active: boolean;
}

interface SanctionsStats {
  total_lists: number;
  total_sanctioned_vessels: number;
  vessels_by_list: Record<string, number>;
}

/**
 * Sanctions Checker Page
 * 
 * Check vessels against international sanctions lists with:
 * - Single vessel search
 * - Bulk checking
 * - Sanctions list management
 * - Results tracking
 */
const SanctionsCheckerPage: React.FC = () => {
  const [searchImo, setSearchImo] = useState('');
  const [bulkImos, setBulkImos] = useState('');
  const [results, setResults] = useState<SanctionCheckResult[]>([]);
  const [sanctionsList, setSanctionsList] = useState<SanctionsList[]>([]);
  const [stats, setStats] = useState<SanctionsStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'results' | 'lists'>('search');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingLists, setUpdatingLists] = useState(false);

  // Fetch sanctions stats on mount
  useEffect(() => {
    fetchStats();
    fetchLists();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await ApiService.getSanctionsStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching sanctions stats:', err);
    }
  };

  const fetchLists = async () => {
    try {
      setIsListLoading(true);
      const data = await ApiService.getSanctionsLists(true);
      setSanctionsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching sanctions lists:', err);
    } finally {
      setIsListLoading(false);
    }
  };

  // Single vessel search
  const handleSingleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchImo.trim()) {
      setError('Please enter an IMO number');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      const result = await ApiService.checkVesselSanctions(searchImo);
      setResults([result]);
      setActiveTab('results');
      setSuccess(`Checked vessel ${searchImo}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check vessel');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk check
  const handleBulkCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const imoList = bulkImos
      .split('\n')
      .map(imo => imo.trim())
      .filter(imo => imo.length > 0);

    if (imoList.length === 0) {
      setError('Please enter at least one IMO number');
      return;
    }

    try {
      setIsBulkLoading(true);
      setError(null);
      setSuccess(null);
      const response = await ApiService.bulkCheckVesselSanctions(imoList);
      const resultsList = Object.values(response.results || {}) as SanctionCheckResult[];
      setResults(resultsList);
      setActiveTab('results');
      const sanctionedCount = response.total_sanctioned || 0;
      setSuccess(`Checked ${response.total_checked} vessels. ${sanctionedCount} sanctioned.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check vessels');
      setResults([]);
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Update sanctions lists
  const handleUpdateLists = async () => {
    try {
      setUpdatingLists(true);
      setError(null);
      setSuccess(null);
      await ApiService.updateSanctionsLists();
      setSuccess('Sanctions lists updated successfully');
      fetchStats();
      fetchLists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lists');
    } finally {
      setUpdatingLists(false);
    }
  };

  const sanctionedCount = results.filter(r => r.is_sanctioned).length;
  const cleanCount = results.filter(r => !r.is_sanctioned).length;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sanctions Checker</h1>
        <p className="text-gray-600">Screen vessels against international sanctions lists</p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Active Lists</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_lists}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Sanctioned Vessels</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{stats.total_sanctioned_vessels}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Lists Coverage</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">{Object.keys(stats.vessels_by_list).length}</p>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('search')}
          className={`pb-3 px-1 font-medium transition ${
            activeTab === 'search'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Search className="inline mr-2" size={18} />
          Search Vessels
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`pb-3 px-1 font-medium transition ${
            activeTab === 'results'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Results ({results.length})
        </button>
        <button
          onClick={() => setActiveTab('lists')}
          className={`pb-3 px-1 font-medium transition ${
            activeTab === 'lists'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Sanctions Lists
        </button>
      </div>

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* Single Vessel Search */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Single Vessel Search</h2>
            <form onSubmit={handleSingleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IMO Number
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={searchImo}
                    onChange={(e) => setSearchImo(e.target.value)}
                    placeholder="e.g., 9652609"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                  >
                    {isLoading ? 'Checking...' : 'Check'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Bulk Vessel Search */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bulk Check</h2>
            <form onSubmit={handleBulkCheck} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IMO Numbers (one per line)
                </label>
                <textarea
                  value={bulkImos}
                  onChange={(e) => setBulkImos(e.target.value)}
                  placeholder="9652609&#10;9335746&#10;9246912"
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={isBulkLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
              >
                {isBulkLoading ? 'Checking...' : 'Check All'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div>
          {results.length > 0 && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-red-50 rounded-lg shadow p-6 border-l-4 border-red-600">
                <p className="text-gray-600 text-sm font-medium">Sanctioned Vessels</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{sanctionedCount}</p>
              </div>
              <div className="bg-green-50 rounded-lg shadow p-6 border-l-4 border-green-600">
                <p className="text-gray-600 text-sm font-medium">Clean Vessels</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{cleanCount}</p>
              </div>
            </div>
          )}

          {results.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
              No search results yet. Use the search tab to check vessels.
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">IMO</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Details</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Checked By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {results.map((result, idx) => (
                      <tr key={idx} className={result.is_sanctioned ? 'bg-red-50' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-3">
                          {result.is_sanctioned ? (
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="text-red-600" size={18} />
                              <span className="text-sm font-medium text-red-700">SANCTIONED</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="text-green-600" size={18} />
                              <span className="text-sm font-medium text-green-700">CLEAN</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-3 font-mono font-medium text-gray-900">
                          {result.imo}
                        </td>
                        <td className="px-6 py-3">
                          {result.is_sanctioned && result.details ? (
                            <div className="text-sm">
                              <p className="font-medium text-gray-900">
                                {result.details.vessel_name || 'Unknown'}
                              </p>
                              <p className="text-gray-600">
                                {result.details.list_name || 'Sanctions List'}
                              </p>
                              {result.details.reason && (
                                <p className="text-gray-600">
                                  Reason: {result.details.reason}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-600">Not on any sanctions list</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {result.checked_by || 'System'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lists Tab */}
      {activeTab === 'lists' && (
        <div className="space-y-6">
          {/* Update Button */}
          <div className="flex gap-3">
            <button
              onClick={handleUpdateLists}
              disabled={updatingLists}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              <RefreshCw size={18} />
              {updatingLists ? 'Updating...' : 'Update Lists'}
            </button>
          </div>

          {/* Lists Table */}
          {isListLoading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
              Loading sanctions lists...
            </div>
          ) : sanctionsList.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
              No sanctions lists available
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">List Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vessels</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sanctionsList.map(list => (
                      <tr key={list.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">{list.name}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {list.description || 'No description'}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-700 font-medium">
                            {list.vessel_count}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            list.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {list.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SanctionsCheckerPage;