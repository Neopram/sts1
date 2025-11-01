import React, { useState } from 'react';
import { Button } from '../Common/Button';
import { Alert } from '../Common/Alert';

interface ImportSession {
  session_id: string;
  filename: string;
  upload_date: string;
  imported_by: string;
  total_records: number;
  successfully_imported: number;
  failed_records: number;
  duplicate_records: number;
  validation_errors: number;
  status: 'completed' | 'in-progress' | 'failed' | 'pending-review';
  completion_time?: string;
  import_format: 'CSV' | 'Excel' | 'JSON' | 'XML';
  data_quality_score: number;
  notes?: string;
}

interface VesselImportRecord {
  row_number: number;
  imo_number: string;
  vessel_name: string;
  vessel_type: string;
  flag_state: string;
  grt: number;
  status: 'valid' | 'invalid' | 'duplicate' | 'warning';
  validation_errors?: string[];
  mapped_to_existing?: string;
}

interface DataValidationRule {
  rule_id: string;
  field_name: string;
  rule_description: string;
  validation_type: 'required' | 'format' | 'range' | 'unique' | 'lookup';
  is_critical: boolean;
}

// Mock import sessions data
const MOCK_IMPORT_SESSIONS: ImportSession[] = [
  {
    session_id: 'IMP-001',
    filename: 'Fleet_Master_2025-12-16.csv',
    upload_date: '2025-12-16',
    imported_by: 'Admin User',
    total_records: 127,
    successfully_imported: 125,
    failed_records: 2,
    duplicate_records: 0,
    validation_errors: 2,
    status: 'completed',
    completion_time: '2 min 34 sec',
    import_format: 'CSV',
    data_quality_score: 98.4,
    notes: 'Successful import. 2 vessels had incorrect GRT values.',
  },
  {
    session_id: 'IMP-002',
    filename: 'New_Vessels_Q4_2025.xlsx',
    upload_date: '2025-12-15',
    imported_by: 'Fleet Manager',
    total_records: 45,
    successfully_imported: 43,
    failed_records: 2,
    duplicate_records: 0,
    validation_errors: 2,
    status: 'completed',
    completion_time: '1 min 12 sec',
    import_format: 'Excel',
    data_quality_score: 95.6,
    notes: '2 vessels had missing STCW officer certification numbers.',
  },
  {
    session_id: 'IMP-003',
    filename: 'Partner_Fleet_Acquisition.csv',
    upload_date: '2025-12-14',
    imported_by: 'Operations Director',
    total_records: 89,
    successfully_imported: 85,
    failed_records: 4,
    duplicate_records: 0,
    validation_errors: 4,
    status: 'completed',
    completion_time: '3 min 08 sec',
    import_format: 'CSV',
    data_quality_score: 95.5,
    notes: 'Acquisition import. Some vessels had old insurance info requiring update.',
  },
  {
    session_id: 'IMP-004',
    filename: 'Charter_Fleet_2026.xlsx',
    upload_date: '2025-12-10',
    imported_by: 'Fleet Manager',
    total_records: 156,
    successfully_imported: 150,
    failed_records: 6,
    duplicate_records: 0,
    validation_errors: 6,
    status: 'completed',
    completion_time: '4 min 45 sec',
    import_format: 'Excel',
    data_quality_score: 96.2,
  },
];

const MOCK_VALIDATION_RULES: DataValidationRule[] = [
  {
    rule_id: 'VLD-001',
    field_name: 'IMO Number',
    rule_description: 'Must be valid IMO number (7 digits)',
    validation_type: 'format',
    is_critical: true,
  },
  {
    rule_id: 'VLD-002',
    field_name: 'Vessel Name',
    rule_description: 'Cannot be blank, max 50 characters',
    validation_type: 'required',
    is_critical: true,
  },
  {
    rule_id: 'VLD-003',
    field_name: 'Vessel Type',
    rule_description: 'Must match approved vessel type list',
    validation_type: 'lookup',
    is_critical: true,
  },
  {
    rule_id: 'VLD-004',
    field_name: 'GRT',
    rule_description: 'Must be between 100 and 200000 tons',
    validation_type: 'range',
    is_critical: true,
  },
  {
    rule_id: 'VLD-005',
    field_name: 'Flag State',
    rule_description: 'Must be valid ISO 3166 country code',
    validation_type: 'format',
    is_critical: true,
  },
  {
    rule_id: 'VLD-006',
    field_name: 'Build Year',
    rule_description: 'Cannot be in the future',
    validation_type: 'range',
    is_critical: false,
  },
];

const MOCK_SAMPLE_RECORDS: VesselImportRecord[] = [
  {
    row_number: 1,
    imo_number: '9876543',
    vessel_name: 'MV Pacific Explorer',
    vessel_type: 'Tanker',
    flag_state: 'SG',
    grt: 45680,
    status: 'valid',
  },
  {
    row_number: 2,
    imo_number: '9876544',
    vessel_name: 'MV Atlantic Storm',
    vessel_type: 'Tanker',
    flag_state: 'PA',
    grt: 52340,
    status: 'valid',
  },
  {
    row_number: 3,
    imo_number: 'INVALID',
    vessel_name: 'MV Indian Ocean',
    vessel_type: 'Bulk Carrier',
    flag_state: 'IN',
    grt: 58900,
    status: 'invalid',
    validation_errors: ['Invalid IMO number format'],
  },
  {
    row_number: 4,
    imo_number: '9876545',
    vessel_name: '',
    vessel_type: 'Tanker',
    flag_state: 'SG',
    grt: 48200,
    status: 'warning',
    validation_errors: ['Vessel name is blank'],
  },
  {
    row_number: 5,
    imo_number: '9876546',
    vessel_name: 'MV Cargo Master',
    vessel_type: 'Container Ship',
    flag_state: 'LR',
    grt: 92500,
    status: 'valid',
  },
];

const calculateImportStats = (sessions: ImportSession[]) => {
  const completed = sessions.filter(s => s.status === 'completed');
  const totalImported = sessions.reduce((sum, s) => sum + s.successfully_imported, 0);
  const totalFailed = sessions.reduce((sum, s) => sum + s.failed_records, 0);
  const avgQuality = sessions.reduce((sum, s) => sum + s.data_quality_score, 0) / sessions.length;

  return {
    total_import_sessions: sessions.length,
    total_vessels_imported: totalImported,
    total_import_failures: totalFailed,
    avg_data_quality: avgQuality,
    completed_sessions: completed.length,
    pending_review: sessions.filter(s => s.status === 'pending-review').length,
  };
};

export const BulkFleetImportManager: React.FC = () => {
  const sessions = MOCK_IMPORT_SESSIONS;
  const validationRules = MOCK_VALIDATION_RULES;
  const sampleRecords = MOCK_SAMPLE_RECORDS;
  const stats = calculateImportStats(sessions);

  const [activeTab, setActiveTab] = useState<'history' | 'new-import' | 'validation'>('history');
  const [showValidationDetails, setShowValidationDetails] = useState(false);

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50', margin: '0 0 8px 0' }}>
          📥 Bulk Fleet Import Manager
        </h2>
        <p style={{ color: '#7f8c8d', fontSize: '14px', margin: 0 }}>
          Mass vessel import, data validation, duplicate detection, and fleet synchronization
        </p>
      </div>

      {/* Key Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Total Sessions</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#3498db', margin: 0 }}>
            {stats.total_import_sessions}
          </p>
        </div>
        <div style={{ background: '#d5f4e6', borderRadius: '12px', padding: '16px', border: '1px solid #27ae60' }}>
          <p style={{ fontSize: '12px', color: '#0e6251', margin: '0 0 8px 0', fontWeight: '600' }}>
            ✅ Vessels Imported
          </p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#27ae60', margin: 0 }}>
            {stats.total_vessels_imported}
          </p>
        </div>
        <div style={{ background: '#fadbd8', borderRadius: '12px', padding: '16px', border: '1px solid #e74c3c' }}>
          <p style={{ fontSize: '12px', color: '#c0392b', margin: '0 0 8px 0', fontWeight: '600' }}>
            ❌ Failed Records
          </p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#e74c3c', margin: 0 }}>
            {stats.total_import_failures}
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Avg Data Quality</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#f39c12', margin: 0 }}>
            {stats.avg_data_quality.toFixed(1)}%
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
        {['history', 'new-import', 'validation'].map((tab) => (
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
            {tab === 'history' && '📋 Import History'}
            {tab === 'new-import' && '➕ New Import'}
            {tab === 'validation' && '✓ Validation Rules'}
          </button>
        ))}
      </div>

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              background: '#fff',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e0e6ed' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Session ID</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Filename</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Format</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Records</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Success</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Failed</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Quality</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, idx) => (
                <tr
                  key={session.session_id}
                  style={{
                    borderBottom: '1px solid #e0e6ed',
                    background: idx % 2 === 0 ? '#fff' : '#f8f9fa',
                  }}
                >
                  <td style={{ padding: '12px', fontWeight: '600', color: '#2c3e50' }}>
                    {session.session_id}
                  </td>
                  <td style={{ padding: '12px', color: '#7f8c8d' }}>
                    <p style={{ margin: 0, fontSize: '12px' }}>{session.filename}</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#95a5a6' }}>
                      {new Date(session.upload_date).toLocaleDateString()}
                    </p>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#2c3e50', fontWeight: '600' }}>
                    {session.import_format}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#2c3e50', fontWeight: '600' }}>
                    {session.total_records}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#27ae60', fontWeight: '600' }}>
                    {session.successfully_imported}
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      color: session.failed_records > 0 ? '#e74c3c' : '#7f8c8d',
                      fontWeight: '600',
                    }}
                  >
                    {session.failed_records}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <div
                        style={{
                          width: '60px',
                          height: '6px',
                          background: '#ecf0f1',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${session.data_quality_score}%`,
                            background: session.data_quality_score >= 95 ? '#27ae60' : session.data_quality_score >= 90 ? '#f39c12' : '#e74c3c',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#7f8c8d' }}>
                        {session.data_quality_score.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: session.status === 'completed' ? '#d5f4e6' : session.status === 'failed' ? '#fadbd8' : '#ecf0f1',
                        color: session.status === 'completed' ? '#0e6251' : session.status === 'failed' ? '#c0392b' : '#34495e',
                      }}
                    >
                      {session.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* NEW IMPORT TAB */}
      {activeTab === 'new-import' && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e0e6ed',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div
            style={{
              border: '2px dashed #3498db',
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center',
              marginBottom: '20px',
              background: '#ebf5fb',
            }}
          >
            <p style={{ fontSize: '32px', margin: '0 0 8px 0' }}>📂</p>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50', margin: '0 0 8px 0' }}>
              Drop file here or click to upload
            </p>
            <p style={{ fontSize: '13px', color: '#7f8c8d', margin: 0 }}>
              Supported formats: CSV, Excel, JSON, XML (max 50MB)
            </p>
            <Button
              style={{
                marginTop: '12px',
                background: '#3498db',
                color: '#fff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Browse Files
            </Button>
          </div>

          <div
            style={{
              background: '#f8f9fa',
              border: '1px solid #e0e6ed',
              borderRadius: '8px',
              padding: '16px',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#2c3e50' }}>
              📋 Import Options
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#2c3e50', display: 'block', marginBottom: '6px' }}>
                  Update Strategy
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #bdc3c7',
                    fontSize: '12px',
                  }}
                >
                  <option>Skip duplicates</option>
                  <option>Update existing</option>
                  <option>Merge data</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#2c3e50', display: 'block', marginBottom: '6px' }}>
                  Data Mapping Profile
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #bdc3c7',
                    fontSize: '12px',
                  }}
                >
                  <option>Standard IMO Format</option>
                  <option>Lloyd's Register Format</option>
                  <option>Custom Mapping</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#2c3e50', display: 'block', marginBottom: '6px' }}>
                  Validation Strictness
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #bdc3c7',
                    fontSize: '12px',
                  }}
                >
                  <option>Strict (Recommended)</option>
                  <option>Standard</option>
                  <option>Lenient</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VALIDATION RULES TAB */}
      {activeTab === 'validation' && (
        <>
          <Alert
            variant="info"
            title="Data Validation Rules"
            message="All fields marked as critical must pass validation for successful import. Warnings can be reviewed and overridden if necessary."
          />

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {validationRules.map((rule) => (
              <div
                key={rule.rule_id}
                style={{
                  background: '#fff',
                  border: `1px solid ${rule.is_critical ? '#e74c3c' : '#bdc3c7'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  borderLeft: `4px solid ${rule.is_critical ? '#e74c3c' : '#3498db'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#2c3e50', margin: '0 0 4px 0' }}>
                      {rule.field_name}
                    </p>
                    <p style={{ fontSize: '12px', color: '#34495e', margin: 0 }}>
                      {rule.rule_description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: rule.validation_type === 'required' ? '#fadbd8' : '#ebf5fb',
                        color: rule.validation_type === 'required' ? '#c0392b' : '#1f618d',
                      }}
                    >
                      {rule.validation_type.toUpperCase()}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: rule.is_critical ? '#fadbd8' : '#d5f4e6',
                        color: rule.is_critical ? '#c0392b' : '#0e6251',
                      }}
                    >
                      {rule.is_critical ? 'CRITICAL' : 'WARNING'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sample Data Validation */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#2c3e50' }}>
              📊 Sample Validation Results
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  background: '#fff',
                  borderRadius: '8px',
                }}
              >
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e0e6ed' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>
                      Row
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>
                      IMO
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>
                      Vessel Name
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>
                      Type
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>
                      Status
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sampleRecords.map((record, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #e0e6ed',
                        background: idx % 2 === 0 ? '#fff' : '#f8f9fa',
                      }}
                    >
                      <td style={{ padding: '12px', color: '#7f8c8d' }}>{record.row_number}</td>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#2c3e50' }}>
                        {record.imo_number}
                      </td>
                      <td style={{ padding: '12px', color: '#2c3e50' }}>{record.vessel_name || '—'}</td>
                      <td style={{ padding: '12px', color: '#7f8c8d' }}>{record.vessel_type}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background:
                              record.status === 'valid'
                                ? '#d5f4e6'
                                : record.status === 'invalid'
                                  ? '#fadbd8'
                                  : '#fdeaa8',
                            color:
                              record.status === 'valid'
                                ? '#0e6251'
                                : record.status === 'invalid'
                                  ? '#c0392b'
                                  : '#d68910',
                          }}
                        >
                          {record.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '11px', color: '#7f8c8d' }}>
                        {record.validation_errors && record.validation_errors.length > 0
                          ? record.validation_errors.join('; ')
                          : '✓ OK'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BulkFleetImportManager;