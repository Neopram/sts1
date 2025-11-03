/**
 * 📝 SESSION CREATION PAGE
 * 
 * Página para crear nuevas operaciones STS
 * Accesible solo por: Admin, Broker, Charterer, Owner
 * 
 * Integra el contenido de sts-session-creation.html como componente React
 * con validación de permisos y flujo mejorado
 */

import React, { useState, useCallback } from 'react';
import { usePolicy } from '../../contexts/PolicyContext';
import { useApp } from '../../contexts/AppContext';
import './SessionCreationPage.css';

interface SessionFormData {
  vesselName: string;
  vesselIMO: string;
  operationType: 'STS' | 'PORT_CALL' | 'INSPECTION';
  eta: string;
  location: string;
  description: string;
  participants: string[];
}

/**
 * Componente principal
 */
export const SessionCreationPage: React.FC = () => {
  const { user } = useApp();
  const { canCreateOperation } = usePolicy();
  const [formData, setFormData] = useState<SessionFormData>({
    vesselName: '',
    vesselIMO: '',
    operationType: 'STS',
    eta: '',
    location: '',
    description: '',
    participants: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Verificar permisos
  if (!canCreateOperation()) {
    return (
      <div className="session-creation-container error-state">
        <div className="error-card">
          <h2>Access Denied</h2>
          <p>Your role ({user?.role}) does not have permission to create operations.</p>
          <p className="text-muted">Only Admin, Broker, Charterer, and Shipowner roles can create new STS sessions.</p>
          <a href="/overview" className="btn-primary">Go Back to Overview</a>
        </div>
      </div>
    );
  }
  
  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Validaciones básicas
      if (!formData.vesselName || !formData.vesselIMO || !formData.eta) {
        throw new Error('Please fill in all required fields');
      }
      
      // Aquí iría la lógica de envío al backend
      console.log('[SESSION CREATION] Submitting:', formData);
      
      // Mock: simular envío
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Si llegamos aquí, fue exitoso
      setSuccess(true);
      setFormData({
        vesselName: '',
        vesselIMO: '',
        operationType: 'STS',
        eta: '',
        location: '',
        description: '',
        participants: []
      });
      
      // Mostrar mensaje de éxito durante 3 segundos
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('[SESSION CREATION] Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="session-creation-container">
      <div className="session-creation-header">
        <h1>Create New STS Operation</h1>
        <p className="subtitle">
          Initialize a new marine service operation session
        </p>
      </div>
      
      <div className="session-creation-content">
        {/* Tarjeta informativa */}
        <div className="info-card">
          <h3>📋 Operation Information</h3>
          <p>
            You are creating this operation as <strong>{user?.role}</strong> 
            ({user?.company || user?.email})
          </p>
          <p className="text-muted">
            All participants will receive notifications about this new operation.
          </p>
        </div>
        
        {/* Mensajes de estado */}
        {error && (
          <div className="alert alert-error">
            <span>❌ {error}</span>
            <button 
              onClick={() => setError(null)}
              className="alert-close"
            >×</button>
          </div>
        )}
        
        {success && (
          <div className="alert alert-success">
            <span>✅ Operation created successfully!</span>
          </div>
        )}
        
        {/* Formulario */}
        <form onSubmit={handleSubmit} className="session-creation-form">
          {/* Fila 1: Vessel Info */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="vesselName">Vessel Name *</label>
              <input
                id="vesselName"
                type="text"
                name="vesselName"
                value={formData.vesselName}
                onChange={handleInputChange}
                placeholder="e.g., MT Golden Sun"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="vesselIMO">Vessel IMO *</label>
              <input
                id="vesselIMO"
                type="text"
                name="vesselIMO"
                value={formData.vesselIMO}
                onChange={handleInputChange}
                placeholder="e.g., 9876543"
                pattern="\\d{7}"
                maxLength={7}
                required
              />
            </div>
          </div>
          
          {/* Fila 2: Operation Type & ETA */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="operationType">Operation Type *</label>
              <select
                id="operationType"
                name="operationType"
                value={formData.operationType}
                onChange={handleInputChange}
              >
                <option value="STS">Ship-to-Ship (STS)</option>
                <option value="PORT_CALL">Port Call</option>
                <option value="INSPECTION">Inspection</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="eta">ETA (Estimated Time of Arrival) *</label>
              <input
                id="eta"
                type="datetime-local"
                name="eta"
                value={formData.eta}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          
          {/* Fila 3: Location */}
          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="location">Location / Port *</label>
              <input
                id="location"
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Singapore Strait"
              />
            </div>
          </div>
          
          {/* Fila 4: Description */}
          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="description">Description / Notes</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Additional details about this operation..."
                rows={4}
              />
            </div>
          </div>
          
          {/* Botones */}
          <div className="form-actions">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Creating...' : 'Create Operation'}
            </button>
            <a href="/overview" className="btn btn-secondary">
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionCreationPage;