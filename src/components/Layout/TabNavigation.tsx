import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface Tab {
  id: string;
  label: string;
  badge?: number;
}

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: Tab[];
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ 
  activeTab, 
  onTabChange, 
  tabs 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    navigate(`/${tabId}`);
  };
  
  // Sync URL with active tab
  useEffect(() => {
    const currentTab = location.pathname.slice(1) || 'overview';
    if (currentTab !== activeTab && tabs.some(tab => tab.id === currentTab)) {
      onTabChange(currentTab);
    }
  }, [location, activeTab, onTabChange, tabs]);
  
  return (
    <nav className="bg-white border-b border-secondary-200/50 shadow-card relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto scrollbar-thin">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`relative py-4 px-6 font-medium text-sm transition-all duration-200 duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-primary-600 bg-primary-50/50'
                  : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-danger-100 text-danger-700'
                  }`}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              {/* Active indicator */}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-t-full"></div>
              )}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};
