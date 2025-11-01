import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Users,
  MapPin,
  Calendar,
  Activity,
  Play,
  Square,
  X,
  RefreshCw,
  Download,
} from 'lucide-react';
import ApiService from '../../api';
import { useApp } from '../../contexts/AppContext';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';
import { Button } from '../Common/Button';
import { Card } from '../Common/Card';
import { Loading } from '../Common/Loading';
import { Alert } from '../Common/Alert';
import { BaseModal } from '../Common/BaseModal';

interface RoomStatus {
  room_id: string;
  status: string;
  status_detail: string;
  timeline_phase: string;
  total_documents: number;
  pending_documents: number;
  allowed_transitions: string[];
}

interface TimelineEvent {
  timestamp: string;
  type: string;
  description: string;
  actor: string;
}

interface TimelineData {
  room_id: string;
  current_status: string;
  current_phase: string;
  timeline_events: TimelineEvent[];
  created_at: string;
  updated_at: string;
}

interface RoomData {
  id: string;
  title: string;
  location: string;
  sts_eta: string;
  description?: string;
  status: string;
  status_detail?: string;
  timeline_phase?: string;
  created_at: string;
  updated_at?: string;
}

export const RoomDetailPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, hasPermission, setCurrentRoomId } = useApp();

  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [roomStatus, setRoomStatus] = useState<RoomStatus | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Set current room for WebSocket connection
  useEffect(() => {
    if (roomId && setCurrentRoomId) {
      setCurrentRoomId(roomId);
    }
  }, [roomId, setCurrentRoomId]);

  // Listen for real-time updates
  useRealtimeUpdates({
    onDocumentUpdate: (data) => {
      if (data.room_id === roomId) {
        loadRoomData();
      }
    },
    onApprovalUpdate: (data) => {
      if (data.room_id === roomId) {
        loadRoomData();
      }
    },
    onRoomStatusUpdate: (data) => {
      if (data.room_id === roomId) {
        loadRoomData();
      }
    },
  });

  // Modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState<string>('');
  const [statusReason, setStatusReason] = useState<string>('');

  // Load room data
  useEffect(() => {
    if (!roomId) return;
    loadRoomData();
  }, [roomId]);

  const loadRoomData = async () => {
    if (!roomId) return;

    try {
      setLoading(true);
      setError(null);

      // Load in parallel
      const [room, status, timelineData, docs] = await Promise.all([
        ApiService.getRoom(roomId),
        ApiService.getRoomStatus(roomId),
        ApiService.getRoomTimeline(roomId),
        ApiService.getDocuments(roomId).catch(() => []),
      ]);

      setRoomData(room);
      setRoomStatus(status);
      setTimeline(timelineData);
      setDocuments(docs || []);
    } catch (err: any) {
      console.error('Error loading room data:', err);
      setError(err.message || 'Failed to load room details');
    } finally {
      setLoading(false);
    }
  };

  // Handle status transitions
  const handleStart = async () => {
    if (!roomId) return;
    await executeTransition('start', 'Operation started');
  };

  const handleComplete = async () => {
    if (!roomId) return;
    await executeTransition('complete', 'Operation completed');
  };

  const handleCancel = async () => {
    if (!roomId) return;
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;
    await executeTransition('cancel', reason);
  };

  const handleStatusTransition = async () => {
    if (!roomId || !selectedNewStatus) return;
    await executeTransition('transition', selectedNewStatus, statusReason);
    setShowStatusModal(false);
    setSelectedNewStatus('');
    setStatusReason('');
  };

  const executeTransition = async (
    action: 'start' | 'complete' | 'cancel' | 'transition',
    statusOrReason: string,
    reason?: string
  ) => {
    if (!roomId) return;

    try {
      setActionLoading(action);

      switch (action) {
        case 'start':
          await ApiService.startRoom(roomId);
          break;
        case 'complete':
          await ApiService.completeRoom(roomId);
          break;
        case 'cancel':
          await ApiService.cancelRoom(roomId, statusOrReason);
          break;
        case 'transition':
          await ApiService.transitionRoomStatus(roomId, statusOrReason, reason);
          break;
      }

      // Reload data
      await loadRoomData();

      // Show success notification
      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: {
            type: 'success',
            message: `Operation ${action}ed successfully`,
          },
        })
      );
    } catch (err: any) {
      console.error(`Error ${action}ing room:`, err);
      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: {
            type: 'error',
            message: err.message || `Failed to ${action} operation`,
          },
        })
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      ready: { label: 'Ready', color: 'bg-blue-100 text-blue-800' },
      active: { label: 'Active', color: 'bg-green-100 text-green-800' },
      completed: { label: 'Completed', color: 'bg-gray-100 text-gray-800' },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
      on_hold: { label: 'On Hold', color: 'bg-orange-100 text-orange-800' },
    };

    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  // Get phase badge styling
  const getPhaseBadge = (phase?: string) => {
    if (!phase) return null;

    const phaseMap: Record<string, { label: string; color: string }> = {
      pre_docs: { label: 'Pre-Documents', color: 'bg-purple-100 text-purple-800' },
      docs_pending: { label: 'Documents Pending', color: 'bg-yellow-100 text-yellow-800' },
      ready: { label: 'Ready', color: 'bg-blue-100 text-blue-800' },
      active: { label: 'Active', color: 'bg-green-100 text-green-800' },
      completed: { label: 'Completed', color: 'bg-gray-100 text-gray-800' },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
    };

    const phaseInfo = phaseMap[phase] || { label: phase, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${phaseInfo.color}`}>
        {phaseInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-white to-primary-50/30 p-6">
        <Loading message="Loading room details..." />
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-white to-primary-50/30 p-6">
        <Alert type="error" title="Error" message={error || 'Room not found'} />
        <Button onClick={() => navigate('/dashboard')} variant="secondary" className="mt-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const currentStatus = roomStatus?.status || roomData.status;
  const allowedTransitions = roomStatus?.allowed_transitions || [];
  const canStart = allowedTransitions.includes('active') && currentStatus === 'ready';
  const canComplete = allowedTransitions.includes('completed') && currentStatus === 'active';
  const canCancel = allowedTransitions.includes('cancelled');

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-white to-primary-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="ghost"
            size="sm"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-secondary-900 mb-2">{roomData.title}</h1>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-secondary-600">
                  <MapPin className="w-4 h-4" />
                  <span>{roomData.location}</span>
                </div>
                <div className="flex items-center gap-2 text-secondary-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    ETA: {new Date(roomData.sts_eta).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {getStatusBadge(currentStatus)}
              {getPhaseBadge(roomStatus?.timeline_phase)}
              <Button
                onClick={loadRoomData}
                variant="ghost"
                size="sm"
                isLoading={loading}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {hasPermission('rooms', 'update') && (
          <div className="flex gap-3 mb-6 flex-wrap">
            {canStart && (
              <Button
                onClick={handleStart}
                variant="primary"
                isLoading={actionLoading === 'start'}
                icon={<Play className="w-4 h-4" />}
              >
                Start Operation
              </Button>
            )}
            {canComplete && (
              <Button
                onClick={handleComplete}
                variant="primary"
                isLoading={actionLoading === 'complete'}
                icon={<CheckCircle className="w-4 h-4" />}
              >
                Complete Operation
              </Button>
            )}
            {canCancel && (
              <Button
                onClick={handleCancel}
                variant="danger"
                isLoading={actionLoading === 'cancel'}
                icon={<XCircle className="w-4 h-4" />}
              >
                Cancel Operation
              </Button>
            )}
            {allowedTransitions.length > 0 && (
              <Button
                onClick={() => setShowStatusModal(true)}
                variant="secondary"
                icon={<Activity className="w-4 h-4" />}
              >
                Change Status
              </Button>
            )}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timeline */}
            <Card padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-secondary-900 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Timeline
                </h2>
              </div>

              {timeline?.timeline_events && timeline.timeline_events.length > 0 ? (
                <div className="space-y-4">
                  {timeline.timeline_events.map((event, index) => (
                    <div key={index} className="flex gap-4 relative">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-primary-600" />
                        </div>
                        {index < timeline.timeline_events.length - 1 && (
                          <div className="w-0.5 h-full bg-secondary-200 ml-5 -mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-secondary-900">{event.type}</span>
                          <span className="text-sm text-secondary-500">
                            {event.timestamp
                              ? new Date(event.timestamp).toLocaleString()
                              : 'Unknown time'}
                          </span>
                        </div>
                        <p className="text-secondary-700 mb-1">{event.description}</p>
                        <p className="text-sm text-secondary-500">by {event.actor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-secondary-500 text-center py-8">No timeline events yet</p>
              )}
            </Card>

            {/* Documents Summary */}
            <Card padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-secondary-900 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documents
                </h2>
                <Button
                  onClick={() => navigate(`/documents?room=${roomId}`)}
                  variant="ghost"
                  size="sm"
                >
                  View All
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-4 bg-secondary-50 rounded-lg">
                  <div className="text-2xl font-bold text-secondary-900">
                    {roomStatus?.total_documents || 0}
                  </div>
                  <div className="text-sm text-secondary-600">Total</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-900">
                    {roomStatus?.pending_documents || 0}
                  </div>
                  <div className="text-sm text-yellow-700">Pending</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">
                    {(roomStatus?.total_documents || 0) - (roomStatus?.pending_documents || 0)}
                  </div>
                  <div className="text-sm text-green-700">Approved</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-900">
                    {documents.filter((d) => d.status === 'rejected').length}
                  </div>
                  <div className="text-sm text-red-700">Rejected</div>
                </div>
              </div>

              {/* Critical Documents */}
              {documents.filter((d) => d.critical_path || d.priority === 'urgent').length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-secondary-900 mb-2">Critical Documents</h3>
                  <div className="space-y-2">
                    {documents
                      .filter((d) => d.critical_path || d.priority === 'urgent')
                      .slice(0, 3)
                      .map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                        >
                          <div>
                            <span className="font-medium text-secondary-900">{doc.type_name}</span>
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                              doc.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : doc.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {doc.status}
                            </span>
                          </div>
                          <Button
                            onClick={() => navigate(`/documents?room=${roomId}&doc=${doc.id}`)}
                            variant="ghost"
                            size="sm"
                          >
                            View
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column - Info */}
          <div className="space-y-6">
            {/* Status Info */}
            <Card padding="lg">
              <h2 className="text-xl font-bold text-secondary-900 mb-4">Status Information</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-secondary-600">Current Status</span>
                  <div className="mt-1">{getStatusBadge(currentStatus)}</div>
                </div>
                <div>
                  <span className="text-sm text-secondary-600">Timeline Phase</span>
                  <div className="mt-1">
                    {getPhaseBadge(roomStatus?.timeline_phase) || (
                      <span className="text-secondary-500">Not set</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-secondary-600">Created</span>
                  <div className="mt-1 text-secondary-900">
                    {roomData.created_at
                      ? new Date(roomData.created_at).toLocaleString()
                      : 'Unknown'}
                  </div>
                </div>
                {roomData.updated_at && (
                  <div>
                    <span className="text-sm text-secondary-600">Last Updated</span>
                    <div className="mt-1 text-secondary-900">
                      {new Date(roomData.updated_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Allowed Transitions */}
            {allowedTransitions.length > 0 && (
              <Card padding="lg">
                <h2 className="text-xl font-bold text-secondary-900 mb-4">Available Actions</h2>
                <div className="space-y-2">
                  {allowedTransitions.map((transition) => (
                    <Button
                      key={transition}
                      onClick={() => {
                        setSelectedNewStatus(transition);
                        setShowStatusModal(true);
                      }}
                      variant="secondary"
                      fullWidth
                      size="sm"
                    >
                      Transition to {transition}
                    </Button>
                  ))}
                </div>
              </Card>
            )}

            {/* Quick Stats */}
            <Card padding="lg">
              <h2 className="text-xl font-bold text-secondary-900 mb-4">Quick Stats</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-secondary-600">Documents</span>
                  <span className="font-semibold text-secondary-900">
                    {roomStatus?.total_documents || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-600">Pending</span>
                  <span className="font-semibold text-yellow-700">
                    {roomStatus?.pending_documents || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-600">Completion</span>
                  <span className="font-semibold text-secondary-900">
                    {roomStatus?.total_documents
                      ? Math.round(
                          ((roomStatus.total_documents - (roomStatus.pending_documents || 0)) /
                            roomStatus.total_documents) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Status Transition Modal */}
      <BaseModal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setSelectedNewStatus('');
          setStatusReason('');
        }}
        title="Change Room Status"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              New Status
            </label>
            <select
              value={selectedNewStatus}
              onChange={(e) => setSelectedNewStatus(e.target.value)}
              className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select status...</option>
              {allowedTransitions.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Reason (Optional)
            </label>
            <textarea
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              placeholder="Enter reason for status change..."
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              onClick={() => {
                setShowStatusModal(false);
                setSelectedNewStatus('');
                setStatusReason('');
              }}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusTransition}
              variant="primary"
              disabled={!selectedNewStatus}
              isLoading={actionLoading === 'transition'}
            >
              Change Status
            </Button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

export default RoomDetailPage;

