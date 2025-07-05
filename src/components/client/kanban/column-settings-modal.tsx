'use client';

import { useState } from 'react';
import { X, Trash2, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Column {
  id: string;
  name: string;
  position: number;
  color: string;
  task_count: number;
}

interface ColumnSettingsModalProps {
  column: Column;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (columnId: string, data: { name?: string; color?: string }) => void;
  onDelete: (columnId: string) => void;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#F97316', // Orange
];

export default function ColumnSettingsModal({
  column,
  isOpen,
  onClose,
  onUpdate,
  onDelete
}: ColumnSettingsModalProps) {
  const [name, setName] = useState(column.name);
  const [color, setColor] = useState(column.color);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onUpdate(column.id, {
        name: name.trim(),
        color
      });
      onClose();
    } catch (error) {
      console.error('Error updating column:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isDeleting) {
      setIsDeleting(true);
      return;
    }

    try {
      await onDelete(column.id);
      onClose();
    } catch (error) {
      console.error('Error deleting column:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border rounded-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Column Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Column Name */}
          <div className="space-y-2">
            <Label htmlFor="column-name">Column Name</Label>
            <Input
              id="column-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter column name"
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label>Column Color</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  onClick={() => setColor(presetColor)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    color === presetColor ? 'border-foreground' : 'border-border'
                  }`}
                  style={{ backgroundColor: presetColor }}
                  title={`Select ${presetColor}`}
                />
              ))}
              <div className="flex items-center gap-2 ml-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="flex items-center gap-2 p-2 border rounded">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium">{name || 'Column Name'}</span>
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                {column.task_count}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isSaving}
            className={isDeleting ? 'bg-red-600' : ''}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? 'Confirm Delete' : 'Delete Column'}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!name.trim() || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
