'use client';

import { useState } from 'react';
import { Plus, MoreVertical } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
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
    <div className="mobile-kanban-column w-72 sm:w-80 flex-shrink-0">
      <div className="bg-background border rounded-lg h-full flex flex-col mobile-optimized">
        {/* Column Header - Mobile optimized */}
        <div className="mobile-kanban-column-header p-3 md:p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: column.color }}
              />
              <h3 className="font-medium text-sm md:text-base truncate">{column.name}</h3>
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full flex-shrink-0">
                {tasks.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowTaskModal(true)}
                className="touch-target p-1 hover:bg-secondary rounded transition-colors"
                title="Create detailed task"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowColumnSettings(true)}
                className="touch-target p-1 hover:bg-secondary rounded transition-colors"
                title="Column settings"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tasks Area - Mobile optimized */}
        <div
          ref={setNodeRef}
          className={`mobile-kanban-tasks mobile-drop-zone relative flex-1 p-3 md:p-4 space-y-2 md:space-y-3 overflow-y-auto touch-scroll transition-all duration-300 ease-out ${
            isOver
              ? 'drag-over bg-primary/5 border-2 border-primary border-dashed shadow-inner ring-2 ring-primary/20'
              : 'border-2 border-transparent'
          }`}
        >
          {/* Drop Zone Indicator - Mobile optimized */}
          {isOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 backdrop-blur-sm z-10 pointer-events-none">
              <div className="bg-primary text-primary-foreground px-3 md:px-4 py-2 rounded-lg shadow-lg font-medium text-sm animate-pulse">
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

              {/* Create Task Form - Mobile optimized */}
              {showCreateForm ? (
                <form onSubmit={handleCreateTask} className="space-y-2">
                  <textarea
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Enter task title..."
                    className="w-full p-2 text-sm border rounded-md resize-none touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="touch-target-comfortable flex-1 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewTaskTitle('');
                      }}
                      className="touch-target-comfortable flex-1 px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="touch-target-large w-full p-3 text-sm text-muted-foreground border-2 border-dashed border-secondary rounded-md hover:border-primary/50 hover:text-foreground transition-colors"
                >
                  <Plus className="h-4 w-4 mx-auto mb-1" />
                  <span>Add a task</span>
                </button>
              )}
        </div>
      </div>

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
