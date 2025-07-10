'use client';

import { useState } from 'react';
import { Plus, MoreVertical, GripVertical } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import TaskCard from './task-card';
import TaskModal from './task-modal';
import ColumnSettingsModal from './column-settings-modal';

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

interface Column {
  id: string;
  name: string;
  position: number;
  color: string;
  task_count: number;
}

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onTaskMove: (taskId: string, newColumnId: string, newPosition: number) => void;
  onTaskCreate: (columnId: string, taskData: Partial<Task>) => void;
  onTaskUpdate: (taskId: string, taskData: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  onColumnUpdate?: (columnId: string, data: { name?: string; color?: string }) => void;
  onColumnDelete?: (columnId: string) => void;
}

export default function KanbanColumn({
  column,
  tasks,
  onTaskMove,
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  onColumnUpdate,
  onColumnDelete
}: KanbanColumnProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🎯 [COLUMN] handleCreateTask called:', {
      columnId: column.id,
      columnName: column.name,
      newTaskTitle,
      timestamp: new Date().toISOString()
    });

    if (!newTaskTitle.trim()) {
      console.log('⚠️ [COLUMN] Task title is empty, returning early');
      return;
    }

    const taskData = {
      title: newTaskTitle.trim(),
      priority: 'medium'
    };

    console.log('📋 [COLUMN] Calling onTaskCreate with:', {
      columnId: column.id,
      taskData
    });

    onTaskCreate(column.id, taskData);

    setNewTaskTitle('');
    setShowCreateForm(false);
    console.log('✅ [COLUMN] Task creation form reset');
  };

  const handleTaskModalSave = (taskData: Partial<Task>) => {
    console.log('🎯 [COLUMN MODAL] handleTaskModalSave called:', {
      columnId: column.id,
      columnName: column.name,
      taskData,
      timestamp: new Date().toISOString()
    });

    onTaskCreate(column.id, taskData);
    setShowTaskModal(false);
    console.log('✅ [COLUMN MODAL] Task modal closed');
  };

  return (
    <div className="mobile-kanban-column w-64 sm:w-72 md:w-80 flex-shrink-0">
      <Card className="h-full flex flex-col mobile-optimized shadow-sm hover:shadow-md transition-all duration-200 border-border/50">
        {/* Enhanced Column Header */}
        <CardHeader className="mobile-kanban-column-header p-3 sm:p-4 pb-2 sm:pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                style={{ backgroundColor: column.color }}
              />
              <h3 className="font-semibold text-sm md:text-base truncate text-foreground">
                {column.name}
              </h3>
              <Badge
                variant="secondary"
                className="text-xs px-2.5 py-1 font-medium flex-shrink-0"
              >
                {tasks.length}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTaskModal(true)}
                      className="touch-target h-8 w-8 p-0 hover:bg-secondary/80"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create detailed task</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowColumnSettings(true)}
                      className="touch-target h-8 w-8 p-0 hover:bg-secondary/80"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Column settings</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>

        {/* Enhanced Tasks Area */}
        <CardContent
          ref={setNodeRef}
          className={`mobile-kanban-tasks mobile-drop-zone relative flex-1 p-4 space-y-3 overflow-y-auto touch-scroll transition-all duration-300 ease-out ${
            isOver
              ? 'drag-over bg-primary/5 border-2 border-primary border-dashed shadow-inner ring-2 ring-primary/20 rounded-lg'
              : 'border-2 border-transparent'
          }`}
        >
          {/* Enhanced Drop Zone Indicator */}
          {isOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 backdrop-blur-sm z-10 pointer-events-none rounded-lg">
              <div className="bg-primary text-primary-foreground px-4 py-3 rounded-xl shadow-lg font-semibold text-sm animate-bounce border border-primary-foreground/20">
                Drop task here
              </div>
            </div>
          )}

          {tasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              index={index}
              onUpdate={onTaskUpdate}
              onDelete={onTaskDelete}
            />
          ))}

              {/* Enhanced Create Task Form */}
              {showCreateForm ? (
                <form onSubmit={handleCreateTask} className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <Textarea
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Enter task title..."
                    className="resize-none touch-manipulation text-sm"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      className="touch-target-comfortable flex-1"
                    >
                      Add Task
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewTaskTitle('');
                      }}
                      className="touch-target-comfortable flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setShowCreateForm(true)}
                  className="touch-target-large w-full p-4 text-sm text-muted-foreground border-2 border-dashed border-border/50 rounded-lg hover:border-primary/50 hover:text-foreground hover:bg-muted/50 transition-all duration-200 flex flex-col items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add a task</span>
                </Button>
              )}
        </CardContent>
      </Card>

      {/* Task Creation Modal */}
      <TaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSave={handleTaskModalSave}
        mode="create"
      />

      {/* Column Settings Modal */}
      {onColumnUpdate && onColumnDelete && (
        <ColumnSettingsModal
          column={column}
          isOpen={showColumnSettings}
          onClose={() => setShowColumnSettings(false)}
          onUpdate={onColumnUpdate}
          onDelete={onColumnDelete}
        />
      )}
    </div>
  );
}
