'use client';

import { useState } from 'react';
import { Edit2, Trash2, MoreVertical, ExternalLink } from 'lucide-react';

interface Message {
  id: string;
  user_id: string;
  content: string;
  message_type: string;
  meet_link?: string;
  referenced_task_id?: string;
  thread_id?: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  tasks?: {
    id: string;
    title: string;
  };
}

interface ChatMessageProps {
  message: Message;
  onUpdate: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
}

export default function ChatMessage({ message, onUpdate, onDelete }: ChatMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showMenu, setShowMenu] = useState(false);

  // Mock current user ID - in real app, get from auth context
  const currentUserId = 'd1a02417-37f3-41fb-b01e-5ce0c08faab8';
  const isOwnMessage = message.user_id === currentUserId;

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content);
    setShowMenu(false);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onUpdate(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this message?')) {
      onDelete(message.id);
    }
    setShowMenu(false);
  };

  const formatTime = (dateString: string) => {
    try {
      if (!dateString) {
        return 'Agora';
      }

      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', dateString);
        return 'Agora';
      }

      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffInHours < 24 * 7) {
        return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
    } catch (error) {
      console.error('Error formatting time:', error, 'dateString:', dateString);
      return 'Agora';
    }
  };

  const renderMessageContent = () => {
    if (message.message_type === 'system') {
      return (
        <div className="text-sm text-muted-foreground italic">
          {message.content}
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        
        {/* Task Reference */}
        {message.tasks && (
          <div className="inline-flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-sm">
            <ExternalLink className="h-3 w-3 text-blue-600" />
            <span className="text-blue-800">Task: {message.tasks.title}</span>
          </div>
        )}

        {/* Meet Link */}
        {message.meet_link && (
          <div className="inline-flex items-center gap-2 px-2 py-1 bg-green-50 border border-green-200 rounded text-sm">
            <ExternalLink className="h-3 w-3 text-green-600" />
            <a 
              href={message.meet_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-800 hover:underline"
            >
              Join Meeting
            </a>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex gap-3 group ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-medium text-primary">
          {/* Mock user initial - in real app, get from user data */}
          U
        </span>
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-xs sm:max-w-md ${isOwnMessage ? 'text-right' : ''}`}>
        <div className={`inline-block p-3 rounded-lg ${
          isOwnMessage 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-secondary text-secondary-foreground'
        }`}>
          {renderMessageContent()}
        </div>

        {/* Message Meta */}
        <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${
          isOwnMessage ? 'justify-end' : ''
        }`}>
          <span>{formatTime(message.created_at)}</span>
          {message.is_edited && <span>(edited)</span>}
          
          {/* Message Actions */}
          {isOwnMessage && message.message_type !== 'system' && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-secondary rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-3 w-3" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-6 bg-white border rounded-md shadow-lg z-10 min-w-24">
                  <button
                    onClick={handleEdit}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit2 className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
