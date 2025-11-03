/**
 * CHAT ROOM COMPONENT - PHASE 4
 * 
 * Main chat interface for STS operations
 * Features:
 * - Real-time messaging via WebSocket
 * - Message history loading from API
 * - Read receipts
 * - Typing indicators
 * - Public/Private message distinction
 */

import React, { useState, useEffect, useRef } from 'react';
import { Loader, AlertTriangle, MessageSquare } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import ApiService from '../../api';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';

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
  roomId?: string;
  chatType?: 'public' | 'private' | 'all';
  onMessagesLoad?: (count: number) => void;
}

export const ChatRoom: React.FC<Props> = ({
  roomId,
  onMessagesLoad
}) => {
  const { currentRoomId, user } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const effectiveRoomId = roomId || currentRoomId;

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load initial messages from API
  const loadMessages = async () => {
    if (!effectiveRoomId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await ApiService.getRoomMessages(effectiveRoomId, 50, 0);
      
      if (Array.isArray(response)) {
        setMessages(response as Message[]);
        onMessagesLoad?.(response.length);
      } else if (response && typeof response === 'object' && 'data' in response) {
        const data = (response as any).data;
        if (Array.isArray(data)) {
          setMessages(data);
          onMessagesLoad?.(data.length);
        } else {
          setMessages([]);
          onMessagesLoad?.(0);
        }
      } else {
        setMessages([]);
        onMessagesLoad?.(0);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages. Please try again.');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Setup WebSocket connection
  const setupWebSocket = async () => {
    if (!effectiveRoomId || !user?.email) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const baseURL = import.meta.env.VITE_API_URL || '';
      const wsURL = `${protocol}//${window.location.host}${baseURL}/api/v1/rooms/${effectiveRoomId}/ws?user_email=${user.email}&user_name=${encodeURIComponent(user.name || 'Anonymous')}`;
      
      const ws = new WebSocket(wsURL);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'message') {
            // New message received
            const newMessage: Message = {
              id: data.message_id || data.id || `msg-${Date.now()}`,
              sender_email: data.sender_email,
              sender_name: data.sender_name,
              content: data.content,
              message_type: data.message_type || 'text',
              created_at: new Date().toISOString(),
              read_by: [data.sender_email],
              attachments: data.attachments,
              is_public: data.is_public ?? true  // PHASE 4: Default to public
            };
            setMessages(prev => [...prev, newMessage]);
          } else if (data.type === 'typing') {
            // Typing indicator
            if (data.typing) {
              setTypingUsers(prev => new Set([...prev, data.user_name]));
            } else {
              setTypingUsers(prev => {
                const updated = new Set(prev);
                updated.delete(data.user_name);
                return updated;
              });
            }
          } else if (data.type === 'read_receipt') {
            // Message read receipt
            setMessages(prev =>
              prev.map(msg =>
                msg.id === data.message_id
                  ? {
                      ...msg,
                      read_by: Array.isArray(msg.read_by) 
                        ? [...msg.read_by, data.user_email] 
                        : [data.user_email]
                    }
                  : msg
              )
            );
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('Connection error. Messages may not update in real-time.');
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket closed');
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error setting up WebSocket:', err);
      setError('Failed to establish real-time connection.');
    }
  };

  // Initialize - load messages and setup WebSocket
  useEffect(() => {
    loadMessages();
    setupWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [effectiveRoomId, user?.email]);

  // Send message handler
  const handleSendMessage = async (content: string, isPublic: boolean = true) => {  // PHASE 4
    if (!effectiveRoomId || !wsRef.current || !content.trim()) return;

    try {
      // Send via WebSocket for real-time delivery
      wsRef.current.send(
        JSON.stringify({
          type: 'message',
          content: content.trim(),
          message_type: 'text',
          is_public: isPublic  // PHASE 4: Pass visibility
        })
      );
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    }
  };

  // Handle typing indicator
  const handleTyping = (isTyping: boolean) => {
    if (!wsRef.current) return;

    try {
      wsRef.current.send(
        JSON.stringify({
          type: 'typing',
          typing: isTyping
        })
      );
    } catch (err) {
      console.error('Error sending typing indicator:', err);
    }
  };

  if (!effectiveRoomId) {
    return (
      <div className="flex items-center justify-center h-[500px] text-center">
        <div>
          <MessageSquare className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900">Select a room to chat</h3>
          <p className="text-secondary-600 mt-2">Choose an operation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-secondary-200">
      {/* Error Banner */}
      {error && (
        <div className="bg-warning-50 border-b border-warning-200 px-6 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning-600" />
          <span className="text-warning-800 font-medium text-sm">{error}</span>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader className="w-8 h-8 text-primary-600 mx-auto mb-2 animate-spin" />
              <p className="text-secondary-600">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <MessageSquare className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-secondary-900">No messages yet</h3>
              <p className="text-secondary-600 mt-2">Start the conversation by sending a message</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_email === user?.email}
                showAvatar={index === 0 || messages[index - 1].sender_email !== message.sender_email}
              />
            ))}
            {typingUsers.size > 0 && (
              <div className="text-sm text-secondary-600 italic">
                {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <ChatInput 
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        disabled={!wsRef.current}
      />
    </div>
  );
};