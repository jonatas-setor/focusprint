'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Hash, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { extractTaskQuery, searchTasksForAutoComplete } from '@/utils/task-references';
import { extractMilestoneQuery, searchMilestonesForAutoComplete } from '@/utils/milestone-references';

interface Task {
  id: string;
  title: string;
}

interface Milestone {
  id: string;
  name: string;
  progress_percentage: number;
  status: string;
}

interface MessageInputProps {
  projectId: string;
  onSendMessage: (content: string, messageType?: string) => Promise<void>;
}

export default function MessageInput({ projectId, onSendMessage }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showTaskSuggestions, setShowTaskSuggestions] = useState(false);
  const [taskSuggestions, setTaskSuggestions] = useState<Task[]>([]);
  const [taskQuery, setTaskQuery] = useState('');
  const [showMilestoneSuggestions, setShowMilestoneSuggestions] = useState(false);
  const [milestoneSuggestions, setMilestoneSuggestions] = useState<Milestone[]>([]);
  const [milestoneQuery, setMilestoneQuery] = useState('');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [suggestionType, setSuggestionType] = useState<'task' | 'milestone' | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  useEffect(() => {
    // Load task suggestions when # is typed
    if (taskQuery) {
      loadTaskSuggestions(taskQuery);
    } else {
      setTaskSuggestions([]);
      setShowTaskSuggestions(false);
    }
  }, [taskQuery]);

  const loadTaskSuggestions = async (query: string) => {
    try {
      const response = await fetch(`/api/client/projects/${projectId}/tasks?search=${encodeURIComponent(query)}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setTaskSuggestions(data.tasks || []);
        setShowTaskSuggestions(true);
      }
    } catch (error) {
      console.error('Error loading task suggestions:', error);
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    setMessage(value);

    // Extract task query from current cursor position
    const taskQueryResult = extractTaskQuery(value, cursorPosition);

    if (taskQueryResult && taskQueryResult.query.length > 0) {
      setTaskQuery(taskQueryResult.query);

      // Search for tasks
      try {
        const tasks = await searchTasksForAutoComplete(taskQueryResult.query, projectId);
        setTaskSuggestions(tasks);
        setShowTaskSuggestions(tasks.length > 0);
        setSelectedSuggestionIndex(-1);
      } catch (error) {
        console.error('Error searching tasks:', error);
        setTaskSuggestions([]);
        setShowTaskSuggestions(false);
      }
    } else {
      setTaskQuery('');
      setTaskSuggestions([]);
      setShowTaskSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleTaskSelect = (task: Task) => {
    const hashIndex = message.lastIndexOf('#');
    if (hashIndex !== -1) {
      const beforeHash = message.substring(0, hashIndex);
      const afterHash = message.substring(hashIndex + 1);
      const spaceIndex = afterHash.indexOf(' ');
      const afterTask = spaceIndex === -1 ? '' : afterHash.substring(spaceIndex);
      
      setMessage(`${beforeHash}#${task.id}${afterTask}`);
    }
    setShowTaskSuggestions(false);
    setTaskQuery('');
    textareaRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || sending) return;

    const messageContent = message.trim();
    setMessage('');
    setSending(true);
    setShowTaskSuggestions(false);
    setTaskQuery('');

    try {
      await onSendMessage(messageContent);
    } catch (error) {
      // Restore message on error
      setMessage(messageContent);
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const selectTaskSuggestion = (task: Task) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const taskQueryResult = extractTaskQuery(message, cursorPosition);

    if (taskQueryResult) {
      const beforeQuery = message.substring(0, taskQueryResult.start);
      const afterQuery = message.substring(taskQueryResult.end);
      const newMessage = `${beforeQuery}#${task.id} ${afterQuery}`;

      setMessage(newMessage);
      setShowTaskSuggestions(false);
      setTaskQuery('');
      setSelectedSuggestionIndex(-1);

      // Focus back to textarea
      setTimeout(() => {
        textareaRef.current?.focus();
        const newCursorPos = beforeQuery.length + task.id.length + 2;
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showTaskSuggestions && taskSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < taskSuggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : taskSuggestions.length - 1
        );
        return;
      }

      if (e.key === 'Tab' || e.key === 'Enter') {
        if (selectedSuggestionIndex >= 0) {
          e.preventDefault();
          selectTaskSuggestion(taskSuggestions[selectedSuggestionIndex]);
          return;
        }
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }

    if (e.key === 'Escape') {
      setShowTaskSuggestions(false);
      setTaskQuery('');
      setSelectedSuggestionIndex(-1);
    }
  };

  return (
    <div className="relative">
      {/* Task Suggestions */}
      {showTaskSuggestions && taskSuggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 bg-background border border-border rounded-t-lg shadow-lg max-h-40 overflow-y-auto z-10">
          {taskSuggestions.map((task, index) => (
            <button
              key={task.id}
              onClick={() => selectTaskSuggestion(task)}
              className={`w-full px-3 py-2 text-left flex items-center gap-2 text-sm ${
                index === selectedSuggestionIndex
                  ? 'bg-blue-50 text-blue-900'
                  : 'hover:bg-secondary'
              }`}
            >
              <Hash className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{task.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Message Input Form */}
      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex items-end gap-2">
          {/* Attachment Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-shrink-0"
            disabled={sending}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem... (use # para referenciar tarefas)"
              className="w-full resize-none border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent max-h-32 min-h-[40px]"
              disabled={sending}
              rows={1}
              data-chat-input
            />
          </div>

          {/* Emoji Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-shrink-0"
            disabled={sending}
          >
            <Smile className="h-4 w-4" />
          </Button>

          {/* Send Button */}
          <Button
            type="submit"
            size="sm"
            disabled={!message.trim() || sending}
            className="flex-shrink-0"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
