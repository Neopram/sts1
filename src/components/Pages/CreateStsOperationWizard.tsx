import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Ship, Users, FileText, CheckCircle2 } from 'lucide-react';
import { Card } from '../Common/Card';
import { Button } from '../Common/Button';
import ApiService from '../../api';

interface StepProps {
  isActive: boolean;
  number: number;
  title: string;
}

interface StsOperation {
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  operationType: string;
  cargoType: string;
  quantity: string;
  transferRate: string;
}

const Step: React.FC<StepProps> = ({ isActive, number, title }) => (
  <div className={`flex items-center ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
      isActive ? 'bg-blue-600 text-white' : 'bg-gray-200'
    }`}>
      {number}
    </div>
    <span className="ml-3 font-medium">{title}</span>
  </div>
);

interface Country {
  code: string;
  name: string;
  flag: string;
}

const countries: Country[] = [
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
];

const operationTypes = [
  { id: 'standard', label: 'Standard STS Transfer' },
  { id: 'lightering', label: 'Lightering Operation' },
  { id: 'reverse', label: 'Reverse Lightering' },
  { id: 'multi', label: 'Multi-Ship Operation' },
  { id: 'topping', label: 'Topping Off Operation' },
];

const cargoTypes = [
  { id: 'crude', label: 'Crude Oil' },
  { id: 'gasoline', label: 'Gasoline' },
  { id: 'diesel', label: 'Gas Oil / Diesel' },
  { id: 'jet', label: 'Jet Fuel / Kerosene' },
  { id: 'fuel', label: 'Fuel Oil' },
  { id: 'naphtha', label: 'Naphtha' },
  { id: 'condensate', label: 'Condensate' },
  { id: 'lpg', label: 'LPG' },
  { id: 'lng', label: 'LNG' },
  { id: 'chemicals', label: 'Chemicals' },
];

interface CreateStsOperationWizardProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateStsOperationWizard: React.FC<CreateStsOperationWizardProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<StsOperation>({
    title: '',
    startDate: '',
    endDate: '',
    location: '',
    operationType: '',
    cargoType: '',
    quantity: '',
    transferRate: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNext = () => {
    // Validate current step
    if (step === 1) {
      if (!formData.title || !formData.startDate || !formData.endDate) {
        setError('Please fill in all fields');
        return;
      }
    } else if (step === 2) {
      if (!formData.location || !formData.operationType) {
        setError('Please fill in all fields');
        return;
      }
    } else if (step === 3) {
      if (!formData.cargoType || !formData.quantity || !formData.transferRate) {
        setError('Please fill in all fields');
        return;
      }
    }
    
    setError(null);
    setStep(step + 1);
  };

  const handlePrevious = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Create operation via API
      const response = await ApiService.staticPost('/api/v1/rooms', {
        title: formData.title,
        location: formData.location,
        sts_eta: formData.startDate,
        description: `Operation Type: ${operationTypes.find(t => t.id === formData.operationType)?.label}\nCargo: ${cargoTypes.find(c => c.id === formData.cargoType)?.label}\nQuantity: ${formData.quantity} MT\nTransfer Rate: ${formData.transferRate} MT/hr`
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to create operation');
      console.error('Error creating operation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b">
          <div className="flex items-center space-x-2">
            <Ship className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold">Create New STS Operation Session</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-gray-600 mt-4 mb-6">
          Configure your ship-to-ship transfer operation with automated 48-hour clearance tracking
        </p>

        {/* Steps */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Step isActive={step >= 1} number={1} title="Basic Information" />
          <Step isActive={step >= 2} number={2} title="Parties & Location" />
          <Step isActive={step >= 3} number={3} title="Cargo Configuration" />
          <Step isActive={step >= 4} number={4} title="Review & Create" />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-900 text-sm">
                <strong>ℹ️ Operation Title Format:</strong> STS OPERATION - TRADING COMPANY - SHIPOWNER
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operation Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., STS OPERATION - TRADING CO - OWNER NAME"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operation Start Date *
                </label>
                <input
                  type="datetime-local"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operation End Date *
                </label>
                <input
                  type="datetime-local"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Parties & Location */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Location (Coastal Country) *
              </label>
              <select
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Coastal Country</option>
                {countries.map(country => (
                  <option key={country.code} value={country.name}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operation Type *
              </label>
              <select
                name="operationType"
                value={formData.operationType}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Operation Type</option>
                {operationTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Parties & Contacts</p>
              <p className="text-sm text-gray-600">You can add parties after creating the operation</p>
              <Button variant="secondary" size="sm" className="w-full">
                + Add Parties
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Cargo Configuration */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cargo Type *
              </label>
              <select
                name="cargoType"
                value={formData.cargoType}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Cargo Type</option>
                {cargoTypes.map(cargo => (
                  <option key={cargo.id} value={cargo.id}>
                    {cargo.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity (MT) *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="e.g., 50000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transfer Rate (MT/hr) *
                </label>
                <input
                  type="number"
                  name="transferRate"
                  value={formData.transferRate}
                  onChange={handleInputChange}
                  placeholder="e.g., 500"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900 text-sm">
                <strong>📋 Operation Details:</strong> Define the basic parameters of your STS operation
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Review & Create */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gray-50">
                <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Operation Title</p>
                <p className="text-sm font-semibold text-gray-900">{formData.title}</p>
              </Card>

              <Card className="bg-gray-50">
                <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Location</p>
                <p className="text-sm font-semibold text-gray-900">{formData.location}</p>
              </Card>

              <Card className="bg-gray-50">
                <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Operation Type</p>
                <p className="text-sm font-semibold text-gray-900">
                  {operationTypes.find(t => t.id === formData.operationType)?.label}
                </p>
              </Card>

              <Card className="bg-gray-50">
                <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Cargo Type</p>
                <p className="text-sm font-semibold text-gray-900">
                  {cargoTypes.find(c => c.id === formData.cargoType)?.label}
                </p>
              </Card>

              <Card className="bg-gray-50">
                <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Quantity</p>
                <p className="text-sm font-semibold text-gray-900">{formData.quantity} MT</p>
              </Card>

              <Card className="bg-gray-50">
                <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Transfer Rate</p>
                <p className="text-sm font-semibold text-gray-900">{formData.transferRate} MT/hr</p>
              </Card>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-900 font-semibold">Ready to Create</p>
                <p className="text-green-800 text-sm">Your operation will be created with automated 48-hour clearance tracking</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            variant="secondary"
            onClick={handlePrevious}
            disabled={step === 1 || isSubmitting}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <span className="text-sm text-gray-600">
            Step {step} of 4
          </span>

          {step < 4 ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={isSubmitting}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Operation'}
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CreateStsOperationWizard;