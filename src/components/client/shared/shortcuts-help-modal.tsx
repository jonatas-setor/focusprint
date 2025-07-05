'use client';

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Keyboard, 
  Navigation, 
  Plus, 
  MessageSquare, 
  FolderOpen, 
  Settings,
  Command,
  Hash,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ShortcutItem {
  id: string;
  name: string;
  description: string;
  keys: string[];
  category: 'navigation' | 'projects' | 'tasks' | 'chat' | 'general';
}

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts?: ShortcutItem[];
}

// Default shortcuts configuration
const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  // Navigation
  {
    id: 'command_palette',
    name: 'Command Palette',
    description: 'Open command palette for quick actions',
    keys: ['Ctrl', 'P'],
    category: 'navigation'
  },
  {
    id: 'go_dashboard',
    name: 'Go to Dashboard',
    description: 'Navigate to main dashboard',
    keys: ['Ctrl', 'H'],
    category: 'navigation'
  },
  {
    id: 'go_projects',
    name: 'Go to Projects',
    description: 'Navigate to projects list',
    keys: ['Ctrl', 'Shift', 'P'],
    category: 'navigation'
  },
  {
    id: 'go_teams',
    name: 'Go to Teams',
    description: 'Navigate to teams page',
    keys: ['Ctrl', 'Shift', 'T'],
    category: 'navigation'
  },
  {
    id: 'go_my_week',
    name: 'Go to My Week',
    description: 'Navigate to weekly view',
    keys: ['Ctrl', 'W'],
    category: 'navigation'
  },
  
  // Projects
  {
    id: 'new_project',
    name: 'New Project',
    description: 'Create a new project',
    keys: ['Ctrl', 'Shift', 'N'],
    category: 'projects'
  },
  {
    id: 'recent_project_1',
    name: 'Recent Project 1',
    description: 'Go to most recent project',
    keys: ['Ctrl', '1'],
    category: 'projects'
  },
  {
    id: 'recent_project_2',
    name: 'Recent Project 2',
    description: 'Go to second most recent project',
    keys: ['Ctrl', '2'],
    category: 'projects'
  },
  {
    id: 'recent_project_3',
    name: 'Recent Project 3',
    description: 'Go to third most recent project',
    keys: ['Ctrl', '3'],
    category: 'projects'
  },
  
  // Tasks
  {
    id: 'new_task',
    name: 'New Task',
    description: 'Create a new task in current project',
    keys: ['Ctrl', 'T'],
    category: 'tasks'
  },
  {
    id: 'search_tasks',
    name: 'Search Tasks',
    description: 'Search tasks in current project',
    keys: ['Ctrl', 'F'],
    category: 'tasks'
  },
  
  // Chat
  {
    id: 'focus_chat',
    name: 'Focus Chat',
    description: 'Focus on chat input in project view',
    keys: ['Ctrl', 'M'],
    category: 'chat'
  },
  
  // General
  {
    id: 'global_search',
    name: 'Global Search',
    description: 'Search across all projects and tasks',
    keys: ['Ctrl', '/'],
    category: 'general'
  },
  {
    id: 'help_shortcuts',
    name: 'Help & Shortcuts',
    description: 'Show this help modal',
    keys: ['Ctrl', '?'],
    category: 'general'
  }
];

const CATEGORY_CONFIG = {
  navigation: {
    name: 'Navigation',
    icon: Navigation,
    color: 'bg-blue-100 text-blue-800'
  },
  projects: {
    name: 'Projects',
    icon: FolderOpen,
    color: 'bg-green-100 text-green-800'
  },
  tasks: {
    name: 'Tasks',
    icon: Hash,
    color: 'bg-purple-100 text-purple-800'
  },
  chat: {
    name: 'Chat',
    icon: MessageSquare,
    color: 'bg-orange-100 text-orange-800'
  },
  general: {
    name: 'General',
    icon: Command,
    color: 'bg-gray-100 text-gray-800'
  }
};

// Simple fuzzy search function
function fuzzySearch(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  if (textLower.includes(queryLower)) {
    return 1;
  }
  
  let score = 0;
  let queryIndex = 0;
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      score++;
      queryIndex++;
    }
  }
  
  return queryIndex === queryLower.length ? score / text.length : 0;
}

export default function ShortcutsHelpModal({ 
  isOpen, 
  onClose, 
  shortcuts = DEFAULT_SHORTCUTS 
}: ShortcutsHelpModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter shortcuts based on search query
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) {
      return shortcuts;
    }

    return shortcuts
      .map(shortcut => {
        const nameScore = fuzzySearch(searchQuery, shortcut.name);
        const descScore = fuzzySearch(searchQuery, shortcut.description);
        const keysScore = Math.max(...shortcut.keys.map(key => fuzzySearch(searchQuery, key)));
        
        const maxScore = Math.max(nameScore, descScore, keysScore);
        
        return { shortcut, score: maxScore };
      })
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(result => result.shortcut);
  }, [shortcuts, searchQuery]);

  // Group shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, ShortcutItem[]> = {};
    
    filteredShortcuts.forEach(shortcut => {
      if (!groups[shortcut.category]) {
        groups[shortcut.category] = [];
      }
      groups[shortcut.category].push(shortcut);
    });
    
    return groups;
  }, [filteredShortcuts]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[80vh] p-0 gap-0 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts..."
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto p-6">
          {Object.keys(groupedShortcuts).length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No shortcuts found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => {
                const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
                const Icon = config.icon;
                
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-4">
                      <Icon className="h-5 w-5" />
                      <h3 className="text-lg font-semibold">{config.name}</h3>
                      <Badge variant="outline" className={cn("text-xs", config.color)}>
                        {categoryShortcuts.length}
                      </Badge>
                    </div>
                    
                    <div className="grid gap-3">
                      {categoryShortcuts.map(shortcut => (
                        <div 
                          key={shortcut.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{shortcut.name}</div>
                            <div className="text-sm text-gray-600">{shortcut.description}</div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, index) => (
                              <React.Fragment key={index}>
                                <Badge variant="outline" className="font-mono text-xs px-2 py-1">
                                  {key}
                                </Badge>
                                {index < shortcut.keys.length - 1 && (
                                  <Plus className="h-3 w-3 text-gray-400" />
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 text-center">
          <p className="text-sm text-gray-600">
            Press <Badge variant="outline" className="mx-1">Esc</Badge> to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
