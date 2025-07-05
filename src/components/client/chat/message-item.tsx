'use client';

import { useState, useEffect } from 'react';
import { Edit2, Trash2, MoreVertical, ExternalLink, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { parseTaskReferences, formatMessageWithTaskReferences, MessagePart } from '@/utils/task-references';
import TaskDetailModal from '@/components/client/tasks/task-detail-modal';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  checklists?: any[];
  attachments?: any[];
}

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

interface MessageItemProps {
  message: Message;
  projectId: string;
  onUpdate: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  availableTasks?: { id: string; title: string }[];
}

export default function MessageItem({ message, projectId, onUpdate, onDelete, availableTasks = [] }: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showMenu, setShowMenu] = useState(false);
  const [validTasks, setValidTasks] = useState<Map<string, { id: string, title: string }>>(new Map());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  // Mock current user ID - in real app, get from auth context
  const currentUserId = 'd1a02417-37f3-41fb-b01e-5ce0c08faab8';
  const isOwnMessage = message.user_id === currentUserId;

  // Load and validate task references when message content or available tasks change
  useEffect(() => {
    const { taskIds } = parseTaskReferences(message.content);
    if (taskIds.length > 0 && availableTasks.length > 0) {
      const validatedTasks = new Map();

      // Validate task IDs against available tasks
      taskIds.forEach(taskId => {
        const task = availableTasks.find(t => t.id === taskId);
        if (task) {
          validatedTasks.set(taskId, task);
        }
      });

      setValidTasks(validatedTasks);
    } else {
      setValidTasks(new Map());
    }
  }, [message.content, availableTasks]);

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
    if (confirm('Tem certeza que deseja excluir esta mensagem?')) {
      onDelete(message.id);
    }
    setShowMenu(false);
  };

  const handleTaskClick = async (taskId: string) => {
    try {
      setLoadingTaskId(taskId);

      // Load full task details including checklists and attachments
      const response = await fetch(`/api/client/tasks/${taskId}`);
      const data = await response.json();

      if (response.ok) {
        setSelectedTask(data.task);
        setIsTaskModalOpen(true);
      } else {
        toast.error(data.error || 'Failed to load task details');
      }
    } catch (error) {
      console.error('Error loading task details:', error);
      toast.error('Failed to load task details');
    } finally {
      setLoadingTaskId(null);
    }
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setSelectedTask(updatedTask);
    // Note: We could also update the validTasks map here if needed
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  };

  const formatTime = (timestamp: string) => {
    try {
      if (!timestamp) {
        return 'Agora';
      }

      const date = new Date(timestamp);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return 'Agora';
      }

      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting time:', error, 'timestamp:', timestamp);
      return 'Agora';
    }
  };

  const renderMessageContent = () => {
    if (isEditing) {
      return (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-2 border border-border rounded text-sm resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit}>
              Salvar
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
              Cancelar
            </Button>
          </div>
        </div>
      );
    }

    // Parse and format task references in content
    const parseContent = (content: string) => {
      const parts = formatMessageWithTaskReferences(content, validTasks);

      return parts.map((part, index) => {
        switch (part.type) {
          case 'text':
            return part.content;

          case 'task-reference':
            return (
              <span
                key={`task-ref-${index}`}
                className={`inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm cursor-pointer hover:bg-blue-200 transition-colors ${
                  loadingTaskId === part.task?.id ? 'opacity-50' : ''
                }`}
                onClick={() => {
                  if (part.task?.id && loadingTaskId !== part.task.id) {
                    handleTaskClick(part.task.id);
                  }
                }}
                title={`Task: ${part.task?.title} - Click to view details`}
              >
                <span className="text-xs">#</span>
                <span className="font-medium">{part.task?.title}</span>
                {loadingTaskId === part.task?.id && (
                  <span className="text-xs">...</span>
                )}
              </span>
            );

          case 'invalid-task-reference':
            return (
              <span
                key={`invalid-task-ref-${index}`}
                className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-md text-sm"
                title="Task not found"
              >
                <span className="text-xs">#</span>
                <span className="line-through">{part.content.substring(1)}</span>
              </span>
            );

          default:
            return part.content;
        }
      });
    };

    return (
      <div className="space-y-2">
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.message_type === 'meet_link' ? (
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-green-600" />
              <span>Videochamada iniciada</span>
            </div>
          ) : (
            parseContent(message.content)
          )}
        </div>
        
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
            <Video className="h-3 w-3 text-green-600" />
            <a 
              href={message.meet_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-800 hover:underline"
            >
              Entrar na videochamada
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
          isOwnMessage ? 'justify-end' : 'justify-start'
        }`}>
          <span>{formatTime(message.created_at)}</span>
          {message.is_edited && <span>(editado)</span>}
          
          {/* Message Actions */}
          {isOwnMessage && !isEditing && (
            <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit2 className="h-3 w-3 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="h-3 w-3 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isTaskModalOpen}
        onClose={handleCloseTaskModal}
        onUpdate={handleTaskUpdate}
      />
    </div>
  );
}
