// Complete API service for STS Clearance Hub - Production Ready
import { RoomSummary, Activity } from './types/api';

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

  // HTTP Helper Methods (instance methods)
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Authentication
  static async login(email: string, password: string): Promise<any> {
    const service = new ApiService();
    return service.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  static async register(email: string, password: string, name: string, company: string = '', role: string = 'buyer'): Promise<any> {
    const service = new ApiService();
    return service.request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, company, role })
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

  // Get snapshots - REAL API CALL
  static async getSnapshots(roomId: string): Promise<any[]> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/snapshots`);
      console.log('getSnapshots response:', response);
      return response as any[];
    } catch (error) {
      console.error('Error in getSnapshots:', error);
      throw error;
    }
  }

  // Generate snapshot - REAL API CALL
  static async generateSnapshot(roomId: string, snapshotData?: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/snapshots`, {
        method: 'POST',
        body: JSON.stringify(snapshotData || {
          title: `Snapshot - ${new Date().toISOString()}`,
          snapshot_type: 'pdf',
          include_documents: true,
          include_activity: true,
          include_approvals: true
        })
      });
      console.log('generateSnapshot response:', response);
      return response as any;
    } catch (error) {
      console.error('Error in generateSnapshot:', error);
      throw error;
    }
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

  static async exportUserDataCSV(): Promise<Blob> {
    try {
      const service = new ApiService();
      const token = localStorage.getItem('auth-token');
      
      const response = await fetch('/api/v1/settings/export/csv', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Error in exportUserDataCSV:', error);
      throw error;
    }
  }

  static async changePassword(oldPassword: string, newPassword: string, confirmPassword: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/settings/password', {
        method: 'PUT',
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });
      console.log('changePassword response:', response);
      return response;
    } catch (error) {
      console.error('Error in changePassword:', error);
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

  // ===== STATIC HTTP HELPER METHODS =====
  
  static async staticGet<T>(endpoint: string): Promise<T> {
    const service = new ApiService();
    return service.get<T>(endpoint);
  }

  static async staticPost<T>(endpoint: string, body?: any): Promise<T> {
    const service = new ApiService();
    return service.post<T>(endpoint, body);
  }

  static async staticPut<T>(endpoint: string, body?: any): Promise<T> {
    const service = new ApiService();
    return service.put<T>(endpoint, body);
  }

  static async staticPatch<T>(endpoint: string, body?: any): Promise<T> {
    const service = new ApiService();
    return service.patch<T>(endpoint, body);
  }

  static async staticDelete<T>(endpoint: string): Promise<T> {
    const service = new ApiService();
    return service.delete<T>(endpoint);
  }

  // ===== ADMIN DASHBOARD METHODS =====

  // Get admin stats (fixed endpoint)
  static async getAdminStats(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/stats/dashboard');
      console.log('getAdminStats response:', response);
      return response;
    } catch (error) {
      console.error('Error in getAdminStats:', error);
      throw error;
    }
  }

  // Get system health
  static async getSystemHealth(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/stats/system/health');
      console.log('getSystemHealth response:', response);
      return response;
    } catch (error) {
      console.error('Error in getSystemHealth:', error);
      throw error;
    }
  }

  // User Management
  static async getUsers(limit: number = 50, offset: number = 0, roleFilter?: string): Promise<any> {
    try {
      const service = new ApiService();
      let url = `/api/v1/users?limit=${limit}&offset=${offset}`;
      if (roleFilter) {
        url += `&role_filter=${roleFilter}`;
      }
      const response = await service.request(url);
      console.log('getUsers response:', response);
      return response;
    } catch (error) {
      console.error('Error in getUsers:', error);
      throw error;
    }
  }

  static async updateUser(userId: string, data: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      console.log('updateUser response:', response);
      return response;
    } catch (error) {
      console.error('Error in updateUser:', error);
      throw error;
    }
  }

  static async deleteUser(userId: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/users/${userId}`, {
        method: 'DELETE'
      });
      console.log('deleteUser response:', response);
      return response;
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw error;
    }
  }

  static async resetUserPassword(userId: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/users/${userId}/reset-password`, {
        method: 'POST'
      });
      console.log('resetUserPassword response:', response);
      return response;
    } catch (error) {
      console.error('Error in resetUserPassword:', error);
      throw error;
    }
  }

  // Configuration Management
  static async getFeatureFlags(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/config/feature-flags');
      console.log('getFeatureFlags response:', response);
      return response;
    } catch (error) {
      console.error('Error in getFeatureFlags:', error);
      throw error;
    }
  }

  static async updateFeatureFlag(key: string, enabled: boolean): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/config/feature-flags/${key}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled })
      });
      console.log('updateFeatureFlag response:', response);
      return response;
    } catch (error) {
      console.error('Error in updateFeatureFlag:', error);
      throw error;
    }
  }

  static async getDocumentTypes(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/config/document-types');
      console.log('getDocumentTypes response:', response);
      return response;
    } catch (error) {
      console.error('Error in getDocumentTypes:', error);
      throw error;
    }
  }

  static async createDocumentType(data: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/config/document-types', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      console.log('createDocumentType response:', response);
      return response;
    } catch (error) {
      console.error('Error in createDocumentType:', error);
      throw error;
    }
  }

  static async updateDocumentType(typeId: string, data: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/config/document-types/${typeId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      console.log('updateDocumentType response:', response);
      return response;
    } catch (error) {
      console.error('Error in updateDocumentType:', error);
      throw error;
    }
  }

  // Cache Management
  static async getCacheStats(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/cache/stats');
      console.log('getCacheStats response:', response);
      return response;
    } catch (error) {
      console.error('Error in getCacheStats:', error);
      throw error;
    }
  }

  static async clearSystemCache(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/cache/clear', {
        method: 'POST'
      });
      console.log('clearSystemCache response:', response);
      return response;
    } catch (error) {
      console.error('Error in clearSystemCache:', error);
      throw error;
    }
  }

  // Get all rooms (for operations view)
  static async getAllRooms(limit: number = 100, offset: number = 0): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms?limit=${limit}&offset=${offset}`);
      console.log('getAllRooms response:', response);
      return response;
    } catch (error) {
      console.error('Error in getAllRooms:', error);
      throw error;
    }
  }

  // Get room details for operations view
  static async getRoomDetails(roomId: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/summary`);
      console.log('getRoomDetails response:', response);
      return response;
    } catch (error) {
      console.error('Error in getRoomDetails:', error);
      throw error;
    }
  }

  // ===== REGIONAL OPERATIONS METHODS =====

  // Get regional dashboard
  static async getRegionalDashboard(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/regional/dashboard');
      console.log('getRegionalDashboard response:', response);
      return response;
    } catch (error) {
      console.error('Error in getRegionalDashboard:', error);
      throw error;
    }
  }

  // Get regional operations filtered
  static async getRegionalOperations(
    region?: string,
    statusFilter?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any> {
    try {
      const service = new ApiService();
      let url = `/api/v1/regional/operations?limit=${limit}&offset=${offset}`;
      if (region) url += `&region=${encodeURIComponent(region)}`;
      if (statusFilter) url += `&status_filter=${encodeURIComponent(statusFilter)}`;
      
      const response = await service.request(url);
      console.log('getRegionalOperations response:', response);
      return response;
    } catch (error) {
      console.error('Error in getRegionalOperations:', error);
      throw error;
    }
  }

  // Get regional operation details
  static async getRegionalOperationDetails(roomId: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/regional/operations/${roomId}`);
      console.log('getRegionalOperationDetails response:', response);
      return response;
    } catch (error) {
      console.error('Error in getRegionalOperationDetails:', error);
      throw error;
    }
  }

  // Get vessels for a regional operation
  static async getRegionalOperationVessels(roomId: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/regional/operations/${roomId}/vessels`);
      console.log('getRegionalOperationVessels response:', response);
      return response;
    } catch (error) {
      console.error('Error in getRegionalOperationVessels:', error);
      throw error;
    }
  }

  // Get regional statistics
  static async getRegionalStatistics(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/regional/statistics');
      console.log('getRegionalStatistics response:', response);
      return response;
    } catch (error) {
      console.error('Error in getRegionalStatistics:', error);
      throw error;
    }
  }

  // ===== SANCTIONS CHECKING METHODS =====

  // Check single vessel against sanctions lists
  static async checkVesselSanctions(imo: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/sanctions/check/${encodeURIComponent(imo)}`);
      console.log('checkVesselSanctions response:', response);
      return response;
    } catch (error) {
      console.error('Error in checkVesselSanctions:', error);
      throw error;
    }
  }

  // Check multiple vessels against sanctions lists
  static async bulkCheckVesselSanctions(imos: string[]): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(
        '/api/v1/sanctions/check/bulk',
        {
          method: 'POST',
          body: JSON.stringify({ imo_list: imos })
        }
      );
      console.log('bulkCheckVesselSanctions response:', response);
      return response;
    } catch (error) {
      console.error('Error in bulkCheckVesselSanctions:', error);
      throw error;
    }
  }

  // Get all sanctions lists
  static async getSanctionsLists(activeOnly: boolean = true): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/sanctions/lists?active_only=${activeOnly}`);
      console.log('getSanctionsLists response:', response);
      return response;
    } catch (error) {
      console.error('Error in getSanctionsLists:', error);
      throw error;
    }
  }

  // Update sanctions lists from external sources
  static async updateSanctionsLists(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(
        '/api/v1/sanctions/update-lists',
        { method: 'POST' }
      );
      console.log('updateSanctionsLists response:', response);
      return response;
    } catch (error) {
      console.error('Error in updateSanctionsLists:', error);
      throw error;
    }
  }

  // Add vessel to sanctions list
  static async addVesselToSanctions(data: {
    list_id: string;
    imo: string;
    vessel_name: string;
    flag?: string;
    owner?: string;
    reason?: string;
  }): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(
        '/api/v1/sanctions/add-vessel',
        {
          method: 'POST',
          body: JSON.stringify(data)
        }
      );
      console.log('addVesselToSanctions response:', response);
      return response;
    } catch (error) {
      console.error('Error in addVesselToSanctions:', error);
      throw error;
    }
  }

  // Get sanctions statistics
  static async getSanctionsStats(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/sanctions/stats');
      console.log('getSanctionsStats response:', response);
      return response;
    } catch (error) {
      console.error('Error in getSanctionsStats:', error);
      throw error;
    }
  }

  // ===== PRIVACY & GDPR METHODS (Phase 2.4) =====

  // Get user consent records
  static async getUserConsents(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/privacy/consents');
      console.log('getUserConsents response:', response);
      return response;
    } catch (error) {
      console.error('Error in getUserConsents:', error);
      throw error;
    }
  }

  // Update consent status
  static async updateConsent(consentId: string, data: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(
        `/api/v1/privacy/consents/${consentId}`,
        {
          method: 'PUT',
          body: JSON.stringify(data)
        }
      );
      console.log('updateConsent response:', response);
      return response;
    } catch (error) {
      console.error('Error in updateConsent:', error);
      throw error;
    }
  }

  // Revoke consent
  static async revokeConsent(consentId: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(
        `/api/v1/privacy/consents/${consentId}`,
        {
          method: 'DELETE'
        }
      );
      console.log('revokeConsent response:', response);
      return response;
    } catch (error) {
      console.error('Error in revokeConsent:', error);
      throw error;
    }
  }

  // Get retention policies
  static async getRetentionPolicies(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/privacy/retention-policies');
      console.log('getRetentionPolicies response:', response);
      return response;
    } catch (error) {
      console.error('Error in getRetentionPolicies:', error);
      throw error;
    }
  }

  // Update retention policy
  static async updateRetentionPolicy(policyId: string, data: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(
        `/api/v1/privacy/retention-policies/${policyId}`,
        {
          method: 'PUT',
          body: JSON.stringify(data)
        }
      );
      console.log('updateRetentionPolicy response:', response);
      return response;
    } catch (error) {
      console.error('Error in updateRetentionPolicy:', error);
      throw error;
    }
  }

  // Request data export
  static async requestDataExport(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(
        '/api/v1/privacy/data-export',
        {
          method: 'POST'
        }
      );
      console.log('requestDataExport response:', response);
      return response;
    } catch (error) {
      console.error('Error in requestDataExport:', error);
      throw error;
    }
  }

  // Get user data exports
  static async getUserDataExports(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/privacy/data-exports');
      console.log('getUserDataExports response:', response);
      return response;
    } catch (error) {
      console.error('Error in getUserDataExports:', error);
      throw error;
    }
  }

  // Download data export
  static async downloadDataExport(exportId: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/privacy/data-exports/${exportId}/download`);
      console.log('downloadDataExport response:', response);
      return response;
    } catch (error) {
      console.error('Error in downloadDataExport:', error);
      throw error;
    }
  }

  // Request account erasure (Right to be Forgotten)
  static async requestAccountErasure(data: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(
        '/api/v1/privacy/erasure-request',
        {
          method: 'POST',
          body: JSON.stringify(data)
        }
      );
      console.log('requestAccountErasure response:', response);
      return response;
    } catch (error) {
      console.error('Error in requestAccountErasure:', error);
      throw error;
    }
  }

  // Get audit logs
  static async getAuditLogs(offset: number = 0, limit: number = 50): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/privacy/audit-logs?offset=${offset}&limit=${limit}`);
      console.log('getAuditLogs response:', response);
      return response;
    } catch (error) {
      console.error('Error in getAuditLogs:', error);
      throw error;
    }
  }

  // ===== APPROVAL MATRIX METHODS (Phase 2.5) =====

  // Get approval matrix rules for a room
  static async getApprovalMatrixRules(roomId: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/approval-matrix/rules`);
      console.log('getApprovalMatrixRules response:', response);
      return response;
    } catch (error) {
      console.error('Error in getApprovalMatrixRules:', error);
      throw error;
    }
  }

  // Create approval matrix rule
  static async createApprovalMatrixRule(roomId: string, data: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(
        `/api/v1/rooms/${roomId}/approval-matrix/rules`,
        {
          method: 'POST',
          body: JSON.stringify(data)
        }
      );
      console.log('createApprovalMatrixRule response:', response);
      return response;
    } catch (error) {
      console.error('Error in createApprovalMatrixRule:', error);
      throw error;
    }
  }

  // Update approval matrix rule
  static async updateApprovalMatrixRule(roomId: string, ruleId: string, data: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(
        `/api/v1/rooms/${roomId}/approval-matrix/rules/${ruleId}`,
        {
          method: 'PUT',
          body: JSON.stringify(data)
        }
      );
      console.log('updateApprovalMatrixRule response:', response);
      return response;
    } catch (error) {
      console.error('Error in updateApprovalMatrixRule:', error);
      throw error;
    }
  }

  // Delete approval matrix rule
  static async deleteApprovalMatrixRule(roomId: string, ruleId: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(
        `/api/v1/rooms/${roomId}/approval-matrix/rules/${ruleId}`,
        {
          method: 'DELETE'
        }
      );
      console.log('deleteApprovalMatrixRule response:', response);
      return response;
    } catch (error) {
      console.error('Error in deleteApprovalMatrixRule:', error);
      throw error;
    }
  }

  // Get pending approvals for a room
  static async getPendingApprovals(roomId: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/approvals/pending`);
      console.log('getPendingApprovals response:', response);
      return response;
    } catch (error) {
      console.error('Error in getPendingApprovals:', error);
      throw error;
    }
  }

  // Submit approval action (approve/reject)
  static async submitApprovalAction(roomId: string, approvalId: string, data: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(
        `/api/v1/rooms/${roomId}/approvals/${approvalId}/action`,
        {
          method: 'POST',
          body: JSON.stringify(data)
        }
      );
      console.log('submitApprovalAction response:', response);
      return response;
    } catch (error) {
      console.error('Error in submitApprovalAction:', error);
      throw error;
    }
  }

  // Get approval statistics
  static async getApprovalStatistics(roomId: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/approvals/statistics`);
      console.log('getApprovalStatistics response:', response);
      return response;
    } catch (error) {
      console.error('Error in getApprovalStatistics:', error);
      throw error;
    }
  }

  // Get approval history
  static async getApprovalHistory(roomId: string, limit: number = 50, offset: number = 0): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/rooms/${roomId}/approvals/history?limit=${limit}&offset=${offset}`);
      console.log('getApprovalHistory response:', response);
      return response;
    } catch (error) {
      console.error('Error in getApprovalHistory:', error);
      throw error;
    }
  }

  // ===== DASHBOARD CUSTOMIZATION METHODS (Phase 2.6) =====

  // Get dashboard layouts
  static async getDashboardLayouts(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/dashboard/layouts');
      console.log('getDashboardLayouts response:', response);
      return response;
    } catch (error) {
      console.error('Error in getDashboardLayouts:', error);
      throw error;
    }
  }

  // Create dashboard layout
  static async createDashboardLayout(layout: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/dashboard/layouts', {
        method: 'POST',
        body: JSON.stringify(layout)
      });
      console.log('createDashboardLayout response:', response);
      return response;
    } catch (error) {
      console.error('Error in createDashboardLayout:', error);
      throw error;
    }
  }

  // Update dashboard layout
  static async updateDashboardLayout(layoutId: string, layout: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/dashboard/layouts/${layoutId}`, {
        method: 'PUT',
        body: JSON.stringify(layout)
      });
      console.log('updateDashboardLayout response:', response);
      return response;
    } catch (error) {
      console.error('Error in updateDashboardLayout:', error);
      throw error;
    }
  }

  // ===== ADVANCED FILTERING METHODS (Phase 2.6) =====

  // Get saved filters
  static async getSavedFilters(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/filters/saved');
      console.log('getSavedFilters response:', response);
      return response;
    } catch (error) {
      console.error('Error in getSavedFilters:', error);
      throw error;
    }
  }

  // Save advanced filter
  static async saveAdvancedFilter(filter: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/filters', {
        method: 'POST',
        body: JSON.stringify(filter)
      });
      console.log('saveAdvancedFilter response:', response);
      return response;
    } catch (error) {
      console.error('Error in saveAdvancedFilter:', error);
      throw error;
    }
  }

  // Apply advanced filter
  static async applyAdvancedFilter(filterFields: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/filters/apply', {
        method: 'POST',
        body: JSON.stringify({ filters: filterFields })
      });
      console.log('applyAdvancedFilter response:', response);
      return response;
    } catch (error) {
      console.error('Error in applyAdvancedFilter:', error);
      throw error;
    }
  }

  // Delete advanced filter
  static async deleteAdvancedFilter(filterId: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/filters/${filterId}`, {
        method: 'DELETE'
      });
      console.log('deleteAdvancedFilter response:', response);
      return response;
    } catch (error) {
      console.error('Error in deleteAdvancedFilter:', error);
      throw error;
    }
  }

  // Export filtered results
  static async exportFilteredResults(filterFields: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/filters/export', {
        method: 'POST',
        body: JSON.stringify({ filters: filterFields })
      });
      console.log('exportFilteredResults response:', response);
      return response;
    } catch (error) {
      console.error('Error in exportFilteredResults:', error);
      throw error;
    }
  }

  // ===== ROLE & PERMISSION METHODS (Phase 2.6) =====

  // Get role permissions
  static async getRolePermissions(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/roles');
      console.log('getRolePermissions response:', response);
      return response;
    } catch (error) {
      console.error('Error in getRolePermissions:', error);
      throw error;
    }
  }

  // Get available permissions
  static async getAvailablePermissions(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/permissions');
      console.log('getAvailablePermissions response:', response);
      return response;
    } catch (error) {
      console.error('Error in getAvailablePermissions:', error);
      throw error;
    }
  }

  // Create role
  static async createRole(role: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/roles', {
        method: 'POST',
        body: JSON.stringify(role)
      });
      console.log('createRole response:', response);
      return response;
    } catch (error) {
      console.error('Error in createRole:', error);
      throw error;
    }
  }

  // Update role permissions
  static async updateRolePermissions(roleId: string, data: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/roles/${roleId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      console.log('updateRolePermissions response:', response);
      return response;
    } catch (error) {
      console.error('Error in updateRolePermissions:', error);
      throw error;
    }
  }

  // Delete role
  static async deleteRole(roleId: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/roles/${roleId}`, {
        method: 'DELETE'
      });
      console.log('deleteRole response:', response);
      return response;
    } catch (error) {
      console.error('Error in deleteRole:', error);
      throw error;
    }
  }

  // Get FAQ
  static async getFAQ(): Promise<any[]> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/help/faq');
      console.log('getFAQ response:', response);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error in getFAQ:', error);
      return [];
    }
  }

  // Get help articles
  static async getHelpArticles(): Promise<any[]> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/help/articles');
      console.log('getHelpArticles response:', response);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error in getHelpArticles:', error);
      return [];
    }
  }

  // Submit contact form
  static async submitContactForm(data: any): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/help/contact', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      console.log('submitContactForm response:', response);
      return response;
    } catch (error) {
      console.error('Error in submitContactForm:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markNotificationAsRead(notificationId: string): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request(`/api/v1/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
      console.log('markNotificationAsRead response:', response);
      return response;
    } catch (error) {
      console.error('Error in markNotificationAsRead:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  static async markAllNotificationsAsRead(): Promise<any> {
    try {
      const service = new ApiService();
      const response = await service.request('/api/v1/notifications/read-all', {
        method: 'PUT'
      });
      console.log('markAllNotificationsAsRead response:', response);
      return response;
    } catch (error) {
      console.error('Error in markAllNotificationsAsRead:', error);
      throw error;
    }
  }
}

// Export the class
export { ApiService };
export default ApiService;