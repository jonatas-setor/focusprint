'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  MessageSquare, 
  FolderOpen, 
  Settings, 
  Users, 
  Calendar,
  Hash,
  ArrowRight,
  Command
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CommandAction {
  id: string;
  title: string;
  description?: string;
  category: 'projects' | 'tasks' | 'navigation' | 'chat' | 'general';
  icon?: string | React.ReactNode; // Can be icon name string or React element
  shortcut?: string;
  handler: () => void;
  keywords?: string[]; // Additional search keywords
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions: CommandAction[];
  placeholder?: string;
}

// Icon mapping for string-based icons
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Home: () => <Search className="h-4 w-4" />, // Temporary fallback
  FolderOpen: () => <FolderOpen className="h-4 w-4" />,
  Users: () => <Users className="h-4 w-4" />,
  Settings: () => <Settings className="h-4 w-4" />,
  Plus: () => <Plus className="h-4 w-4" />,
  Search: () => <Search className="h-4 w-4" />,
  MessageSquare: () => <MessageSquare className="h-4 w-4" />,
  HelpCircle: () => <Search className="h-4 w-4" />, // Temporary fallback
  Hash: () => <Hash className="h-4 w-4" />,
  Calendar: () => <Calendar className="h-4 w-4" />,
};

// Function to render icon from string or React element
const renderIcon = (icon?: string | React.ReactNode) => {
  if (!icon) return null;
  if (typeof icon === 'string') {
    const IconComponent = ICON_MAP[icon];
    return IconComponent ? <IconComponent /> : null;
  }
  return icon;
};

// Category icons and labels
const CATEGORY_CONFIG = {
  projects: { icon: FolderOpen, label: 'Projetos', color: 'bg-blue-100 text-blue-800' },
  tasks: { icon: Hash, label: 'Tarefas', color: 'bg-green-100 text-green-800' },
  navigation: { icon: ArrowRight, label: 'Navegação', color: 'bg-purple-100 text-purple-800' },
  chat: { icon: MessageSquare, label: 'Chat', color: 'bg-orange-100 text-orange-800' },
  general: { icon: Command, label: 'Geral', color: 'bg-gray-100 text-gray-800' },
};

// Fuzzy search implementation
function fuzzySearch(query: string, text: string): number {
  if (!query) return 1;
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match gets highest score
  if (textLower.includes(queryLower)) {
    return 1;
  }
  
  // Fuzzy matching
  let score = 0;
  let queryIndex = 0;
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      score++;
      queryIndex++;
    }
  }
  
  return queryIndex === queryLower.length ? score / textLower.length : 0;
}

function CommandPalette({ isOpen, onClose, actions, placeholder = "Digite um comando..." }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Filter and sort actions based on search query
  const filteredActions = useMemo(() => {
    if (!query.trim()) {
      return actions;
    }
    
    const results = actions
      .map(action => {
        // Search in title, description, and keywords
        const titleScore = fuzzySearch(query, action.title);
        const descScore = action.description ? fuzzySearch(query, action.description) : 0;
        const keywordScore = action.keywords ? 
          Math.max(...action.keywords.map(keyword => fuzzySearch(query, keyword))) : 0;
        
        const maxScore = Math.max(titleScore, descScore, keywordScore);
        
        return {
          action,
          score: maxScore,
        };
      })
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(result => result.action);
    
    return results;
  }, [actions, query]);
  
  // Group actions by category
  const groupedActions = useMemo(() => {
    const groups: Record<string, CommandAction[]> = {};
    
    filteredActions.forEach(action => {
      if (!groups[action.category]) {
        groups[action.category] = [];
      }
      groups[action.category].push(action);
    });
    
    return groups;
  }, [filteredActions]);
  
  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);
  
  // Update selected index when filtered actions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredActions]);
  
  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredActions.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredActions.length - 1
        );
        break;
        
      case 'Enter':
        event.preventDefault();
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].handler();
          onClose();
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
    }
  }, [filteredActions, selectedIndex, onClose]);
  
  // Execute action
  const executeAction = useCallback((action: CommandAction) => {
    action.handler();
    onClose();
  }, [onClose]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Search Input */}
        <div className="flex items-center border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground mr-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
          <Badge variant="outline" className="ml-2 text-xs">
            ESC
          </Badge>
        </div>
        
        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {filteredActions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum comando encontrado</p>
              <p className="text-sm">Tente uma busca diferente</p>
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(groupedActions).map(([category, categoryActions]) => {
                const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
                const Icon = config.icon;
                
                return (
                  <div key={category} className="mb-4 last:mb-0">
                    {/* Category Header */}
                    <div className="flex items-center gap-2 px-2 py-1 mb-1">
                      <Icon className="h-3 w-3" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {config.label}
                      </span>
                    </div>
                    
                    {/* Category Actions */}
                    <div className="space-y-1">
                      {categoryActions.map((action, actionIndex) => {
                        const globalIndex = filteredActions.indexOf(action);
                        const isSelected = globalIndex === selectedIndex;
                        
                        return (
                          <div
                            key={action.id}
                            className={cn(
                              "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors",
                              isSelected 
                                ? "bg-accent text-accent-foreground" 
                                : "hover:bg-accent/50"
                            )}
                            onClick={() => executeAction(action)}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {action.icon && (
                                <div className="flex-shrink-0">
                                  {action.icon}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {action.title}
                                </div>
                                {action.description && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {action.description}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {action.shortcut && (
                              <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                                {action.shortcut}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t px-4 py-2 text-xs text-muted-foreground bg-muted/30">
          <div className="flex items-center justify-between">
            <span>Use ↑↓ para navegar, Enter para executar</span>
            <span>{filteredActions.length} comando(s)</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CommandPalette;
