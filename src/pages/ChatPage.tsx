/**
 * CHAT PAGE - PHASE 4
 * 
 * Main chat interface for STS operations
 * Integrates ChatRoom, MessageBubble, and ChatInput components
 * Features:
 * - Real-time messaging
 * - Public/Private messages
 * - Room selection
 * - Activity status
 */

import React, { useState } from 'react';
import { ChevronLeft, MessageSquare } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { ChatRoom } from '../components/Chat/ChatRoom';

interface Props {
  roomId?: string;
  onClose?: () => void;
}

export const ChatPage: React.FC<Props> = ({ roomId, onClose }) => {
  const { currentRoomId, user } = useApp();
  const [messageCount, setMessageCount] = useState(0);

  const effectiveRoomId = roomId || currentRoomId;

  // Get room information
  const getRoomInfo = () => {
    if (!effectiveRoomId) return null;

    // Find the operation/room
    const operation = operations?.find((op: any) => op.room_id === effectiveRoomId);
    return operation;
  };

  const roomInfo = getRoomInfo();

  const handleMessagesLoad = (count: number) => {
    setMessageCount(count);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-secondary-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-secondary-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Back Button and Title */}
          <div className="flex items-center gap-4">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                title="Close chat"
              >
                <ChevronLeft className="w-5 h-5 text-secondary-600" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-secondary-900">
                {roomInfo?.vessel_name || 'Chat'}
              </h1>
              <p className="text-sm text-secondary-600">
                {roomInfo?.operation_type || 'STS Operation'} • {messageCount} message{messageCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* User Info */}
          <div className="text-right">
            <p className="text-sm font-medium text-secondary-900">{user?.name || user?.email}</p>
            <p className="text-xs text-secondary-600">{user?.role || 'User'}</p>
          </div>
        </div>

        {/* Info Banner */}
        {!effectiveRoomId && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              Select an operation from the dashboard to start chatting
            </div>
          </div>
        )}
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-hidden">
        {effectiveRoomId ? (
          <ChatRoom
            roomId={effectiveRoomId}
            chatType="all"
            onMessagesLoad={handleMessagesLoad}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-secondary-900 mb-2">
                No Room Selected
              </h2>
              <p className="text-secondary-600 max-w-sm">
                Go back to the dashboard and select an operation to start chatting with your team
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Stats */}
      <div className="bg-white border-t border-secondary-200 px-6 py-3 text-xs text-secondary-600 flex justify-between">
        <div>Room: {effectiveRoomId ? effectiveRoomId.slice(0, 8) + '...' : 'None'}</div>
        <div>Status: {effectiveRoomId ? '✅ Connected' : '⚪ Waiting'}</div>
      </div>
    </div>
  );
};