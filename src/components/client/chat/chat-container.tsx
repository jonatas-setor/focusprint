'use client';

import { useState, useEffect, useRef } from 'react';
import { MoreVertical } from 'lucide-react';
import { useRealtime } from '@/contexts/realtime-context';
import MessageList from './message-list';
import EnhancedMessageInput from './enhanced-message-input';
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
  availableMilestones?: {
    id: string;
    name: string;
    progress_percentage: number;
    status: string;
  }[];
}

export default function ChatContainer({
  projectId,
  availableTasks = [],
  availableMilestones = []
}: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { subscribeToMessages } = useRealtime();

  // Load messages and setup real-time subscription
  useEffect(() => {
    if (!projectId) return;

    console.log('🔄 Setting up chat for project:', projectId);

    // Load initial messages
    loadMessages();

    // TODO: Setup real-time subscription for messages when Realtime is properly configured
    // For now, we'll rely on manual updates after sending messages
    console.log('⚠️ Realtime subscription disabled - using manual updates for now');

    /*
    // Setup real-time subscription for messages (disabled until Realtime is configured)
    console.log('🔔 Setting up Realtime subscription for messages in project:', projectId);

    const unsubscribe = subscribeToMessages(projectId, (payload) => {
      console.log('📨 Realtime message update:', payload.eventType, payload);

      switch (payload.eventType) {
        case 'INSERT':
          // Add new message
          const newMessage = payload.new as Message;

          // Validate message data
          if (!newMessage.id || !newMessage.content || !newMessage.created_at) {
            console.warn('Invalid message data received via Realtime:', newMessage);
            break;
          }

          console.log('✅ Adding new message to chat:', newMessage.id, newMessage.content);
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(msg => msg.id === newMessage.id)) {
              console.log('⚠️ Message already exists, skipping duplicate:', newMessage.id);
              return prev;
            }
            return [...prev, newMessage];
          });
          break;

        case 'UPDATE':
          // Update existing message
          const updatedMessage = payload.new as Message;
          if (updatedMessage && updatedMessage.id) {
            console.log('🔄 Updating message in chat:', updatedMessage.id);
            setMessages(prev =>
              prev.map(msg =>
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
            );
          }
          break;

        case 'DELETE':
          // Remove deleted message
          const deletedMessage = payload.old as Message;
          if (deletedMessage && deletedMessage.id) {
            console.log('🗑️ Removing message from chat:', deletedMessage.id);
            setMessages(prev =>
              prev.filter(msg => msg.id !== deletedMessage.id)
            );
          }
          break;
      }
    });

    // Cleanup subscription on component unmount
    return () => {
      console.log('🔌 Cleaning up real-time subscription for project:', projectId);
      unsubscribe();
    };
    */
  }, [projectId]);

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
      console.log('📤 Sending message:', content);

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
        console.error('❌ Failed to send message:', errorData);
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      console.log('✅ Message sent successfully:', data);

      // The RPC function returns an array, so we need to get the first item
      let newMessage = data.message;

      // Check if message is an array (from RPC function) and get the first item
      if (Array.isArray(newMessage) && newMessage.length > 0) {
        newMessage = newMessage[0];
        console.log('📦 Extracted message from array:', newMessage);
      }

      // Immediately add the message to the list for instant feedback
      if (newMessage && newMessage.id && newMessage.content) {
        console.log('⚡ Adding message to chat immediately:', newMessage.id);
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (exists) {
            console.log('⚠️ Message already exists, skipping duplicate:', newMessage.id);
            return prev;
          }
          // Add the new message to the end of the list
          const updatedMessages = [...prev, newMessage];
          console.log('📝 Updated messages list, total:', updatedMessages.length);
          return updatedMessages;
        });
      } else {
        console.error('❌ Invalid message data received:', newMessage);
        console.error('❌ Full response data:', data);
      }

    } catch (error) {
      console.error('❌ Error sending message:', error);
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
      console.log('✅ Message updated successfully:', messageId);

      // Note: Real-time subscription will handle updating the message in the list
      // No need to manually update state here
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

      console.log('✅ Message deleted successfully:', messageId);

      // Note: Real-time subscription will handle removing the message from the list
      // No need to manually update state here
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
    <div className="h-full max-h-[calc(100vh-4rem)] flex flex-col mobile-optimized">
      {/* Chat Header - Mobile optimized */}
      <div className="p-3 md:p-4 border-b bg-background/95 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm md:text-base">Project Chat</h3>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <GoogleMeetButton
              projectId={projectId}
              onMeetCreated={handleMeetCreated}
            />
            <button className="touch-target p-1 hover:bg-secondary rounded transition-colors">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
            {error}
            <button
              onClick={() => setError('')}
              className="touch-target ml-2 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Messages Area - Mobile optimized */}
      <div className="mobile-chat-messages flex-1 overflow-y-auto max-h-[calc(100vh-12rem)]">
        <MessageList
          messages={messages}
          projectId={projectId}
          loading={loading}
          onUpdateMessage={handleUpdateMessage}
          onDeleteMessage={handleDeleteMessage}
          availableTasks={availableTasks}
          availableMilestones={availableMilestones}
        />
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Mobile optimized */}
      <div className="mobile-chat-input border-t bg-background/95 flex-shrink-0">
        <EnhancedMessageInput
          projectId={projectId}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
