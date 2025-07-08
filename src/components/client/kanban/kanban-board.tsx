'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core';
import { useRealtime } from '@/contexts/realtime-context';
import KanbanColumn from './kanban-column';

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

interface KanbanBoardProps {
  projectId: string;
}

export default function KanbanBoard({ projectId }: KanbanBoardProps) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const { subscribeToTasks, subscribeToColumns } = useRealtime();

  // Component initialization - removed console.log to prevent infinite loop messages

  const loadData = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError('');

      // Load columns and tasks in parallel
      const [columnsResponse, tasksResponse] = await Promise.all([
        fetch(`/api/client/projects/${projectId}/columns`),
        fetch(`/api/client/projects/${projectId}/tasks`)
      ]);

      if (!columnsResponse.ok) {
        const columnsError = await columnsResponse.json();
        throw new Error(columnsError.error || 'Failed to load columns');
      }

      if (!tasksResponse.ok) {
        const tasksError = await tasksResponse.json();
        throw new Error(tasksError.error || 'Failed to load tasks');
      }

      const columnsData = await columnsResponse.json();
      const tasksData = await tasksResponse.json();

      setColumns(columnsData.columns || []);
      setTasks(tasksData.tasks || []);
    } catch (err) {
      console.error('Error loading kanban data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId, loadData]); // Include loadData in dependencies for proper React behavior

  // Set up Realtime subscription for tasks
  useEffect(() => {
    if (!projectId) return;

    console.log('🔔 Setting up Realtime subscription for tasks in project:', projectId);

    const unsubscribe = subscribeToTasks(projectId, (payload) => {
      console.log('📋 Realtime task update:', payload);

      switch (payload.eventType) {
        case 'INSERT':
          const newTask = payload.new as Task;
          setTasks(prev => {
            if (prev.some(task => task.id === newTask.id)) {
              return prev;
            }
            return [...prev, newTask];
          });
          break;

        case 'UPDATE':
          const updatedTask = payload.new as Task;
          setTasks(prev =>
            prev.map(task =>
              task.id === updatedTask.id ? updatedTask : task
            )
          );
          break;

        case 'DELETE':
          const deletedTask = payload.old as Task;
          setTasks(prev =>
            prev.filter(task => task.id !== deletedTask.id)
          );
          break;
      }
    });

    return unsubscribe;
  }, [projectId, subscribeToTasks]);

  // Set up Realtime subscription for columns
  useEffect(() => {
    if (!projectId) return;

    console.log('🔔 Setting up Realtime subscription for columns in project:', projectId);

    const unsubscribe = subscribeToColumns(projectId, (payload) => {
      console.log('📊 Realtime column update:', payload);

      switch (payload.eventType) {
        case 'INSERT':
          const newColumn = payload.new as Column;
          setColumns(prev => {
            if (prev.some(col => col.id === newColumn.id)) {
              return prev;
            }
            return [...prev, { ...newColumn, task_count: 0 }].sort((a, b) => a.position - b.position);
          });
          break;

        case 'UPDATE':
          const updatedColumn = payload.new as Column;
          setColumns(prev =>
            prev.map(col =>
              col.id === updatedColumn.id ? { ...updatedColumn, task_count: col.task_count } : col
            ).sort((a, b) => a.position - b.position)
          );
          break;

        case 'DELETE':
          const deletedColumn = payload.old as Column;
          setColumns(prev =>
            prev.filter(col => col.id !== deletedColumn.id)
          );
          break;
      }
    });

    return unsubscribe;
  }, [projectId, subscribeToColumns]);

  // Enhanced sensors for better touch and mouse support
  const sensors = useSensors(
    // Mouse sensor for desktop
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    // Touch sensor for mobile devices
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    // Pointer sensor as fallback
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string;
    setDraggedTaskId(taskId);

    // Find and store the dragged task for overlay
    const task = tasks.find(t => t.id === taskId);
    setDraggedTask(task || null);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Add any drag over logic here if needed
    // This can be used for real-time feedback during drag
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // Clear drag state
    setDraggedTaskId(null);
    setDraggedTask(null);

    // If no destination, do nothing
    if (!over) {
      return;
    }

    const taskId = active.id as string;
    const newColumnId = over.id as string;

    // Find the task being moved
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Calculate new position based on drop location
    let newPosition: number;

    if (task.column_id === newColumnId) {
      // Moving within the same column - for now, keep current position
      // TODO: Implement precise drop position calculation
      return;
    } else {
      // Moving to a different column - find the highest position and add 1
      const destinationTasks = tasks.filter(t => t.column_id === newColumnId);
      console.log('🔍 Destination tasks:', destinationTasks.map(t => ({ id: t.id, position: t.position })));

      const maxPosition = destinationTasks.length > 0
        ? Math.max(...destinationTasks.map(t => t.position))
        : 0;
      newPosition = maxPosition + 1;

      console.log('🔍 Calculated position:', { maxPosition, newPosition });
    }

    try {
      // Optimistically update the UI
      setTasks(prevTasks => {
        const updatedTasks = prevTasks.map(t => {
          if (t.id === taskId) {
            return { ...t, column_id: newColumnId, position: newPosition };
          }
          return t;
        });
        return updatedTasks;
      });

      // Update the server
      const response = await fetch(`/api/client/tasks/${taskId}/position`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          column_id: newColumnId,
          position: newPosition
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to move task');
      }

      // Reload data to ensure consistency
      await loadData();
    } catch (err) {
      console.error('Error moving task:', err);
      // Revert optimistic update
      await loadData();
      setError(err instanceof Error ? err.message : 'Failed to move task');
    }
  };

  const handleTaskMove = async (taskId: string, newColumnId: string, newPosition: number) => {
    // This function is kept for backward compatibility but will be replaced by handleDragEnd
    try {
      // Optimistically update the UI
      setTasks(prevTasks => {
        const updatedTasks = prevTasks.map(task => {
          if (task.id === taskId) {
            return { ...task, column_id: newColumnId, position: newPosition };
          }
          return task;
        });
        return updatedTasks;
      });

      // Update the server
      const response = await fetch(`/api/client/tasks/${taskId}/position`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          column_id: newColumnId,
          position: newPosition
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to move task');
      }

      // Reload data to ensure consistency
      await loadData();
    } catch (err) {
      console.error('Error moving task:', err);
      // Revert optimistic update
      await loadData();
      setError(err instanceof Error ? err.message : 'Failed to move task');
    }
  };

  const handleTaskCreate = async (columnId: string, taskData: Partial<Task>) => {
    console.log('🔥🔥🔥 [TASK CREATE] FUNCTION CALLED - THIS SHOULD ALWAYS APPEAR!');
    console.log('🔥🔥🔥 [TASK CREATE] Parameters:', { columnId, taskData, projectId });

    try {
      console.log('🚀 [TASK CREATE] Starting task creation:', {
        projectId,
        columnId,
        taskData,
        timestamp: new Date().toISOString()
      });

      const requestPayload = {
        ...taskData,
        column_id: columnId
      };

      console.log('📤 [TASK CREATE] Request payload:', requestPayload);
      console.log('🌐 [TASK CREATE] API URL:', `/api/client/projects/${projectId}/tasks`);

      const response = await fetch(`/api/client/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      console.log('📥 [TASK CREATE] Response status:', response.status);
      console.log('📥 [TASK CREATE] Response ok:', response.ok);
      console.log('📥 [TASK CREATE] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // Try to get response text first, then parse as JSON
        const responseText = await response.text();
        console.error('❌ [TASK CREATE] Raw response text:', responseText);

        let errorData: { error?: string } = {};
        try {
          errorData = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
          console.error('❌ [TASK CREATE] Failed to parse error response as JSON:', parseError);
          errorData = { error: responseText || 'Unknown error' };
        }

        console.error('❌ [TASK CREATE] Error response data:', errorData);
        console.error('❌ [TASK CREATE] Full response:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorData,
          responseText
        });
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}` || 'Failed to create task');
      }

      const responseData = await response.json();
      console.log('✅ [TASK CREATE] Success response data:', responseData);

      // Reload data to show the new task
      console.log('🔄 [TASK CREATE] Reloading data...');
      await loadData();
      console.log('✅ [TASK CREATE] Task creation completed successfully');
    } catch (err) {
      console.error('💥 [TASK CREATE] Error creating task:', err);
      console.error('💥 [TASK CREATE] Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        projectId,
        columnId,
        taskData
      });
      setError(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  const handleTaskUpdate = async (taskId: string, taskData: Partial<Task>) => {
    try {
      const response = await fetch(`/api/client/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update task');
      }

      // Reload data to show the updated task
      await loadData();
    } catch (err) {
      console.error('Error updating task:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    try {
      const response = await fetch(`/api/client/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete task');
      }

      // Reload data to remove the deleted task
      await loadData();
    } catch (err) {
      console.error('Error deleting task:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const getTasksForColumn = (columnId: string) => {
    return tasks
      .filter(task => task.column_id === columnId)
      .sort((a, b) => a.position - b.position);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading board...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button 
            onClick={loadData}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col mobile-optimized">
      {/* Header - Mobile optimized */}
      <div className="flex items-center justify-between mb-4 md:mb-6 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base md:text-lg font-semibold">Kanban Board</h2>
        </div>
        <button className="touch-target-comfortable flex items-center gap-2 px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Column</span>
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Mobile-optimized Kanban board */}
        <div className="mobile-kanban-board flex-1 overflow-x-auto touch-scroll">
          <div className="mobile-kanban-columns flex gap-4 md:gap-6 h-full min-w-max pb-4 md:pb-6">
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={getTasksForColumn(column.id)}
                onTaskMove={handleTaskMove}
                onTaskCreate={handleTaskCreate}
                onTaskUpdate={handleTaskUpdate}
                onTaskDelete={handleTaskDelete}
              />
            ))}
          </div>
        </div>

        {/* Drag Overlay for better mobile feedback */}
        <DragOverlay>
          {draggedTask ? (
            <div className="mobile-task-card mobile-gpu-accelerated opacity-90 transform rotate-3 scale-105 shadow-2xl ring-2 ring-primary/50">
              <div className="bg-card border border-primary/30 rounded-lg p-3 md:p-4">
                <h4 className="font-semibold text-sm text-card-foreground mb-1">
                  {draggedTask.title}
                </h4>
                {draggedTask.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {draggedTask.description.length > 60
                      ? `${draggedTask.description.substring(0, 60)}...`
                      : draggedTask.description
                    }
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
