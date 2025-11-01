/**
 * Dashboard API Service
 * =====================
 * Centralized API client for all dashboard endpoints.
 * Handles authentication, role-based data fetching, and error handling.
 */

import { api } from './api'

export interface DashboardOverviewResponse {
  role: string
  timestamp: string
  data: Record<string, any>
}

// Admin Dashboard
export const dashboardApi = {
  // Unified overview - auto-detects user role
  getOverview: async (): Promise<DashboardOverviewResponse> => {
    const response = await api.get('/dashboard/overview')
    return response.data
  },

  // Admin endpoints
  admin: {
    getStats: async () => api.get('/dashboard/admin/stats'),
    getCompliance: async () => api.get('/dashboard/admin/compliance'),
    getHealth: async () => api.get('/dashboard/admin/health'),
    getAudit: async () => api.get('/dashboard/admin/audit'),
  },

  // Charterer endpoints
  charterer: {
    getOverview: async () => api.get('/dashboard/charterer/overview'),
    getDemurrage: async () => api.get('/dashboard/charterer/demurrage'),
    getMyOperations: async () => api.get('/dashboard/charterer/my-operations'),
    getPendingApprovals: async () => api.get('/dashboard/charterer/pending-approvals'),
    getUrgentApprovals: async () => api.get('/dashboard/charterer/urgent-approvals'),
  },

  // Broker endpoints
  broker: {
    getOverview: async () => api.get('/dashboard/broker/overview'),
    getCommission: async () => api.get('/dashboard/broker/commission'),
    getDealHealth: async () => api.get('/dashboard/broker/deal-health'),
    getStuckDeals: async () => api.get('/dashboard/broker/stuck-deals'),
    getApprovalQueue: async () => api.get('/dashboard/broker/approval-queue'),
    getMyRooms: async () => api.get('/dashboard/broker/my-rooms'),
    getPartyPerformance: async () => api.get('/dashboard/broker/party-performance'),
  },

  // Owner endpoints
  owner: {
    getOverview: async () => api.get('/dashboard/owner/overview'),
    getSireCompliance: async () => api.get('/dashboard/owner/sire-compliance'),
    getCrewStatus: async () => api.get('/dashboard/owner/crew-status'),
    getInsurance: async () => api.get('/dashboard/owner/insurance'),
  },

  // Inspector endpoints
  inspector: {
    getOverview: async () => api.get('/dashboard/inspector/overview'),
    getFindings: async () => api.get('/dashboard/inspector/findings'),
    getCompliance: async () => api.get('/dashboard/inspector/compliance'),
    getRecommendations: async () => api.get('/dashboard/inspector/recommendations'),
  },
}