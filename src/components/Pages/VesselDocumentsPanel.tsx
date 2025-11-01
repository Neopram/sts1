import React, { useState } from 'react';
import { Alert } from '../Common/Alert';
import { Button } from '../Common/Button';

interface VesselDocument {
  id: string;
  vessel_name: string;
  type: string;
  category: 'Certificate' | 'Insurance' | 'Crew' | 'Operational';
  issue_date: string;
  expiry_date: string;
  status: 'Valid' | 'Expiring' | 'Expired';
  file_url?: string;
  criticality: 'high' | 'medium' | 'low';
}

interface VesselDocumentsPanelProps {
  documents?: VesselDocument[];
  isLoading?: boolean;
}

const DOCUMENT_CATEGORIES = {
  Certificate: [
    { name: 'Class Certificate', criticality: 'high' },
    { name: 'ISM Certificate', criticality: 'high' },
    { name: 'SOLAS Certificate', criticality: 'high' },
    { name: 'MARPOL Certificate', criticality: 'high' },
    { name: 'Load Line Certificate', criticality: 'high' },
    { name: 'Safety Construction Certificate', criticality: 'medium' },
  ],
  Insurance: [
    { name: 'P&I Insurance', criticality: 'high' },
    { name: 'Hull Insurance', criticality: 'high' },
    { name: 'War Risk Insurance', criticality: 'medium' },
  ],
  Crew: [
    { name: 'Crew Licenses', criticality: 'high' },
    { name: 'Medical Certificates', criticality: 'high' },
    { name: 'Training Records', criticality: 'medium' },
  ],
  Operational: [
    { name: 'Safety Manual', criticality: 'medium' },
    { name: 'Procedure Manuals', criticality: 'medium' },
    { name: 'Maintenance Plans', criticality: 'low' },
  ],
};

const calculateDaysToExpiry = (expiryDate: string): number => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getExpiryStatus = (expiryDate: string): 'Valid' | 'Expiring' | 'Expired' => {
  const daysLeft = calculateDaysToExpiry(expiryDate);
  if (daysLeft < 0) return 'Expired';
  if (daysLeft < 30) return 'Expiring';
  return 'Valid';
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'Valid':
      return 'bg-green-100 text-green-800';
    case 'Expiring':
      return 'bg-yellow-100 text-yellow-800';
    case 'Expired':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Mock data for demonstration
const MOCK_DOCUMENTS: VesselDocument[] = [
  // MV Pacific Explorer
  {
    id: 'doc_001',
    vessel_name: 'MV Pacific Explorer',
    type: 'Class Certificate',
    category: 'Certificate',
    issue_date: '2021-05-15',
    expiry_date: '2026-05-15',
    status: 'Valid',
    criticality: 'high',
    file_url: '#',
  },
  {
    id: 'doc_002',
    vessel_name: 'MV Pacific Explorer',
    type: 'ISM Certificate',
    category: 'Certificate',
    issue_date: '2022-03-01',
    expiry_date: '2025-02-28',
    status: 'Expiring',
    criticality: 'high',
    file_url: '#',
  },
  {
    id: 'doc_003',
    vessel_name: 'MV Pacific Explorer',
    type: 'P&I Insurance',
    category: 'Insurance',
    issue_date: '2024-06-01',
    expiry_date: '2025-05-31',
    status: 'Valid',
    criticality: 'high',
    file_url: '#',
  },
  // MV Atlantic Storm
  {
    id: 'doc_004',
    vessel_name: 'MV Atlantic Storm',
    type: 'Class Certificate',
    category: 'Certificate',
    issue_date: '2022-08-20',
    expiry_date: '2027-08-20',
    status: 'Valid',
    criticality: 'high',
    file_url: '#',
  },
  {
    id: 'doc_005',
    vessel_name: 'MV Atlantic Storm',
    type: 'Crew Licenses',
    category: 'Crew',
    issue_date: '2023-01-15',
    expiry_date: '2025-01-14',
    status: 'Valid',
    criticality: 'high',
    file_url: '#',
  },
  // MV Indian Ocean
  {
    id: 'doc_006',
    vessel_name: 'MV Indian Ocean',
    type: 'Class Certificate',
    category: 'Certificate',
    issue_date: '2020-11-10',
    expiry_date: '2024-11-10',
    status: 'Expired',
    criticality: 'high',
    file_url: '#',
  },
  {
    id: 'doc_007',
    vessel_name: 'MV Indian Ocean',
    type: 'Medical Certificates',
    category: 'Crew',
    issue_date: '2023-06-01',
    expiry_date: '2024-11-30',
    status: 'Expiring',
    criticality: 'high',
    file_url: '#',
  },
];

export const VesselDocumentsPanel: React.FC<VesselDocumentsPanelProps> = ({
  documents = MOCK_DOCUMENTS,
  isLoading = false,
}) => {
  const [expandedVessel, setExpandedVessel] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);

  // Group documents by vessel and category
  const groupedDocs = documents.reduce((acc: any, doc) => {
    if (!acc[doc.vessel_name]) {
      acc[doc.vessel_name] = {};
    }
    if (!acc[doc.vessel_name][doc.category]) {
      acc[doc.vessel_name][doc.category] = [];
    }
    acc[doc.vessel_name][doc.category].push(doc);
    return acc;
  }, {});

  // Count document status
  const docStats = {
    total: documents.length,
    valid: documents.filter(d => d.status === 'Valid').length,
    expiring: documents.filter(d => d.status === 'Expiring').length,
    expired: documents.filter(d => d.status === 'Expired').length,
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-gray-600">Total Documents</p>
          <p className="text-2xl font-bold text-blue-600">{docStats.total}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-gray-600">Valid</p>
          <p className="text-2xl font-bold text-green-600">✅ {docStats.valid}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <p className="text-sm text-gray-600">Expiring Soon</p>
          <p className="text-2xl font-bold text-yellow-600">⚠️ {docStats.expiring}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <p className="text-sm text-gray-600">Expired</p>
          <p className="text-2xl font-bold text-red-600">🔴 {docStats.expired}</p>
        </div>
      </div>

      {/* Alerts */}
      {docStats.expired > 0 && (
        <Alert
          variant="error"
          title="Urgent Action Required"
          message={`You have ${docStats.expired} expired document(s). Please renew them immediately to maintain compliance.`}
        />
      )}

      {docStats.expiring > 0 && (
        <Alert
          variant="warning"
          title="Documents Expiring Soon"
          message={`${docStats.expiring} document(s) will expire within 30 days. Please arrange renewal.`}
        />
      )}

      {/* Vessel-wise Document View */}
      <div className="space-y-4">
        {Object.entries(groupedDocs).map(([vesselName, categories]: [string, any]) => (
          <div key={vesselName} className="border rounded-lg overflow-hidden">
            {/* Vessel Header */}
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 cursor-pointer hover:from-blue-600 hover:to-blue-700"
              onClick={() => setExpandedVessel(expandedVessel === vesselName ? null : vesselName)}
            >
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">
                  🚢 {vesselName}
                </h3>
                <span className="text-sm">
                  {expandedVessel === vesselName ? '▼' : '▶'} {Object.values(categories).flat().length} documents
                </span>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedVessel === vesselName && (
              <div className="bg-gray-50 p-4 space-y-4">
                {Object.entries(categories).map(([category, docs]: [string, any]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="font-semibold text-sm text-gray-700 bg-white p-2 rounded">
                      📂 {category} ({docs.length})
                    </h4>

                    <div className="space-y-2">
                      {docs.map((doc: VesselDocument) => {
                        const daysLeft = calculateDaysToExpiry(doc.expiry_date);
                        return (
                          <div
                            key={doc.id}
                            className="bg-white rounded p-3 border border-gray-200 hover:border-blue-300 transition"
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">{doc.type}</span>
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeColor(doc.status)}`}>
                                    {doc.status}
                                    {daysLeft >= 0 && doc.status === 'Expiring' && ` (${daysLeft}d)`}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1 space-y-1">
                                  <p>Issued: {new Date(doc.issue_date).toLocaleDateString()}</p>
                                  <p>Expires: {new Date(doc.expiry_date).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(doc.file_url || '#', '_blank')}
                                >
                                  📄
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setUploadingFile(doc.id)}
                                >
                                  📤
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Document Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => setSelectedCategory(category)}
                    >
                      ➕ Add Document
                    </Button>
                  </div>
                ))}

                {/* Upload New Document to Vessel */}
                <div className="bg-white rounded p-4 border-2 border-dashed border-blue-300">
                  <div className="space-y-2">
                    <p className="font-semibold text-sm">📤 Upload New Document</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(DOCUMENT_CATEGORIES).map(cat => (
                        <Button
                          key={cat}
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedCategory(cat)}
                          className="text-xs"
                        >
                          {cat}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fleet-wide Document Status */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">📊 Fleet Document Compliance Score</h3>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm opacity-90">Overall Compliance</p>
            <p className="text-3xl font-bold">
              {Math.round((docStats.valid / docStats.total) * 100)}%
            </p>
          </div>
          <div>
            <p className="text-sm opacity-90">Critical Issues</p>
            <p className="text-3xl font-bold">
              {docStats.expired}
            </p>
          </div>
          <div>
            <p className="text-sm opacity-90">Requires Attention</p>
            <p className="text-3xl font-bold">
              {docStats.expiring}
            </p>
          </div>
        </div>

        <div className="bg-white bg-opacity-20 rounded p-3 text-sm">
          <p>
            {docStats.expired === 0 && docStats.expiring === 0
              ? '✅ All documents are current and valid.'
              : `⚠️ Action required: ${docStats.expired} expired, ${docStats.expiring} expiring soon.`}
          </p>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          📥 Import Documents (Bulk Upload)
        </Button>
        <Button variant="outline" size="sm">
          📊 Export Document List
        </Button>
        <Button variant="outline" size="sm">
          📧 Send Renewal Reminders
        </Button>
        <Button variant="outline" size="sm">
          📑 Generate Compliance Report
        </Button>
      </div>
    </div>
  );
};