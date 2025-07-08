'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Hash, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { extractTaskQuery, searchTasksForAutoComplete } from '@/utils/task-references';
import { extractMilestoneQuery, searchMilestonesForAutoComplete, getMilestoneStatusColor } from '@/utils/milestone-references';

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

interface EnhancedMessageInputProps {
  projectId: string;
  onSendMessage: (content: string, messageType?: string) => Promise<void>;
}

export default function EnhancedMessageInput({ projectId, onSendMessage }: EnhancedMessageInputProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  // Task suggestions
  const [showTaskSuggestions, setShowTaskSuggestions] = useState(false);
  const [taskSuggestions, setTaskSuggestions] = useState<Task[]>([]);
  const [taskQuery, setTaskQuery] = useState('');
  
  // Milestone suggestions
  const [showMilestoneSuggestions, setShowMilestoneSuggestions] = useState(false);
  const [milestoneSuggestions, setMilestoneSuggestions] = useState<Milestone[]>([]);
  const [milestoneQuery, setMilestoneQuery] = useState('');
  
  // Common suggestion state
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [suggestionType, setSuggestionType] = useState<'task' | 'milestone' | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  // Handle input changes and detect references
  const handleInputChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);

    const cursorPosition = e.target.selectionStart || 0;

    // Check for task references (#)
    const taskQueryResult = extractTaskQuery(newMessage, cursorPosition);
    if (taskQueryResult && taskQueryResult.query.length > 0) {
      setTaskQuery(taskQueryResult.query);
      setSuggestionType('task');
      
      try {
        const tasks = await searchTasksForAutoComplete(taskQueryResult.query, projectId);
        setTaskSuggestions(tasks);
        setShowTaskSuggestions(tasks.length > 0);
        setShowMilestoneSuggestions(false);
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
    }

    // Check for milestone references (@milestone)
    const milestoneQueryResult = extractMilestoneQuery(newMessage, cursorPosition);
    if (milestoneQueryResult && milestoneQueryResult.query.length > 0) {
      setMilestoneQuery(milestoneQueryResult.query);
      setSuggestionType('milestone');
      
      try {
        const milestones = await searchMilestonesForAutoComplete(milestoneQueryResult.query, projectId);
        setMilestoneSuggestions(milestones);
        setShowMilestoneSuggestions(milestones.length > 0);
        setShowTaskSuggestions(false);
        setSelectedSuggestionIndex(-1);
      } catch (error) {
        console.error('Error searching milestones:', error);
        setMilestoneSuggestions([]);
        setShowMilestoneSuggestions(false);
      }
    } else {
      setMilestoneQuery('');
      setMilestoneSuggestions([]);
      setShowMilestoneSuggestions(false);
    }

    // Clear suggestion type if no active queries
    if (!taskQueryResult && !milestoneQueryResult) {
      setSuggestionType(null);
      setSelectedSuggestionIndex(-1);
    }
  };

  // Select task suggestion
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
      setSuggestionType(null);

      setTimeout(() => {
        textareaRef.current?.focus();
        const newCursorPos = beforeQuery.length + task.id.length + 2;
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  // Select milestone suggestion
  const selectMilestoneSuggestion = (milestone: Milestone) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const milestoneQueryResult = extractMilestoneQuery(message, cursorPosition);

    if (milestoneQueryResult) {
      const beforeQuery = message.substring(0, milestoneQueryResult.start);
      const afterQuery = message.substring(milestoneQueryResult.end);
      const newMessage = `${beforeQuery}@milestone:${milestone.id} ${afterQuery}`;

      setMessage(newMessage);
      setShowMilestoneSuggestions(false);
      setMilestoneQuery('');
      setSelectedSuggestionIndex(-1);
      setSuggestionType(null);

      setTimeout(() => {
        textareaRef.current?.focus();
        const newCursorPos = beforeQuery.length + milestone.id.length + 12; // @milestone: + id + space
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const activeSuggestions = suggestionType === 'task' ? taskSuggestions : milestoneSuggestions;
    const showingSuggestions = suggestionType === 'task' ? showTaskSuggestions : showMilestoneSuggestions;

    if (showingSuggestions && activeSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < activeSuggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : activeSuggestions.length - 1
        );
      } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        if (suggestionType === 'task') {
          selectTaskSuggestion(activeSuggestions[selectedSuggestionIndex] as Task);
        } else if (suggestionType === 'milestone') {
          selectMilestoneSuggestion(activeSuggestions[selectedSuggestionIndex] as Milestone);
        }
      } else if (e.key === 'Escape') {
        setShowTaskSuggestions(false);
        setShowMilestoneSuggestions(false);
        setSelectedSuggestionIndex(-1);
        setSuggestionType(null);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Send message
  const handleSend = async () => {
    console.log('🚀 handleSend called with message:', message);
    console.log('🚀 message.trim():', message.trim());
    console.log('🚀 sending state:', sending);

    if (!message.trim() || sending) {
      console.log('⚠️ Message send blocked - empty message or already sending');
      return;
    }

    console.log('📤 Starting to send message:', message.trim());
    setSending(true);

    try {
      console.log('📡 Calling onSendMessage with:', message.trim());
      await onSendMessage(message.trim());
      console.log('✅ onSendMessage completed successfully');

      setMessage('');
      setShowTaskSuggestions(false);
      setShowMilestoneSuggestions(false);
      setSelectedSuggestionIndex(-1);
      setSuggestionType(null);

      console.log('🧹 Message input cleared and state reset');
    } catch (error) {
      console.error('❌ Error in handleSend:', error);
    } finally {
      setSending(false);
      console.log('🏁 handleSend completed, sending state reset');
    }
  };

  const showingSuggestions = showTaskSuggestions || showMilestoneSuggestions;
  const activeSuggestions = suggestionType === 'task' ? taskSuggestions : milestoneSuggestions;

  return (
    <div className="relative">
      {/* Suggestions - Mobile optimized */}
      {showingSuggestions && activeSuggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 bg-background border border-border rounded-t-lg shadow-lg max-h-40 overflow-y-auto touch-scroll z-10">
          {suggestionType === 'task' && taskSuggestions.map((task, index) => (
            <button
              key={task.id}
              onClick={() => selectTaskSuggestion(task)}
              className={`touch-target-comfortable w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition-colors ${
                index === selectedSuggestionIndex
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-secondary'
              }`}
            >
              <Hash className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{task.title}</span>
            </button>
          ))}

          {suggestionType === 'milestone' && milestoneSuggestions.map((milestone, index) => (
            <button
              key={milestone.id}
              onClick={() => selectMilestoneSuggestion(milestone)}
              className={`touch-target-comfortable w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition-colors ${
                index === selectedSuggestionIndex
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-secondary'
              }`}
            >
              <Target className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{milestone.name}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`px-1 rounded text-xs ${getMilestoneStatusColor(milestone.status)}`}>
                    {milestone.status}
                  </span>
                  <span>{milestone.progress_percentage}%</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Input - Mobile optimized */}
      <div className="flex gap-2 p-3 md:p-4 border-t border-border">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem... Use # para tarefas ou @milestone"
          className="flex-1 resize-none border border-border rounded-lg px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px] max-h-32 touch-manipulation"
          rows={1}
          style={{ fontSize: '16px' }} // Prevents zoom on iOS
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          size="sm"
          className="touch-target-comfortable self-end flex-shrink-0"
        >
          {sending ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
