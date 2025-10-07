// Complete API service for STS Clearance Hub - Production Ready
import { RoomSummary, Activity, Message, DocumentType } from '../types/api';

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

class ApiService {
  private baseURL: string;
  private token: string | null;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    this.token = localStorage.getItem('auth-token');
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<any> {
    return this.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async validateToken(): Promise<any> {
    return this.request('/api/v1/auth/validate');
  }

  // Rooms Management
  async getRooms(): Promise<any[]> {
    return this.request('/api/v1/rooms');
  }

  async createRoom(roomData: any): Promise<any> {
    return this.request('/api/v1/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData)
    });
  }

  // Cockpit Data
  async getRoomSummary(roomId: string): Promise<RoomSummary> {
    return this.request(`/api/v1/rooms/${roomId}/summary`);
  }

  async getRoomDocuments(roomId: string): Promise<any> {
    return this.request(`/api/v1/rooms/${roomId}/documents`);
  }

  // Document Management
  async uploadDocument(
    roomId: string, 
    typeCode: string, 
    file: File, 
    notes?: string, 
    expiresOn?: string
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type_code', typeCode);
    if (notes) formData.append('notes', notes);
    if (expiresOn) formData.append('expires_on', expiresOn);

    const url = `${this.baseURL}/api/v1/rooms/${roomId}/documents/upload`;
    
    const headers: Record<string, string> = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    console.log('Uploading document to:', url);
    console.log('Headers:', headers);
    console.log('FormData entries:', Array.from(formData.entries()));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData
      });

      console.log('Upload response status:', response.status);
      console.log('Upload response headers:', response.headers);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Upload error data:', errorData);
        throw new Error(errorData?.detail || `Upload failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in uploadDocument:', error);
      throw error;
    }
  }

  async updateDocumentStatus(roomId: string, documentId: string, updateData: any): Promise<any> {
    return this.request(`/api/v1/rooms/${roomId}/documents/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  async approveDocument(roomId: string, documentId: string): Promise<any> {
    return this.request(`/api/v1/rooms/${roomId}/documents/${documentId}/approve`, {
      method: 'POST'
    });
  }

  async rejectDocument(roomId: string, documentId: string, reason: string): Promise<any> {
    return this.request(`/api/v1/rooms/${roomId}/documents/${documentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async downloadDocument(roomId: string, documentId: string): Promise<Blob> {
    const url = `${this.baseURL}/api/v1/rooms/${roomId}/documents/${documentId}/download`;
    
    const headers: Record<string, string> = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    return await response.blob();
  }

  async deleteDocument(roomId: string, documentId: string): Promise<any> {
    return this.request(`/api/v1/rooms/${roomId}/documents/${documentId}`, {
      method: 'DELETE'
    });
  }

  // Activity and History
  async getActivities(roomId: string, limit: number = 50): Promise<Activity[]> {
    return this.request(`/api/v1/rooms/${roomId}/activity?limit=${limit}`);
  }

  async getSnapshots(roomId: string): Promise<any[]> {
    return this.request(`/api/v1/rooms/${roomId}/snapshots`);
  }

  async generateSnapshot(roomId: string): Promise<any> {
    return this.request(`/api/v1/rooms/${roomId}/generate-snapshot`, {
      method: 'POST'
    });
  }

  // Messages and Communications
  async getMessages(roomId: string): Promise<Message[]> {
    return this.request(`/api/v1/rooms/${roomId}/messages`);
  }

  async sendMessage(roomId: string, content: string, attachments?: File[]): Promise<any> {
    if (attachments && attachments.length > 0) {
      const formData = new FormData();
      formData.append('content', content);
      attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file);
      });

      const url = `${this.baseURL}/api/messages/${roomId}`;
      const headers: Record<string, string> = {};
      if (this.token) {
        headers.Authorization = `Bearer ${this.token}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Send message failed: ${response.statusText}`);
      }

      return await response.json();
    }

    return this.request(`/api/v1/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  // PDF Generation
  async generatePDF(roomId: string): Promise<Blob> {
    const url = `${this.baseURL}/api/v1/rooms/${roomId}/pdf`;
    
    const headers: Record<string, string> = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { 
      method: 'POST',
      headers 
    });
    
    if (!response.ok) {
      throw new Error(`PDF generation failed: ${response.statusText}`);
    }

    return await response.blob();
  }

  // Utility methods
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth-token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth-token');
  }

  // Health check
  async healthCheck(): Promise<any> {
    return this.request('/health');
  }

  // System info
  async getSystemInfo(): Promise<any> {
    return this.request('/api/v1/system/info');
  }

  // Get supported document types
  async getDocumentTypes(): Promise<DocumentType[]> {
    return this.request('/api/v1/document-types');
  }

  // Get vessels data
  async getVessels(roomId: string): Promise<any[]> {
    return this.request(`/api/v1/rooms/${roomId}/vessels`);
  }

  // Get documents
  async getDocuments(roomId: string): Promise<any[]> {
    return this.request(`/api/v1/rooms/${roomId}/documents`);
  }

  // Get notifications
  async getNotifications(): Promise<any[]> {
    return this.request('/api/v1/notifications');
  }

  // Create room
  async createRoom(roomData: any): Promise<any> {
    return this.request('/api/v1/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData)
    });
  }

  // Get history/activities
  async getHistory(roomId: string): Promise<any[]> {
    return this.request(`/api/v1/rooms/${roomId}/activity`);
  }

  // Get snapshots
  async getSnapshots(roomId: string): Promise<any[]> {
    return this.request(`/api/v1/rooms/${roomId}/snapshots`);
  }

  // Generate snapshot
  async generateSnapshot(roomId: string): Promise<any> {
    return this.request(`/api/v1/rooms/${roomId}/snapshots`, {
      method: 'POST'
    });
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<any> {
    return this.request(`/api/v1/notifications/${notificationId}/read`, {
      method: 'PATCH'
    });
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead(): Promise<any> {
    return this.request('/api/v1/notifications/mark-all-read', {
      method: 'PATCH'
    });
  }

  // Submit contact form
  async submitContactForm(formData: any): Promise<any> {
    return this.request('/api/v1/support/contact', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
  }

  // Get FAQ data
  async getFAQ(): Promise<any[]> {
    return this.request('/api/v1/help/faq');
  }

  // Get help articles
  async getHelpArticles(): Promise<any[]> {
    return this.request('/api/v1/help/articles');
  }
}

// Export singleton instance
const apiService = new ApiService();
export default apiService;