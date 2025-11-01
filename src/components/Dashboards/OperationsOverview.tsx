import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import * as api from '../../api';

interface Operation {
  id: string;
  title: string;
  location: string;
  sts_operation_code: string;
  status: 'draft' | 'ready' | 'active' | 'completed';
  scheduled_start_date: string;
  participants_count: number;
  vessels_count: number;
  created_at: string;
}

type FilterStatus = 'all' | 'draft' | 'ready' | 'active' | 'completed';
type SortKey = 'created_at' | 'title' | 'status';

export const OperationsOverview: React.FC = () => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch operations
  const fetchOperations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listStsOperations(0, 100);
      setOperations(Array.isArray(data) ? data : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch operations';
      setError(message);
      console.error('Error fetching operations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load operations on mount
  useEffect(() => {
    fetchOperations();
  }, []);

  // Filter operations
  const filteredOperations = operations.filter((op) => {
    const matchesSearch =
      op.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.sts_operation_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || op.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Sort operations
  const sortedOperations = [...filteredOperations].sort((a, b) => {
    let aVal: any = a[sortKey];
    let bVal: any = b[sortKey];

    if (sortKey === 'created_at') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    const comparison = aVal > bVal ? 1 : -1;
    return sortAsc ? comparison : -comparison;
  });

  // Paginate
  const totalPages = Math.ceil(sortedOperations.length / pageSize);
  const paginatedOperations = sortedOperations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'ready':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedIds.size === paginatedOperations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedOperations.map((op) => op.id)));
    }
  };

  // Handle select one
  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Bulk action: start selected
  const handleBulkStart = async () => {
    try {
      for (const id of selectedIds) {
        await api.startOperation(id);
      }
      setSelectedIds(new Set());
      await fetchOperations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk action failed');
    }
  };

  // Bulk action: complete selected
  const handleBulkComplete = async () => {
    try {
      for (const id of selectedIds) {
        await api.completeOperation(id);
      }
      setSelectedIds(new Set());
      await fetchOperations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk action failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading operations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">STS Operations</h1>
        <div className="text-sm text-gray-600">
          {filteredOperations.length} operations
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <p className="font-semibold">⚠️ {error}</p>
        </div>
      )}

      {/* Filters & Search */}
      <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by title, code, or location..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as FilterStatus);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <div className="flex gap-2">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="created_at">Created Date</option>
                <option value="title">Title</option>
                <option value="status">Status</option>
              </select>
              <button
                onClick={() => setSortAsc(!sortAsc)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {sortAsc ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Page Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Items per Page
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
          <p className="text-blue-900 font-semibold">
            {selectedIds.size} operation{selectedIds.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleBulkStart}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Start Selected
            </button>
            <button
              onClick={handleBulkComplete}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Complete Selected
            </button>
          </div>
        </div>
      )}

      {/* Operations Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === paginatedOperations.length && paginatedOperations.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300"
                />
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Operation
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Code
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Location
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Participants
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Vessels
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Created
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedOperations.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  No operations found
                </td>
              </tr>
            ) : (
              paginatedOperations.map((op) => (
                <tr key={op.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(op.id)}
                      onChange={() => handleSelectOne(op.id)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <a href={`/operations/${op.id}`} className="text-blue-600 hover:underline font-medium">
                      {op.title}
                    </a>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm">{op.sts_operation_code}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(op.status)}`}>
                      {op.status.charAt(0).toUpperCase() + op.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{op.location}</td>
                  <td className="px-6 py-4 text-center font-semibold">{op.participants_count || 0}</td>
                  <td className="px-6 py-4 text-center font-semibold">{op.vessels_count || 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(op.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        className="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        View
                      </button>
                      {op.status === 'ready' && (
                        <button
                          onClick={() => api.startOperation(op.id).then(fetchOperations)}
                          className="px-2 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Start
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

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Page {currentPage} of {totalPages} ({filteredOperations.length} total)
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperationsOverview;