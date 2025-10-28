/**
 * OCIMF (Oil Companies International Marine Forum) Standard Documents
 * Defines all required documents for STS operations
 */

import { OCIMFDocument } from '../types/documents';

/**
 * Standard OCIMF documents required for STS operations
 * Based on industry best practices and regulatory requirements
 */
export const OCIMF_DOCUMENTS: OCIMFDocument[] = [
  // ========== VESSEL DOCUMENTATION (HIGH PRIORITY) ==========
  {
    id: 'q88',
    code: 'Q88',
    name: 'Q88 Vessel Questionnaire',
    category: 'vessel',
    description: 'Updated vessel information questionnaire including current condition and recent repairs',
    isRequired: true,
    hasExpiry: true,
    expiryWarningDays: 30,
    criticality: 'high',
    sortOrder: 1
  },
  {
    id: 'class_status',
    code: 'CLASS',
    name: 'Class Status Report',
    category: 'vessel',
    description: 'Current classification society status including conditions and memoranda',
    isRequired: true,
    hasExpiry: true,
    expiryWarningDays: 30,
    criticality: 'high',
    sortOrder: 2
  },
  {
    id: 'iopp_form_b',
    code: 'IOPP-B',
    name: 'IOPP Form B',
    category: 'vessel',
    description: 'International Oil Pollution Prevention Certificate - Form B',
    isRequired: true,
    hasExpiry: true,
    expiryWarningDays: 60,
    criticality: 'high',
    sortOrder: 3
  },
  {
    id: 'meg4_analysis',
    code: 'MEG4',
    name: 'MEG4 Fuel Analysis',
    category: 'technical',
    description: 'Marine Fuel Oil Analysis Report',
    isRequired: true,
    hasExpiry: true,
    expiryWarningDays: 30,
    criticality: 'high',
    sortOrder: 4
  },
  {
    id: 'isp_code_cert',
    code: 'ISM',
    name: 'ISM Code Safety Management Certificate',
    category: 'operations',
    description: 'International Safety Management Code Certificate',
    isRequired: true,
    hasExpiry: true,
    expiryWarningDays: 60,
    criticality: 'high',
    sortOrder: 5
  },

  // ========== INSURANCE DOCUMENTATION (HIGH PRIORITY) ==========
  {
    id: 'pi_certificate',
    code: 'P&I',
    name: 'P&I Insurance Certificate',
    category: 'insurance',
    description: 'Protection & Indemnity Insurance Certificate',
    isRequired: true,
    hasExpiry: true,
    expiryWarningDays: 60,
    criticality: 'high',
    sortOrder: 6
  },
  {
    id: 'hull_insurance',
    code: 'HULL',
    name: 'Hull Insurance Certificate',
    category: 'insurance',
    description: 'Marine Hull & Machinery Insurance Certificate',
    isRequired: true,
    hasExpiry: true,
    expiryWarningDays: 60,
    criticality: 'high',
    sortOrder: 7
  },

  // ========== SANCTIONS & COMPLIANCE (HIGH PRIORITY) ==========
  {
    id: 'ofac_screening',
    code: 'OFAC',
    name: 'OFAC Screening Report',
    category: 'sanctions',
    description: 'Office of Foreign Assets Control sanction screening confirmation',
    isRequired: true,
    hasExpiry: false,
    expiryWarningDays: 0,
    criticality: 'high',
    sortOrder: 8
  },
  {
    id: 'eu_sanctions',
    code: 'EU-SANCTIONS',
    name: 'EU Sanctions List Verification',
    category: 'sanctions',
    description: 'Verification against EU consolidated sanctions list',
    isRequired: true,
    hasExpiry: false,
    expiryWarningDays: 0,
    criticality: 'high',
    sortOrder: 9
  },
  {
    id: 'un_sanctions',
    code: 'UN-SANCTIONS',
    name: 'UN Sanctions List Verification',
    category: 'sanctions',
    description: 'Verification against UN consolidated sanctions list',
    isRequired: true,
    hasExpiry: false,
    expiryWarningDays: 0,
    criticality: 'high',
    sortOrder: 10
  },

  // ========== CREW DOCUMENTATION (MEDIUM PRIORITY) ==========
  {
    id: 'crew_manifest',
    code: 'CREW-MANIFEST',
    name: 'Crew Manifest',
    category: 'crew',
    description: 'Complete crew manifest with nationality and certifications',
    isRequired: true,
    hasExpiry: false,
    expiryWarningDays: 0,
    criticality: 'med',
    sortOrder: 11
  },
  {
    id: 'stcw_certifications',
    code: 'STCW',
    name: 'STCW Certifications',
    category: 'crew',
    description: 'Standards of Training, Certification and Watchkeeping certificates',
    isRequired: true,
    hasExpiry: true,
    expiryWarningDays: 60,
    criticality: 'med',
    sortOrder: 12
  },

  // ========== TECHNICAL DOCUMENTATION (MEDIUM PRIORITY) ==========
  {
    id: 'stability_report',
    code: 'STABILITY',
    name: 'Stability Report',
    category: 'technical',
    description: 'Vessel stability and hydrostatic information',
    isRequired: true,
    hasExpiry: false,
    expiryWarningDays: 0,
    criticality: 'med',
    sortOrder: 13
  },
  {
    id: 'cargo_hold_cert',
    code: 'CARGO-HOLD',
    name: 'Cargo Hold Certificate',
    category: 'technical',
    description: 'Cargo hold cleaning and inspection certificate',
    isRequired: true,
    hasExpiry: true,
    expiryWarningDays: 30,
    criticality: 'med',
    sortOrder: 14
  },
  {
    id: 'ballast_certificate',
    code: 'BALLAST',
    name: 'Ballast Tank Certificate',
    category: 'technical',
    description: 'Ballast tank inspection and certification',
    isRequired: true,
    hasExpiry: true,
    expiryWarningDays: 30,
    criticality: 'med',
    sortOrder: 15
  },

  // ========== OPERATIONAL DOCUMENTATION (MEDIUM PRIORITY) ==========
  {
    id: 'sog_certificate',
    code: 'SOG',
    name: 'Safety of Life at Sea Certificate',
    category: 'operations',
    description: 'SOLAS compliance certificate',
    isRequired: true,
    hasExpiry: true,
    expiryWarningDays: 60,
    criticality: 'med',
    sortOrder: 16
  },
  {
    id: 'marpol_certificate',
    code: 'MARPOL',
    name: 'MARPOL Certificate',
    category: 'operations',
    description: 'International Convention for Prevention of Pollution from Ships',
    isRequired: true,
    hasExpiry: true,
    expiryWarningDays: 60,
    criticality: 'med',
    sortOrder: 17
  },
  {
    id: 'loadline_cert',
    code: 'LOADLINE',
    name: 'Load Line Certificate',
    category: 'operations',
    description: 'International Load Line Certificate',
    isRequired: true,
    hasExpiry: true,
    expiryWarningDays: 60,
    criticality: 'med',
    sortOrder: 18
  },

  // ========== OPTIONAL DOCUMENTATION (LOW PRIORITY) ==========
  {
    id: 'additional_compliance',
    code: 'COMPLIANCE',
    name: 'Additional Compliance Documents',
    category: 'operations',
    description: 'Any additional compliance documents required by charterer',
    isRequired: false,
    hasExpiry: false,
    expiryWarningDays: 0,
    criticality: 'low',
    sortOrder: 19
  }
];

/**
 * Default filter configuration
 */
export const DEFAULT_MISSING_DOCS_FILTER = {
  status: 'all' as const,
  priority: 'all' as const,
  category: 'all' as const,
  searchTerm: '',
  sortBy: 'priority' as const,
  sortOrder: 'desc' as const
};

/**
 * Default user configuration for missing documents
 */
export const DEFAULT_MISSING_DOCS_CONFIG = {
  autoRefresh: true,
  refreshInterval: 300, // 5 minutes
  defaultSort: 'priority' as const,
  defaultFilter: 'critical' as const,
  showNotifications: true,
  hideCompleted: false
};

/**
 * Category labels for UI display
 */
export const CATEGORY_LABELS = {
  vessel: 'Vessel Documentation',
  insurance: 'Insurance',
  sanctions: 'Sanctions & Compliance',
  operations: 'Operations',
  crew: 'Crew Certifications',
  technical: 'Technical'
};

/**
 * Category descriptions
 */
export const CATEGORY_DESCRIPTIONS = {
  vessel: 'Vessel-specific information and condition reports',
  insurance: 'Insurance coverage and policy documents',
  sanctions: 'Sanctions screening and compliance verification',
  operations: 'Operational compliance and safety certificates',
  crew: 'Crew certifications and requirements',
  technical: 'Technical vessel specifications and surveys'
};

/**
 * Status labels for UI display
 */
export const STATUS_LABELS = {
  missing: 'Missing',
  under_review: 'Under Review',
  approved: 'Approved',
  expired: 'Expired'
};

/**
 * Priority labels for UI display
 */
export const PRIORITY_LABELS = {
  high: 'Critical',
  med: 'Important',
  low: 'Optional'
};

/**
 * Priority colors for UI
 */
export const PRIORITY_COLORS = {
  high: 'red',
  med: 'amber',
  low: 'green'
};

/**
 * Get document by ID
 */
export function getOCIMFDocumentById(id: string): OCIMFDocument | undefined {
  return OCIMF_DOCUMENTS.find(doc => doc.id === id);
}

/**
 * Get documents by category
 */
export function getOCIMFDocumentsByCategory(
  category: OCIMFDocument['category']
): OCIMFDocument[] {
  return OCIMF_DOCUMENTS.filter(doc => doc.category === category).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

/**
 * Get all required documents
 */
export function getRequiredOCIMFDocuments(): OCIMFDocument[] {
  return OCIMF_DOCUMENTS.filter(doc => doc.isRequired).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

/**
 * Get all high-priority documents
 */
export function getCriticalOCIMFDocuments(): OCIMFDocument[] {
  return OCIMF_DOCUMENTS.filter(doc => doc.criticality === 'high').sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}