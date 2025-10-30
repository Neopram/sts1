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
    <header className="sticky top-0 z-50 bg-gradient-html-header shadow-lg transition-shadow duration-300">
      <div className="mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between py-5">
          {/* Logo and Brand - Premium */}
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110 hover:bg-white/30 flex-shrink-0">
              <span className="text-white font-bold text-lg flex items-center justify-center">
                <Ship className="w-6 h-6" />
              </span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-2xl font-bold text-white leading-none">🚢 STS Clearance Hub</h1>
              <p className="text-sm text-white/80 mt-1 font-medium">Enterprise Operations</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            {/* Create Room Button - Premium */}
            {isAuthenticated && (
              <button
                onClick={() => setShowCreateRoomModal(true)}
                className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 bg-white text-html-header rounded-lg hover:bg-gray-100 transition-all duration-300 font-semibold shadow-md transform hover:scale-105 active:scale-95 text-sm"
                title="Create New Operation"
              >
                <Plus className="w-5 h-5 flex-shrink-0" />
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
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-sm text-white bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-lg transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
              >
                <span className="text-lg leading-none flex-shrink-0">{getCurrentLanguage().flag}</span>
                <span className="hidden sm:inline">{getCurrentLanguage().code.toUpperCase()}</span>
                <ChevronDown className="w-4 h-4 text-white/70 flex-shrink-0" />
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
                className="relative inline-flex items-center justify-center p-2.5 text-white bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                title="Notifications"
              >
                <Bell className="w-5 h-5 flex-shrink-0" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-html-location text-xs font-bold text-white ring-2 ring-html-header animate-pulse-custom">
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
                className="inline-flex items-center justify-center p-2.5 text-white bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                title="Help & Support"
              >
                <HelpCircle className="w-5 h-5 flex-shrink-0" />
              </button>
            </div>

            {/* User Menu - Premium */}
            <div className="relative">
              <button
                ref={userMenuButtonRef}
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center ring-2 ring-white/20 font-semibold text-white text-sm flex-shrink-0">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <span className="text-sm font-semibold text-white hidden lg:inline">{user?.name}</span>
                <ChevronDown className="w-4 h-4 text-white/70 flex-shrink-0" />
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
              className="inline-flex items-center justify-center p-2.5 text-white bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {showMobileMenu ? (
                <X className="w-5 h-5 flex-shrink-0" />
              ) : (
                <Menu className="w-5 h-5 flex-shrink-0" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-white/20 py-4">
            <div className="space-y-2">
              {/* Global Search Mobile */}
              <div className="w-full">
                <GlobalSearch />
              </div>

              {/* Mobile Menu Items */}
              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowMobileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors duration-200"
                >
                  <Bell className="w-4 h-4 flex-shrink-0" />
                  <span>{t('notifications')}</span>
                  {unreadCount > 0 && (
                    <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-html-location text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => handleNavigation('/help')}
                  className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors duration-200"
                >
                  <HelpCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{t('help')}</span>
                </button>
                
                <button
                  onClick={() => handleNavigation('/profile')}
                  className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors duration-200"
                >
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span>{t('profile')}</span>
                </button>
                
                <button
                  onClick={() => handleNavigation('/settings')}
                  className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors duration-200"
                >
                  <Settings className="w-4 h-4 flex-shrink-0" />
                  <span>{t('settings')}</span>
                </button>
                
                <div className="border-t border-white/20 my-2"></div>
                
                {isAuthenticated && (
                  <button
                    onClick={handleLogout}
                    data-logout-button
                    className="w-full text-left px-3 py-2.5 text-sm text-danger-100 hover:bg-danger-500/20 rounded-lg flex items-center gap-3 transition-colors duration-200"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    <span>Logout</span>
                  </button>
                )}
              </div>

              {/* Language Selector Mobile */}
              <div className="pt-3 border-t border-white/20">
                <label className="block text-xs font-semibold text-white/80 mb-2.5 uppercase tracking-wider">{t('language')}</label>
                <select
                  value={currentLanguage.code}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-white/20 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-white/30 focus:border-white/30 text-sm font-medium transition-all duration-200"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-html-header text-white">
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
