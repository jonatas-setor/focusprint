'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, User, Clock, Flag, Plus, Check, Trash2, Paperclip } from 'lucide-react';
import { toast } from 'sonner';

interface TaskChecklist {
  id: string;
  title: string;
  completed: boolean;
  position: number;
}

interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  uploaded_by: string;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

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
  checklists?: TaskChecklist[];
  attachments?: TaskAttachment[];
}

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (task: Task) => void;
}

export default function TaskDetailModal({ task, isOpen, onClose, onUpdate }: TaskDetailModalProps) {
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);

  useEffect(() => {
    if (task && isOpen) {
      setEditedTask({ ...task });
      loadAttachments();
    }
  }, [task, isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [isOpen, onClose]);

  const loadAttachments = async () => {
    if (!task) return;

    try {
      const response = await fetch(`/api/client/tasks/${task.id}/attachments`);
      const data = await response.json();

      if (response.ok) {
        setAttachments(data.attachments || []);
      } else {
        console.error('Failed to load attachments:', data.error);
      }
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  };

  const handleSave = async () => {
    if (!editedTask) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/client/tasks/${editedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editedTask.title,
          description: editedTask.description,
          priority: editedTask.priority,
          due_date: editedTask.due_date,
          estimated_hours: editedTask.estimated_hours,
          actual_hours: editedTask.actual_hours,
          assigned_to: editedTask.assigned_to,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update task');
      }

      toast.success('Task updated successfully!');
      onUpdate(result.task);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim() || !editedTask) return;

    try {
      const response = await fetch(`/api/client/tasks/${editedTask.id}/checklists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newChecklistItem.trim(),
          position: (editedTask.checklists?.length || 0) + 1,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add checklist item');
      }

      setEditedTask({
        ...editedTask,
        checklists: [...(editedTask.checklists || []), result.checklist],
      });
      setNewChecklistItem('');
      toast.success('Checklist item added!');
    } catch (error) {
      console.error('Error adding checklist item:', error);
      toast.error('Failed to add checklist item');
    }
  };

  const handleToggleChecklistItem = async (checklistId: string, completed: boolean) => {
    if (!editedTask) return;

    try {
      const response = await fetch(`/api/client/tasks/${editedTask.id}/checklists/${checklistId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed }),
      });

      if (!response.ok) {
        throw new Error('Failed to update checklist item');
      }

      setEditedTask({
        ...editedTask,
        checklists: editedTask.checklists?.map(item =>
          item.id === checklistId ? { ...item, completed } : item
        ),
      });
    } catch (error) {
      console.error('Error updating checklist item:', error);
      toast.error('Failed to update checklist item');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !task) return;

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/client/tasks/${task.id}/attachments`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('File uploaded successfully!');
        await loadAttachments(); // Reload attachments
      } else {
        toast.error(data.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!task) return;

    try {
      const response = await fetch(`/api/client/tasks/${task.id}/attachments/${attachmentId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Attachment deleted successfully!');
        await loadAttachments(); // Reload attachments
      } else {
        toast.error(data.error || 'Failed to delete attachment');
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete attachment');
    }
  };

  const handleDownloadAttachment = async (attachmentId: string, fileName: string) => {
    if (!task) return;

    try {
      const response = await fetch(`/api/client/tasks/${task.id}/attachments/${attachmentId}`);
      const data = await response.json();

      if (response.ok) {
        // Create a temporary link to download the file
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.error(data.error || 'Failed to download attachment');
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast.error('Failed to download attachment');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const completedChecklists = editedTask?.checklists?.filter(item => item.completed).length || 0;
  const totalChecklists = editedTask?.checklists?.length || 0;
  const checklistProgress = totalChecklists > 0 ? (completedChecklists / totalChecklists) * 100 : 0;

  if (!isOpen || !task || !editedTask) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => {
          // Prevent modal from closing when clicking inside the modal content
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editedTask.title}
                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                className="text-xl font-semibold w-full border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
              />
            ) : (
              <h2 className="text-xl font-semibold">{editedTask.title}</h2>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditedTask({ ...task });
                    setIsEditing(false);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-120px)]">
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Description */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
              {isEditing ? (
                <textarea
                  value={editedTask.description || ''}
                  onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                  placeholder="Add a description..."
                  className="w-full h-32 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md min-h-[80px]">
                  {editedTask.description || (
                    <span className="text-gray-500 italic">No description provided</span>
                  )}
                </div>
              )}
            </div>

            {/* Checklist */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">
                  Checklist ({completedChecklists}/{totalChecklists})
                </h3>
                {totalChecklists > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${checklistProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{Math.round(checklistProgress)}%</span>
                  </div>
                )}
              </div>

              {/* Checklist Items */}
              <div className="space-y-2 mb-3">
                {editedTask.checklists?.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                    <button
                      onClick={() => handleToggleChecklistItem(item.id, !item.completed)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        item.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-green-500'
                      }`}
                    >
                      {item.completed && <Check className="h-3 w-3" />}
                    </button>
                    <span className={`flex-1 ${item.completed ? 'line-through text-gray-500' : ''}`}>
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>

              {/* Add Checklist Item */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Add checklist item..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                />
                <button
                  onClick={handleAddChecklistItem}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Attachments */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Attachments ({attachments.length})
              </h3>

              {/* File Upload Area */}
              <div className="mb-4">
                <label className="block">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.zip"
                  />
                  <div className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isUploading
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }`}>
                    <Paperclip className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">
                      {isUploading ? 'Uploading...' : 'Click to upload files'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Maximum file size: 5MB</p>
                  </div>
                </label>
              </div>

              {/* Attachments List */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {attachment.file_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(attachment.file_size)} • {new Date(attachment.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleDownloadAttachment(attachment.id, attachment.file_name)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                          title="Download"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteAttachment(attachment.id)}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l bg-gray-50 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                {isEditing ? (
                  <select
                    value={editedTask.priority}
                    onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                ) : (
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(editedTask.priority)}`}>
                    <Flag className="h-3 w-3 mr-1" />
                    {editedTask.priority.charAt(0).toUpperCase() + editedTask.priority.slice(1)}
                  </span>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedTask.due_date || ''}
                    onChange={(e) => setEditedTask({ ...editedTask, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {editedTask.due_date ? new Date(editedTask.due_date).toLocaleDateString() : 'No due date'}
                  </div>
                )}
              </div>

              {/* Time Tracking */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Tracking</label>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Estimated Hours</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedTask.estimated_hours || ''}
                        onChange={(e) => setEditedTask({ ...editedTask, estimated_hours: parseFloat(e.target.value) || undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        step="0.5"
                        min="0"
                      />
                    ) : (
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        {editedTask.estimated_hours || 0}h estimated
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Actual Hours</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedTask.actual_hours || ''}
                        onChange={(e) => setEditedTask({ ...editedTask, actual_hours: parseFloat(e.target.value) || undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        step="0.5"
                        min="0"
                      />
                    ) : (
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        {editedTask.actual_hours || 0}h logged
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assignee</label>
                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  {editedTask.assigned_to ? 'Assigned User' : 'Unassigned'}
                </div>
              </div>

              {/* Timestamps */}
              <div className="pt-4 border-t">
                <div className="space-y-2 text-xs text-gray-500">
                  <div>Created: {new Date(editedTask.created_at).toLocaleString()}</div>
                  <div>Updated: {new Date(editedTask.updated_at).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
