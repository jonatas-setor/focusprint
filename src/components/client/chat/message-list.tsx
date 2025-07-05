'use client';

import { MessageCircle } from 'lucide-react';
import MessageItem from './message-item';

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

interface MessageListProps {
  messages: Message[];
  projectId: string;
  loading: boolean;
  onUpdateMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  availableTasks?: { id: string; title: string }[];
}

export default function MessageList({
  messages,
  projectId,
  loading,
  onUpdateMessage,
  onDeleteMessage,
  availableTasks = []
}: MessageListProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center py-8">
          <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-2">
            Nenhuma mensagem ainda
          </p>
          <p className="text-xs text-muted-foreground">
            Seja o primeiro a enviar uma mensagem neste projeto
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages
        .filter((message, index, array) => {
          // Filter out messages without valid IDs or duplicates
          if (!message.id) {
            console.warn('Message without ID found:', message);
            return false;
          }
          // Check for duplicates
          return array.findIndex(m => m.id === message.id) === index;
        })
        .map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            projectId={projectId}
            onUpdate={onUpdateMessage}
            onDelete={onDeleteMessage}
            availableTasks={availableTasks}
          />
        ))}
    </div>
  );
}
