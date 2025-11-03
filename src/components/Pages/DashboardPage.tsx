/**
 * DASHBOARD PAGE - PR1 PHASE 1
 * 
 * Unified dashboard entry point with:
 * - Breadcrumb navigation
 * - Role switcher modal
 * - Dashboard container orchestration
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, LayoutDashboard, Settings2, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { DashboardContainer } from './DashboardContainer';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, currentRoomId, rooms } = useApp();
  
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  
  // Get current room
  const currentRoom = rooms.find(r => r.id === currentRoomId);
  
  // Available roles for this user (mock - in production would come from backend)
  const availableRoles = ['broker', 'inspector', 'admin', 'viewer'];
  
  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Breadcrumb Navigation - PR1 */}
      <div className="bg-white border-b border-secondary-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => navigate('/')}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                STS Hub
              </button>
              <ChevronRight className="w-4 h-4 text-secondary-400" />
              
              {currentRoom && (
                <>
                  <button
                    onClick={() => navigate('/')}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Rooms
                  </button>
                  <ChevronRight className="w-4 h-4 text-secondary-400" />
                  <span className="text-secondary-900 font-semibold">{currentRoom.title}</span>
                </>
              )}
              
              <ChevronRight className="w-4 h-4 text-secondary-400" />
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-primary-600" />
                <span className="text-secondary-900 font-semibold capitalize">
                  {user?.role || 'Dashboard'}
                </span>
              </div>
            </div>
            
            {/* Role Switcher Button - PR1 */}
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-200"
              title="Switch dashboard view"
            >
              <Settings2 className="w-4 h-4" />
              <span>Switch View</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Role Switcher Modal - PR1 */}
      {showRoleSwitcher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-secondary-200">
              <h3 className="text-lg font-bold text-secondary-900">Switch Dashboard View</h3>
              <button
                onClick={() => setShowRoleSwitcher(false)}
                className="text-secondary-400 hover:text-secondary-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6">
              <p className="text-sm text-secondary-600 mb-4">
                View this operation from different perspectives:
              </p>
              
              <div className="space-y-2">
                {availableRoles.map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      // Update user role temporarily for this view
                      // In production, this would be a proper role switching mechanism
                      window.location.href = `/dashboard?role=${role}`;
                      setShowRoleSwitcher(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                      user?.role?.toLowerCase() === role
                        ? 'border-primary-600 bg-primary-50 text-primary-900 font-medium'
                        : 'border-secondary-200 hover:border-primary-400 text-secondary-900 hover:bg-primary-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="capitalize font-medium">{role}</span>
                      {user?.role?.toLowerCase() === role && (
                        <span className="text-xs font-bold bg-primary-600 text-white px-2 py-1 rounded">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-secondary-500 mt-1">
                      View data from the {role} perspective
                    </p>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-secondary-200 flex gap-3">
              <button
                onClick={() => setShowRoleSwitcher(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-secondary-700 bg-secondary-100 hover:bg-secondary-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Dashboard Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardContainer />
      </div>
    </div>
  );
};

export default DashboardPage;