import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  RefreshCw,
  Search,
  Download,
  Eye,
  X
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Activity as ActivityType } from '../../types/api';
import ApiService from '../../api';

interface ActivityPageProps {
  activities?: ActivityType[];
}

export const ActivityPage: React.FC<ActivityPageProps> = ({ 
  activities: propActivities 
}) => {
  const { currentRoomId } = useApp();
  const [activities, setActivities] = useState<ActivityType[]>(propActivities || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Load activities from API
  const loadActivities = async () => {
    if (!currentRoomId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const apiActivities = await ApiService.getActivities(currentRoomId, 100);
      setActivities(apiActivities);
    } catch (err) {
      console.error('Error loading activities:', err);
      setError('Failed to load activities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle activity action
  const handleActivityAction = async (activity: ActivityType, action: string) => {
    try {
      setLoading(true);
      setError(null);
      
      if (action === 'view') {
        setSelectedActivity(activity);
        setShowActivityModal(true);
      } else if (action === 'download') {
        // Generate and download activity report
        if (!currentRoomId) return;
        
        try {
          const blob = await ApiService.generatePDF(currentRoomId);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `activity-report-${activity.id}.pdf`;
          a.click();
          setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        } catch (err) {
          console.error('Error downloading activity report:', err);
          setError('Failed to download activity report. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error handling activity action:', err);
      setError('Failed to process activity action. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Export activities to CSV
  const handleExportCSV = () => {
    try {
      const csvContent = [
        ['Timestamp', 'Type', 'Title', 'Description', 'User', 'Status'],
        ...filteredActivities.map(activity => [
          new Date(activity.timestamp).toLocaleString(),
          activity.type,
          activity.title,
          activity.description,
          activity.user || 'System',
          activity.status || 'N/A'
        ])
      ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sts-activities-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setError('Failed to export activities. Please try again.');
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadActivities();
  }, [currentRoomId]);

  // Update local state when props change
  useEffect(() => {
    if (propActivities) {
      setActivities(propActivities);
    }
  }, [propActivities]);

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = (activity.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (activity.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (activity.user && activity.user.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || activity.type === filterType;
    const matchesStatus = filterStatus === 'all' || activity.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterStatus('all');
  };

  // Get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return <CheckCircle className="w-5 h-5 text-success-500" />;
      case 'upload':
        return <Download className="w-5 h-5 text-blue-500" />;
      case 'status_change':
        return <Activity className="w-5 h-5 text-purple-500" />;
      case 'system':
        return <Info className="w-5 h-5 text-secondary-500" />;
      case 'reminder':
        return <Clock className="w-5 h-5 text-warning-500" />;
      default:
        return <Activity className="w-5 h-5 text-secondary-500" />;
    }
  };

  // Get status icon
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-danger-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-secondary-500" />;
    }
  };

  // Get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-success-800 border-success-200';
      case 'warning':
        return 'bg-yellow-100 text-warning-800 border-warning-200';
      case 'error':
        return 'bg-red-100 text-danger-800 border-danger-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-secondary-100 text-secondary-800 border-secondary-200';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-secondary-600">Loading activities...</p>
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
          <Activity className="w-6 h-6 mr-3" />
          Activity Log
        </h1>
        
        <div className="flex gap-6">
          <button
            onClick={handleExportCSV}
            className="btn-success flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          
          <button
            onClick={loadActivities}
            disabled={loading}
            className="btn-secondary flex items-center disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search activities..."
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
            <option value="approval">Approval</option>
            <option value="upload">Upload</option>
            <option value="status_change">Status Change</option>
            <option value="system">System</option>
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
            <option value="info">Info</option>
          </select>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-secondary-600">
              {filteredActivities.length} of {activities.length} activities
            </div>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Activities List */}
      <div className="card">
        <div className="px-6 py-4 border-b border-secondary-200">
          <h3 className="text-lg font-medium text-secondary-900">Recent Activities</h3>
        </div>
        
        <div className="divide-y divide-secondary-200">
          {filteredActivities.length === 0 ? (
            <div className="p-6 text-center">
              <Activity className="w-12 h-12 text-secondary-400 mx-auto mb-6" />
              <h3 className="text-lg font-medium text-secondary-900 mb-2">No activities found</h3>
              <p className="text-secondary-600">No activities match your current filters.</p>
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <div key={activity.id} className="p-6 hover:bg-secondary-50 transition-colors duration-200">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-6 mb-2">
                      <h4 className="font-medium text-secondary-900">{activity.title}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(activity.status)}`}>
                        {getStatusIcon(activity.status)}
                        {activity.status || 'info'}
                      </span>
                      <span className="text-sm text-secondary-500">{formatTimestamp(activity.timestamp)}</span>
                    </div>
                    
                    <p className="text-secondary-600 mb-2">{activity.description}</p>
                    
                    {activity.user && (
                      <p className="text-sm text-secondary-500">
                        By: <span className="font-medium">{activity.user}</span>
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleActivityAction(activity, 'view')}
                      className="p-2 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleActivityAction(activity, 'download')}
                      className="p-2 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Activity Details Modal */}
      {showActivityModal && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[50]">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-secondary-900 mb-6">Activity Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Title
                </label>
                <p className="text-secondary-900">{selectedActivity.title}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Type
                </label>
                <div className="flex items-center gap-2">
                  {getActivityIcon(selectedActivity.type)}
                  <span className="capitalize">{selectedActivity.type.replace('_', ' ')}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Status
                </label>
                <span className={`px-2 py-1 text-sm font-medium rounded-full border ${getStatusColor(selectedActivity.status)}`}>
                  {getStatusIcon(selectedActivity.status)}
                  {selectedActivity.status || 'info'}
                </span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Description
                </label>
                <p className="text-secondary-900 bg-secondary-50 p-3 rounded-xl">{selectedActivity.description}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Timestamp
                </label>
                <p className="text-secondary-900">{new Date(selectedActivity.timestamp).toLocaleString()}</p>
              </div>
              
              {selectedActivity.user && (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    User
                  </label>
                  <p className="text-secondary-900">{selectedActivity.user}</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-6 mt-6">
              <button
                onClick={() => setShowActivityModal(false)}
                className="flex-1 px-4 py-2 border border-secondary-300 rounded-xl text-secondary-700 hover:bg-secondary-50 transition-colors duration-200"
              >
                Close
              </button>
              
              <button
                onClick={() => handleActivityAction(selectedActivity, 'download')}
                className="flex-1 btn-primary"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Download Data
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
