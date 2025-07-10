import * as z from 'zod';

// Base task validation schema
export const taskBaseSchema = z.object({
  title: z.string()
    .min(1, 'Task title is required')
    .max(100, 'Task title must be less than 100 characters')
    .trim(),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .transform(val => val?.trim() || undefined),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], {
    required_error: 'Please select a priority level',
  }),
  due_date: z.string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    }, {
      message: 'Due date cannot be in the past',
    }),
});

// Extended task schema with time tracking
export const taskEditSchema = taskBaseSchema.extend({
  estimated_hours: z.number()
    .min(0, 'Estimated hours cannot be negative')
    .max(1000, 'Estimated hours seems too high')
    .optional(),
  actual_hours: z.number()
    .min(0, 'Actual hours cannot be negative')
    .max(1000, 'Actual hours seems too high')
    .optional(),
});

// Schema for creating new tasks (simplified)
export const taskCreateSchema = taskBaseSchema;

// Schema for checklist items
export const checklistItemSchema = z.object({
  title: z.string()
    .min(1, 'Checklist item title is required')
    .max(100, 'Title must be less than 100 characters')
    .trim(),
});

// Schema for task comments (if needed in the future)
export const taskCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment is too long')
    .trim(),
});

// Schema for task assignment (if needed in the future)
export const taskAssignmentSchema = z.object({
  assigned_to: z.string()
    .uuid('Invalid user ID')
    .optional(),
});

// Combined schema for full task updates
export const taskFullUpdateSchema = taskEditSchema.extend({
  assigned_to: z.string()
    .uuid('Invalid user ID')
    .optional(),
});

// Type exports for TypeScript
export type TaskBaseData = z.infer<typeof taskBaseSchema>;
export type TaskEditData = z.infer<typeof taskEditSchema>;
export type TaskCreateData = z.infer<typeof taskCreateSchema>;
export type ChecklistItemData = z.infer<typeof checklistItemSchema>;
export type TaskCommentData = z.infer<typeof taskCommentSchema>;
export type TaskAssignmentData = z.infer<typeof taskAssignmentSchema>;
export type TaskFullUpdateData = z.infer<typeof taskFullUpdateSchema>;

// Validation helpers
export const validateTaskTitle = (title: string): string | null => {
  const result = z.string().min(1).max(100).safeParse(title.trim());
  return result.success ? null : result.error.errors[0]?.message || 'Invalid title';
};

export const validateTaskDescription = (description: string): string | null => {
  const result = z.string().max(500).safeParse(description.trim());
  return result.success ? null : result.error.errors[0]?.message || 'Invalid description';
};

export const validateTaskPriority = (priority: string): string | null => {
  const result = z.enum(['low', 'medium', 'high', 'urgent']).safeParse(priority);
  return result.success ? null : result.error.errors[0]?.message || 'Invalid priority';
};

export const validateTaskDueDate = (dueDate: string): string | null => {
  if (!dueDate) return null;
  
  const selectedDate = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (selectedDate < today) {
    return 'Due date cannot be in the past';
  }
  
  return null;
};

export const validateTaskHours = (hours: number): string | null => {
  const result = z.number().min(0).max(1000).safeParse(hours);
  return result.success ? null : result.error.errors[0]?.message || 'Invalid hours';
};

// Default values for forms
export const defaultTaskValues: TaskCreateData = {
  title: '',
  description: '',
  priority: 'medium',
  due_date: '',
};

export const defaultTaskEditValues: TaskEditData = {
  title: '',
  description: '',
  priority: 'medium',
  due_date: '',
  estimated_hours: 0,
  actual_hours: 0,
};

export const defaultChecklistItemValues: ChecklistItemData = {
  title: '',
};

// Form field configurations
export const taskFormFields = {
  title: {
    label: 'Task Title',
    placeholder: 'Enter a clear, descriptive task title...',
    required: true,
    maxLength: 100,
  },
  description: {
    label: 'Description',
    placeholder: 'Provide additional context, requirements, or notes for this task...',
    required: false,
    maxLength: 500,
    rows: 4,
  },
  priority: {
    label: 'Priority Level',
    required: true,
    options: [
      { value: 'low', label: 'Low', description: 'Can be done when time permits' },
      { value: 'medium', label: 'Medium', description: 'Standard priority level' },
      { value: 'high', label: 'High', description: 'Important and time-sensitive' },
      { value: 'urgent', label: 'Urgent', description: 'Needs immediate attention' },
    ],
  },
  due_date: {
    label: 'Due Date',
    placeholder: '',
    required: false,
  },
  estimated_hours: {
    label: 'Estimated Hours',
    placeholder: '0',
    required: false,
    min: 0,
    max: 1000,
    step: 0.5,
  },
  actual_hours: {
    label: 'Actual Hours',
    placeholder: '0',
    required: false,
    min: 0,
    max: 1000,
    step: 0.5,
  },
} as const;
