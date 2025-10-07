import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Eye, Download, Trash2, Star, MoreVertical, AlertTriangle, X } from 'lucide-react';
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
        await ApiService.sendMessage(currentRoomId!, newMessage.trim(), attachments);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col h-full space-y-8">
      {/* Error Display */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-danger-500 mr-2" />
            <span className="text-danger-800 font-medium">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-danger-400 hover:text-danger-600 transition-colors duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-secondary-900">Messages</h1>
        
        <div className="flex gap-6">
          <button
            onClick={onUploadDocument}
            className="btn-primary flex items-center"
          >
            <Paperclip className="w-4 h-4 mr-2" />
            Upload Document
          </button>
          
          <button
            onClick={loadMessages}
            disabled={loading}
            className="btn-secondary disabled:opacity-50"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-4 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Types</option>
          <option value="text">Text</option>
          <option value="system">System</option>
          <option value="document">Document</option>
          <option value="notification">Notification</option>
        </select>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-6">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-8">
            <Paperclip className="w-12 h-12 text-secondary-400 mx-auto mb-6" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">No messages found</h3>
            <p className="text-secondary-600">Start a conversation by sending a message.</p>
          </div>
        ) : (
          filteredMessages.map((message) => (
            <div key={message.id} className="bg-white rounded-xl shadow-card border border-secondary-200 p-6">
              <div className="flex items-start gap-6">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-medium">
                    {message.sender_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-secondary-900">{message.sender_name}</span>
                    {getMessageIcon(message.type)}
                    <span className="text-sm text-secondary-500">{formatTimestamp(message.timestamp)}</span>
                    {message.status && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        message.status === 'read' ? 'bg-green-100 text-success-800' : 'bg-secondary-100 text-secondary-800'
                      }`}>
                        {message.status}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-secondary-700 mb-2">{message.content}</p>
                  
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="space-y-2">
                      {message.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-secondary-50 rounded border">
                          <Paperclip className="w-4 h-4 text-secondary-500" />
                          <span className="text-sm text-secondary-700">{attachment.name}</span>
                          <span className="text-xs text-secondary-500">
                            ({(attachment.size / 1024).toFixed(1)} KB)
                          </span>
                          <button
                            onClick={() => handleDownloadAttachment(attachment)}
                            className="ml-auto p-1 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleViewMessage(message)}
                    className="p-1 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  {message.sender === user?.email && (
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="p-1 text-secondary-400 hover:text-danger-600 transition-colors duration-200"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white rounded-xl shadow-card border border-secondary-200 p-6">
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="mb-3 p-3 bg-secondary-50 rounded-xl border">
            <div className="flex items-center gap-2 mb-2">
              <Paperclip className="w-4 h-4 text-secondary-500" />
              <span className="text-sm font-medium text-secondary-700">Attachments ({attachments.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center gap-2 px-2 py-1 bg-white rounded border text-sm">
                  <span className="text-secondary-700">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="text-danger-500 hover:text-danger-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            rows={3}
            className="flex-1 px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          
          <div className="flex flex-col gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-secondary-500 hover:text-secondary-700 transition-colors duration-200"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleSendMessage}
              disabled={(!newMessage.trim() && attachments.length === 0) || sending}
              className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
              title="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
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