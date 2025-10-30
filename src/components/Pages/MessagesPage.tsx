import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Eye, Download, Trash2, Star, MoreVertical, AlertTriangle, X, MessageCircle, Clock } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Message } from '../../types/api';
import ApiService from '../../api';

interface MessagesPageProps {
  messages?: Message[];
  onSendMessage?: (content: string, attachments?: File[]) => Promise<void>;
  onUploadDocument: () => void;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({ 
  messages = [], 
  onSendMessage,
  onUploadDocument 
}) => {
  const { user, currentRoomId } = useApp();
  
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>(messages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load messages from API
  const loadMessages = async () => {
    if (!currentRoomId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const apiMessages = await ApiService.getMessages(currentRoomId);
      setLocalMessages(apiMessages);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  // Load messages on component mount
  useEffect(() => {
    loadMessages();
  }, [currentRoomId]);

  // Update local messages when prop changes
  useEffect(() => {
    if (messages.length > 0) {
      setLocalMessages(messages);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && attachments.length === 0) || sending) {
      return;
    }

    try {
      setSending(true);
      setError(null);
      
      if (onSendMessage) {
        await onSendMessage(newMessage.trim(), attachments);
      } else {
        // Fallback to API service
        await ApiService.sendMessage(currentRoomId!, newMessage.trim(), 'text');
      }
      
      // Add message to local state
      const newMsg: Message = {
        id: Date.now().toString(),
        content: newMessage.trim(),
        sender: user?.email || 'Unknown',
        sender_name: user?.name || 'Unknown User',
        timestamp: new Date().toISOString(),
        type: 'text',
        status: 'sent'
      };
      
      setLocalMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      setAttachments([]);
      
      // Refresh messages from API
      await loadMessages();
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleViewMessage = (message: Message) => {
    setSelectedMessage(message);
    setShowMessageModal(true);
  };

  const handleDownloadAttachment = async (attachment: any) => {
    if (!attachment.url) return;
    
    try {
      const response = await fetch(attachment.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      a.click();
      
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Error downloading attachment:', err);
      setError('Failed to download attachment. Please try again.');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // In a real app, this would call a delete API endpoint
      console.log('Deleting message:', messageId);
      
      // Remove from local state
      setLocalMessages(prev => prev.filter(msg => msg.id !== messageId));
      setShowMessageModal(false);
      setSelectedMessage(null);
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('Failed to delete message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatTimeOnly = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Group messages by sender
  const groupMessagesBySender = (msgs: Message[]) => {
    const groups: { sender: string; sender_name: string; avatar: string; messages: Message[] }[] = [];
    
    msgs.forEach(msg => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.sender === msg.sender) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({
          sender: msg.sender,
          sender_name: msg.sender_name,
          avatar: msg.sender_name.charAt(0).toUpperCase(),
          messages: [msg]
        });
      }
    });
    
    return groups;
  };

  const isOwnMessage = (sender: string) => sender === user?.email;

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'system':
        return <AlertTriangle className="w-4 h-4 text-blue-500" />;
      case 'notification':
        return <Star className="w-4 h-4 text-warning-500" />;
      case 'document':
        return <Paperclip className="w-4 h-4 text-success-500" />;
      default:
        return null;
    }
  };

  // Filter messages
  const filteredMessages = localMessages.filter(message => {
    const matchesSearch = message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.sender_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || message.type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Create message groups AFTER filteredMessages is defined
  const messageGroups = groupMessagesBySender(filteredMessages);

  if (loading && localMessages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-secondary-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col h-screen space-y-4">
      {/* Error Display */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl p-4 mb-2">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-danger-500 mr-2 flex-shrink-0" />
            <span className="text-danger-800 font-medium text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-danger-400 hover:text-danger-600 transition-colors duration-200 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">Messages</h1>
          <p className="text-sm text-secondary-600 mt-1">Manage your conversations</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onUploadDocument}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium text-sm flex items-center gap-2"
          >
            <Paperclip className="w-4 h-4" />
            Upload Document
          </button>
          
          <button
            onClick={loadMessages}
            disabled={loading}
            className="px-4 py-2.5 border border-secondary-200 text-secondary-600 rounded-lg hover:bg-secondary-50 transition-colors duration-200 disabled:opacity-50"
            title="Refresh"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-3 p-4 bg-white rounded-xl border border-secondary-200 mb-1">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="🔍 Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-4 py-2.5 border border-secondary-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-secondary-50 focus:bg-white transition-colors text-sm"
          />
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2.5 border border-secondary-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-secondary-50 focus:bg-white transition-colors text-sm"
        >
          <option value="all">All Types</option>
          <option value="text">Text</option>
          <option value="system">System</option>
          <option value="document">Document</option>
          <option value="notification">Notification</option>
        </select>
      </div>

      {/* Messages List - WhatsApp Style */}
      <div className="flex-1 overflow-y-auto space-y-6 bg-white rounded-xl border border-secondary-200 p-6 shadow-sm">
        {messageGroups.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">No messages found</h3>
            <p className="text-secondary-600">Start a conversation by sending a message.</p>
          </div>
        ) : (
          messageGroups.map((group, groupIdx) => (
            <div key={`group-${groupIdx}`} className={`flex gap-3 ${isOwnMessage(group.sender) ? 'justify-end' : 'justify-start'}`}>
              {/* Avatar - Only for other users' messages */}
              {!isOwnMessage(group.sender) && (
                <div className="w-8 h-8 bg-secondary-300 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-medium">{group.avatar}</span>
                </div>
              )}
              
              {/* Messages Group */}
              <div className={`flex flex-col gap-2 max-w-md ${isOwnMessage(group.sender) ? 'items-end' : 'items-start'}`}>
                {/* Sender Name - Only for other users' first message */}
                {!isOwnMessage(group.sender) && (
                  <span className="text-xs font-medium text-secondary-600 px-3 pt-1">{group.sender_name}</span>
                )}
                
                {/* Message Bubbles */}
                {group.messages.map((message) => (
                  <div 
                    key={message.id}
                    className={`group relative flex items-end gap-2 ${isOwnMessage(group.sender) ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Message Bubble */}
                    <div
                      className={`px-4 py-2 rounded-2xl max-w-xs break-words transition-all duration-200 ${
                        isOwnMessage(group.sender)
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-secondary-100 text-secondary-900 rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      
                      {/* Attachments inline in bubble */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className={`mt-2 pt-2 border-t ${isOwnMessage(group.sender) ? 'border-blue-400' : 'border-secondary-200'}`}>
                          {message.attachments.map((attachment, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 mt-1">
                              <Paperclip className={`w-3 h-3 flex-shrink-0 ${isOwnMessage(group.sender) ? 'text-blue-200' : 'text-secondary-500'}`} />
                              <span className={`text-xs truncate max-w-[120px] ${isOwnMessage(group.sender) ? 'text-blue-100' : 'text-secondary-600'}`}>
                                {attachment.name}
                              </span>
                              <button
                                onClick={() => handleDownloadAttachment(attachment)}
                                className={`flex-shrink-0 transition-colors ${isOwnMessage(group.sender) ? 'hover:text-blue-200' : 'hover:text-secondary-700'}`}
                                title="Download"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Time & Status on hover */}
                      <div className={`flex items-center gap-1 mt-1 text-xs opacity-70 group-hover:opacity-100 transition-opacity ${isOwnMessage(group.sender) ? 'text-blue-100' : 'text-secondary-600'}`}>
                        <span>{formatTimeOnly(message.timestamp)}</span>
                        {message.status === 'read' && <span>✓</span>}
                      </div>
                    </div>

                    {/* Action buttons on hover */}
                    <div className="hidden group-hover:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button
                        onClick={() => handleViewMessage(message)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isOwnMessage(group.sender)
                            ? 'text-blue-600 hover:bg-blue-50'
                            : 'text-secondary-600 hover:bg-secondary-50'
                        }`}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {message.sender === user?.email && (
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="p-1.5 text-secondary-600 hover:text-danger-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - WhatsApp Style */}
      <div className="rounded-xl border border-secondary-200 bg-white overflow-hidden">
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="border-b border-secondary-200 p-4 bg-secondary-50">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip className="w-4 h-4 text-secondary-500" />
              <span className="text-xs font-medium text-secondary-700">Attachments ({attachments.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center gap-2 px-2 py-1 bg-white rounded-lg border border-secondary-200 text-xs hover:bg-secondary-50 transition-colors">
                  <Paperclip className="w-3 h-3 text-secondary-400 flex-shrink-0" />
                  <span className="text-secondary-700 truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="text-secondary-400 hover:text-danger-600 transition-colors flex-shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex items-end gap-2 p-4">
          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors duration-200 flex-shrink-0"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          
          {/* Message input */}
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-3 py-2 border-0 focus:ring-0 bg-secondary-50 rounded-2xl resize-none focus:bg-secondary-100 transition-colors text-sm"
            style={{ maxHeight: '100px', minHeight: '40px' }}
          />
          
          {/* Send button */}
          <button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && attachments.length === 0) || sending}
            className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors duration-200 disabled:bg-secondary-300 disabled:cursor-not-allowed flex-shrink-0"
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt"
        />
      </div>

      {/* Message Details Modal */}
      {showMessageModal && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[50]">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-secondary-900 mb-6">Message Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  From
                </label>
                <p className="text-secondary-900">{selectedMessage.sender_name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Type
                </label>
                <div className="flex items-center gap-2">
                  {getMessageIcon(selectedMessage.type)}
                  <span className="capitalize">{selectedMessage.type}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Sent
                </label>
                <p className="text-secondary-900">{new Date(selectedMessage.timestamp).toLocaleString()}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Message
                </label>
                <p className="text-secondary-900 bg-secondary-50 p-3 rounded-xl">{selectedMessage.content}</p>
              </div>
              
              {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Attachments
                  </label>
                  <div className="space-y-2">
                    {selectedMessage.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-secondary-50 rounded-xl border">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-secondary-500" />
                          <span className="text-secondary-700">{attachment.name}</span>
                          <span className="text-sm text-secondary-500">
                            ({(attachment.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          onClick={() => handleDownloadAttachment(attachment)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors duration-200"
                        >
                          <Download className="w-3 h-3 inline mr-1" />
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-6 mt-6">
              <button
                onClick={() => setShowMessageModal(false)}
                className="flex-1 px-4 py-2 border border-secondary-300 rounded-xl text-secondary-700 hover:bg-secondary-50 transition-colors duration-200"
              >
                Close
              </button>
              
              {selectedMessage.sender === user?.email && (
                <button
                  onClick={() => handleDeleteMessage(selectedMessage.id)}
                  className="flex-1 btn-danger"
                >
                  <Trash2 className="w-4 h-4 inline mr-2" />
                  Delete Message
                </button>
              )}
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};