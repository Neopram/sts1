import React, { useState } from 'react';
import { Button } from '../Common/Button';
import { Alert } from '../Common/Alert';

interface STSOperation {
  operation_id: string;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled' | 'on-hold';
  operation_type: 'Transfer' | 'Bunkering' | 'Inspection' | 'Maintenance';
  supplier_vessel: string;
  receiver_vessel: string;
  cargo_type: string;
  quantity: number;
  quantity_unit: 'bbls' | 'tons' | 'm3' | 'gallons';
  scheduled_date: string;
  start_date?: string;
  completion_date?: string;
  location: string;
  weather_condition: string;
  sea_state: 'calm' | 'moderate' | 'rough' | 'very rough';
  visibility: string;
  wind_speed: number; // knots
  api_gravity?: number;
  temperature?: number;
  buyer_representative: string;
  seller_representative: string;
  surveyor_name: string;
  total_operations_today: number;
  estimated_duration_hours: number;
  actual_duration_hours?: number;
  quality_specs: string[];
  safety_incidents: number;
  environmental_incidents: number;
  compliance_violations: number;
  notes: string;
}

interface OperationsStats {
  total_operations_year: number;
  completed_this_month: number;
  in_progress_count: number;
  on_hold_count: number;
  total_cargo_transferred: number;
  total_revenue: number;
  safety_rating: number;
  average_operation_duration: number;
  incident_rate: number;
}

interface Party {
  party_id: string;
  party_name: string;
  party_type: 'Buyer' | 'Seller' | 'Broker' | 'Surveyor' | 'Inspector' | 'Charterer';
  contact_person: string;
  email: string;
  phone: string;
  country: string;
  company_registration: string;
  sanction_status: 'clear' | 'flagged' | 'blocked';
}

// Mock STS operations data
const MOCK_OPERATIONS: STSOperation[] = [
  {
    operation_id: 'STS-001',
    status: 'completed',
    operation_type: 'Transfer',
    supplier_vessel: 'MV Pacific Explorer',
    receiver_vessel: 'MT Global Carrier',
    cargo_type: 'Marine Gasoil (MGO)',
    quantity: 2500,
    quantity_unit: 'tons',
    scheduled_date: '2025-12-15',
    start_date: '2025-12-15',
    completion_date: '2025-12-15',
    location: 'Singapore Strait',
    weather_condition: 'Fair',
    sea_state: 'moderate',
    visibility: '5+ nm',
    wind_speed: 12,
    api_gravity: 31.5,
    temperature: 25,
    buyer_representative: 'John Smith',
    seller_representative: 'Ahmed Al-Mazrouei',
    surveyor_name: 'Robert Chen',
    total_operations_today: 1,
    estimated_duration_hours: 8,
    actual_duration_hours: 7.5,
    quality_specs: ['Sulfur <0.5%', 'Viscosity 32cSt', 'Flash Point >60°C'],
    safety_incidents: 0,
    environmental_incidents: 0,
    compliance_violations: 0,
    notes: 'Smooth operation. Quality specs met. No issues.',
  },
  {
    operation_id: 'STS-002',
    status: 'in-progress',
    operation_type: 'Transfer',
    supplier_vessel: 'MV Atlantic Storm',
    receiver_vessel: 'MT Energy Transport',
    cargo_type: 'Heavy Fuel Oil (HFO)',
    quantity: 4200,
    quantity_unit: 'tons',
    scheduled_date: '2025-12-16',
    start_date: '2025-12-16',
    location: 'Off Port Kelang',
    weather_condition: 'Good',
    sea_state: 'calm',
    visibility: '10+ nm',
    wind_speed: 8,
    api_gravity: 25.2,
    temperature: 35,
    buyer_representative: 'Maria Garcia',
    seller_representative: 'Yuki Tanaka',
    surveyor_name: 'Peter Johnson',
    total_operations_today: 2,
    estimated_duration_hours: 12,
    quality_specs: ['Sulfur <1.0%', 'Viscosity 180cSt', 'Pour Point <6°C'],
    safety_incidents: 0,
    environmental_incidents: 0,
    compliance_violations: 0,
    notes: 'Operation in progress. On schedule.',
  },
  {
    operation_id: 'STS-003',
    status: 'planned',
    operation_type: 'Transfer',
    supplier_vessel: 'MV Indian Ocean',
    receiver_vessel: 'MT Blue Water',
    cargo_type: 'Low Sulfur Fuel Oil (LSFO)',
    quantity: 3800,
    quantity_unit: 'tons',
    scheduled_date: '2025-12-18',
    location: 'Off Singapore',
    weather_condition: 'Unknown',
    sea_state: 'moderate',
    visibility: '5+ nm',
    wind_speed: 15,
    api_gravity: 28.5,
    temperature: 30,
    buyer_representative: 'Hassan Al-Rashid',
    seller_representative: 'Carlos Mendez',
    surveyor_name: 'Lisa Wong',
    total_operations_today: 3,
    estimated_duration_hours: 10,
    quality_specs: ['Sulfur <0.5%', 'Viscosity 40cSt', 'Flashpoint >60°C'],
    safety_incidents: 0,
    environmental_incidents: 0,
    compliance_violations: 0,
    notes: 'Scheduled for 18 Dec. Pre-operation checks ongoing.',
  },
  {
    operation_id: 'STS-004',
    status: 'on-hold',
    operation_type: 'Transfer',
    supplier_vessel: 'MV Cargo Master',
    receiver_vessel: 'MT Western Star',
    cargo_type: 'Marine Gasoil (MGO)',
    quantity: 2100,
    quantity_unit: 'tons',
    scheduled_date: '2025-12-17',
    location: 'Off Fujairah',
    weather_condition: 'Adverse',
    sea_state: 'rough',
    visibility: '1 nm',
    wind_speed: 28,
    api_gravity: 32.0,
    temperature: 22,
    buyer_representative: 'James Wilson',
    seller_representative: 'Elena Rossi',
    surveyor_name: 'Michael Chen',
    total_operations_today: 1,
    estimated_duration_hours: 8,
    quality_specs: ['Sulfur <0.5%', 'Viscosity 32cSt'],
    safety_incidents: 0,
    environmental_incidents: 0,
    compliance_violations: 0,
    notes: 'Operation on hold due to adverse weather. Expected to resume 19 Dec.',
  },
  {
    operation_id: 'STS-005',
    status: 'completed',
    operation_type: 'Inspection',
    supplier_vessel: 'MV Ocean Runner',
    receiver_vessel: 'N/A',
    cargo_type: 'Condition Survey',
    quantity: 1,
    quantity_unit: 'bbls',
    scheduled_date: '2025-12-14',
    start_date: '2025-12-14',
    completion_date: '2025-12-14',
    location: 'Singapore Strait',
    weather_condition: 'Fair',
    sea_state: 'calm',
    visibility: '5+ nm',
    wind_speed: 10,
    buyer_representative: 'Tom Davis',
    seller_representative: 'N/A',
    surveyor_name: 'Sarah Mitchell',
    total_operations_today: 1,
    estimated_duration_hours: 3,
    actual_duration_hours: 2.8,
    quality_specs: [],
    safety_incidents: 0,
    environmental_incidents: 0,
    compliance_violations: 0,
    notes: 'Condition survey completed. Vessel in good condition.',
  },
];

const MOCK_PARTIES: Party[] = [
  {
    party_id: 'PRT-001',
    party_name: 'Global Energy Trading Ltd',
    party_type: 'Buyer',
    contact_person: 'John Smith',
    email: 'j.smith@globalenergy.com',
    phone: '+65-6248-3333',
    country: 'Singapore',
    company_registration: 'RCB12345678',
    sanction_status: 'clear',
  },
  {
    party_id: 'PRT-002',
    party_name: 'Middle East Oil Suppliers',
    party_type: 'Seller',
    contact_person: 'Ahmed Al-Mazrouei',
    email: 'a.mazrouei@meoilsupply.ae',
    phone: '+971-4-308-5555',
    country: 'UAE',
    company_registration: 'AE-2024-001234',
    sanction_status: 'clear',
  },
  {
    party_id: 'PRT-003',
    party_name: 'Tropical Marine Surveys',
    party_type: 'Surveyor',
    contact_person: 'Robert Chen',
    email: 'r.chen@tropicalsurveys.sg',
    phone: '+65-6532-1000',
    country: 'Singapore',
    company_registration: 'SG-INC-98765432',
    sanction_status: 'clear',
  },
  {
    party_id: 'PRT-004',
    party_name: 'Pacific Brokerage Services',
    party_type: 'Broker',
    contact_person: 'Linda Wong',
    email: 'l.wong@pacificbroker.com',
    phone: '+60-3-2162-8888',
    country: 'Malaysia',
    company_registration: 'MY-2023-456789',
    sanction_status: 'clear',
  },
];

const calculateStats = (operations: STSOperation[]): OperationsStats => {
  const completed = operations.filter(o => o.status === 'completed');
  const totalCargo = operations.reduce((sum, o) => sum + o.quantity, 0);

  return {
    total_operations_year: 243,
    completed_this_month: completed.length,
    in_progress_count: operations.filter(o => o.status === 'in-progress').length,
    on_hold_count: operations.filter(o => o.status === 'on-hold').length,
    total_cargo_transferred: totalCargo,
    total_revenue: totalCargo * 285,
    safety_rating: 98.5,
    average_operation_duration: 9.2,
    incident_rate: 0.2,
  };
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return '#27ae60';
    case 'in-progress':
      return '#3498db';
    case 'planned':
      return '#f39c12';
    case 'on-hold':
      return '#e74c3c';
    case 'cancelled':
      return '#95a5a6';
    default:
      return '#7f8c8d';
  }
};

export const STSOperationsManager: React.FC = () => {
  const operations = MOCK_OPERATIONS;
  const parties = MOCK_PARTIES;
  const stats = calculateStats(operations);

  const [activeTab, setActiveTab] = useState<'operations' | 'parties'>('operations');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredOps = filterStatus === 'all' ? operations : operations.filter(o => o.status === filterStatus);

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50', margin: '0 0 8px 0' }}>
          ⚓ STS Operations Manager
        </h2>
        <p style={{ color: '#7f8c8d', fontSize: '14px', margin: 0 }}>
          Ship-to-Ship transfer coordination, cargo tracking, party management, and real-time monitoring
        </p>
      </div>

      {/* Key Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Year-to-Date Operations</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#3498db', margin: 0 }}>
            {stats.total_operations_year}
          </p>
        </div>
        <div style={{ background: '#d5f4e6', borderRadius: '12px', padding: '16px', border: '1px solid #27ae60' }}>
          <p style={{ fontSize: '12px', color: '#0e6251', margin: '0 0 8px 0', fontWeight: '600' }}>
            Completed (Month)
          </p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#27ae60', margin: 0 }}>
            {stats.completed_this_month}
          </p>
        </div>
        <div style={{ background: '#ebf5fb', borderRadius: '12px', padding: '16px', border: '1px solid #3498db' }}>
          <p style={{ fontSize: '12px', color: '#1f618d', margin: '0 0 8px 0', fontWeight: '600' }}>
            In Progress
          </p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#3498db', margin: 0 }}>
            {stats.in_progress_count}
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Total Cargo Transferred</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#e74c3c', margin: 0 }}>
            {(stats.total_cargo_transferred / 1000).toFixed(1)}K tons
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Safety Rating</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#27ae60', margin: 0 }}>
            {stats.safety_rating.toFixed(1)}%
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Total Revenue</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#9b59b6', margin: 0 }}>
            ${(stats.total_revenue / 1000000).toFixed(1)}M
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '2px solid #e0e6ed',
        }}
      >
        {['operations', 'parties'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: activeTab === tab ? '#3498db' : '#7f8c8d',
              borderBottom: activeTab === tab ? '3px solid #3498db' : '3px solid transparent',
              marginBottom: '-2px',
            }}
          >
            {tab === 'operations' && '⚓ Active Operations'}
            {tab === 'parties' && '👥 Parties & Contacts'}
          </button>
        ))}
      </div>

      {/* OPERATIONS TAB */}
      {activeTab === 'operations' && (
        <>
          <div
            style={{
              background: '#fff',
              border: '1px solid #e0e6ed',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}
          >
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#2c3e50', display: 'block', marginBottom: '8px' }}>
              Filter by Status
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['all', 'completed', 'in-progress', 'planned', 'on-hold'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: filterStatus === status ? '2px solid #3498db' : '1px solid #bdc3c7',
                    background: filterStatus === status ? '#ebf5fb' : '#fff',
                    color: filterStatus === status ? '#3498db' : '#7f8c8d',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {status.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredOps.map((op) => (
              <div
                key={op.operation_id}
                style={{
                  border: `2px solid ${getStatusColor(op.status)}`,
                  borderRadius: '12px',
                  padding: '16px',
                  background: getStatusColor(op.status) + '05',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#2c3e50', margin: '0 0 4px 0' }}>
                      {op.operation_id} - {op.cargo_type}
                    </p>
                    <p style={{ fontSize: '12px', color: '#7f8c8d', margin: 0 }}>
                      {op.operation_type} • {op.location}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: getStatusColor(op.status) + '20',
                      color: getStatusColor(op.status),
                    }}
                  >
                    {op.status.toUpperCase()}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <div>
                    <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '0 0 4px 0' }}>Supplier</p>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#2c3e50', margin: 0 }}>
                      {op.supplier_vessel}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '0 0 4px 0' }}>Receiver</p>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#2c3e50', margin: 0 }}>
                      {op.receiver_vessel}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '0 0 4px 0' }}>Quantity</p>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#e74c3c', margin: 0 }}>
                      {op.quantity.toLocaleString()} {op.quantity_unit}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '0 0 4px 0' }}>Duration</p>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#3498db', margin: 0 }}>
                      {op.actual_duration_hours || op.estimated_duration_hours} hrs
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '12px',
                    fontSize: '11px',
                    padding: '12px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    marginBottom: '12px',
                  }}
                >
                  <div>
                    <span style={{ color: '#7f8c8d' }}>Weather: </span>
                    <span style={{ fontWeight: '600', color: '#2c3e50' }}>{op.weather_condition}</span>
                  </div>
                  <div>
                    <span style={{ color: '#7f8c8d' }}>Sea State: </span>
                    <span style={{ fontWeight: '600', color: '#2c3e50' }}>{op.sea_state.toUpperCase()}</span>
                  </div>
                  <div>
                    <span style={{ color: '#7f8c8d' }}>Wind: </span>
                    <span style={{ fontWeight: '600', color: '#2c3e50' }}>{op.wind_speed} kts</span>
                  </div>
                  <div>
                    <span style={{ color: '#7f8c8d' }}>Visibility: </span>
                    <span style={{ fontWeight: '600', color: '#2c3e50' }}>{op.visibility}</span>
                  </div>
                </div>

                {(op.safety_incidents > 0 || op.environmental_incidents > 0 || op.compliance_violations > 0) && (
                  <Alert
                    variant="warning"
                    title="Incidents Reported"
                    message={`Safety: ${op.safety_incidents} | Environmental: ${op.environmental_incidents} | Compliance: ${op.compliance_violations}`}
                  />
                )}

                <div style={{ fontSize: '12px', color: '#34495e', padding: '8px 0', borderTop: '1px solid #e0e6ed', marginTop: '12px', paddingTop: '12px' }}>
                  <p style={{ margin: 0, fontWeight: '600', marginBottom: '4px' }}>📝 Notes:</p>
                  <p style={{ margin: 0, color: '#2c3e50' }}>{op.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* PARTIES TAB */}
      {activeTab === 'parties' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {parties.map((party) => (
            <div
              key={party.party_id}
              style={{
                background: '#fff',
                border: '1px solid #e0e6ed',
                borderRadius: '12px',
                padding: '16px',
                borderLeft: `4px solid ${party.sanction_status === 'clear' ? '#27ae60' : party.sanction_status === 'flagged' ? '#f39c12' : '#e74c3c'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: '#2c3e50', margin: '0 0 4px 0' }}>
                    {party.party_name}
                  </p>
                  <p style={{ fontSize: '12px', color: '#7f8c8d', margin: 0 }}>
                    {party.party_type}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: party.sanction_status === 'clear' ? '#d5f4e6' : party.sanction_status === 'flagged' ? '#fdeaa8' : '#fadbd8',
                    color: party.sanction_status === 'clear' ? '#0e6251' : party.sanction_status === 'flagged' ? '#d68910' : '#c0392b',
                  }}
                >
                  {party.sanction_status.toUpperCase()}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div>
                  <p style={{ color: '#7f8c8d', margin: '0 0 2px 0' }}>Contact</p>
                  <p style={{ color: '#2c3e50', margin: 0, fontWeight: '500' }}>{party.contact_person}</p>
                </div>
                <div>
                  <p style={{ color: '#7f8c8d', margin: '0 0 2px 0' }}>Email</p>
                  <p style={{ color: '#3498db', margin: 0, fontSize: '11px' }}>{party.email}</p>
                </div>
                <div>
                  <p style={{ color: '#7f8c8d', margin: '0 0 2px 0' }}>Phone</p>
                  <p style={{ color: '#2c3e50', margin: 0 }}>{party.phone}</p>
                </div>
                <div>
                  <p style={{ color: '#7f8c8d', margin: '0 0 2px 0' }}>Country & Registration</p>
                  <p style={{ color: '#2c3e50', margin: 0 }}>
                    {party.country} • {party.company_registration}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default STSOperationsManager;