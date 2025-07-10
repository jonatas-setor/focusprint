'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, FlagIcon, Loader2Icon, AlertCircleIcon } from 'lucide-react';
import { toast } from 'sonner';

import { useModalBehavior, useModalLoading } from '@/hooks/use-modal-behavior';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

// Form validation schema
const taskFormSchema = z.object({
  title: z.string()
    .min(1, 'Task title is required')
    .max(100, 'Task title must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], {
    required_error: 'Please select a priority level',
  }),
  due_date: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  assigned_to?: string;
  column_id: string;
  position: number;
  created_at: string;
}

interface TaskModalProps {
  task?: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => void;
  mode: 'create' | 'edit';
}

// Priority configuration with colors and icons
const priorityConfig = {
  low: {
    label: 'Low',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '🟢',
  },
  medium: {
    label: 'Medium',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: '🟡',
  },
  high: {
    label: 'High',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: '🟠',
  },
  urgent: {
    label: 'Urgent',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: '🔴',
  },
};

export default function TaskModal({ task, isOpen, onClose, onSave, mode }: TaskModalProps) {
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
    },
  });

  // Enhanced modal behaviors
  const { isLoading: isSubmitting, withLoading } = useModalLoading();
  const { modalRef, handleClose: modalHandleClose, handleKeyDown } = useModalBehavior({
    isOpen,
    onClose,
    closeOnEscape: true,
    closeOnOutsideClick: true,
    preventCloseWhenLoading: isSubmitting,
    focusOnOpen: true,
    restoreFocusOnClose: true,
    trapFocus: true,
  });

  // Reset form when modal opens/closes or task changes
  useEffect(() => {
    if (isOpen) {
      if (task && mode === 'edit') {
        form.reset({
          title: task.title || '',
          description: task.description || '',
          priority: task.priority || 'medium',
          due_date: task.due_date || '',
        });
      } else {
        form.reset({
          title: '',
          description: '',
          priority: 'medium',
          due_date: '',
        });
      }
    }
  }, [task, mode, isOpen, form]);

  const handleSubmit = async (data: TaskFormData) => {
    try {
      await withLoading(async () => {
        onSave({
          title: data.title.trim(),
          description: data.description?.trim() || undefined,
          priority: data.priority,
          due_date: data.due_date || undefined,
        });

        toast.success(mode === 'create' ? 'Task created successfully!' : 'Task updated successfully!');
        handleClose();
      }, mode === 'create' ? 'Creating task...' : 'Saving changes...');
    } catch (error) {
      toast.error('Failed to save task. Please try again.');
      console.error('Error saving task:', error);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      modalHandleClose();
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          ref={modalRef}
          className="sm:max-w-[600px] max-h-[90vh] overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                {mode === 'create' ? (
                  <AlertCircleIcon className="w-5 h-5 text-primary" />
                ) : (
                  <FlagIcon className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl font-semibold">
                  {mode === 'create' ? 'Create New Task' : 'Edit Task'}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  {mode === 'create'
                    ? 'Add a new task to your project board with all the necessary details.'
                    : 'Update the task information and settings below.'
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* Task Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        Task Title
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter a clear, descriptive task title..."
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-muted-foreground">
                        Keep it concise but descriptive (max 100 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Task Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide additional context, requirements, or notes for this task..."
                          className="min-h-[100px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-muted-foreground">
                        Optional details to help clarify the task requirements (max 500 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Priority Selection */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        Priority Level
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select task priority">
                              {field.value && (
                                <div className="flex items-center gap-2">
                                  <span>{priorityConfig[field.value].icon}</span>
                                  <Badge
                                    variant="outline"
                                    className={priorityConfig[field.value].color}
                                  >
                                    {priorityConfig[field.value].label}
                                  </Badge>
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(priorityConfig).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center gap-3">
                                <span className="text-base">{config.icon}</span>
                                <div className="flex flex-col">
                                  <span className="font-medium">{config.label}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {value === 'urgent' && 'Needs immediate attention'}
                                    {value === 'high' && 'Important and time-sensitive'}
                                    {value === 'medium' && 'Standard priority level'}
                                    {value === 'low' && 'Can be done when time permits'}
                                  </span>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs text-muted-foreground">
                        Set the urgency level to help with task prioritization
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Due Date */}
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Due Date
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-muted-foreground">
                        Optional deadline for task completion
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>

          <DialogFooter className="flex-shrink-0 gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={form.handleSubmit(handleSubmit)}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Saving...'}
                </>
              ) : (
                <>
                  {mode === 'create' ? 'Create Task' : 'Save Changes'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
