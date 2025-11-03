/**
 * MESSAGE BUBBLE COMPONENT - PHASE 4
 * 
 * Individual message display with:
 * - Sender information
 * - Timestamp
 * - Read receipts
 * - Message type indicators
 */

import React from 'react';
import { Check, CheckCheck, FileText, Lock, Globe } from 'lucide-react';

interface Message {
  id: string;
  sender_email: string;
  sender_name: string;
  content: string;
  message_type: 'text' | 'file' | 'system';
  created_at: string;
  read_by?: string[];
  attachments?: string;
  is_public?: boolean;  // PHASE 4: Message visibility
}

interface Props {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
}

export const MessageBubble: React.FC<Props> = ({
  message,
  isOwn,
  showAvatar = true
}) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return formatTime(dateString);
    }
    
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Determine read status
  const isRead = (message.read_by || []).length > 1; // More than just sender
  const readByCount = (message.read_by || []).length - 1; // Exclude sender

  // Get sender initials for avatar
  const initials = message.sender_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {showAvatar ? (
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
          isOwn ? 'bg-primary-600' : 'bg-secondary-400'
        }`}>
          {initials}
        </div>
      ) : (
        <div className="flex-shrink-0 w-8" />
      )}

      {/* Message Content */}
      <div className={`flex-1 flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Header - Sender name and time */}
        {showAvatar && (
          <div className={`text-xs font-medium flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
            <span className="text-secondary-700">{message.sender_name}</span>
            <span className="text-secondary-500">{formatDate(message.created_at)}</span>
            {/* Visibility Indicator - PHASE 4 */}
            <div className="flex items-center gap-1" title={message.is_public !== false ? 'Public message' : 'Private message'}>
              {message.is_public !== false ? (
                <Globe className="w-3 h-3 text-secondary-400" aria-label="Public message" />
              ) : (
                <Lock className="w-3 h-3 text-warning-600" aria-label="Private message" />
              )}
            </div>
          </div>
        )}

        {/* Message Bubble */}
        <div className={`mt-1 px-4 py-2 rounded-lg max-w-[70%] break-words ${
          isOwn 
            ? 'bg-primary-100 text-primary-900 rounded-br-none' 
            : 'bg-secondary-100 text-secondary-900 rounded-bl-none'
        }`}>
          {/* Message Type Indicator */}
          {message.message_type === 'system' && (
            <div className="text-xs italic text-secondary-600 mb-1">
              [System Message]
            </div>
          )}

          {/* Message Content */}
          {message.message_type === 'file' && message.attachments ? (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="text-sm">File attachment</span>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          {/* Read Status (only for sent messages) */}
          {isOwn && (
            <div className="flex items-center justify-end gap-1 mt-1">
              {isRead ? (
                <>
                  <CheckCheck className="w-3 h-3 text-primary-600" />
                  <span className="text-xs text-primary-600">
                    {readByCount === 1 ? '1 read' : `${readByCount} read`}
                  </span>
                </>
              ) : (
                <Check className="w-3 h-3 text-primary-500" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};