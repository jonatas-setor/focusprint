'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { useModalBehavior, useModalLoading } from '@/hooks/use-modal-behavior';
import {
  X,
  Calendar,
  User,
  Clock,
  Flag,
  Plus,
  Trash2,
  Paperclip,
  Edit3,
  Save,
  FileText,
  CheckSquare,
  Upload,
  Download,
  Loader2,
  AlertCircle,
  Target,
  Timer
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Form validation schemas
const taskEditSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  due_date: z.string().optional(),
  estimated_hours: z.number().min(0).optional(),
  actual_hours: z.number().min(0).optional(),
});

const checklistItemSchema = z.object({
  title: z.string().min(1, 'Checklist item title is required').max(100, 'Title too long'),
});

type TaskEditData = z.infer<typeof taskEditSchema>;
type ChecklistItemData = z.infer<typeof checklistItemSchema>;

// Priority configuration with enhanced styling
const priorityConfig = {
  low: {
    label: 'Low',
    color: 'bg-green-50 text-green-700 border-green-200',
    icon: '🟢',
    description: 'Can be done when time permits',
  },
  medium: {
    label: 'Medium',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: '🔵',
    description: 'Standard priority level',
  },
  high: {
    label: 'High',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: '🟠',
    description: 'Important and time-sensitive',
  },
  urgent: {
    label: 'Urgent',
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: '🔴',
    description: 'Needs immediate attention',
  },
};

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
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);

  // Enhanced modal behaviors
  const { isLoading, withLoading } = useModalLoading();
  const { modalRef, handleClose: modalHandleClose, handleKeyDown } = useModalBehavior({
    isOpen,
    onClose,
    closeOnEscape: true,
    closeOnOutsideClick: true,
    preventCloseWhenLoading: isLoading || isUploading,
    focusOnOpen: true,
    restoreFocusOnClose: true,
    trapFocus: true,
  });

  // Form for task editing
  const taskForm = useForm<TaskEditData>({
    resolver: zodResolver(taskEditSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
      estimated_hours: 0,
      actual_hours: 0,
    },
  });

  // Form for checklist items
  const checklistForm = useForm<ChecklistItemData>({
    resolver: zodResolver(checklistItemSchema),
    defaultValues: {
      title: '',
    },
  });

  useEffect(() => {
    if (task && isOpen) {
      setEditedTask({ ...task });
      taskForm.reset({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        due_date: task.due_date || '',
        estimated_hours: task.estimated_hours || 0,
        actual_hours: task.actual_hours || 0,
      });
      loadAttachments();
    }
  }, [task, isOpen, taskForm]);

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

  const handleSave = async (data: TaskEditData) => {
    if (!editedTask) return;

    await withLoading(async () => {
      const response = await fetch(`/api/client/tasks/${editedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          priority: data.priority,
          due_date: data.due_date,
          estimated_hours: data.estimated_hours,
          actual_hours: data.actual_hours,
          assigned_to: editedTask.assigned_to,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update task');
      }

      toast.success('Task updated successfully!');
      onUpdate(result.task);
      setEditedTask(result.task);
      setIsEditing(false);
    }, 'Saving changes...');
  };

  const handleAddChecklistItem = async (data: ChecklistItemData) => {
    if (!editedTask) return;

    try {
      const response = await fetch(`/api/client/tasks/${editedTask.id}/checklists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title.trim(),
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
      checklistForm.reset();
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

  const handleClose = () => {
    if (!isLoading && !isUploading) {
      modalHandleClose();
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          ref={modalRef}
          className="max-w-6xl w-[95vw] max-h-[95vh] overflow-hidden p-0 flex flex-col"
          onKeyDown={handleKeyDown}
          showCloseButton={false}
        >
          {/* Header */}
          <DialogHeader className="px-6 py-5 border-b bg-muted/30 flex-shrink-0">
            <div className="space-y-4">
              {/* Title Row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <Form {...taskForm}>
                      <FormField
                        control={taskForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...field}
                                className="text-xl font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0 bg-transparent"
                                placeholder="Task title..."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </Form>
                  ) : (
                    <DialogTitle className="text-xl font-semibold text-foreground pr-4">
                      {editedTask.title}
                    </DialogTitle>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isEditing ? (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={taskForm.handleSubmit(handleSave)}
                            disabled={isLoading}
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Save changes</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => {
                              taskForm.reset();
                              setIsEditing(false);
                            }}
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Cancel editing</TooltipContent>
                      </Tooltip>
                    </>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => setIsEditing(true)}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit task</TooltipContent>
                    </Tooltip>
                  )}

                  {/* Close Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleClose}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Close modal</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Badges Row */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge
                  variant="outline"
                  className={priorityConfig[editedTask.priority].color}
                >
                  <Flag className="w-3 h-3 mr-1" />
                  {priorityConfig[editedTask.priority].label}
                </Badge>

                {editedTask.due_date && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(editedTask.due_date).toLocaleDateString()}
                  </Badge>
                )}

                {totalChecklists > 0 && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <CheckSquare className="w-3 h-3 mr-1" />
                    {completedChecklists}/{totalChecklists}
                  </Badge>
                )}

                {editedTask.estimated_hours && editedTask.estimated_hours > 0 && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Target className="w-3 h-3 mr-1" />
                    {editedTask.estimated_hours}h estimated
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>
          {/* Main Content Area */}
          <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
            {/* Left Panel - Main Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Description Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Form {...taskForm}>
                        <FormField
                          control={taskForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Add a detailed description of the task..."
                                  className="min-h-[100px] resize-none"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </Form>
                    ) : (
                      <div className="min-h-[80px] p-3 bg-muted/30 rounded-md">
                        {editedTask.description ? (
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {editedTask.description}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No description provided
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Checklist Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckSquare className="w-4 h-4" />
                        Checklist ({completedChecklists}/{totalChecklists})
                      </CardTitle>
                      {totalChecklists > 0 && (
                        <div className="flex items-center gap-3">
                          <Progress value={checklistProgress} className="w-20 h-2" />
                          <Badge variant="outline" className="text-xs">
                            {Math.round(checklistProgress)}%
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Checklist Items */}
                    {editedTask.checklists && editedTask.checklists.length > 0 ? (
                      <div className="space-y-2">
                        {editedTask.checklists.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <Checkbox
                              checked={item.completed}
                              onCheckedChange={(checked) =>
                                handleToggleChecklistItem(item.id, checked as boolean)
                              }
                              className="flex-shrink-0"
                            />
                            <span
                              className={`flex-1 text-sm ${
                                item.completed
                                  ? 'line-through text-muted-foreground'
                                  : 'text-foreground'
                              }`}
                            >
                              {item.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No checklist items yet</p>
                      </div>
                    )}

                    {/* Add Checklist Item Form */}
                    <Separator />
                    <Form {...checklistForm}>
                      <form
                        onSubmit={checklistForm.handleSubmit(handleAddChecklistItem)}
                        className="flex gap-2"
                      >
                        <FormField
                          control={checklistForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Add a new checklist item..."
                                  className="h-9"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" size="sm" className="h-9 px-3">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                {/* Attachments Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      Attachments ({attachments.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* File Upload Area */}
                    <div>
                      <label className="block">
                        <input
                          type="file"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                          className="hidden"
                          accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.zip"
                        />
                        <div className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                          isUploading
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                        }`}>
                          {isUploading ? (
                            <Loader2 className="w-8 h-8 text-primary mx-auto mb-2 animate-spin" />
                          ) : (
                            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          )}
                          <p className="text-sm text-foreground font-medium">
                            {isUploading ? 'Uploading...' : 'Click to upload files'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Maximum file size: 5MB
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Attachments List */}
                    {attachments.length > 0 ? (
                      <div className="space-y-2">
                        {attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {attachment.file_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(attachment.file_size)} • {new Date(attachment.uploaded_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    onClick={() => handleDownloadAttachment(attachment.id, attachment.file_name)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Download file</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    onClick={() => handleDeleteAttachment(attachment.id)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete file</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No attachments yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Sidebar - Task Properties */}
            <div className="w-full lg:w-80 lg:min-w-80 border-t lg:border-t-0 lg:border-l bg-muted/20 overflow-y-auto flex-shrink-0">
              <div className="p-6 space-y-6">
                {/* Priority */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Priority</h3>
                  </div>
                  {isEditing ? (
                    <Form {...taskForm}>
                      <FormField
                        control={taskForm.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(priorityConfig).map(([value, config]) => (
                                  <SelectItem key={value} value={value}>
                                    <div className="flex items-center gap-2">
                                      <span>{config.icon}</span>
                                      <span>{config.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </Form>
                  ) : (
                    <Badge className={priorityConfig[editedTask.priority].color}>
                      <span className="mr-1">{priorityConfig[editedTask.priority].icon}</span>
                      {priorityConfig[editedTask.priority].label}
                    </Badge>
                  )}
                </div>

                <Separator />

                {/* Due Date */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Due Date</h3>
                  </div>
                  {isEditing ? (
                    <Form {...taskForm}>
                      <FormField
                        control={taskForm.control}
                        name="due_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="date" className="h-9" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </Form>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {editedTask.due_date
                        ? new Date(editedTask.due_date).toLocaleDateString()
                        : 'No due date set'
                      }
                    </div>
                  )}
                </div>

                <Separator />

                {/* Time Tracking */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Time Tracking</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Estimated Hours</label>
                      {isEditing ? (
                        <Form {...taskForm}>
                          <FormField
                            control={taskForm.control}
                            name="estimated_hours"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    className="h-9"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </Form>
                      ) : (
                        <div className="flex items-center gap-2 text-sm">
                          <Target className="w-3 h-3 text-muted-foreground" />
                          <span>{editedTask.estimated_hours || 0}h estimated</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Actual Hours</label>
                      {isEditing ? (
                        <Form {...taskForm}>
                          <FormField
                            control={taskForm.control}
                            name="actual_hours"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    className="h-9"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </Form>
                      ) : (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span>{editedTask.actual_hours || 0}h logged</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Assignee */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Assignee</h3>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {editedTask.assigned_to ? 'Assigned User' : 'Unassigned'}
                  </div>
                </div>

                <Separator />

                {/* Timestamps */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Details</h3>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div>Created: {new Date(editedTask.created_at).toLocaleString()}</div>
                    <div>Updated: {new Date(editedTask.updated_at).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
