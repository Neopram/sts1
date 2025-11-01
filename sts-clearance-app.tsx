import React, { useState, useEffect } from 'react';
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
import LoginPage from './src/components/Pages/LoginPage';
import ApiService from './src/api';

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

  const tabs = [
    { id: 'overview', label: 'Overview', badge: undefined },
    { id: 'documents', label: 'Documents', badge: cockpitData?.missingDocuments?.length || 0 },
    { id: 'missing', label: 'Missing Docs', badge: missingDocuments?.summary?.criticalCount || 0, highlight: missingDocuments?.summary?.criticalCount > 0 },
    { id: 'approval', label: 'Approval', badge: cockpitData?.pendingApprovals?.length || 0 },
    { id: 'activity', label: 'Activity', badge: undefined },
    { id: 'history', label: 'History', badge: undefined },
    { id: 'messages', label: 'Messages', badge: messages.filter(m => !m.read).length }
  ];

  // Fetch cockpit data
  const fetchCockpitData = async () => {
    if (!currentRoomId) return;
    
    try {
      const data = await ApiService.getRoomSummary(currentRoomId);
      setCockpitData(data);
    } catch (err) {
      console.error('Error fetching cockpit data:', err);
    }
  };

  // Fetch vessels
  const fetchVessels = async () => {
    if (!currentRoomId) return;
    
    try {
      const data = await ApiService.getVessels(currentRoomId);
      setVessels(data);
    } catch (err) {
      console.error('Error fetching vessels:', err);
    }
  };

  // Fetch activities
  const fetchActivities = async () => {
    if (!currentRoomId) return;
    
    try {
      const data = await ApiService.getActivities(currentRoomId);
      setActivities(data);
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  };

  // Fetch messages
  const fetchMessages = async () => {
    if (!currentRoomId) return;
    
    try {
      const data = await ApiService.getMessages(currentRoomId);
      setMessages(data);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  // Fetch missing documents
  const fetchMissingDocuments = async () => {
    if (!currentRoomId) return;
    
    try {
      const data = await ApiService.getMissingDocuments([currentRoomId]);
      setMissingDocuments(data);
    } catch (err) {
      console.error('Error fetching missing documents:', err);
    }
  };

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



  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      if (currentRoomId) {
        fetchCockpitData();
        fetchVessels();
        fetchActivities();
        fetchMessages();
        fetchMissingDocuments();
      }
    };

    const handleLogout = () => {
      // Clear all local state when logout event is fired
      setCockpitData(null);
      setVessels([]);
      setActivities([]);
      setMessages([]);
      setMissingDocuments(null);
      setShowUploadModal(false);
    };

    window.addEventListener('app:refresh', handleRefresh);
    window.addEventListener('app:logout', handleLogout);
    
    return () => {
      window.removeEventListener('app:refresh', handleRefresh);
      window.removeEventListener('app:logout', handleLogout);
    };
  }, [currentRoomId]);

  // Fetch data when room changes
  useEffect(() => {
    if (currentRoomId) {
      fetchCockpitData();
      fetchVessels();
      fetchActivities();
      fetchMessages();
      fetchMissingDocuments();
    }
  }, [currentRoomId]);

  // Show login page if user is not authenticated
  if (!user && !loading) {
    return <LoginPage />;
  }

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

  // Show error state
  if (error) {
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
              <p className="text-secondary-600 mb-6">{error}</p>
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

  // Render tab content
  const renderTabContent = () => {
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