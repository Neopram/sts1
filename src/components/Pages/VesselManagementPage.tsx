import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Ship,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  MapPin,
  Calendar,
  X,
  Check,
  AlertTriangle,
  FileText,
  Flag,
  Building,
} from 'lucide-react';
import ApiService from '../../api';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../Common/Button';
import { Card } from '../Common/Card';
import { Loading } from '../Common/Loading';
import { Alert } from '../Common/Alert';
import { BaseModal } from '../Common/BaseModal';

interface Vessel {
  id: string;
  name: string;
  vessel_type: string;
  flag: string;
  imo: string;
  status: string;
  length?: number;
  beam?: number;
  draft?: number;
  gross_tonnage?: number;
  net_tonnage?: number;
  built_year?: number;
  classification_society?: string;
  room_id?: string;
  room_title?: string;
}

const VESSEL_TYPES = [
  'Tanker',
  'Bulk Carrier',
  'Container Ship',
  'General Cargo',
  'LNG Carrier',
  'LPG Carrier',
  'Chemical Tanker',
  'Product Tanker',
  'Crude Oil Tanker',
  'Other',
];

export const VesselManagementPage: React.FC = () => {
  const { user, hasPermission, rooms, currentRoomId, setCurrentRoomId } = useApp();
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(currentRoomId || '');

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    vessel_type: 'Tanker',
    flag: '',
    imo: '',
    length: '',
    beam: '',
    draft: '',
    gross_tonnage: '',
    net_tonnage: '',
    built_year: '',
    classification_society: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    vessel_type: '',
    flag: '',
    imo: '',
    status: 'active',
    length: '',
    beam: '',
    draft: '',
    gross_tonnage: '',
    net_tonnage: '',
    built_year: '',
    classification_society: '',
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Check permissions
  useEffect(() => {
    if (!hasPermission('vessels', 'read') && user?.role !== 'owner' && user?.role !== 'admin') {
      setError('You do not have permission to access vessel management');
      setLoading(false);
    }
  }, [hasPermission, user]);

  // Load vessels
  useEffect(() => {
    if ((hasPermission('vessels', 'read') || user?.role === 'owner' || user?.role === 'admin') && selectedRoomId) {
      loadVessels();
    }
  }, [selectedRoomId, hasPermission, user]);

  const loadVessels = async () => {
    if (!selectedRoomId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await ApiService.getVessels(selectedRoomId);
      const vesselsList = Array.isArray(response) ? response : response.vessels || response.data || [];
      
      // Add room information if available
      const vesselsWithRoom = vesselsList.map((v: any) => ({
        ...v,
        room_id: selectedRoomId,
        room_title: rooms.find((r) => r.id === selectedRoomId)?.title || 'Unknown Room',
      }));
      
      setVessels(vesselsWithRoom);
    } catch (err: any) {
      console.error('Error loading vessels:', err);
      setError(err.message || 'Failed to load vessels');
    } finally {
      setLoading(false);
    }
  };

  // Memoized filtered vessels
  const filteredVessels = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return vessels.filter((v) => {
      const matchesSearch =
        v.name.toLowerCase().includes(searchLower) ||
        v.imo.toLowerCase().includes(searchLower) ||
        (v.flag && v.flag.toLowerCase().includes(searchLower));
      const matchesType = typeFilter === 'all' || v.vessel_type === typeFilter;
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [vessels, searchTerm, typeFilter, statusFilter]);

  // Create vessel
  const handleCreateVessel = async () => {
    if (!selectedRoomId) {
      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: { type: 'error', message: 'Please select a room first' },
        })
      );
      return;
    }

    if (!createForm.name || !createForm.vessel_type || !createForm.flag || !createForm.imo) {
      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: { type: 'error', message: 'Please fill in all required fields' },
        })
      );
      return;
    }

    // Validate IMO (should be 7 digits)
    if (!/^\d{7}$/.test(createForm.imo)) {
      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: { type: 'error', message: 'IMO must be 7 digits' },
        })
      );
      return;
    }

    try {
      setActionLoading(true);
      await ApiService.createVessel(selectedRoomId, {
        name: createForm.name.trim(),
        vessel_type: createForm.vessel_type,
        flag: createForm.flag.trim(),
        imo: createForm.imo.trim(),
        length: createForm.length ? parseFloat(createForm.length) : undefined,
        beam: createForm.beam ? parseFloat(createForm.beam) : undefined,
        draft: createForm.draft ? parseFloat(createForm.draft) : undefined,
        gross_tonnage: createForm.gross_tonnage ? parseInt(createForm.gross_tonnage) : undefined,
        net_tonnage: createForm.net_tonnage ? parseInt(createForm.net_tonnage) : undefined,
        built_year: createForm.built_year ? parseInt(createForm.built_year) : undefined,
        classification_society: createForm.classification_society.trim() || undefined,
      });

      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: { type: 'success', message: 'Vessel created successfully' },
        })
      );

      setShowCreateModal(false);
      setCreateForm({
        name: '',
        vessel_type: 'Tanker',
        flag: '',
        imo: '',
        length: '',
        beam: '',
        draft: '',
        gross_tonnage: '',
        net_tonnage: '',
        built_year: '',
        classification_society: '',
      });
      await loadVessels();
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: { type: 'error', message: err.message || 'Failed to create vessel' },
        })
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Edit vessel
  const handleEditVessel = async () => {
    if (!selectedVessel || !selectedVessel.room_id) return;

    try {
      setActionLoading(true);
      await ApiService.updateVessel(selectedVessel.room_id, selectedVessel.id, {
        name: editForm.name.trim(),
        vessel_type: editForm.vessel_type,
        flag: editForm.flag.trim(),
        imo: editForm.imo.trim(),
        status: editForm.status,
        length: editForm.length ? parseFloat(editForm.length) : undefined,
        beam: editForm.beam ? parseFloat(editForm.beam) : undefined,
        draft: editForm.draft ? parseFloat(editForm.draft) : undefined,
        gross_tonnage: editForm.gross_tonnage ? parseInt(editForm.gross_tonnage) : undefined,
        net_tonnage: editForm.net_tonnage ? parseInt(editForm.net_tonnage) : undefined,
        built_year: editForm.built_year ? parseInt(editForm.built_year) : undefined,
        classification_society: editForm.classification_society.trim() || undefined,
      });

      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: { type: 'success', message: 'Vessel updated successfully' },
        })
      );

      setShowEditModal(false);
      setSelectedVessel(null);
      await loadVessels();
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: { type: 'error', message: err.message || 'Failed to update vessel' },
        })
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Delete vessel
  const handleDeleteVessel = async () => {
    if (!selectedVessel || !selectedVessel.room_id) return;

    try {
      setActionLoading(true);
      await ApiService.deleteVessel(selectedVessel.room_id, selectedVessel.id);

      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: { type: 'success', message: 'Vessel deleted successfully' },
        })
      );

      setShowDeleteModal(false);
      setSelectedVessel(null);
      await loadVessels();
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('app:notification', {
          detail: { type: 'error', message: err.message || 'Failed to delete vessel' },
        })
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (vessel: Vessel) => {
    setSelectedVessel(vessel);
    setEditForm({
      name: vessel.name,
      vessel_type: vessel.vessel_type,
      flag: vessel.flag,
      imo: vessel.imo,
      status: vessel.status,
      length: vessel.length?.toString() || '',
      beam: vessel.beam?.toString() || '',
      draft: vessel.draft?.toString() || '',
      gross_tonnage: vessel.gross_tonnage?.toString() || '',
      net_tonnage: vessel.net_tonnage?.toString() || '',
      built_year: vessel.built_year?.toString() || '',
      classification_society: vessel.classification_society || '',
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (vessel: Vessel) => {
    setSelectedVessel(vessel);
    setShowDeleteModal(true);
  };

  // Open details modal
  const openDetailsModal = (vessel: Vessel) => {
    setSelectedVessel(vessel);
    setShowDetailsModal(true);
  };

  // Memoized status badge color getter
  const getStatusBadgeColor = useCallback((status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      retired: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }, []);

  if (!hasPermission('vessels', 'read') && user?.role !== 'owner' && user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-white to-primary-50/30 p-6">
        <Alert
          type="error"
          title="Access Denied"
          message="You do not have permission to access vessel management"
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
                <Ship className="w-8 h-8" />
                Vessel Management
              </h1>
              <p className="text-secondary-600">Manage your fleet of vessels</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={loadVessels} variant="ghost" size="sm" isLoading={loading}>
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              {hasPermission('vessels', 'create') && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  variant="primary"
                  icon={<Plus className="w-4 h-4" />}
                  disabled={!selectedRoomId}
                >
                  Create Vessel
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Room Selector */}
        <Card padding="md" className="mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-secondary-700">Select Operation:</label>
            <select
              value={selectedRoomId}
              onChange={(e) => {
                setSelectedRoomId(e.target.value);
                if (setCurrentRoomId) setCurrentRoomId(e.target.value);
              }}
              className="flex-1 max-w-md px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select an operation...</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.title} - {room.location}
                </option>
              ))}
            </select>
            {!selectedRoomId && (
              <Alert
                type="info"
                title="Select Operation"
                message="Please select an operation to view and manage vessels"
                className="flex-1"
              />
            )}
          </div>
        </Card>

        {/* Filters */}
        {selectedRoomId && (
          <Card padding="md" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search vessels..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Types</option>
                {VESSEL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
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
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </div>
          </Card>
        )}

        {/* Vessels Table */}
        {!selectedRoomId ? (
          <Card padding="lg">
            <div className="text-center py-12">
              <Ship className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
              <p className="text-secondary-600">Please select an operation to view vessels</p>
            </div>
          </Card>
        ) : loading ? (
          <Loading message="Loading vessels..." />
        ) : error ? (
          <Alert type="error" title="Error" message={error} />
        ) : (
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary-50 border-b border-secondary-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                      Vessel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                      IMO
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                      Flag
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {filteredVessels.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-secondary-500">
                        No vessels found
                      </td>
                    </tr>
                  ) : (
                    filteredVessels.map((v) => (
                      <tr key={v.id} className="hover:bg-secondary-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <Ship className="w-5 h-5 text-primary-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-secondary-900">{v.name}</div>
                              {v.room_title && (
                                <div className="text-sm text-secondary-500">{v.room_title}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {v.vessel_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-secondary-900">
                          {v.imo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Flag className="w-4 h-4 text-secondary-400" />
                            <span className="text-sm text-secondary-500">{v.flag}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                              v.status
                            )}`}
                          >
                            {v.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openDetailsModal(v)}
                              className="text-blue-600 hover:text-blue-900 transition"
                              title="View details"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            {hasPermission('vessels', 'update') && (
                              <button
                                onClick={() => openEditModal(v)}
                                className="text-blue-600 hover:text-blue-900 transition"
                                title="Edit vessel"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {hasPermission('vessels', 'delete') && (
                              <button
                                onClick={() => openDeleteModal(v)}
                                className="text-red-600 hover:text-red-900 transition"
                                title="Delete vessel"
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

        {/* Create Vessel Modal */}
        <BaseModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setCreateForm({
              name: '',
              vessel_type: 'Tanker',
              flag: '',
              imo: '',
              length: '',
              beam: '',
              draft: '',
              gross_tonnage: '',
              net_tonnage: '',
              built_year: '',
              classification_society: '',
            });
          }}
          title="Create New Vessel"
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Vessel Name *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="MV Example"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Vessel Type *
                </label>
                <select
                  value={createForm.vessel_type}
                  onChange={(e) => setCreateForm({ ...createForm, vessel_type: e.target.value })}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {VESSEL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Flag State *
                </label>
                <input
                  type="text"
                  value={createForm.flag}
                  onChange={(e) => setCreateForm({ ...createForm, flag: e.target.value })}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Panama"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  IMO Number * (7 digits)
                </label>
                <input
                  type="text"
                  value={createForm.imo}
                  onChange={(e) => setCreateForm({ ...createForm, imo: e.target.value.replace(/\D/g, '') })}
                  maxLength={7}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
                  placeholder="1234567"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Length (m)
                </label>
                <input
                  type="number"
                  value={createForm.length}
                  onChange={(e) => setCreateForm({ ...createForm, length: e.target.value })}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Beam (m)
                </label>
                <input
                  type="number"
                  value={createForm.beam}
                  onChange={(e) => setCreateForm({ ...createForm, beam: e.target.value })}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Draft (m)
                </label>
                <input
                  type="number"
                  value={createForm.draft}
                  onChange={(e) => setCreateForm({ ...createForm, draft: e.target.value })}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Gross Tonnage
                </label>
                <input
                  type="number"
                  value={createForm.gross_tonnage}
                  onChange={(e) => setCreateForm({ ...createForm, gross_tonnage: e.target.value })}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Net Tonnage
                </label>
                <input
                  type="number"
                  value={createForm.net_tonnage}
                  onChange={(e) => setCreateForm({ ...createForm, net_tonnage: e.target.value })}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Built Year
                </label>
                <input
                  type="number"
                  value={createForm.built_year}
                  onChange={(e) => setCreateForm({ ...createForm, built_year: e.target.value })}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Classification Society
              </label>
              <input
                type="text"
                value={createForm.classification_society}
                onChange={(e) =>
                  setCreateForm({ ...createForm, classification_society: e.target.value })
                }
                className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="ABS, DNV, etc."
              />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button
                onClick={() => setShowCreateModal(false)}
                variant="ghost"
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateVessel} variant="primary" isLoading={actionLoading}>
                Create Vessel
              </Button>
            </div>
          </div>
        </BaseModal>

        {/* Edit Vessel Modal */}
        <BaseModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedVessel(null);
          }}
          title="Edit Vessel"
          size="lg"
        >
          {selectedVessel && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Vessel Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Vessel Type *
                  </label>
                  <select
                    value={editForm.vessel_type}
                    onChange={(e) => setEditForm({ ...editForm, vessel_type: e.target.value })}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {VESSEL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Flag State *
                  </label>
                  <input
                    type="text"
                    value={editForm.flag}
                    onChange={(e) => setEditForm({ ...editForm, flag: e.target.value })}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    IMO Number *
                  </label>
                  <input
                    type="text"
                    value={editForm.imo}
                    onChange={(e) => setEditForm({ ...editForm, imo: e.target.value.replace(/\D/g, '') })}
                    maxLength={7}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Status *</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Length (m)
                  </label>
                  <input
                    type="number"
                    value={editForm.length}
                    onChange={(e) => setEditForm({ ...editForm, length: e.target.value })}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Beam (m)
                  </label>
                  <input
                    type="number"
                    value={editForm.beam}
                    onChange={(e) => setEditForm({ ...editForm, beam: e.target.value })}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Draft (m)
                  </label>
                  <input
                    type="number"
                    value={editForm.draft}
                    onChange={(e) => setEditForm({ ...editForm, draft: e.target.value })}
                    className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  onClick={() => setShowEditModal(false)}
                  variant="ghost"
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleEditVessel} variant="primary" isLoading={actionLoading}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </BaseModal>

        {/* Delete Vessel Modal */}
        <BaseModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedVessel(null);
          }}
          title="Delete Vessel"
          size="md"
        >
          {selectedVessel && (
            <div className="space-y-4">
              <Alert
                type="error"
                title="Warning"
                message={`Are you sure you want to delete ${selectedVessel.name} (IMO: ${selectedVessel.imo})? This action cannot be undone.`}
              />
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  onClick={() => setShowDeleteModal(false)}
                  variant="ghost"
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleDeleteVessel} variant="danger" isLoading={actionLoading}>
                  Delete Vessel
                </Button>
              </div>
            </div>
          )}
        </BaseModal>

        {/* Vessel Details Modal */}
        <BaseModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedVessel(null);
          }}
          title="Vessel Details"
          size="lg"
        >
          {selectedVessel && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-secondary-700">Vessel Name</label>
                  <p className="text-sm text-secondary-900 mt-1">{selectedVessel.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-secondary-700">Vessel Type</label>
                  <p className="text-sm text-secondary-900 mt-1">{selectedVessel.vessel_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-secondary-700">IMO Number</label>
                  <p className="text-sm text-secondary-900 mt-1 font-mono">{selectedVessel.imo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-secondary-700">Flag State</label>
                  <p className="text-sm text-secondary-900 mt-1">{selectedVessel.flag}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-secondary-700">Status</label>
                  <p className="text-sm text-secondary-900 mt-1">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                        selectedVessel.status
                      )}`}
                    >
                      {selectedVessel.status}
                    </span>
                  </p>
                </div>
                {selectedVessel.built_year && (
                  <div>
                    <label className="text-sm font-medium text-secondary-700">Built Year</label>
                    <p className="text-sm text-secondary-900 mt-1">{selectedVessel.built_year}</p>
                  </div>
                )}
                {selectedVessel.length && (
                  <div>
                    <label className="text-sm font-medium text-secondary-700">Length (m)</label>
                    <p className="text-sm text-secondary-900 mt-1">{selectedVessel.length}</p>
                  </div>
                )}
                {selectedVessel.beam && (
                  <div>
                    <label className="text-sm font-medium text-secondary-700">Beam (m)</label>
                    <p className="text-sm text-secondary-900 mt-1">{selectedVessel.beam}</p>
                  </div>
                )}
                {selectedVessel.draft && (
                  <div>
                    <label className="text-sm font-medium text-secondary-700">Draft (m)</label>
                    <p className="text-sm text-secondary-900 mt-1">{selectedVessel.draft}</p>
                  </div>
                )}
                {selectedVessel.gross_tonnage && (
                  <div>
                    <label className="text-sm font-medium text-secondary-700">Gross Tonnage</label>
                    <p className="text-sm text-secondary-900 mt-1">
                      {selectedVessel.gross_tonnage.toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedVessel.net_tonnage && (
                  <div>
                    <label className="text-sm font-medium text-secondary-700">Net Tonnage</label>
                    <p className="text-sm text-secondary-900 mt-1">
                      {selectedVessel.net_tonnage.toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedVessel.classification_society && (
                  <div>
                    <label className="text-sm font-medium text-secondary-700">
                      Classification Society
                    </label>
                    <p className="text-sm text-secondary-900 mt-1">
                      {selectedVessel.classification_society}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button onClick={() => setShowDetailsModal(false)} variant="ghost">
                  Close
                </Button>
              </div>
            </div>
          )}
        </BaseModal>
      </div>
    </div>
  );
};

export default VesselManagementPage;

