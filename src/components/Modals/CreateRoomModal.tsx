import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Ship, Calendar, MapPin, Users, Plus, Trash2 } from 'lucide-react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (roomData: any) => Promise<void>;
}

interface Party {
  role: 'owner' | 'charterer' | 'broker' | 'viewer';
  name: string;
  email: string;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    sts_eta: '',
    description: ''
  });
  const [parties, setParties] = useState<Party[]>([
    { role: 'owner', name: '', email: '' }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      // Validate form
      if (!formData.title || !formData.location || !formData.sts_eta) {
        setError('Please fill in all required fields');
        return;
      }

      // Validate parties
      const validParties = parties.filter(party => party.name && party.email);
      if (validParties.length === 0) {
        setError('At least one party is required');
        return;
      }

      // Create room data
      const roomData = {
        ...formData,
        sts_eta: new Date(formData.sts_eta).toISOString(),
        parties: validParties
      };

      await onCreateRoom(roomData);
      
      // Reset form
      setFormData({
        title: '',
        location: '',
        sts_eta: '',
        description: ''
      });
      setParties([{ role: 'owner', name: '', email: '' }]);
      
      onClose();
    } catch (err) {
      console.error('Error creating room:', err);
      setError('Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addParty = () => {
    setParties([...parties, { role: 'broker', name: '', email: '' }]);
  };

  const removeParty = (index: number) => {
    if (parties.length > 1) {
      setParties(parties.filter((_, i) => i !== index));
    }
  };

  const updateParty = (index: number, field: keyof Party, value: string) => {
    const updatedParties = [...parties];
    updatedParties[index] = { ...updatedParties[index], [field]: value };
    setParties(updatedParties);
  };

  if (!isOpen) return null;

  // Render modal in a portal to escape the header container
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 -z-10" onClick={onClose}></div>
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh] my-auto">
          {/* Header */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-secondary-200 bg-secondary-50 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Ship className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-secondary-900">Create New STS Operation</h2>
              </div>
              <button
                onClick={onClose}
                type="button"
                className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-xl transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Error Display */}
            {error && (
              <div className="mx-6 mt-4 p-4 bg-danger-50 border border-danger-200 rounded-xl">
                <p className="text-danger-800 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-secondary-900 flex items-center gap-2">
                  <Ship className="w-5 h-5" />
                  <span>Operation Details</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Operation Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2.5 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., STS Transfer - Fujairah Anchorage"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Location *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Fujairah, UAE"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      STS ETA *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
                      <input
                        type="datetime-local"
                        value={formData.sts_eta}
                        onChange={(e) => setFormData({ ...formData, sts_eta: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Optional description of the operation..."
                    />
                  </div>
                </div>
              </div>

              {/* Parties Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-secondary-900 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <span>Parties & Stakeholders</span>
                  </h3>
                  <button
                    type="button"
                    onClick={addParty}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Party</span>
                  </button>
                </div>
                
                <div className="space-y-3">
                  {parties.map((party, index) => (
                    <div key={index} className="border border-secondary-200 rounded-xl p-4 bg-secondary-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                            Role
                          </label>
                          <select
                            value={party.role}
                            onChange={(e) => updateParty(index, 'role', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-secondary-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="owner">Owner</option>
                            <option value="charterer">Charterer</option>
                            <option value="broker">Broker</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                            Name
                          </label>
                          <input
                            type="text"
                            value={party.name}
                            onChange={(e) => updateParty(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-secondary-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Full name"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                            Email
                          </label>
                          <input
                            type="email"
                            value={party.email}
                            onChange={(e) => updateParty(index, 'email', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-secondary-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="email@company.com"
                            required
                          />
                        </div>
                        
                        <div className="flex items-end">
                          {parties.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeParty(index)}
                              className="p-2 text-danger-500 hover:text-danger-700 hover:bg-danger-50 rounded-lg transition-colors duration-200"
                              title="Remove party"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 border border-secondary-300 text-secondary-700 rounded-xl hover:bg-secondary-50 transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Ship className="w-4 h-4" />
                      <span>Create Operation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>,
    document.body
  );
};

export default CreateRoomModal;
