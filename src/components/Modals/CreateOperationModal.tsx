import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import ApiService from '../../api';

interface Party {
  role: 'owner' | 'broker' | 'charterer' | 'seller' | 'buyer';
  name: string;
  email: string;
}

interface OperationFormData {
  title: string;
  location: string;
  sts_eta: string;
  description: string;
  parties: Party[];
}

interface CreateOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * CreateOperationModal Component
 * 
 * Allows brokers to create new STS operations with:
 * 1. Operation details (title, location, ETA, description)
 * 2. Dynamic party management (add/remove participants)
 * 3. Form validation
 * 4. Error handling
 */
export const CreateOperationModal: React.FC<CreateOperationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<OperationFormData>({
    title: '',
    location: '',
    sts_eta: '',
    description: '',
    parties: [
      { role: 'owner', name: '', email: '' },
      { role: 'charterer', name: '', email: '' },
    ],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const roleOptions: Party['role'][] = ['owner', 'broker', 'charterer', 'seller', 'buyer'];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePartyChange = (
    index: number,
    field: keyof Party,
    value: string
  ) => {
    const updatedParties = [...formData.parties];
    updatedParties[index] = {
      ...updatedParties[index],
      [field]: value,
    };
    setFormData(prev => ({
      ...prev,
      parties: updatedParties,
    }));
  };

  const addParty = () => {
    setFormData(prev => ({
      ...prev,
      parties: [
        ...prev.parties,
        { role: 'seller', name: '', email: '' },
      ],
    }));
  };

  const removeParty = (index: number) => {
    setFormData(prev => ({
      ...prev,
      parties: prev.parties.filter((_, i) => i !== index),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Operation title is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.sts_eta) {
      newErrors.sts_eta = 'ETA date is required';
    } else {
      const selectedDate = new Date(formData.sts_eta);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.sts_eta = 'ETA must be in the future';
      }
    }

    // Validate parties
    const hasOwner = formData.parties.some(p => p.role === 'owner');
    if (!hasOwner) {
      newErrors.parties = 'At least one owner must be added';
    }

    formData.parties.forEach((party, index) => {
      if (!party.name.trim()) {
        newErrors[`party_name_${index}`] = 'Name is required';
      }
      if (!party.email.trim()) {
        newErrors[`party_email_${index}`] = 'Email is required';
      } else if (!party.email.includes('@')) {
        newErrors[`party_email_${index}`] = 'Valid email is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Call backend to create operation
      const response = await ApiService.post('/api/v1/rooms', {
        title: formData.title,
        location: formData.location,
        sts_eta: formData.sts_eta,
        description: formData.description,
        parties: formData.parties,
      });

      if (response) {
        // Reset form
        setFormData({
          title: '',
          location: '',
          sts_eta: '',
          description: '',
          parties: [
            { role: 'owner', name: '', email: '' },
            { role: 'charterer', name: '', email: '' },
          ],
        });
        
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create operation';
      setSubmitError(message);
      console.error('Error creating operation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Create New STS Operation</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Alert */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {submitError}
            </div>
          )}

          {/* Operation Details Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Operation Details</h3>
            
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operation Title
                </label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g., STS Operation: MT GLOBAL → MT HORIZON"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.title && (
                  <p className="text-red-600 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  placeholder="e.g., Gulf of Mexico, 25°N 90°W"
                  value={formData.location}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.location ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.location && (
                  <p className="text-red-600 text-sm mt-1">{errors.location}</p>
                )}
              </div>

              {/* ETA */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  STS ETA (Estimated Time of Arrival)
                </label>
                <input
                  type="datetime-local"
                  name="sts_eta"
                  value={formData.sts_eta}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.sts_eta ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.sts_eta && (
                  <p className="text-red-600 text-sm mt-1">{errors.sts_eta}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  placeholder="Describe the operation, cargo type, etc."
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Parties Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Parties Involved</h3>
              <button
                type="button"
                onClick={addParty}
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition text-sm font-medium"
              >
                <Plus size={16} />
                Add Party
              </button>
            </div>

            {errors.parties && (
              <p className="text-red-600 text-sm mb-4">{errors.parties}</p>
            )}

            <div className="space-y-4">
              {formData.parties.map((party, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="grid grid-cols-3 gap-3 flex-1">
                      {/* Role */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Role
                        </label>
                        <select
                          value={party.role}
                          onChange={(e) =>
                            handlePartyChange(index, 'role', e.target.value as Party['role'])
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          {roleOptions.map(role => (
                            <option key={role} value={role}>
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Name
                        </label>
                        <input
                          type="text"
                          placeholder="Full name"
                          value={party.name}
                          onChange={(e) =>
                            handlePartyChange(index, 'name', e.target.value)
                          }
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                            errors[`party_name_${index}`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors[`party_name_${index}`] && (
                          <p className="text-red-600 text-xs mt-1">{errors[`party_name_${index}`]}</p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          placeholder="email@example.com"
                          value={party.email}
                          onChange={(e) =>
                            handlePartyChange(index, 'email', e.target.value)
                          }
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                            errors[`party_email_${index}`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors[`party_email_${index}`] && (
                          <p className="text-red-600 text-xs mt-1">{errors[`party_email_${index}`]}</p>
                        )}
                      </div>
                    </div>

                    {/* Remove Button */}
                    {formData.parties.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeParty(index)}
                        className="text-red-600 hover:text-red-700 transition mt-7"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-blue-400"
            >
              {isSubmitting ? 'Creating...' : 'Create Operation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOperationModal;