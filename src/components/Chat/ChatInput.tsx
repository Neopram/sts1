/**
 * CHAT INPUT COMPONENT - PHASE 4
 * 
 * Message input form with:
 * - Text input
 * - Send button
 * - Typing indicator
 * - File attachment support (future)
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Lock, Globe } from 'lucide-react';

interface Props {
  onSendMessage: (content: string, isPublic?: boolean) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  showVisibilityToggle?: boolean;  // PHASE 4: Show public/private toggle
}

export const ChatInput: React.FC<Props> = ({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = 'Type a message...',
  showVisibilityToggle = true  // PHASE 4
}) => {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isPublic, setIsPublic] = useState(true);  // PHASE 4: Public by default
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle message send
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || disabled) return;
    
    onSendMessage(content.trim(), isPublic);  // PHASE 4: Pass visibility
    setContent('');
    setIsTyping(false);
    onTyping(false);
  };

  // Handle typing indicator
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator if not already sent
    if (!isTyping && newContent.trim()) {
      setIsTyping(true);
      onTyping(true);
    }

    // Stop typing indicator after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onTyping(false);
      }
    }, 3000);
  };

  // Auto-resize textarea
  const handleTextareaResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-secondary-200 bg-white">
      <div className="flex gap-2">
        {/* Input Area */}
        <div className="flex-1 flex items-end gap-2">
          {/* Attachment Button (Future) */}
          <button
            type="button"
            disabled={disabled}
            className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <textarea
            value={content}
            onChange={(e) => {
              handleContentChange(e);
              handleTextareaResize(e);
            }}
            disabled={disabled}
            placeholder={disabled ? 'Connection lost...' : placeholder}
            rows={1}
            className="flex-1 px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-secondary-50 disabled:text-secondary-500 max-h-[120px]"
          />

          {/* Emoji Button (Future) */}
          <button
            type="button"
            disabled={disabled}
            className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
            title="Add emoji"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        {/* Visibility Toggle Button - PHASE 4 */}
        {showVisibilityToggle && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsPublic(!isPublic)}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              isPublic
                ? 'bg-primary-100 text-primary-600 hover:bg-primary-200'
                : 'bg-warning-100 text-warning-600 hover:bg-warning-200'
            } disabled:opacity-50`}
            title={isPublic ? 'Everyone can see this message' : 'Only direct recipients can see this message'}
          >
            {isPublic ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </button>
        )}

        {/* Send Button */}
        <button
          type="submit"
          disabled={disabled || !content.trim()}
          className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 disabled:bg-secondary-300 disabled:cursor-not-allowed flex items-center justify-center"
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Info Text */}
      <div className="text-xs text-secondary-500 mt-2">
        Press <kbd className="px-1 py-0.5 bg-secondary-100 rounded border border-secondary-200 font-mono text-xs">Enter</kbd> to send, 
        <kbd className="px-1 py-0.5 bg-secondary-100 rounded border border-secondary-200 font-mono text-xs ml-1">Shift + Enter</kbd> for new line
      </div>
    </form>
  );
};