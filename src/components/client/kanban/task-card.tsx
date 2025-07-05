'use client';

import { useState } from 'react';
import { Calendar, User, MoreVertical, AlertCircle, Clock, CheckCircle, Users, Flag, Bug, Lightbulb, Zap, Settings, FileText, Target, Edit, Eye, UserPlus, Tag, Trash2 } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import TaskModal from './task-modal';
import TaskDetailModal from '../tasks/task-detail-modal';
import { MilestoneBadge } from '@/components/milestones/MilestoneIndicator';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: string;
  due_date?: string;
  assigned_to?: string;
  column_id: string;
  position: number;
  created_at: string;
  completed?: boolean;
  tags?: string[];
  milestone_id?: string;
  milestone?: {
    id: string;
    name: string;
    description?: string;
    due_date?: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
    progress_percentage: number;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    color: string;
  };
  assignments?: Array<{
    user_id: string;
    assigned_at: string;
    user_profile?: {
      full_name: string;
      avatar_url?: string;
    };
  }>;
  checklist_items?: Array<{
    id: string;
    text: string;
    completed: boolean;
  }>;
  attachments?: Array<{
    id: string;
    filename: string;
    file_size: number;
  }>;
  checklist_progress?: {
    completed: number;
    total: number;
  };
}

interface TaskCardProps {
  task: Task;
  index: number;
  onUpdate: (taskId: string, taskData: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
}

export default function TaskCard({ task, index, onUpdate, onDelete }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500 text-white border-red-500';
      case 'high':
        return 'bg-orange-500 text-white border-orange-500';
      case 'medium':
        return 'bg-yellow-500 text-white border-yellow-500';
      case 'low':
        return 'bg-green-500 text-white border-green-500';
      default:
        return 'bg-gray-500 text-white border-gray-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="h-3 w-3" />;
      case 'high':
        return <Flag className="h-3 w-3" />;
      case 'medium':
        return <Clock className="h-3 w-3" />;
      case 'low':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getTaskTypeIcon = (tags: string[] = []) => {
    // Check for task type in tags
    if (tags.includes('bug') || tags.includes('issue')) {
      return <Bug className="h-3 w-3 text-red-500" />;
    }
    if (tags.includes('feature') || tags.includes('enhancement')) {
      return <Lightbulb className="h-3 w-3 text-blue-500" />;
    }
    if (tags.includes('improvement') || tags.includes('optimization')) {
      return <Zap className="h-3 w-3 text-yellow-500" />;
    }
    if (tags.includes('maintenance') || tags.includes('config')) {
      return <Settings className="h-3 w-3 text-gray-500" />;
    }
    if (tags.includes('documentation') || tags.includes('docs')) {
      return <FileText className="h-3 w-3 text-green-500" />;
    }
    if (tags.includes('epic') || tags.includes('milestone')) {
      return <Target className="h-3 w-3 text-purple-500" />;
    }
    return null;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Enhanced due date status calculation
  const now = new Date();
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && dueDate < now;
  const isDueToday = dueDate && !isOverdue &&
    dueDate.toDateString() === now.toDateString();
  const isDueTomorrow = dueDate && !isOverdue && !isDueToday &&
    dueDate.getTime() - now.getTime() < 48 * 60 * 60 * 1000; // Due within 48 hours
  const isDueSoon = dueDate && !isOverdue && !isDueToday && !isDueTomorrow &&
    dueDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000; // Due within 7 days

  // Get due date display info
  const getDueDateInfo = () => {
    if (!dueDate) return null;

    if (isOverdue) {
      const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
      return {
        text: daysOverdue === 1 ? '1 day overdue' : `${daysOverdue} days overdue`,
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: '⚠️'
      };
    }

    if (isDueToday) {
      return {
        text: 'Due today',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: '🔥'
      };
    }

    if (isDueTomorrow) {
      return {
        text: 'Due tomorrow',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: '⏰'
      };
    }

    if (isDueSoon) {
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return {
        text: `Due in ${daysUntilDue} days`,
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: '📅'
      };
    }

    return {
      text: dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: '📅'
    };
  };

  const handleTaskUpdate = async (taskData: Partial<Task>) => {
    await onUpdate(task.id, taskData);
    setShowEditModal(false);
  };

  const handleTaskClick = async (e: React.MouseEvent) => {
    // Don't open detail modal if clicking on menu or drag handles
    if ((e.target as HTMLElement).closest('.task-menu') || isDragging) {
      return;
    }

    // Don't open modal if it's already open
    if (showDetailModal) {
      return;
    }

    try {
      setIsLoadingDetails(true);

      // Load full task details including checklists and attachments
      const response = await fetch(`/api/client/tasks/${task.id}`);
      const data = await response.json();

      if (response.ok) {
        setSelectedTask(data.task);
        setShowDetailModal(true);
      } else {
        toast.error(data.error || 'Failed to load task details');
      }
    } catch (error) {
      console.error('Error loading task details:', error);
      toast.error('Failed to load task details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleDetailTaskUpdate = (updatedTask: Task) => {
    // Update the task in the parent component
    onUpdate(task.id, updatedTask);
    // Update the selected task to reflect changes in the modal
    setSelectedTask(updatedTask);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedTask(null);
  };

  const handleViewDetails = async () => {
    try {
      setIsLoadingDetails(true);

      // Load full task details including checklists and attachments
      const response = await fetch(`/api/client/tasks/${task.id}`);
      const data = await response.json();

      if (response.ok) {
        setSelectedTask(data.task);
        setShowDetailModal(true);
      } else {
        toast.error(data.error || 'Failed to load task details');
      }
    } catch (error) {
      console.error('Error loading task details:', error);
      toast.error('Failed to load task details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    setEditedTitle(task.title);
  };

  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      await onUpdate(task.id, { title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditedTitle(task.title);
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleTaskClick}
      className={`group bg-white border rounded-lg p-4 cursor-pointer
        hover:shadow-xl hover:shadow-gray-200/50 hover:scale-[1.02] hover:-translate-y-1
        transition-all duration-300 ease-out transform-gpu
        ${task.completed ? 'opacity-75 bg-gray-50 border-gray-300' : ''}
        ${isDragging ?
          'opacity-60 rotate-3 scale-110 shadow-2xl shadow-blue-500/30 z-50 ring-2 ring-blue-400/50 bg-gradient-to-br from-blue-50 to-white border-blue-300' :
          ''
        }
        ${!task.completed && isOverdue ? 'border-red-300 shadow-red-100 hover:border-red-400' :
          !task.completed && isDueToday ? 'border-orange-300 shadow-orange-100 hover:border-orange-400' :
          !task.completed && isDueTomorrow ? 'border-yellow-300 shadow-yellow-100 hover:border-yellow-400' :
          !task.completed && isDueSoon ? 'border-blue-300 shadow-blue-100 hover:border-blue-400' :
          'border-gray-200 hover:border-blue-300'}
        ${isLoadingDetails ? 'opacity-50' : ''}
        hover:bg-gradient-to-br hover:from-white hover:to-gray-50/30
      `}
    >
      {/* Task Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 pr-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="font-semibold text-sm leading-tight text-gray-900 mb-1 w-full bg-transparent border-b border-blue-300 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          ) : (
            <h4
              className={`font-semibold text-sm leading-tight mb-1 cursor-pointer hover:text-blue-600 transition-colors ${
                task.completed ? 'text-gray-500 line-through' : 'text-gray-900'
              }`}
              onDoubleClick={handleTitleDoubleClick}
              title="Double-click to edit"
            >
              {task.title}
            </h4>
          )}
          {task.description && (
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
              {task.description.length > 80 ? `${task.description.substring(0, 80)}...` : task.description}
            </p>
          )}
        </div>

        {/* Quick Actions (visible on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mr-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Toggle task completion
              onUpdate(task.id, { completed: !task.completed });
            }}
            className={`p-1 rounded transition-colors ${
              task.completed
                ? 'hover:bg-gray-100 text-gray-600'
                : 'hover:bg-green-100 text-green-600'
            }`}
            title={task.completed ? "Mark Incomplete" : "Mark Complete"}
          >
            <CheckCircle className={`h-3 w-3 ${task.completed ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowEditModal(true);
            }}
            className="p-1 hover:bg-blue-100 rounded transition-colors"
            title="Quick Edit"
          >
            <Edit className="h-3 w-3 text-blue-600" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails();
            }}
            className="p-1 hover:bg-indigo-100 rounded transition-colors"
            title="View Details"
          >
            <Eye className="h-3 w-3 text-indigo-600" />
          </button>
        </div>

        <div className="relative task-menu">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="h-4 w-4 text-gray-400" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-6 bg-white border rounded-md shadow-lg z-10 min-w-32">
              <button
                onClick={() => {
                  setShowEditModal(true);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this task?')) {
                    onDelete(task.id);
                  }
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Task Description */}
      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Task Metadata */}
      <div className="space-y-3">
        {/* Priority and Status Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
              {getPriorityIcon(task.priority)}
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>

            {/* Task Type Icon */}
            {getTaskTypeIcon(task.tags) && (
              <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full" title="Task Type">
                {getTaskTypeIcon(task.tags)}
              </div>
            )}
          </div>

          {/* Enhanced Due Date Badge */}
          {task.due_date && (() => {
            const dueDateInfo = getDueDateInfo();
            return dueDateInfo ? (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${dueDateInfo.color}`}>
                <span className="text-xs">{dueDateInfo.icon}</span>
                <span>{dueDateInfo.text}</span>
              </div>
            ) : null;
          })()}
        </div>

        {/* Milestone Indicator */}
        {task.milestone && (
          <div className="flex items-center">
            <MilestoneBadge
              milestone={task.milestone}
              onClick={() => {
                // Handle milestone click - could open milestone details
                console.log('Milestone clicked:', task.milestone?.name);
              }}
            />
          </div>
        )}

        {/* Progress Indicators */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            {/* Checklist Progress */}
            {task.checklist_progress && task.checklist_progress.total > 0 && (
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <CheckCircle className="h-3 w-3 flex-shrink-0" />
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5 min-w-[40px]">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${(task.checklist_progress.completed / task.checklist_progress.total) * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium flex-shrink-0">
                    {task.checklist_progress.completed}/{task.checklist_progress.total}
                  </span>
                </div>
              </div>
            )}

            {/* Attachments Count */}
            {task.attachments && task.attachments.length > 0 && (
              <div className="flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span>{task.attachments.length}</span>
              </div>
            )}
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{new Date(task.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
          </div>
        </div>

        {/* User Assignments */}
        {task.assignments && task.assignments.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500">{task.assignments.length} assigned</span>
            </div>

            {/* User Avatars */}
            <div className="flex -space-x-1">
              {task.assignments.slice(0, 3).map((assignment, index) => (
                <div
                  key={assignment.user_id}
                  className="relative"
                  title={assignment.user_profile?.full_name || 'Assigned User'}
                >
                  {assignment.user_profile?.avatar_url ? (
                    <img
                      src={assignment.user_profile.avatar_url}
                      alt={assignment.user_profile.full_name || 'User'}
                      className="h-6 w-6 rounded-full border-2 border-white bg-gray-100"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full border-2 border-white bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                      <span className="text-xs font-medium text-white">
                        {assignment.user_profile?.full_name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {task.assignments.length > 3 && (
                <div className="h-6 w-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">
                    +{task.assignments.length - 3}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Task Edit Modal */}
      <TaskModal
        task={task}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleTaskUpdate}
        mode="edit"
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={showDetailModal}
        onClose={handleCloseDetailModal}
        onUpdate={handleDetailTaskUpdate}
      />
    </div>
  );
}
