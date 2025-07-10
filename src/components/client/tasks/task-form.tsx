'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

import {
  TaskTitleField,
  TaskDescriptionField,
  TaskPriorityField,
  TaskDueDateField,
  TaskEstimatedHoursField,
  TaskActualHoursField,
} from './task-form-fields';

import {
  taskCreateSchema,
  taskEditSchema,
  TaskCreateData,
  TaskEditData,
  defaultTaskValues,
  defaultTaskEditValues,
} from './task-schemas';

interface BaseTaskFormProps {
  onSubmit: (data: any) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
}

interface TaskCreateFormProps extends BaseTaskFormProps {
  mode: 'create';
  onSubmit: (data: TaskCreateData) => void | Promise<void>;
  initialValues?: Partial<TaskCreateData>;
}

interface TaskEditFormProps extends BaseTaskFormProps {
  mode: 'edit';
  onSubmit: (data: TaskEditData) => void | Promise<void>;
  initialValues?: Partial<TaskEditData>;
  showTimeTracking?: boolean;
}

type TaskFormProps = TaskCreateFormProps | TaskEditFormProps;

export default function TaskForm({
  mode,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel,
  cancelLabel = 'Cancel',
  showCancel = true,
  initialValues,
  ...props
}: TaskFormProps) {
  const isEdit = mode === 'edit';
  const showTimeTracking = isEdit && (props as TaskEditFormProps).showTimeTracking !== false;
  
  const schema = isEdit ? taskEditSchema : taskCreateSchema;
  const defaultValues = isEdit ? defaultTaskEditValues : defaultTaskValues;
  
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      ...defaultValues,
      ...initialValues,
    },
  });

  const handleSubmit = async (data: TaskCreateData | TaskEditData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleCancel = () => {
    form.reset();
    onCancel?.();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Task Information */}
        <div className="space-y-4">
          <TaskTitleField
            control={form.control}
            name="title"
            required
          />

          <TaskDescriptionField
            control={form.control}
            name="description"
          />
        </div>

        <Separator />

        {/* Task Properties */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TaskPriorityField
            control={form.control}
            name="priority"
            required
          />

          <TaskDueDateField
            control={form.control}
            name="due_date"
          />
        </div>

        {/* Time Tracking (Edit mode only) */}
        {showTimeTracking && (
          <>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TaskEstimatedHoursField
                control={form.control}
                name="estimated_hours"
              />

              <TaskActualHoursField
                control={form.control}
                name="actual_hours"
              />
            </div>
          </>
        )}

        {/* Form Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6 border-t">
          {showCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              {cancelLabel}
            </Button>
          )}
          
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 sm:flex-none"
          >
            {isSubmitting ? (
              <>
                <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                {isEdit ? 'Saving...' : 'Creating...'}
              </>
            ) : (
              submitLabel || (isEdit ? 'Save Changes' : 'Create Task')
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Convenience components for specific use cases
interface QuickTaskFormProps {
  onSubmit: (data: TaskCreateData) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function QuickTaskForm({ onSubmit, onCancel, isSubmitting }: QuickTaskFormProps) {
  return (
    <TaskForm
      mode="create"
      onSubmit={onSubmit}
      onCancel={onCancel}
      isSubmitting={isSubmitting}
      submitLabel="Add Task"
    />
  );
}

interface DetailedTaskFormProps {
  mode: 'create' | 'edit';
  onSubmit: (data: TaskCreateData | TaskEditData) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  initialValues?: Partial<TaskCreateData | TaskEditData>;
}

export function DetailedTaskForm({
  mode,
  onSubmit,
  onCancel,
  isSubmitting,
  initialValues,
}: DetailedTaskFormProps) {
  if (mode === 'edit') {
    return (
      <TaskForm
        mode="edit"
        onSubmit={onSubmit as (data: TaskEditData) => void | Promise<void>}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        initialValues={initialValues as Partial<TaskEditData>}
        showTimeTracking={true}
      />
    );
  }

  return (
    <TaskForm
      mode="create"
      onSubmit={onSubmit as (data: TaskCreateData) => void | Promise<void>}
      onCancel={onCancel}
      isSubmitting={isSubmitting}
      initialValues={initialValues as Partial<TaskCreateData>}
    />
  );
}

// Hook for form validation
export function useTaskFormValidation(mode: 'create' | 'edit' = 'create') {
  const schema = mode === 'edit' ? taskEditSchema : taskCreateSchema;
  
  return {
    schema,
    validate: (data: any) => schema.safeParse(data),
    validateField: (field: string, value: any) => {
      const fieldSchema = schema.shape[field as keyof typeof schema.shape];
      return fieldSchema?.safeParse(value);
    },
  };
}
