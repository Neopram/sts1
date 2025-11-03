import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { useApp } from './src/contexts/AppContext';
import Header from './src/components/Layout/Header';
import { TabNavigation } from './src/components/Layout/TabNavigation';
import { OverviewPage } from './src/components/Pages/OverviewPage';
import { DashboardContainer } from './src/components/Pages/DashboardContainer'; // PHASE 0: Unified dashboard
import { DocumentsPage } from './src/components/Pages/DocumentsPage';
import { ApprovalPage } from './src/components/Pages/ApprovalPage';
import { ActivityPage } from './src/components/Pages/ActivityPage';
import { HistoryPage } from './src/components/Pages/HistoryPage';
import { MessagesPage } from './src/components/Pages/MessagesPage';
import { MissingDocumentsPage } from './src/components/Pages/MissingDocumentsPage';
import { UploadModal } from './src/components/Modals/UploadModal';
import { StsOperationWizard } from './src/components/Modals/StsOperationWizard'; // PHASE 1: STS Operations wizard
import ApiService from './src/api';

/**
 * UTILITY FUNCTIONS FOR RESILIENT API CALLS
 */

// Helper: Add timeout to promises
const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  actionName: string = 'Request'
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => {
      const error = new Error(`${actionName} timed out after ${timeoutMs}ms`);
      (error as any).code = 'TIMEOUT';
      reject(error);
    }, timeoutMs)
  );
  
  return Promise.race([promise, timeoutPromise]);
};

// Helper: Retry with exponential backoff
const withRetry = async <T,>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      // Don't retry on timeout errors for initial attempts
      if ((err as any)?.code !== 'TIMEOUT' || attempt < maxAttempts) {
        const backoffDelay = delayMs * Math.pow(2, attempt - 1);
        console.log(`[RETRY] Attempt ${attempt} failed, retrying in ${backoffDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  throw new Error('Max retries exceeded');
};

const STSClearanceApp: React.FC = () => {
  const {
    user,
    currentRoomId,
    setCurrentRoomId,
    rooms,
    loading,
    error,
    refreshData
  } = useApp();
  
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState(() => {
    // Initialize activeTab from URL
    const path = location.pathname.slice(1) || 'overview';
    return path;
  });
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showStsWizard, setShowStsWizard] = useState(false); // PHASE 1: STS Wizard state
  const [documentRefreshTrigger, setDocumentRefreshTrigger] = useState(0);
  const [cockpitData, setCockpitData] = useState<any>(null);
  const [vessels, setVessels] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [missingDocuments, setMissingDocuments] = useState<any>(null);
  const [uiError, setUiError] = useState<{ action: string; message: string; timestamp: number } | null>(null);

  /**
   * BADGE HELPERS - Safe badge calculation with fallbacks
   */
  const getDocumentsBadge = (): number => {
    try {
      return cockpitData?.missingDocuments?.length || 0;
    } catch {
      console.warn('[BADGE] Error calculating documents badge');
      return 0;
    }
  };

  const getMissingDocsBadge = (): number => {
    try {
      return missingDocuments?.summary?.criticalCount || 0;
    } catch {
      console.warn('[BADGE] Error calculating missing docs badge');
      return 0;
    }
  };

  const getApprovalBadge = (): number => {
    try {
      return cockpitData?.pendingApprovals?.length || 0;
    } catch {
      console.warn('[BADGE] Error calculating approval badge');
      return 0;
    }
  };

  const getMessagesBadge = (): number => {
    try {
      return Array.isArray(messages) 
        ? messages.filter(m => typeof m === 'object' && 'read' in m && !m.read).length 
        : 0;
    } catch {
      console.warn('[BADGE] Error calculating messages badge');
      return 0;
    }
  };

  /**
   * ROLE-BASED TAB VISIBILITY
   * Returns tabs appropriate for the current user's role
   */
  const getTabs = (): Array<{ id: string; label: string; badge?: number; highlight?: boolean }> => {
    const baseRole = user?.role?.toLowerCase();
    
    // Base tabs for all users
    const baseTabs = [
      { id: 'overview', label: 'Overview', badge: undefined }
    ];
    
    // Role-specific tabs
    const roleSpecificTabs: Record<string, Array<{ id: string; label: string; badge?: number; highlight?: boolean }>> = {
      admin: [
        { id: 'documents', label: 'Documents', badge: getDocumentsBadge() },
        { id: 'missing', label: 'Missing Docs', badge: getMissingDocsBadge(), highlight: getMissingDocsBadge() > 0 },
        { id: 'approval', label: 'Approval', badge: getApprovalBadge() },
        { id: 'activity', label: 'Activity', badge: undefined },
        { id: 'history', label: 'History', badge: undefined },
        { id: 'messages', label: 'Messages', badge: getMessagesBadge() }
      ],
      broker: [
        { id: 'documents', label: 'Documents', badge: getDocumentsBadge() },
        { id: 'missing', label: 'Missing Docs', badge: getMissingDocsBadge(), highlight: getMissingDocsBadge() > 0 },
        { id: 'approval', label: 'Approval', badge: getApprovalBadge() },
        { id: 'activity', label: 'Activity', badge: undefined },
        { id: 'history', label: 'History', badge: undefined },
        { id: 'messages', label: 'Messages', badge: getMessagesBadge() }
      ],
      owner: [
        { id: 'documents', label: 'Documents', badge: getDocumentsBadge() },
        { id: 'approval', label: 'Approval', badge: getApprovalBadge() },
        { id: 'activity', label: 'Activity', badge: undefined },
        { id: 'messages', label: 'Messages', badge: getMessagesBadge() }
      ],
      charterer: [
        { id: 'documents', label: 'Documents', badge: getDocumentsBadge() },
        { id: 'approval', label: 'Approval', badge: getApprovalBadge() },
        { id: 'activity', label: 'Activity', badge: undefined },
        { id: 'messages', label: 'Messages', badge: getMessagesBadge() }
      ],
      seller: [
        { id: 'documents', label: 'Documents', badge: getDocumentsBadge() },
        { id: 'activity', label: 'Activity', badge: undefined },
        { id: 'messages', label: 'Messages', badge: getMessagesBadge() }
      ],
      buyer: [
        { id: 'documents', label: 'Documents', badge: getDocumentsBadge() },
        { id: 'activity', label: 'Activity', badge: undefined },
        { id: 'messages', label: 'Messages', badge: getMessagesBadge() }
      ],
      viewer: [
        { id: 'documents', label: 'Documents (Read-only)', badge: 0 }
      ]
    };
    
    const specificTabs = roleSpecificTabs[baseRole!] || [];
    return [...baseTabs, ...specificTabs];
  };

  /**
   * TAB ACCESS CONTROL
   * Validates if user has permission to access a specific tab
   */
  const canAccessTab = (tabId: string): boolean => {
    const role = user?.role?.toLowerCase();
    
    const tabAccessMatrix: Record<string, string[]> = {
      'overview': ['admin', 'broker', 'owner', 'charterer', 'seller', 'buyer', 'viewer'],
      'documents': ['admin', 'broker', 'owner', 'charterer', 'seller', 'buyer', 'viewer'],
      'missing': ['admin', 'broker', 'owner', 'charterer'],  // No viewer/parties
      'approval': ['admin', 'broker', 'owner', 'charterer'],  // No viewer/parties
      'activity': ['admin', 'broker', 'owner', 'charterer', 'seller', 'buyer'],
      'history': ['admin', 'broker', 'owner', 'charterer'],
      'messages': ['admin', 'broker', 'owner', 'charterer', 'seller', 'buyer']
    };
    
    const allowedRoles = tabAccessMatrix[tabId] || [];
    return allowedRoles.includes(role!);
  };

  // Dynamic tabs based on role
  const tabs = getTabs();

  /**
   * CENTRALIZED ERROR HANDLER
   */
  const handleFetchError = useCallback((action: string, err: unknown) => {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[FETCH] Error ${action}:`, err);
    setUiError({ 
      action, 
      message: `Failed to ${action}: ${errorMsg}`, 
      timestamp: Date.now() 
    });
  }, []);

  const clearError = useCallback((action?: string) => {
    if (!action || uiError?.action === action) {
      setUiError(null);
    }
  }, [uiError?.action]);

  /**
   * FETCH FUNCTIONS WITH RESILIENCE
   * All use withTimeout and withRetry for reliability
   */
  const fetchCockpitData = useCallback(async () => {
    if (!currentRoomId) return;
    
    try {
      const data = await withRetry(
        () => withTimeout(
          ApiService.getRoomSummary(currentRoomId),
          10000,
          'fetchCockpitData'
        ),
        3,
        1000
      );
      setCockpitData(data);
      clearError('cockpit');
    } catch (err) {
      handleFetchError('fetchCockpitData', err);
    }
  }, [currentRoomId, handleFetchError, clearError]);

  const fetchVessels = useCallback(async () => {
    if (!currentRoomId) return;
    
    try {
      const data = await withRetry(
        () => withTimeout(
          ApiService.getVessels(currentRoomId),
          10000,
          'fetchVessels'
        ),
        3,
        1000
      );
      setVessels(data);
      clearError('vessels');
    } catch (err) {
      handleFetchError('fetchVessels', err);
    }
  }, [currentRoomId, handleFetchError, clearError]);

  const fetchActivities = useCallback(async () => {
    if (!currentRoomId) return;
    
    try {
      const data = await withRetry(
        () => withTimeout(
          ApiService.getActivities(currentRoomId),
          10000,
          'fetchActivities'
        ),
        3,
        1000
      );
      setActivities(data);
      clearError('activities');
    } catch (err) {
      handleFetchError('fetchActivities', err);
    }
  }, [currentRoomId, handleFetchError, clearError]);

  const fetchMessages = useCallback(async () => {
    if (!currentRoomId) return;
    
    try {
      const data = await withRetry(
        () => withTimeout(
          ApiService.getMessages(currentRoomId),
          10000,
          'fetchMessages'
        ),
        3,
        1000
      );
      setMessages(data);
      clearError('messages');
    } catch (err) {
      handleFetchError('fetchMessages', err);
    }
  }, [currentRoomId, handleFetchError, clearError]);

  const fetchMissingDocuments = useCallback(async () => {
    if (!currentRoomId) return;
    
    try {
      const data = await withRetry(
        () => withTimeout(
          ApiService.getMissingDocuments([currentRoomId]),
          10000,
          'fetchMissingDocuments'
        ),
        3,
        1000
      );
      setMissingDocuments(data);
      clearError('missingDocs');
    } catch (err) {
      handleFetchError('fetchMissingDocuments', err);
    }
  }, [currentRoomId, handleFetchError, clearError]);

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  // Handle document status update
  const handleUpdateDocumentStatus = async (documentId: string, status: string) => {
    if (!currentRoomId) return;
    
    try {
      await ApiService.updateDocument(currentRoomId, documentId, { status });
      await fetchCockpitData();
      await fetchActivities();
    } catch (err) {
      console.error('Error updating document status:', err);
    }
  };

  // Handle document action
  const handleDocumentAction = async (documentId: string, action: string, data?: any) => {
    if (!currentRoomId) return;
    
    try {
      if (action === 'approve') {
        await ApiService.approveDocument(currentRoomId, documentId, data || {});
      } else if (action === 'reject') {
        await ApiService.rejectDocument(currentRoomId, documentId, data?.reason || 'No reason provided');
      }
      await fetchCockpitData();
      await fetchActivities();
    } catch (err) {
      console.error(`Error with document action ${action}:`, err);
    }
  };

  // Handle view document
  const handleViewDocument = async (document: any) => {
    if (!currentRoomId) return;
    
    try {
      const blob = await ApiService.downloadDocument(currentRoomId, document.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Error viewing document:', err);
    }
  };

  // Handle send message
  const handleSendMessage = async (content: string, _attachments?: File[]) => {
    if (!currentRoomId) return;
    
    try {
      await ApiService.sendMessage(currentRoomId, content, 'text');
      await fetchMessages();
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };



  /**
   * CONSOLIDATED DATA LOADING
   * Loads all data in parallel when room changes or refresh is requested
   * Uses Promise.allSettled for resilience - one failure won't block others
   */
  useEffect(() => {
    const loadAllData = async () => {
      if (!currentRoomId) return;
      
      try {
        // Load all data in parallel - one failure won't block others
        const results = await Promise.allSettled([
          fetchCockpitData(),
          fetchVessels(),
          fetchActivities(),
          fetchMessages(),
          fetchMissingDocuments()
        ]);
        
        // Log any failures for debugging
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.warn(`[DATA_LOAD] Promise ${index} failed:`, result.reason);
          }
        });
      } catch (err) {
        console.error('[DATA_LOAD] Unexpected error loading data:', err);
      }
    };

    // Handle refresh event
    const handleRefresh = () => {
      console.log('[REFRESH] Data refresh requested');
      loadAllData();
    };

    // Handle logout event
    const handleLogout = () => {
      console.log('[LOGOUT] Clearing all data');
      setCockpitData(null);
      setVessels([]);
      setActivities([]);
      setMessages([]);
      setMissingDocuments(null);
      setShowUploadModal(false);
      setUiError(null);
    };

    // Register listeners
    window.addEventListener('app:refresh', handleRefresh);
    window.addEventListener('app:logout', handleLogout);
    
    // Load initial data
    loadAllData();
    
    // Cleanup
    return () => {
      window.removeEventListener('app:refresh', handleRefresh);
      window.removeEventListener('app:logout', handleLogout);
    };
  }, [currentRoomId, fetchCockpitData, fetchVessels, fetchActivities, fetchMessages, fetchMissingDocuments]);

  // NOTE: LoginPage check removed here because STSClearanceApp is wrapped by ProtectedRoute
  // ProtectedRoute guarantees that only authenticated users reach this component

  // Show loading state
  if (loading && !cockpitData) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-secondary-600 font-medium">Loading STS Clearance Hub...</p>
        </div>
      </div>
    );
  }

  // Show error state (only show if critical - no any data loaded)
  if (error && !cockpitData && !loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="card">
            <div className="card-body text-center">
              <div className="w-12 h-12 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-secondary-900 mb-2">Error Loading Application</h2>
              <p className="text-secondary-600 mb-2">{error.message}</p>
              <p className="text-xs text-secondary-500 mb-6">Action: {error.action}</p>
              <button
                onClick={refreshData}
                className="btn-danger"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show room selector if no room is selected
  if (!currentRoomId || rooms.length === 0) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="card">
            <div className="card-body">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-secondary-900 mb-2">Select Operation</h2>
              <p className="text-secondary-600 mb-6">Choose an STS operation to continue</p>
              <div className="space-y-3">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setCurrentRoomId(room.id)}
                    className="w-full text-left p-4 rounded-lg border border-secondary-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all duration-200 group"
                  >
                    <div className="font-semibold text-secondary-900 group-hover:text-primary-700">{room.title}</div>
                    <div className="text-sm text-secondary-600 mt-1">{room.location}</div>
                    <div className="text-xs text-secondary-500 mt-2 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      ETA: {new Date(room.sts_eta).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * RENDER TAB CONTENT WITH PERMISSION VALIDATION
   * Checks user permissions before rendering tab content
   */
  const renderTabContent = () => {
    // Permission check - if user can't access this tab, show access denied
    if (!canAccessTab(activeTab)) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="card max-w-md">
            <div className="card-body">
              <div className="w-12 h-12 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-danger-600 mb-2 text-center">Access Denied</h3>
              <p className="text-secondary-600 text-center">You don't have permission to access this tab.</p>
            </div>
          </div>
        </div>
      );
    }

    // Render appropriate component based on active tab
    switch (activeTab) {
      case 'overview':
        return (
          <DashboardContainer // PHASE 0: Use unified dashboard
            cockpitData={cockpitData}
            vessels={vessels}
            onRefresh={() => {
              fetchCockpitData();
              fetchVessels();
            }}
          />
        );
      case 'documents':
        return (
          <DocumentsPage
            cockpitData={cockpitData}
            refreshTrigger={documentRefreshTrigger}
            onUploadDocument={() => setShowUploadModal(true)}
            onUpdateDocumentStatus={handleUpdateDocumentStatus}
            onDocumentAction={handleDocumentAction}
            onViewDocument={handleViewDocument}
          />
        );
      case 'missing':
        return (
          <MissingDocumentsPage
            onUploadDocument={() => setShowUploadModal(true)}
          />
        );
      case 'approval':
        return (
          <ApprovalPage />
        );
      case 'activity':
        return (
          <ActivityPage
            activities={activities}
          />
        );
      case 'history':
        return (
          <HistoryPage />
        );
      case 'messages':
        return (
          <MessagesPage
            messages={messages}
            onSendMessage={handleSendMessage}
            onUploadDocument={() => setShowUploadModal(true)}
          />
        );
      default:
        return (
          <OverviewPage
            cockpitData={cockpitData}
            vessels={vessels}
          />
        );
    }
  };

  // Check if current path is a tab path
  const isTabPath = ['overview', 'documents', 'missing', 'approval', 'activity', 'history', 'messages'].includes(location.pathname.slice(1));

  return (
    <div className="min-h-screen bg-secondary-50">
      <Header />

      {isTabPath ? (
        <main className="pb-8">
          <TabNavigation
            activeTab={activeTab}
            onTabChange={handleTabChange}
            tabs={tabs}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {renderTabContent()}
          </div>
        </main>
      ) : (
        <main className="pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={() => {
            // Refresh all data after document upload
            fetchCockpitData();
            fetchActivities();
            // Trigger DocumentsPage to refresh its list
            setDocumentRefreshTrigger(prev => prev + 1);
            setShowUploadModal(false);
          }}
        />
      )}

      {/* PHASE 1: STS Operation Wizard */}
      {showStsWizard && (
        <StsOperationWizard
          isOpen={showStsWizard}
          onClose={() => setShowStsWizard(false)}
          onComplete={(operation) => {
            console.log('✅ Operation created:', operation);
            setShowStsWizard(false);
            // Show success notification
            // Optionally refresh operations list
          }}
        />
      )}
    </div>
  );
};

export default STSClearanceApp;