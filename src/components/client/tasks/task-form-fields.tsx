'use client';

import { Control } from 'react-hook-form';
import { CalendarIcon, FlagIcon, TimerIcon, TargetIcon, ClockIcon } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Priority configuration with enhanced styling
export const priorityConfig = {
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

export type Priority = keyof typeof priorityConfig;

interface TaskTitleFieldProps {
  control: Control<any>;
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export function TaskTitleField({ 
  control, 
  name, 
  label = "Task Title", 
  placeholder = "Enter a clear, descriptive task title...",
  required = true 
}: TaskTitleFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-medium flex items-center gap-2">
            {label}
            {required && <span className="text-destructive">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              placeholder={placeholder}
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
  );
}

interface TaskDescriptionFieldProps {
  control: Control<any>;
  name: string;
  label?: string;
  placeholder?: string;
  rows?: number;
}

export function TaskDescriptionField({ 
  control, 
  name, 
  label = "Description",
  placeholder = "Provide additional context, requirements, or notes for this task...",
  rows = 4
}: TaskDescriptionFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-medium">{label}</FormLabel>
          <FormControl>
            <Textarea
              placeholder={placeholder}
              className={`min-h-[${rows * 25}px] resize-none`}
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
  );
}

interface TaskPriorityFieldProps {
  control: Control<any>;
  name: string;
  label?: string;
  required?: boolean;
  showDescription?: boolean;
}

export function TaskPriorityField({ 
  control, 
  name, 
  label = "Priority Level",
  required = true,
  showDescription = true
}: TaskPriorityFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-medium flex items-center gap-2">
            <FlagIcon className="w-4 h-4" />
            {label}
            {required && <span className="text-destructive">*</span>}
          </FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select task priority">
                  {field.value && (
                    <div className="flex items-center gap-2">
                      <span>{priorityConfig[field.value as Priority].icon}</span>
                      <Badge 
                        variant="outline" 
                        className={priorityConfig[field.value as Priority].color}
                      >
                        {priorityConfig[field.value as Priority].label}
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
                      {showDescription && (
                        <span className="text-xs text-muted-foreground">
                          {config.description}
                        </span>
                      )}
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
  );
}

interface TaskDueDateFieldProps {
  control: Control<any>;
  name: string;
  label?: string;
}

export function TaskDueDateField({ 
  control, 
  name, 
  label = "Due Date"
}: TaskDueDateFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-medium flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            {label}
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
  );
}

interface TaskTimeFieldProps {
  control: Control<any>;
  name: string;
  label: string;
  icon?: React.ReactNode;
  placeholder?: string;
  description?: string;
}

export function TaskTimeField({ 
  control, 
  name, 
  label,
  icon,
  placeholder = "0",
  description
}: TaskTimeFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-medium flex items-center gap-2">
            {icon}
            {label}
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              step="0.5"
              min="0"
              placeholder={placeholder}
              className="h-9"
              {...field}
              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
            />
          </FormControl>
          {description && (
            <FormDescription className="text-xs text-muted-foreground">
              {description}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface TaskEstimatedHoursFieldProps {
  control: Control<any>;
  name: string;
}

export function TaskEstimatedHoursField({ control, name }: TaskEstimatedHoursFieldProps) {
  return (
    <TaskTimeField
      control={control}
      name={name}
      label="Estimated Hours"
      icon={<TargetIcon className="w-4 h-4" />}
      description="How long do you think this task will take?"
    />
  );
}

interface TaskActualHoursFieldProps {
  control: Control<any>;
  name: string;
}

export function TaskActualHoursField({ control, name }: TaskActualHoursFieldProps) {
  return (
    <TaskTimeField
      control={control}
      name={name}
      label="Actual Hours"
      icon={<ClockIcon className="w-4 h-4" />}
      description="How much time has been spent on this task?"
    />
  );
}
