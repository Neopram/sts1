import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Settings, 
  User, 
  HelpCircle, 
  LogOut, 
  Menu,
  X,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  Plus,
  Ship
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotifications } from '../../contexts/NotificationContext';

import { useNavigate } from 'react-router-dom';
import GlobalSearch from '../Search/GlobalSearch';
import NotificationDropdown from '../Notifications/NotificationDropdown';
import CreateRoomModal from '../Modals/CreateRoomModal';
import LanguageDropdown from './LanguageDropdown';
import UserMenuDropdown from './UserMenuDropdown';

const Header: React.FC = () => {
  const { user, logout, refreshData } = useApp();
  const { currentLanguage, setLanguage, languages, t } = useLanguage();
  const { unreadCount } = useNotifications();

  const navigate = useNavigate();

  // Check if user is authenticated
  const isAuthenticated = !!(user && localStorage.getItem('auth-token'));
  
  // Create room modal state
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
   
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  // Refs for dropdown positioning
  const notificationButtonRef = React.useRef<HTMLButtonElement>(null);
  const languageButtonRef = React.useRef<HTMLButtonElement>(null);
  const userMenuButtonRef = React.useRef<HTMLButtonElement>(null);

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode);
    setShowLanguageMenu(false);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setShowUserMenu(false);
    setShowMobileMenu(false);
  };

  const handleLogout = async () => {
    // Confirm logout
    if (!confirm(t('logout.confirm'))) {
      return;
    }

    try {
      setShowUserMenu(false);
      setShowMobileMenu(false);
      setLogoutError(null);
      
      // Show loading state
      const logoutButton = document.querySelector('[data-logout-button]');
      if (logoutButton) {
        logoutButton.setAttribute('disabled', 'true');
        logoutButton.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>';
      }
      
      // Call logout
      await logout();
      
      // Show success notification briefly before redirect
      setShowLogoutSuccess(true);
      setTimeout(() => {
        setShowLogoutSuccess(false);
      }, 2000);
      
         } catch (err) {
       console.error('Logout failed:', err);
       setLogoutError(t('logout.error'));
      
      // Reset button state
      const logoutButton = document.querySelector('[data-logout-button]');
      if (logoutButton) {
        logoutButton.removeAttribute('disabled');
        logoutButton.innerHTML = '<LogOut className="w-4 h-4" /><span>Logout</span>';
      }
      
      // Even if logout fails, clear local state after a delay
      setTimeout(() => {
        logout();
      }, 3000);
    }
  };

  // Handle create room
  const handleCreateRoom = async (roomData: any) => {
    try {
      // This would call the API to create a room
      // await ApiService.createRoom(roomData);
      console.log('Creating room:', roomData);
      
      // Refresh data to show new room
      await refreshData();
      
      // Show success notification
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          type: 'success',
          message: 'Operation created successfully'
        }
      }));
    } catch (err) {
      console.error('Error creating room:', err);
      throw err;
    }
  };

  const getCurrentLanguage = () => {
    return currentLanguage;
  };

  // Auto-cleanup notifications
  useEffect(() => {
    if (showLogoutSuccess) {
      const timer = setTimeout(() => {
        setShowLogoutSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showLogoutSuccess]);

  useEffect(() => {
    if (logoutError) {
      const timer = setTimeout(() => {
        setLogoutError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [logoutError]);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand - Premium */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center space-x-3 group cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
                <span className="text-white font-bold text-sm flex items-center justify-center">
                  <Ship className="w-5 h-5" />
                </span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">STS Clearance</h1>
                <p className="text-xs text-gray-500">Enterprise Hub</p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Create Room Button - Premium */}
            {isAuthenticated && (
              <button
                onClick={() => setShowCreateRoomModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold shadow-md transform hover:scale-105 active:scale-95"
                title="Create New Operation"
              >
                <Plus className="w-4 h-4" />
                <span>New Operation</span>
              </button>
            )}
            
            {/* Global Search */}
            <GlobalSearch />

            {/* Language Selector - Premium */}
            <div className="relative">
              <button
                ref={languageButtonRef}
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              >
                <span className="text-lg leading-none">{getCurrentLanguage().flag}</span>
                <span>{getCurrentLanguage().code.toUpperCase()}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              <LanguageDropdown 
                isOpen={showLanguageMenu}
                onClose={() => setShowLanguageMenu(false)}
                buttonRef={languageButtonRef}
                languages={languages}
                onLanguageChange={handleLanguageChange}
              />
            </div>

            {/* Notifications - Premium */}
            <div className="relative">
              <button
                ref={notificationButtonRef}
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              <NotificationDropdown 
                isOpen={showNotifications} 
                onClose={() => setShowNotifications(false)}
                buttonRef={notificationButtonRef}
              />
            </div>

            {/* Help & Support - Premium */}
            <div className="relative">
              <button
                onClick={() => navigate('/help')}
                className="p-2.5 text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                title="Help & Support"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>

            {/* User Menu - Premium */}
            <div className="relative">
              <button
                ref={userMenuButtonRef}
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 px-2 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center ring-2 ring-blue-100 font-semibold text-white text-xs">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden lg:block">{user?.name}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              <UserMenuDropdown
                isOpen={showUserMenu}
                onClose={() => setShowUserMenu(false)}
                buttonRef={userMenuButtonRef}
                isAuthenticated={isAuthenticated}
                onNavigate={handleNavigation}
                onLogout={handleLogout}
                t={t}
              />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2.5 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-xl transition-colors duration-200"
            >
              {showMobileMenu ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-secondary-200 py-4">
            <div className="space-y-4">
              {/* Global Search Mobile */}
              <div className="w-full">
                <GlobalSearch />
              </div>

              {/* Mobile Menu Items */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowMobileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm text-secondary-700 hover:bg-secondary-100 rounded-xl flex items-center gap-3"
                >
                  <Bell className="w-4 h-4" />
                  <span>{t('notifications')}</span>
                  {unreadCount > 0 && (
                    <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-danger-800">
                      {unreadCount}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => handleNavigation('/help')}
                  className="w-full text-left px-3 py-2.5 text-sm text-secondary-700 hover:bg-secondary-100 rounded-xl flex items-center gap-3"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>{t('help')}</span>
                </button>
                
                <button
                  onClick={() => handleNavigation('/profile')}
                  className="w-full text-left px-3 py-2.5 text-sm text-secondary-700 hover:bg-secondary-100 rounded-xl flex items-center gap-3"
                >
                  <User className="w-4 h-4" />
                  <span>{t('profile')}</span>
                </button>
                
                <button
                  onClick={() => handleNavigation('/settings')}
                  className="w-full text-left px-3 py-2.5 text-sm text-secondary-700 hover:bg-secondary-100 rounded-xl flex items-center gap-3"
                >
                  <Settings className="w-4 h-4" />
                  <span>{t('settings')}</span>
                </button>
                
                <div className="border-t border-secondary-200 my-2"></div>
                
                {isAuthenticated && (
                  <button
                    onClick={handleLogout}
                    data-logout-button
                    className="w-full text-left px-3 py-2.5 text-sm text-secondary-700 hover:bg-secondary-100 rounded-xl flex items-center gap-3"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                )}
              </div>

              {/* Language Selector Mobile */}
              <div className="pt-4 border-t border-secondary-200">
                <label className="block text-sm font-medium text-secondary-700 mb-2">{t('language')}</label>
                <select
                  value={currentLanguage.code}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close menus */}
      {(showUserMenu || showLanguageMenu || showMobileMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false);
            setShowLanguageMenu(false);
            setShowMobileMenu(false);
          }}
        />
      )}

      {/* Logout Success Notification */}
      {showLogoutSuccess && (
        <div className="fixed top-6 right-4 z-50 bg-success-50 border border-success-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success-500" />
            <span className="text-success-800 font-medium">{t('logout.success')}</span>
          </div>
        </div>
      )}

      {/* Logout Error Notification */}
      {logoutError && (
        <div className="fixed top-6 right-4 z-50 bg-danger-50 border border-danger-200 rounded-xl p-6 shadow-lg max-w-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-danger-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-danger-800 text-sm">{logoutError}</p>
              <button
                onClick={() => setLogoutError(null)}
                className="text-danger-600 hover:text-danger-800 text-xs mt-1 underline"
              >
                {t('logout.close')}
              </button>
            </div>
          </div>
        </div>
      )}

       {/* Create Room Modal */}
       <CreateRoomModal
         isOpen={showCreateRoomModal}
         onClose={() => setShowCreateRoomModal(false)}
         onCreateRoom={handleCreateRoom}
       />
     </header>
   );
 };

 export default Header;
