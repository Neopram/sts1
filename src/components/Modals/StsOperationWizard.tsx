import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import * as api from '../../api';
import { COASTAL_COUNTRIES, isValidCoastalCountry } from '../../constants/coastalCountries';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (operation: any) => void;
}

interface ParticipantInput {
  name: string;
  email: string;
  organization: string;
  position: string;
}

interface VesselInput {
  vessel_name: string;
  vessel_imo: string;
  mmsi: string;
  vessel_type: string;
  vessel_role: string;
  flag: string;
}

export const StsOperationWizard: React.FC<Props> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { user } = useApp();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationId, setOperationId] = useState<string | null>(null);

  // ======= STEP 1: Basic Info =======
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [q88Enabled, setQ88Enabled] = useState(false);

  // ======= STEP 2-4: Participants =======
  const [tradingCompanyParticipants, setTradingCompanyParticipants] = useState<ParticipantInput[]>([
    { name: '', email: '', organization: '', position: 'Chartering Person' },
  ]);
  const [brokerParticipants, setBrokerParticipants] = useState<ParticipantInput[]>([
    { name: '', email: '', organization: '', position: 'Broker' },
  ]);
  const [shipownerParticipants, setShipownerParticipants] = useState<ParticipantInput[]>([
    { name: '', email: '', organization: '', position: 'Captain' },
  ]);

  // ======= STEP 5: Vessels =======
  const [vessels, setVessels] = useState<VesselInput[]>([
    {
      vessel_name: '',
      vessel_imo: '',
      mmsi: '',
      vessel_type: 'Tanker',
      vessel_role: 'mother_vessel', // PR-2: Default to mother_vessel
      flag: '',
    },
  ]);

  // ======= Validation =======
  const validateStep1 = () => {
    if (!title.trim()) {
      setError('Title is required');
      return false;
    }
    if (!location.trim()) {
      setError('Location is required');
      return false;
    }
    // PR-2: Validate coastal country
    if (!isValidCoastalCountry(location)) {
      setError(`"${location}" is not a recognized coastal country. Please select from the list.`);
      return false;
    }
    if (!startDate) {
      setError('Start date is required');
      return false;
    }
    return true;
  };

  const validateParticipants = (participants: ParticipantInput[]) => {
    const filled = participants.filter((p) => p.email.trim());
    if (filled.length === 0) {
      setError('At least one participant is required for this step');
      return false;
    }
    for (const p of filled) {
      if (!p.email.includes('@')) {
        setError('Invalid email address');
        return false;
      }
      if (!p.name.trim()) {
        setError('Participant name is required');
        return false;
      }
    }
    return true;
  };

  const validateVessels = () => {
    const filled = vessels.filter((v) => v.vessel_imo.trim());
    if (filled.length === 0) {
      setError('At least one vessel is required');
      return false;
    }
    for (const v of filled) {
      if (v.vessel_imo.length < 7 || v.vessel_imo.length > 7) {
        setError('IMO must be 7 digits');
        return false;
      }
      if (!v.vessel_name.trim()) {
        setError('Vessel name is required');
        return false;
      }
    }
    return true;
  };

  // ======= Handle Steps =======
  const handleNext = async () => {
    setError(null);

    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateParticipants(tradingCompanyParticipants)) return;
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!validateParticipants(brokerParticipants)) return;
      setCurrentStep(4);
    } else if (currentStep === 4) {
      if (!validateParticipants(shipownerParticipants)) return;
      setCurrentStep(5);
    } else if (currentStep === 5) {
      if (!validateVessels()) return;
      await handleFinalize();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  // ======= Main Finalize =======
  const handleFinalize = async () => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Create operation
      if (!operationId) {
        const opResponse = await api.createStsOperation({
          title,
          description,
          location,
          scheduled_start_date: startDate,
          scheduled_end_date: endDate,
          q88_enabled: q88Enabled,
        });
        setOperationId(opResponse.id);

        // Step 2-4: Add participants
        const allParticipants = [
          ...tradingCompanyParticipants.map((p) => ({
            ...p,
            participant_type: 'Trading Company',
          })),
          ...brokerParticipants.map((p) => ({
            ...p,
            participant_type: 'Broker',
          })),
          ...shipownerParticipants.map((p) => ({
            ...p,
            participant_type: 'Shipowner',
          })),
        ].filter((p) => p.email.trim());

        for (const participant of allParticipants) {
          await api.addParticipantToOperation(opResponse.id, {
            participant_type: participant.participant_type,
            name: participant.name,
            email: participant.email,
            organization: participant.organization,
            position: participant.position,
          });
        }

        // Step 5: Add vessels
        const filledVessels = vessels.filter((v) => v.vessel_imo.trim());
        for (const vessel of filledVessels) {
          await api.addVesselToOperation(opResponse.id, {
            vessel_name: vessel.vessel_name,
            vessel_imo: vessel.vessel_imo,
            mmsi: vessel.mmsi,
            vessel_type: vessel.vessel_type,
            vessel_role: vessel.vessel_role,
            flag: vessel.flag,
          });
        }

        // Step 6: Finalize & Send Emails - PR-2
        // This endpoint automatically sends emails to all participants
        const finalOp = await api.finalizeOperation(opResponse.id);

        // Show success notification
        window.dispatchEvent(new CustomEvent('app:notification', {
          detail: {
            type: 'success',
            message: `✅ STS Operation created successfully!\n🔔 Notification emails sent to ${allParticipants.length} participants\n📋 Operation Code: ${finalOp.sts_code || opResponse.id}`
          }
        }));

        // Success!
        onComplete?.(finalOp);
        handleClose();
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Operation failed');
      console.error('Wizard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset all state
    setCurrentStep(1);
    setError(null);
    setOperationId(null);
    setTitle('');
    setDescription('');
    setLocation('');
    setStartDate('');
    setEndDate('');
    setQ88Enabled(false);
    setTradingCompanyParticipants([
      { name: '', email: '', organization: '', position: 'Chartering Person' },
    ]);
    setBrokerParticipants([
      { name: '', email: '', organization: '', position: 'Broker' },
    ]);
    setShipownerParticipants([
      { name: '', email: '', organization: '', position: 'Captain' },
    ]);
    setVessels([
      {
        vessel_name: '',
        vessel_imo: '',
        mmsi: '',
        vessel_type: 'Tanker',
        vessel_role: 'mother_vessel', // PR-2: Updated default
        flag: '',
      },
    ]);
    onClose();
  };

  // ======= Render Helpers =======
  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">📋 Basic Information</h3>

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Operation Title *</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="e.g., Ship-to-Ship Transfer - Tanker A to Tanker B"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="Additional details..."
            rows={3}
          />
        </label>

        {/* PR-2: Location Dropdown with Coastal Countries */}
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Location (Coastal Country) *</span>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
          >
            <option value="">-- Select a Coastal Country --</option>
            {COASTAL_COUNTRIES.map((country) => (
              <option key={country.code} value={country.name}>
                {country.name} ({country.code})
              </option>
            ))}
          </select>
          {location && !isValidCoastalCountry(location) && (
            <p className="mt-1 text-xs text-red-600">Invalid selection</p>
          )}
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Start Date *</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">End Date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </label>
        </div>

        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={q88Enabled}
            onChange={(e) => setQ88Enabled(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm font-medium text-gray-700">Enable Q88 Integration</span>
        </label>
      </div>
    </div>
  );

  const renderParticipantsStep = (
    title: string,
    participants: ParticipantInput[],
    setParticipants: (p: ParticipantInput[]) => void
  ) => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">👥 {title}</h3>

      {participants.map((p, idx) => (
        <div key={idx} className="space-y-3 rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Name</span>
              <input
                type="text"
                value={p.name}
                onChange={(e) => {
                  const updated = [...participants];
                  updated[idx].name = e.target.value;
                  setParticipants(updated);
                }}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2"
                placeholder="Full name"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input
                type="email"
                value={p.email}
                onChange={(e) => {
                  const updated = [...participants];
                  updated[idx].email = e.target.value;
                  setParticipants(updated);
                }}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2"
                placeholder="email@example.com"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Organization</span>
              <input
                type="text"
                value={p.organization}
                onChange={(e) => {
                  const updated = [...participants];
                  updated[idx].organization = e.target.value;
                  setParticipants(updated);
                }}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2"
                placeholder="Company name"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Position</span>
              <input
                type="text"
                value={p.position}
                onChange={(e) => {
                  const updated = [...participants];
                  updated[idx].position = e.target.value;
                  setParticipants(updated);
                }}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2"
                placeholder="Job title"
              />
            </label>
          </div>
        </div>
      ))}

      <button
        onClick={() => {
          setParticipants([
            ...participants,
            { name: '', email: '', organization: '', position: 'Staff' },
          ]);
        }}
        className="w-full rounded-lg border border-dashed border-blue-300 py-2 text-blue-600 hover:bg-blue-50"
      >
        + Add Another Participant
      </button>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">🚢 Vessel Assignment</h3>

      {vessels.map((v, idx) => (
        <div key={idx} className="space-y-3 rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Vessel Name</span>
              <input
                type="text"
                value={v.vessel_name}
                onChange={(e) => {
                  const updated = [...vessels];
                  updated[idx].vessel_name = e.target.value;
                  setVessels(updated);
                }}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2"
                placeholder="e.g., MT Ocean Paradise"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">IMO Number *</span>
              <input
                type="text"
                value={v.vessel_imo}
                onChange={(e) => {
                  const updated = [...vessels];
                  updated[idx].vessel_imo = e.target.value;
                  setVessels(updated);
                }}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2"
                placeholder="1234567"
                maxLength={7}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">MMSI</span>
              <input
                type="text"
                value={v.mmsi}
                onChange={(e) => {
                  const updated = [...vessels];
                  updated[idx].mmsi = e.target.value;
                  setVessels(updated);
                }}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2"
                placeholder="MMSI number"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Flag State</span>
              <input
                type="text"
                value={v.flag}
                onChange={(e) => {
                  const updated = [...vessels];
                  updated[idx].flag = e.target.value;
                  setVessels(updated);
                }}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2"
                placeholder="e.g., Singapore"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Vessel Type</span>
              <select
                value={v.vessel_type}
                onChange={(e) => {
                  const updated = [...vessels];
                  updated[idx].vessel_type = e.target.value;
                  setVessels(updated);
                }}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2"
              >
                <option>Tanker</option>
                <option>Bulk Carrier</option>
                <option>Container Ship</option>
                <option>General Cargo</option>
                <option>Other</option>
              </select>
            </label>

            {/* PR-2: Mother/Daughter Vessel Role Selection */}
            <div className="block">
              <span className="text-sm font-medium text-gray-700">Vessel Role *</span>
              <div className="mt-2 space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`vessel-role-${idx}`}
                    value="mother_vessel"
                    checked={v.vessel_role === 'mother_vessel'}
                    onChange={(e) => {
                      const updated = [...vessels];
                      updated[idx].vessel_role = e.target.value;
                      setVessels(updated);
                    }}
                    className="w-4 h-4 border-gray-300"
                  />
                  <span className="text-sm text-gray-700 font-medium">🛢️ Mother Vessel (Donor)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`vessel-role-${idx}`}
                    value="daughter_vessel"
                    checked={v.vessel_role === 'daughter_vessel'}
                    onChange={(e) => {
                      const updated = [...vessels];
                      updated[idx].vessel_role = e.target.value;
                      setVessels(updated);
                    }}
                    className="w-4 h-4 border-gray-300"
                  />
                  <span className="text-sm text-gray-700 font-medium">🛳️ Daughter Vessel (Receiver)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={() => {
          setVessels([
            ...vessels,
            {
              vessel_name: '',
              vessel_imo: '',
              mmsi: '',
              vessel_type: 'Tanker',
              vessel_role: 'mother_vessel', // PR-2: Updated default
              flag: '',
            },
          ]);
        }}
        className="w-full rounded-lg border border-dashed border-blue-300 py-2 text-blue-600 hover:bg-blue-50"
      >
        + Add Another Vessel
      </button>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="card max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="card-header sticky top-0 bg-white border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              Create STS Operation - Step {currentStep} of 5
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ✕
            </button>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="card-body p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <p className="font-semibold">❌ {error}</p>
            </div>
          )}

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 &&
            renderParticipantsStep(
              'Trading Company Participants',
              tradingCompanyParticipants,
              setTradingCompanyParticipants
            )}
          {currentStep === 3 &&
            renderParticipantsStep(
              'Broker Participants',
              brokerParticipants,
              setBrokerParticipants
            )}
          {currentStep === 4 &&
            renderParticipantsStep(
              'Shipowner Participants',
              shipownerParticipants,
              setShipownerParticipants
            )}
          {currentStep === 5 && renderStep5()}
        </div>

        {/* Footer */}
        <div className="card-footer flex justify-between border-t p-6 bg-gray-50">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleNext}
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : currentStep === 5 ? '✓ Create' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};