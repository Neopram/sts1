// API Types for STS Clearance Hub
export interface RoomSummary {
  room_id: string;
  title: string;
  location: string;
  sts_eta: string;
  progress_percentage: number;
  total_required_docs: number;
  resolved_required_docs: number;
  blockers: Document[];
  expiring_soon: Document[];
}

export interface Document {
  id: string;
  type_code: string;
  type_name: string;
  status: 'missing' | 'under_review' | 'approved' | 'expired';
  expires_on?: string;
  uploaded_by?: string;
  uploaded_at?: string;
  notes?: string;
  required: boolean;
  criticality: 'high' | 'med' | 'low';
  criticality_score: number;
}

export interface Activity {
  id: string;
  type: 'approval' | 'upload' | 'status_change' | 'system' | 'reminder';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
}

export interface Message {
  id: string;
  sender: string;
  sender_name: string;
  sender_role?: string;
  content: string;
  timestamp: string;
  type: 'text' | 'system' | 'document' | 'notification';
  status?: 'sent' | 'delivered' | 'read';
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  metadata?: {
    document_id?: string;
    action?: string;
  };
}

export interface Room {
  id: string;
  title: string;
  location: string;
  sts_eta: string;
}

export interface User {
  email: string;
  role: 'owner' | 'charterer' | 'broker' | 'viewer';
  name: string;
}

export interface DocumentType {
  code: string;
  name: string;
  description?: string;
  required?: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}