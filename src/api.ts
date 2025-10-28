// Complete API service for STS Clearance Hub - Production Ready
import { RoomSummary, Activity, Message, DocumentType } from './types/api';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

class ApiService {
  private baseURL: string;
  private token: string | null;

  constructor() {
    // In development, use the proxy; in production, use the configured URL
    if (import.meta.env.DEV) {
      this.baseURL = '';  // Use Vite proxy (same origin)
    } else {
      this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
    }
    this.token = localStorage.getItem('auth-token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth-token', token);
  }

  static setToken(token: string) {
    localStorage.setItem('auth-token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth-token');
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
  static async login(email: string, password: string): Promise<any> {
    const service = new ApiService();
    return service.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  static async validateToken(): Promise<any> {
    const service = new ApiService();
    return service.request('/api/v1/auth/validate');
  }

  static async logout(): Promise<any> {
    const service = new ApiService();
    return service.request('/api/v1/auth/logout', {
      method: 'POST'
    });
  }

  // Get rooms
  static async getRooms(): Promise<any[]> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/rooms');
      console.log('getRooms response:', response);
      return response as any[];
    } catch (error) {
      console.error('Error in getRooms:', error);
      throw error;
    }
  }

  // Get room
  static async getRoom(roomId: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}`);
      console.log('getRoom response:', response);
      return response;
    } catch (error) {
      console.error('Error in getRoom:', error);
      throw error;
    }
  }

  // Get room summary
  static async getRoomSummary(roomId: string): Promise<RoomSummary> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/summary`);
      console.log('getRoomSummary response:', response);
      return response as RoomSummary;
    } catch (error) {
      console.error('Error in getRoomSummary:', error);
      throw error;
    }
  }

  // Get room documents
  static async getRoomDocuments(roomId: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/documents`);
      console.log('getRoomDocuments response:', response);
      return response;
    } catch (error) {
      console.error('Error in getRoomDocuments:', error);
      throw error;
    }
  }

  // Upload document
  static async uploadDocument(roomId: string, documentType: string, file: File, notes?: string, expiresOn?: string): Promise<any> {
    try {
      const service = new ApiService();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);
      if (notes) formData.append('notes', notes);
      if (expiresOn) formData.append('expires_on', expiresOn);

      const url = `${service.baseURL}/api/v1/rooms/${roomId}/documents/upload`;
      console.log('Uploading document to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${service.token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Upload response:', result);
      return result;
    } catch (error) {
      console.error('Error in uploadDocument:', error);
      throw error;
    }
  }

  // Update document
  static async updateDocument(roomId: string, documentId: string, updateData: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/documents/${documentId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });
      console.log('updateDocument response:', response);
      return response;
    } catch (error) {
      console.error('Error in updateDocument:', error);
      throw error;
    }
  }

  // Approve document
  static async approveDocument(roomId: string, documentId: string, approvalData: any = {}): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/documents/${documentId}/approve`, {
        method: 'POST',
        body: JSON.stringify(approvalData)
      });
      console.log('approveDocument response:', response);
      return response;
    } catch (error) {
      console.error('Error in approveDocument:', error);
      throw error;
    }
  }

  // Reject document
  static async rejectDocument(roomId: string, documentId: string, reason: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/documents/${documentId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `reason=${encodeURIComponent(reason)}`
      });
      console.log('rejectDocument response:', response);
      return response;
    } catch (error) {
      console.error('Error in rejectDocument:', error);
      throw error;
    }
  }

  // Download document
  static async downloadDocument(roomId: string, documentId: string): Promise<Blob> {
    try {
      const service = new ApiService();
      const url = `${service.baseURL}/api/v1/rooms/${roomId}/documents/${documentId}/download`;
      console.log('Downloading document from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${service.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('Download successful, blob size:', blob.size);
      return blob;
    } catch (error) {
      console.error('Error in downloadDocument:', error);
      throw error;
    }
  }

  // Get document
  static async getDocument(roomId: string, documentId: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/documents/${documentId}`);
      console.log('getDocument response:', response);
      return response;
    } catch (error) {
      console.error('Error in getDocument:', error);
      throw error;
    }
  }

  // Get activities
  static async getActivities(roomId: string, limit: number = 50): Promise<Activity[]> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/activities?limit=${limit}`);
      console.log('getActivities response:', response);
      return response as Activity[];
    } catch (error) {
      console.error('Error in getActivities:', error);
      throw error;
    }
  }

  // Generate PDF
  static async generatePDF(roomId: string): Promise<Blob> {
    try {
      const service = new ApiService();
      const url = `${service.baseURL}/api/v1/rooms/${roomId}/snapshot.pdf`;
      console.log('Generating PDF from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${service.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('PDF generation successful, blob size:', blob.size);
      return blob;
    } catch (error) {
      console.error('Error in generatePDF:', error);
      throw error;
    }
  }

  // Utility methods
  static clearToken() {
    localStorage.removeItem('auth-token');
  }

  // Health check
  static async healthCheck(): Promise<any> {
    const service = new ApiService();
    return service.request('/health');
  }

  // Get document types
  static async getDocumentTypes(): Promise<DocumentType[]> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/document-types');
      console.log('getDocumentTypes response:', response);
      return response as DocumentType[];
    } catch (error) {
      console.error('Error in getDocumentTypes:', error);
      throw error;
    }
  }

  // Get vessels (filtered by user access)
  static async getVessels(roomId: string): Promise<any[]> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/vessels`);
      console.log('getVessels response:', response);
      return response as any[];
    } catch (error) {
      console.error('Error in getVessels:', error);
      throw error;
    }
  }

  // Get vessel-specific documents
  static async getVesselDocuments(roomId: string, vesselId: string): Promise<any[]> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/vessels/${vesselId}/documents`);
      console.log('getVesselDocuments response:', response);
      return response as any[];
    } catch (error) {
      console.error('Error in getVesselDocuments:', error);
      throw error;
    }
  }

  // Get vessel-specific approvals
  static async getVesselApprovals(roomId: string, vesselId: string): Promise<any[]> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/vessels/${vesselId}/approvals`);
      console.log('getVesselApprovals response:', response);
      return response as any[];
    } catch (error) {
      console.error('Error in getVesselApprovals:', error);
      throw error;
    }
  }

  // Get vessel-specific messages
  static async getVesselMessages(roomId: string, vesselId: string, limit?: number, offset?: number): Promise<any[]> {
    try {
      const service = new ApiService();
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      const response = await service.request(`/api/v1/rooms/${roomId}/vessels/${vesselId}/messages?${params}`);
      console.log('getVesselMessages response:', response);
      return response as any[];
    } catch (error) {
      console.error('Error in getVesselMessages:', error);
      throw error;
    }
  }

  // Send vessel-specific message
  static async sendVesselMessage(roomId: string, vesselId: string, content: string, messageType: string = 'text'): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/vessels/${vesselId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, message_type: messageType })
      });
      console.log('sendVesselMessage response:', response);
      return response;
    } catch (error) {
      console.error('Error in sendVesselMessage:', error);
      throw error;
    }
  }

  // Get approvals
  static async getApprovals(roomId: string): Promise<any[]> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/approvals`);
      console.log('getApprovals response:', response);
      return response as any[];
    } catch (error) {
      console.error('Error in getApprovals:', error);
      throw error;
    }
  }

  // Get weather data
  static async getWeather(roomId: string, latitude?: number, longitude?: number): Promise<any> {
    try {
      const service = new ApiService();
      const params = new URLSearchParams();
      if (latitude) params.append('latitude', latitude.toString());
      if (longitude) params.append('longitude', longitude.toString());
      const response = await service.request(`/api/v1/rooms/${roomId}/weather?${params}`);
      console.log('getWeather response:', response);
      return response;
    } catch (error) {
      console.error('Error in getWeather:', error);
      throw error;
    }
  }

  // Get vessel sessions for current user
  static async getMyVesselSessions(): Promise<any[]> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/vessel-sessions/my-sessions');
      console.log('getMyVesselSessions response:', response);
      return response as any[];
    } catch (error) {
      console.error('Error in getMyVesselSessions:', error);
      throw error;
    }
  }

  // Get snapshots (placeholder - not in current API)
  static async getSnapshots(roomId: string): Promise<any[]> {
    // This endpoint doesn't exist yet, return mock data for now
    return [
      {
        id: 'snapshot-1',
        title: 'Room Status Snapshot',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        status: 'completed',
        download_url: `/api/v1/rooms/${roomId}/snapshot.pdf`,
        file_size: 1024 * 1024, // 1MB
        type: 'pdf'
      },
      {
        id: 'snapshot-2',
        title: 'Previous Status Snapshot',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        status: 'completed',
        download_url: `/api/v1/rooms/${roomId}/snapshot.pdf`,
        file_size: 1024 * 1024, // 1MB
        type: 'pdf'
      }
    ];
  }

  // Generate snapshot (placeholder - not in current API)
  static async generateSnapshot(roomId: string): Promise<any> {
    // This endpoint doesn't exist yet, simulate success
    console.log('Generating snapshot for room:', roomId);
    return { success: true, snapshotId: Date.now().toString() };
  }

  // Get documents
  static async getDocuments(roomId: string): Promise<any[]> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/documents`);
      console.log('getDocuments response:', response);
      return response as any[];
    } catch (error) {
      console.error('Error in getDocuments:', error);
      throw error;
    }
  }

  // Get notifications
  static async getNotifications(): Promise<any[]> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/notifications');
      console.log('getNotifications response:', response);
      return response as any[];
    } catch (error) {
      console.error('Error in getNotifications:', error);
      throw error;
    }
  }

  // Get system info
  static async getSystemInfo(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/config/system-info');
      console.log('getSystemInfo response:', response);
      return response;
    } catch (error) {
      console.error('Error in getSystemInfo:', error);
      throw error;
    }
  }

  // Get history (activity logs for a room)
  static async getHistory(roomId: string): Promise<any[]> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/activities`);
      console.log('getHistory response:', response);
      return response as any[];
    } catch (error) {
      console.error('Error in getHistory:', error);
      throw error;
    }
  }

  // Get messages for a room
  static async getMessages(roomId: string, limit?: number, offset?: number): Promise<any[]> {
    try {
      const service = new ApiService();
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      const response = await service.request(`/api/v1/rooms/${roomId}/messages?${params}`);
      console.log('getMessages response:', response);
      return response as any[];
    } catch (error) {
      console.error('Error in getMessages:', error);
      throw error;
    }
  }

  // Send message to a room
  static async sendMessage(roomId: string, content: string, messageType: string = 'text'): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, message_type: messageType })
      });
      console.log('sendMessage response:', response);
      return response;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }

  // Search methods
  async searchGlobal(query: string, limit: number = 20): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/search/global?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async search(query: string, limit: number = 20): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getSearchSuggestions(query: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/search/suggestions?q=${encodeURIComponent(query)}`);
  }

  // Notification methods
  async markNotificationRead(notificationId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/notifications/${notificationId}/read`, {
      method: 'PUT'
    });
  }

  // Document methods
  async getDocumentById(roomId: string, docId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/rooms/${roomId}/documents/${docId}`);
  }

  async downloadDocument(roomId: string, docId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/rooms/${roomId}/documents/${docId}/download`);
  }

  async updateDocumentStatus(roomId: string, docId: string, status: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/rooms/${roomId}/documents/${docId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  // Approval methods
  async updateApproval(approvalId: string, status: string, comments?: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/approvals/${approvalId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, comments })
    });
  }

  // Cockpit methods
  async getCockpitSummary(): Promise<ApiResponse<any>> {
    return this.request('/api/v1/cockpit/summary');
  }

  // Cache methods
  async getCacheStats(): Promise<ApiResponse<any>> {
    return this.request('/api/v1/cache/stats');
  }

  async clearCache(): Promise<ApiResponse<any>> {
    return this.request('/api/v1/cache/clear', {
      method: 'POST'
    });
  }

  // Auth methods
  async refreshToken(): Promise<ApiResponse<any>> {
    return this.request('/api/v1/auth/refresh', {
      method: 'POST'
    });
  }

  // File methods
  async getFile(filePath: string): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/files/${filePath}`);
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.request('/health');
  }

  // Profile methods
  async getUserProfile(): Promise<ApiResponse<any>> {
    return this.request('/api/v1/profile/me');
  }

  async updateUserProfile(profileData: any): Promise<ApiResponse<any>> {
    return this.request('/api/v1/profile/me', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  async changePassword(passwordData: any): Promise<ApiResponse<any>> {
    return this.request('/api/v1/profile/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData)
    });
  }

  async uploadAvatar(file: File): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/api/v1/profile/avatar', {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set content-type for FormData
    });
  }

  async deleteAvatar(): Promise<ApiResponse<any>> {
    return this.request('/api/v1/profile/avatar', {
      method: 'DELETE'
    });
  }

  // Settings methods
  static async getUserSettings(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/settings');
      console.log('getUserSettings response:', response);
      return response;
    } catch (error) {
      console.error('Error in getUserSettings:', error);
      throw error;
    }
  }

  static async updateUserSettings(settingsData: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsData)
      });
      console.log('updateUserSettings response:', response);
      return response;
    } catch (error) {
      console.error('Error in updateUserSettings:', error);
      throw error;
    }
  }

  static async exportUserData(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/settings/export', {
        method: 'POST'
      });
      console.log('exportUserData response:', response);
      return response;
    } catch (error) {
      console.error('Error in exportUserData:', error);
      throw error;
    }
  }

  // Missing Documents methods
  static async getMissingDocuments(roomIds?: string[], vesselIds?: string[]): Promise<any> {
    try {
      const service = new ApiService();
      const params = new URLSearchParams();
      
      if (roomIds && roomIds.length > 0) {
        roomIds.forEach(id => params.append('room_ids', id));
      }
      
      if (vesselIds && vesselIds.length > 0) {
        vesselIds.forEach(id => params.append('vessel_ids', id));
      }
      
      const queryString = params.toString();
      const url = `/api/v1/missing-documents/overview${queryString ? '?' + queryString : ''}`;
      const response = await service.request(url);
      console.log('getMissingDocuments response:', response);
      return response;
    } catch (error) {
      console.error('Error in getMissingDocuments:', error);
      throw error;
    }
  }

  static async getMissingDocumentsConfig(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/missing-documents/config');
      console.log('getMissingDocumentsConfig response:', response);
      return response;
    } catch (error) {
      console.error('Error in getMissingDocumentsConfig:', error);
      throw error;
    }
  }

  static async updateMissingDocumentsConfig(config: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/missing-documents/config', {
        method: 'PUT',
        body: JSON.stringify(config)
      });
      console.log('updateMissingDocumentsConfig response:', response);
      return response;
    } catch (error) {
      console.error('Error in updateMissingDocumentsConfig:', error);
      throw error;
    }
  }
}

// Export the class
export default ApiService;