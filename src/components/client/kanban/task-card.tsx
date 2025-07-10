'use client';

import { useState } from 'react';
import { MoreVertical, AlertCircle, Clock, CheckCircle, Users, Flag, Bug, Lightbulb, Zap, Settings, FileText, Target, Edit, Eye, Tag, Trash2, Paperclip } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
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

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'secondary';
      case 'medium':
        return 'outline';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return <AlertCircle className="h-3 w-3" />;
      case 'high':
        return <Flag className="h-3 w-3" />;
      case 'medium':
        return <Target className="h-3 w-3" />;
      case 'low':
        return <Clock className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleTaskClick}
      className={`group cursor-pointer touch-manipulation transition-all duration-300 ease-out
        hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.01] hover:-translate-y-0.5
        ${task.completed ? 'opacity-75 bg-muted/50' : 'bg-card/95 backdrop-blur-sm'}
        ${isDragging ?
          'opacity-70 rotate-1 scale-105 shadow-2xl shadow-primary/30 z-50 ring-2 ring-primary/40 border-primary/40' :
          ''
        }
        ${!task.completed && isOverdue ? 'border-destructive/60 shadow-destructive/20 bg-destructive/5' :
          !task.completed && isDueToday ? 'border-orange-400/60 shadow-orange-400/20 bg-orange-50/50' :
          !task.completed && isDueTomorrow ? 'border-yellow-400/60 shadow-yellow-400/20 bg-yellow-50/50' :
          !task.completed && isDueSoon ? 'border-blue-400/60 shadow-blue-400/20 bg-blue-50/50' :
          'border-border/60 hover:border-primary/60 shadow-sm'}
        ${isLoadingDetails ? 'opacity-50' : ''}
      `}
    >
      <CardContent className="p-4 space-y-4">
        {/* Enhanced Task Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                className="font-semibold text-sm leading-tight w-full bg-transparent border-b-2 border-primary focus:outline-none focus:border-primary/80 transition-colors"
                autoFocus
              />
            ) : (
              <h4
                className={`font-semibold text-sm leading-tight cursor-pointer hover:text-primary transition-colors ${
                  task.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                }`}
                onDoubleClick={handleTitleDoubleClick}
                title="Double-click to edit"
              >
                {task.title}
              </h4>
            )}
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-2">
                {task.description.length > 80 ? `${task.description.substring(0, 80)}...` : task.description}
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 ml-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate(task.id, { completed: !task.completed });
                    }}
                  >
                    <CheckCircle className={`h-3 w-3 ${task.completed ? 'fill-current text-green-600' : 'text-muted-foreground'}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {task.completed ? "Mark Incomplete" : "Mark Complete"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEditModal(true);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Quick Edit</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails();
                    }}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View Details</TooltipContent>
              </Tooltip>
            </TooltipProvider>
        </div>

          <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditModal(true);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails();
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Are you sure you want to delete this task?')) {
                    onDelete(task.id);
                  }
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>

      {/* Task Description */}
      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

        {/* Task Metadata */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={getPriorityColor(task.priority)} className="text-xs">
              {getPriorityIcon(task.priority)}
              <span className="ml-1">{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
            </Badge>

            {/* Task Type Icon */}
            {getTaskTypeIcon(task.tags) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center w-6 h-6 bg-muted rounded-full">
                      {getTaskTypeIcon(task.tags)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Task Type</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Enhanced Due Date Badge */}
          {task.due_date && (() => {
            const dueDateInfo = getDueDateInfo();
            return dueDateInfo ? (
              <Badge variant="outline" className={`text-xs ${dueDateInfo.color}`}>
                <span className="mr-1">{dueDateInfo.icon}</span>
                {dueDateInfo.text}
              </Badge>
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
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {/* Checklist Progress */}
            {task.checklist_progress && task.checklist_progress.total > 0 && (
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <CheckCircle className="h-3 w-3 flex-shrink-0" />
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Progress
                    value={(task.checklist_progress.completed / task.checklist_progress.total) * 100}
                    className="flex-1 h-1.5 min-w-[40px]"
                  />
                  <span className="text-xs font-medium flex-shrink-0">
                    {task.checklist_progress.completed}/{task.checklist_progress.total}
                  </span>
                </div>
              </div>
            )}

            {/* Attachments Count */}
            {task.attachments && task.attachments.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      <span>{task.attachments.length}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {task.attachments.length} attachment{task.attachments.length > 1 ? 's' : ''}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{task.assignments.length} assigned</span>
            </div>

            {/* User Avatars */}
            <div className="flex -space-x-1">
              {task.assignments.slice(0, 3).map((assignment, index) => (
                <TooltipProvider key={assignment.user_id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-6 w-6 border-2 border-background">
                        <AvatarImage
                          src={assignment.user_profile?.avatar_url}
                          alt={assignment.user_profile?.full_name || 'User'}
                        />
                        <AvatarFallback className="text-xs">
                          {assignment.user_profile?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      {assignment.user_profile?.full_name || 'Assigned User'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
              {task.assignments.length > 3 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-6 w-6 border-2 border-background">
                        <AvatarFallback className="text-xs bg-muted">
                          +{task.assignments.length - 3}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      {task.assignments.length - 3} more assigned
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        )}
      </CardContent>

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
    </Card>
  );
}
