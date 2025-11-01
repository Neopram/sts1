import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../Common/Dialog';
import { Button } from '../Common/Button';
import { Input } from '../Common/Input';
import { Select } from '../Common/Select';
import { Alert } from '../Common/Alert';

interface Vessel {
  id: string;
  name: string;
  vessel_type: string;
  flag: string;
  imo: string;
  length?: number;
  beam?: number;
  draft?: number;
  gross_tonnage?: number;
  net_tonnage?: number;
  built_year?: number;
  classification_society?: string;
  status: string;
}

interface VesselManagementModalProps {
  vessel?: Vessel;
  onSave: (vessel: Partial<Vessel>) => Promise<void>;
  onDelete?: (vesselId: string) => Promise<void>;
  isLoading?: boolean;
}

const VESSEL_TYPES = [
  'Tanker (Crude)',
  'Tanker (Product)',
  'Bulk Carrier',
  'Container Ship',
  'General Cargo',
  'RoRo Carrier',
  'LNG Carrier',
  'LPG Carrier',
  'Multi-Purpose',
  'Other'
];

const VESSEL_STATUSES = ['Active', 'Inactive', 'Under Maintenance', 'Decommissioned'];

const CLASSIFICATION_SOCIETIES = ['DNV', 'ABS', 'ClassNK', 'Lloyd\'s', 'Bureau Veritas', 'RINA', 'China CCS', 'Indian Register'];

export const VesselManagementModal: React.FC<VesselManagementModalProps> = ({
  vessel,
  onSave,
  onDelete,
  isLoading = false,
}) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Vessel>>(
    vessel || {
      name: '',
      vessel_type: '',
      flag: '',
      imo: '',
      status: 'Active',
    }
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.name?.trim()) {
      setError('Vessel Name is required');
      return false;
    }
    if (!formData.vessel_type) {
      setError('Vessel Type is required');
      return false;
    }
    if (!formData.flag?.trim()) {
      setError('Flag State is required');
      return false;
    }
    if (!formData.imo?.trim()) {
      setError('IMO Number is required');
      return false;
    }
    // Validate IMO format (7 digits)
    if (!/^\d{7}$/.test(formData.imo)) {
      setError('IMO must be 7 digits');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await onSave(formData);
      setSuccess(`Vessel "${formData.name}" ${vessel ? 'updated' : 'created'} successfully!`);
      setTimeout(() => {
        setOpen(false);
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vessel');
    }
  };

  const handleDelete = async () => {
    if (!vessel?.id) return;
    if (!window.confirm(`Are you sure you want to delete "${vessel.name}"? This action cannot be undone.`)) return;

    try {
      if (onDelete) {
        await onDelete(vessel.id);
        setSuccess(`Vessel "${vessel.name}" deleted successfully!`);
        setTimeout(() => {
          setOpen(false);
          setSuccess(null);
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete vessel');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={vessel ? 'outline' : 'default'} size="sm">
          {vessel ? (
            <>
              ✏️ Edit
            </>
          ) : (
            <>
              ➕ Add New Vessel
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {vessel ? '✏️ Edit Vessel' : '➕ Add New Vessel'}
          </DialogTitle>
          <DialogDescription>
            {vessel ? 'Update vessel information' : 'Create a new vessel in your fleet'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="error" title="Error" message={error} />
          )}
          {success && (
            <Alert variant="success" title="Success" message={success} />
          )}

          {/* Required Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Vessel Name *
              </label>
              <Input
                placeholder="e.g., MV Pacific Explorer"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                IMO Number *
              </label>
              <Input
                placeholder="e.g., 1234567"
                value={formData.imo || ''}
                onChange={(e) => handleInputChange('imo', e.target.value)}
                disabled={isLoading}
                maxLength={7}
              />
              <p className="text-xs text-gray-500">7 digits only</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Vessel Type *
              </label>
              <Select
                value={formData.vessel_type || ''}
                onValueChange={(value) => handleInputChange('vessel_type', value)}
                disabled={isLoading}
              >
                <option value="">Select type...</option>
                {VESSEL_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Flag State *
              </label>
              <Input
                placeholder="e.g., Panama, Liberia, Singapore"
                value={formData.flag || ''}
                onChange={(e) => handleInputChange('flag', e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Optional Fields */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Technical Specifications (Optional)</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Length (m)</label>
                <Input
                  type="number"
                  placeholder="e.g., 245.0"
                  value={formData.length || ''}
                  onChange={(e) => handleInputChange('length', e.target.value ? parseFloat(e.target.value) : '')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Beam (m)</label>
                <Input
                  type="number"
                  placeholder="e.g., 44.0"
                  value={formData.beam || ''}
                  onChange={(e) => handleInputChange('beam', e.target.value ? parseFloat(e.target.value) : '')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Draft (m)</label>
                <Input
                  type="number"
                  placeholder="e.g., 14.5"
                  value={formData.draft || ''}
                  onChange={(e) => handleInputChange('draft', e.target.value ? parseFloat(e.target.value) : '')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Gross Tonnage (GT)</label>
                <Input
                  type="number"
                  placeholder="e.g., 47000"
                  value={formData.gross_tonnage || ''}
                  onChange={(e) => handleInputChange('gross_tonnage', e.target.value ? parseInt(e.target.value) : '')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Net Tonnage (NT)</label>
                <Input
                  type="number"
                  placeholder="e.g., 28000"
                  value={formData.net_tonnage || ''}
                  onChange={(e) => handleInputChange('net_tonnage', e.target.value ? parseInt(e.target.value) : '')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Built Year</label>
                <Input
                  type="number"
                  placeholder="e.g., 2015"
                  value={formData.built_year || ''}
                  onChange={(e) => handleInputChange('built_year', e.target.value ? parseInt(e.target.value) : '')}
                  disabled={isLoading}
                  min={1950}
                  max={new Date().getFullYear()}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Classification Society</label>
                <Select
                  value={formData.classification_society || ''}
                  onValueChange={(value) => handleInputChange('classification_society', value)}
                  disabled={isLoading}
                >
                  <option value="">Select...</option>
                  {CLASSIFICATION_SOCIETIES.map(society => (
                    <option key={society} value={society}>{society}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={formData.status || 'Active'}
                  onValueChange={(value) => handleInputChange('status', value)}
                  disabled={isLoading}
                >
                  {VESSEL_STATUSES.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 border-t pt-4">
            {vessel && onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1"
              >
                🗑️ Delete Vessel
              </Button>
            )}
            <div className="flex-1 flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : vessel ? 'Update Vessel' : 'Create Vessel'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};