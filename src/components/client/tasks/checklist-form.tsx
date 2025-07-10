'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Check, X, GripVertical, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';

import {
  checklistItemSchema,
  ChecklistItemData,
  defaultChecklistItemValues,
} from './task-schemas';

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  position: number;
}

interface ChecklistFormProps {
  items: ChecklistItem[];
  onAddItem: (data: ChecklistItemData) => void | Promise<void>;
  onToggleItem: (id: string, completed: boolean) => void | Promise<void>;
  onDeleteItem: (id: string) => void | Promise<void>;
  onReorderItems?: (items: ChecklistItem[]) => void | Promise<void>;
  isLoading?: boolean;
  showProgress?: boolean;
  allowReorder?: boolean;
  maxItems?: number;
}

export default function ChecklistForm({
  items,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onReorderItems,
  isLoading = false,
  showProgress = true,
  allowReorder = false,
  maxItems = 50,
}: ChecklistFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  
  const form = useForm<ChecklistItemData>({
    resolver: zodResolver(checklistItemSchema),
    defaultValues: defaultChecklistItemValues,
  });

  const completedItems = items.filter(item => item.completed).length;
  const totalItems = items.length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const handleAddItem = async (data: ChecklistItemData) => {
    try {
      setIsAdding(true);
      await onAddItem(data);
      form.reset();
    } catch (error) {
      console.error('Error adding checklist item:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleItem = async (id: string, completed: boolean) => {
    try {
      await onToggleItem(id, completed);
    } catch (error) {
      console.error('Error toggling checklist item:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await onDeleteItem(id);
    } catch (error) {
      console.error('Error deleting checklist item:', error);
    }
  };

  const canAddMore = totalItems < maxItems;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Check className="w-4 h-4" />
            Checklist ({completedItems}/{totalItems})
          </CardTitle>
          {showProgress && totalItems > 0 && (
            <div className="flex items-center gap-3">
              <Progress value={progress} className="w-20 h-2" />
              <Badge variant="outline" className="text-xs">
                {Math.round(progress)}%
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Checklist Items */}
        {totalItems > 0 ? (
          <div className="space-y-2">
            {items
              .sort((a, b) => a.position - b.position)
              .map((item) => (
                <ChecklistItemRow
                  key={item.id}
                  item={item}
                  onToggle={handleToggleItem}
                  onDelete={handleDeleteItem}
                  allowReorder={allowReorder}
                  isLoading={isLoading}
                />
              ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Check className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No checklist items yet</p>
            <p className="text-xs mt-1">Add items to track task progress</p>
          </div>
        )}

        {/* Add New Item Form */}
        {canAddMore && (
          <>
            <Separator />
            <Form {...form}>
              <form 
                onSubmit={form.handleSubmit(handleAddItem)}
                className="flex gap-2"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Add a new checklist item..."
                          className="h-9"
                          disabled={isAdding || isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  className="h-9 px-3"
                  disabled={isAdding || isLoading}
                >
                  {isAdding ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </Form>
          </>
        )}

        {!canAddMore && (
          <div className="text-center py-2">
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Maximum {maxItems} items reached
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ChecklistItemRowProps {
  item: ChecklistItem;
  onToggle: (id: string, completed: boolean) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  allowReorder?: boolean;
  isLoading?: boolean;
}

function ChecklistItemRow({
  item,
  onToggle,
  onDelete,
  allowReorder = false,
  isLoading = false,
}: ChecklistItemRowProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggle = async () => {
    try {
      setIsToggling(true);
      await onToggle(item.id, !item.completed);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(item.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
      {allowReorder && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      
      <Checkbox
        checked={item.completed}
        onCheckedChange={handleToggle}
        disabled={isToggling || isLoading}
        className="flex-shrink-0"
      />
      
      <span 
        className={`flex-1 text-sm transition-all ${
          item.completed 
            ? 'line-through text-muted-foreground' 
            : 'text-foreground'
        }`}
      >
        {item.title}
      </span>
      
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleDelete}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              disabled={isDeleting || isLoading}
            >
              {isDeleting ? (
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete item</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

// Utility functions for checklist management
export const checklistUtils = {
  calculateProgress: (items: ChecklistItem[]) => {
    const completed = items.filter(item => item.completed).length;
    const total = items.length;
    return total > 0 ? (completed / total) * 100 : 0;
  },
  
  getNextPosition: (items: ChecklistItem[]) => {
    return Math.max(0, ...items.map(item => item.position)) + 1;
  },
  
  reorderItems: (items: ChecklistItem[], fromIndex: number, toIndex: number) => {
    const result = Array.from(items);
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);
    
    // Update positions
    return result.map((item, index) => ({
      ...item,
      position: index + 1,
    }));
  },
  
  filterCompleted: (items: ChecklistItem[]) => items.filter(item => item.completed),
  filterPending: (items: ChecklistItem[]) => items.filter(item => !item.completed),
};
