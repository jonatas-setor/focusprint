'use client';

import { useState } from 'react';
import TaskModal from '@/components/client/kanban/task-modal';

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
}

export default function TestModalPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  const sampleTask: Task = {
    id: '1',
    title: 'Sample Task',
    description: 'This is a sample task for testing',
    priority: 'high',
    due_date: '2024-01-15',
    assigned_to: 'user-1',
    column_id: 'col-1',
    position: 1,
    created_at: '2024-01-01T00:00:00Z'
  };

  const handleCreateTask = (taskData: Partial<Task>) => {
    console.log('Creating task:', taskData);
    const newTask: Task = {
      id: Date.now().toString(),
      title: taskData.title || '',
      description: taskData.description,
      priority: taskData.priority || 'medium',
      due_date: taskData.due_date,
      assigned_to: taskData.assigned_to,
      column_id: 'col-1',
      position: tasks.length + 1,
      created_at: new Date().toISOString()
    };
    setTasks(prev => [...prev, newTask]);
    setShowCreateModal(false);
  };

  const handleUpdateTask = (taskData: Partial<Task>) => {
    console.log('Updating task:', taskData);
    setTasks(prev => prev.map(task => 
      task.id === sampleTask.id 
        ? { ...task, ...taskData }
        : task
    ));
    setShowEditModal(false);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Task Modal Testing</h1>
        
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Test Task Creation Modal</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Open Create Task Modal
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Test Task Edit Modal</h2>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Open Edit Task Modal
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Created Tasks ({tasks.length})</h2>
            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task.id} className="p-3 border rounded-md">
                  <h3 className="font-medium">{task.title}</h3>
                  {task.description && (
                    <p className="text-sm text-gray-600">{task.description}</p>
                  )}
                  <div className="flex gap-2 mt-2 text-xs">
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      Priority: {task.priority}
                    </span>
                    {task.due_date && (
                      <span className="px-2 py-1 bg-blue-100 rounded">
                        Due: {task.due_date}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-gray-500 italic">No tasks created yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Task Creation Modal */}
        <TaskModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateTask}
          mode="create"
        />

        {/* Task Edit Modal */}
        <TaskModal
          task={sampleTask}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleUpdateTask}
          mode="edit"
        />
      </div>
    </div>
  );
}
