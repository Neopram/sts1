import React, { useState, useEffect } from 'react';
import {
  History,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Eye,
  AlertTriangle,
  Search,
  Calendar,
  FileText,
  X
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import ApiService from '../../api';

interface Snapshot {
  id: string;
  title?: string;
  timestamp: string;
  status: string;
  download_url: string;
  file_size: number;
  type: string;
}

interface HistoryEntry {
  id: string;
  title?: string;
  description?: string;
  timestamp: string;
  type: string;
  status: string;
  user?: string;
  details?: any;
}

export const HistoryPage: React.FC = () => {
  const { currentRoomId } = useApp();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  // Load snapshots from API
  const loadSnapshots = async () => {
    if (!currentRoomId) return;

    try {
      setLoading(true);
      setError(null);

      const apiSnapshots = await ApiService.getSnapshots(currentRoomId);
      setSnapshots(apiSnapshots);
    } catch (err) {
      console.error('Error loading snapshots:', err);
      setError('Failed to load snapshots. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate new snapshot
  const generateNewSnapshot = async () => {
    if (!currentRoomId) return;

    try {
      setLoading(true);
      setError(null);

      await ApiService.generateSnapshot(currentRoomId);

      // Refresh snapshots list
      await loadSnapshots();

      // Show success message
      setError(null);

      // Show success notification
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          type: 'success',
          message: 'Snapshot generated successfully'
        }
      }));
    } catch (err) {
      console.error('Error generating snapshot:', err);
      setError('Failed to generate snapshot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Download snapshot
  const downloadSnapshot = async (snapshot: Snapshot) => {
    if (!currentRoomId) return;

    try {
      setLoading(true);
      setError(null);

      const blob = await ApiService.generatePDF(currentRoomId);
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${(snapshot.title || 'snapshot').replace(/\s+/g, '-').toLowerCase()}.pdf`;
      a.click();

      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Error downloading snapshot:', err);
      setError('Failed to download snapshot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // View snapshot details
  const handleViewSnapshot = (snapshot: Snapshot) => {
    setSelectedSnapshot(snapshot);
    setShowSnapshotModal(true);
  };

  // Load history data from API
  const loadHistory = async () => {
    if (!currentRoomId) return;

    try {
      setLoading(true);
      setError(null);

      const apiHistory = await ApiService.getHistory(currentRoomId);
      setHistory(apiHistory);
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Failed to load history data. Please try again.');
      // Set empty array on error instead of mock data
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (currentRoomId) {
      loadSnapshots();
      loadHistory();
    }
  }, [currentRoomId]);

  // Filter snapshots
  const filteredSnapshots = snapshots.filter(snapshot => {
    const matchesSearch = ((snapshot.title || '').toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || snapshot.status === filterStatus;
    const matchesType = filterType === 'all' || snapshot.type === filterType;

    let matchesDate = true;
    if (dateRange.start && dateRange.end) {
      const snapshotDate = new Date(snapshot.timestamp);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      matchesDate = snapshotDate >= startDate && snapshotDate <= endDate;
    }

    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });

  // Filter history
  const filteredHistory = history.filter(entry => {
    const matchesSearch = (((entry.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (entry.description || '').toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesType = filterType === 'all' || entry.type === filterType;
    const matchesStatus = filterStatus === 'all' || entry.status === filterStatus;

    let matchesDate = true;
    if (dateRange.start && dateRange.end) {
      const entryDate = new Date(entry.timestamp);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      matchesDate = entryDate >= startDate && entryDate <= endDate;
    }

    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success-500" />;
      case 'error':
      case 'failed':
        return <XCircle className="w-4 h-4 text-danger-500" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning-500" />;
      default:
        return <Clock className="w-4 h-4 text-secondary-500" />;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return 'bg-green-100 text-success-800 border-success-200';
      case 'error':
      case 'failed':
        return 'bg-red-100 text-danger-800 border-danger-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'warning':
        return 'bg-yellow-100 text-warning-800 border-warning-200';
      default:
        return 'bg-secondary-100 text-secondary-800 border-secondary-200';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading && snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-secondary-600">Loading history data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
      {/* Error Display */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-danger-500 mr-2" />
            <span className="text-danger-800 font-medium">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-danger-400 hover:text-danger-600 transition-colors duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-secondary-900 flex items-center">
          <History className="w-6 h-6 mr-3" />
          History & Snapshots
        </h1>

        <div className="flex gap-6">
          <button
            onClick={generateNewSnapshot}
            disabled={loading}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Snapshot'}
          </button>
          <button
            onClick={loadSnapshots}
            disabled={loading}
            className="btn-secondary disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 px-4 py-6 bg-secondary-50 rounded-xl border border-secondary-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="upload">Upload</option>
            <option value="approval">Approval</option>
            <option value="status_change">Status Change</option>
            <option value="snapshot">Snapshot</option>
            <option value="reminder">Reminder</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="processing">Processing</option>
          </select>

          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-4 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Start Date"
          />

          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-4 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="End Date"
          />
      </div>

      {/* Snapshots Section */}
      <div className="bg-white rounded-xl shadow-card border border-secondary-200">
        <div className="px-6 py-4 border-b border-secondary-200">
          <h3 className="text-lg font-medium text-secondary-900 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Snapshots ({filteredSnapshots.length})
          </h3>
          <p className="text-sm text-secondary-600 mt-1">
            Generated snapshots of room status and documents
          </p>
        </div>

        <div className="p-6">
          {filteredSnapshots.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-secondary-400 mx-auto mb-6" />
              <h3 className="text-lg font-medium text-secondary-900 mb-2">No snapshots found</h3>
              <p className="text-secondary-600">Generate a snapshot to see it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSnapshots.map((snapshot) => (
                <div key={snapshot.id} className="border border-secondary-200 rounded-xl p-4 hover:shadow-md transition-shadow duration-200">
                  {/* Row 1: Title & File Size */}
                  <div className="mb-3">
                    <h4 className="font-bold text-secondary-900">{snapshot.title || 'Untitled Snapshot'}</h4>
                    <p className="text-sm text-secondary-600 mt-1 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {formatFileSize(snapshot.file_size)}
                    </p>
                  </div>

                  {/* Row 2: Status & Time Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border flex-shrink-0 ${getStatusColor(snapshot.status)}`}>
                      {getStatusIcon(snapshot.status)}
                      {snapshot.status}
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border border-secondary-200 bg-secondary-50 text-secondary-700 flex-shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatTimestamp(snapshot.timestamp)}
                    </span>
                  </div>

                  {/* Row 3: Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewSnapshot(snapshot)}
                      className="flex-1 px-3 py-2 text-sm border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors duration-200 flex items-center justify-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => downloadSnapshot(snapshot)}
                      className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* History Section */}
      <div className="bg-white rounded-xl shadow-card border border-secondary-200">
        <div className="px-6 py-4 border-b border-secondary-200">
          <h3 className="text-lg font-medium text-secondary-900 flex items-center">
            <History className="w-5 h-5 mr-2" />
            Activity History ({filteredHistory.length})
          </h3>
          <p className="text-sm text-secondary-600 mt-1">
            Recent activities and changes in the room
          </p>
        </div>

        <div className="p-6">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-secondary-300 rounded-xl bg-secondary-50">
              <History className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary-900 mb-2">No history found</h3>
              <p className="text-secondary-600">No activities match your current filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((entry) => (
                <div key={entry.id} className="border border-secondary-200 rounded-xl p-4 hover:shadow-md transition-shadow duration-200">
                  {/* Row 1: Title & Description */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(entry.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-secondary-900">{entry.title || 'Untitled Activity'}</h4>
                      <p className="text-sm text-secondary-600 mt-1">{entry.description || 'No description available'}</p>
                      {entry.user && (
                        <p className="text-xs text-secondary-500 mt-1">By: {entry.user}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Status & Type & Time Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border flex-shrink-0 ${getStatusColor(entry.status)}`}>
                      {getStatusIcon(entry.status)}
                      {entry.status}
                    </span>

                    {/* Type Badge */}
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border border-secondary-200 bg-secondary-50 text-secondary-700 flex-shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                      {entry.type || 'Activity'}
                    </span>

                    {/* Time Badge */}
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border border-secondary-200 bg-secondary-50 text-secondary-700 flex-shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>

                  {/* Row 3: Actions */}
                  {entry.details && (
                    <div className="flex items-center gap-2 justify-end">
                      <button className="p-1.5 text-secondary-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-secondary-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Snapshot Details Modal */}
      {showSnapshotModal && selectedSnapshot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[50]">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-secondary-900 mb-6">Snapshot Details</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Title
                </label>
                <p className="text-secondary-900">{selectedSnapshot.title || 'Untitled Snapshot'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Status
                </label>
                <span className={`px-2 py-1 text-sm font-medium rounded-full border ${getStatusColor(selectedSnapshot.status)}`}>
                  {getStatusIcon(selectedSnapshot.status)}
                  {selectedSnapshot.status}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Generated
                </label>
                <p className="text-secondary-900">{formatTimestamp(selectedSnapshot.timestamp)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  File Size
                </label>
                <p className="text-secondary-900">{formatFileSize(selectedSnapshot.file_size)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Type
                </label>
                <p className="text-secondary-900">{selectedSnapshot.type}</p>
              </div>
            </div>

            <div className="flex gap-6 mt-6">
              <button
                onClick={() => setShowSnapshotModal(false)}
                className="flex-1 px-4 py-2 border border-secondary-300 rounded-xl text-secondary-700 hover:bg-secondary-50 transition-colors duration-200"
              >
                Close
              </button>

              <button
                onClick={() => downloadSnapshot(selectedSnapshot)}
                className="flex-1 btn-primary"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Download Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
