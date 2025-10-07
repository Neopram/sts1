import React, { useState } from 'react';
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-6">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-secondary-200 bg-secondary-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Ship className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-secondary-900">Create New STS Operation</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-xl transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-6 bg-danger-50 border border-danger-200 rounded-xl">
            <p className="text-danger-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Basic Information */}
          <div className="space-y-8">
            <h3 className="text-lg font-medium text-secondary-900 flex items-center">
              <Ship className="w-5 h-5 mr-2" />
              Operation Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 gap-6">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Operation Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full pl-10 pr-4 py-3 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full pl-10 pr-4 py-3 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional description of the operation..."
                />
              </div>
            </div>
          </div>

          {/* Parties Section */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-secondary-900 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Parties & Stakeholders
              </h3>
              <button
                type="button"
                onClick={addParty}
                className="btn-primary flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Party
              </button>
            </div>
            
            <div className="space-y-4">
              {parties.map((party, index) => (
                <div key={index} className="border border-secondary-200 rounded-xl p-6 bg-secondary-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Role
                      </label>
                      <select
                        value={party.role}
                        onChange={(e) => updateParty(index, 'role', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="owner">Owner</option>
                        <option value="charterer">Charterer</option>
                        <option value="broker">Broker</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={party.name}
                        onChange={(e) => updateParty(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Full name"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={party.email}
                        onChange={(e) => updateParty(index, 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="email@company.com"
                        required
                      />
                    </div>
                    
                    <div className="flex items-end">
                      {parties.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeParty(index)}
                          className="p-2 text-danger-500 hover:text-danger-700 hover:bg-danger-50 rounded-xl transition-colors duration-200"
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
          <div className="flex justify-end space-x-4 pt-6 border-t border-secondary-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-secondary-300 text-secondary-700 rounded-xl hover:bg-secondary-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Ship className="w-4 h-4 mr-2" />
                  Create Operation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;
