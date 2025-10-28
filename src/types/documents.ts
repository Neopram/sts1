/**
 * Document and OCIMF types for STS Clearance Hub
 * Defines all TypeScript interfaces for missing documents management
 */

/**
 * OCIMF Document Definition
 * Represents a standardized document type in the STS process
 */
export interface OCIMFDocument {
  id: string;
  code: string;
  name: string;
  category: 'vessel' | 'insurance' | 'sanctions' | 'operations' | 'crew' | 'technical';
  description: string;
  isRequired: boolean;
  hasExpiry: boolean;
  expiryWarningDays: number; // days before expiry to show warning
  criticality: 'high' | 'med' | 'low';
  sortOrder: number;
}

/**
 * Document Status
 * All possible states a document can be in
 */
export type DocumentStatus = 'missing' | 'under_review' | 'approved' | 'expired';

/**
 * Document Priority
 * Derived from status and expiry date
 */
export type DocumentPriority = 'high' | 'med' | 'low';

/**
 * Missing Document Status
 * Represents a document that is missing, expiring, or has issues
 */
export interface MissingDocumentStatus {
  id: string;
  type: OCIMFDocument;
  status: DocumentStatus;
  priority: DocumentPriority;
  reason: 'missing' | 'expired' | 'expiring_soon' | 'under_review';
  daysUntilExpiry?: number; // negative if already expired
  uploadedAt?: string; // ISO format
  expiresOn?: string; // ISO format
  uploadedBy?: string;
  notes?: string;
  room?: {
    id: string;
    title: string;
    location: string;
  };
  vessel?: {
    id: string;
    name: string;
    imo: string;
    vesselType: string;
  };
}

/**
 * Missing Documents Overview
 * Aggregated view of all missing/expiring documents
 */
export interface MissingDocumentsOverview {
  summary: {
    totalDocuments: number;
    missingCount: number;
    expiringCount: number;
    expiredCount: number;
    underReviewCount: number;
    criticalCount: number; // high priority items
  };
  categories: {
    missing: MissingDocumentStatus[];
    expiring: MissingDocumentStatus[];
    expired: MissingDocumentStatus[];
    underReview: MissingDocumentStatus[];
  };
  statistics: {
    completionPercentage: number;
    lastUpdated: string;
    expirationRiskScore: number; // 0-100
  };
}

/**
 * Filter Options for Missing Documents
 */
export interface MissingDocumentsFilter {
  status?: DocumentStatus | 'all';
  priority?: DocumentPriority | 'all';
  category?: OCIMFDocument['category'] | 'all';
  searchTerm?: string;
  sortBy?: 'priority' | 'expiry' | 'uploadDate' | 'name';
  sortOrder?: 'asc' | 'desc';
}

/**
 * User Configuration for Missing Documents View
 */
export interface MissingDocumentsConfig {
  autoRefresh: boolean;
  refreshInterval: number; // seconds
  defaultSort: 'priority' | 'expiry' | 'uploadDate';
  defaultFilter: 'all' | 'critical' | 'missing' | 'expiring';
  showNotifications: boolean;
  hideCompleted: boolean;
}

/**
 * Action request for missing document operations
 */
export interface MissingDocumentAction {
  documentId: string;
  action: 'upload' | 'remind' | 'acknowledge' | 'ignore' | 'download_template';
  data?: Record<string, any>;
}

/**
 * Response from missing document action
 */
export interface MissingDocumentActionResponse {
  success: boolean;
  message: string;
  data?: any;
}