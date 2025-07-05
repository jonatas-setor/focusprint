'use client';

import { useState, useEffect, useRef } from 'react';
import { MoreVertical } from 'lucide-react';
import { useRealtime } from '@/contexts/realtime-context';
import MessageList from './message-list';
import MessageInput from './message-input';
import GoogleMeetButton from './google-meet-button';

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

interface ChatContainerProps {
  projectId: string;
  availableTasks?: { id: string; title: string }[];
}

export default function ChatContainer({ projectId, availableTasks = [] }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { subscribeToMessages } = useRealtime();

  useEffect(() => {
    if (projectId) {
      loadMessages();
    }
  }, [projectId]);

  // Set up Realtime subscription for messages
  useEffect(() => {
    if (!projectId) return;

    console.log('🔔 Setting up Realtime subscription for messages in project:', projectId);

    const unsubscribe = subscribeToMessages(projectId, (payload) => {
      console.log('📨 Realtime message update:', payload);

      switch (payload.eventType) {
        case 'INSERT':
          // Add new message
          const newMessage = payload.new as Message;

          // Validate message data
          if (!newMessage.id || !newMessage.content || !newMessage.created_at) {
            console.warn('Invalid message data received via Realtime:', newMessage);
            break;
          }

          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
          break;

        case 'UPDATE':
          // Update existing message
          const updatedMessage = payload.new as Message;
          setMessages(prev =>
            prev.map(msg =>
              msg.id === updatedMessage.id ? updatedMessage : msg
            )
          );
          break;

        case 'DELETE':
          // Remove deleted message
          const deletedMessage = payload.old as Message;
          setMessages(prev =>
            prev.filter(msg => msg.id !== deletedMessage.id)
          );
          break;
      }
    });

    return unsubscribe;
  }, [projectId, subscribeToMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/client/projects/${projectId}/messages?limit=50`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load messages');
      }

      // Filter and validate messages, then reverse to show oldest first
      const validMessages = (data.messages || [])
        .filter((message: Message) => {
          if (!message.id || !message.content || !message.created_at) {
            console.warn('Invalid message data from API:', message);
            return false;
          }
          return true;
        })
        .reverse();

      setMessages(validMessages);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content: string, messageType: string = 'text') => {
    try {
      const response = await fetch(`/api/client/projects/${projectId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          message_type: messageType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      
      // Add the new message to the list
      setMessages(prev => [...prev, data.message]);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const handleUpdateMessage = async (messageId: string, content: string) => {
    try {
      const response = await fetch(`/api/client/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update message');
      }

      const data = await response.json();
      
      // Update the message in the list
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? data.message : msg
        )
      );
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/client/messages/${messageId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete message');
      }

      // Remove the message from the list
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  };

  const handleMeetCreated = async (meetLink: string) => {
    try {
      await handleSendMessage(
        `Videochamada iniciada: ${meetLink}`,
        'meet_link'
      );
    } catch (error) {
      console.error('Error sending meet link message:', error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b bg-background/95">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">Project Chat</h3>
          </div>
          <div className="flex items-center gap-2">
            <GoogleMeetButton
              projectId={projectId}
              onMeetCreated={handleMeetCreated}
            />
            <button className="p-1 hover:bg-secondary rounded">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {error}
            <button 
              onClick={() => setError('')}
              className="ml-2 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          projectId={projectId}
          loading={loading}
          onUpdateMessage={handleUpdateMessage}
          onDeleteMessage={handleDeleteMessage}
          availableTasks={availableTasks}
        />
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t bg-background/95">
        <MessageInput
          projectId={projectId}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
