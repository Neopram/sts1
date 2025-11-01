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
    <nav className="bg-gradient-to-r from-secondary-50 to-white border-b-2 border-secondary-100 shadow-md relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto scrollbar-thin py-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`relative py-4 px-6 font-semibold text-sm transition-all duration-300 whitespace-nowrap
                ${
                activeTab === tab.id
                  ? 'text-primary-700 border-b-3 border-primary-600 bg-white/50'
                  : 'text-secondary-600 hover:text-primary-600 hover:bg-white/30 hover:border-b-3 hover:border-primary-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2.5">
                <span className={activeTab === tab.id ? 'font-bold' : 'font-semibold'}>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-danger-500 text-white shadow-md hover:bg-danger-600'
                  }`}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};
