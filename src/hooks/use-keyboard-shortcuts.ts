'use client';

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { ShortcutsConfig } from '@/types/database';

export interface ShortcutAction {
  id: string;
  description: string;
  category: 'navigation' | 'tasks' | 'projects' | 'chat' | 'general';
  defaultKey: string;
  handler: () => void;
  context?: string; // Optional context where shortcut is active
  preventDefault?: boolean;
}

export interface ShortcutConflict {
  key: string;
  conflictingActions: ShortcutAction[];
}

export interface KeyboardShortcutsState {
  shortcuts: Map<string, ShortcutAction>; // Map by action ID, not key
  conflicts: ShortcutConflict[];
  enabled: boolean;
  customKeys: Record<string, string>;
}

// Default keyboard shortcuts for FocuSprint
export const DEFAULT_SHORTCUTS: ShortcutAction[] = [
  {
    id: 'new_task',
    description: 'Criar nova tarefa',
    category: 'tasks',
    defaultKey: 'Ctrl+T',
    handler: () => {}, // Will be overridden when registered
    preventDefault: true,
  },
  {
    id: 'focus_chat',
    description: 'Focar no chat',
    category: 'chat',
    defaultKey: 'Ctrl+M',
    handler: () => {},
    preventDefault: true,
  },
  {
    id: 'command_palette',
    description: 'Abrir paleta de comandos',
    category: 'general',
    defaultKey: 'Ctrl+K',
    handler: () => {},
    preventDefault: true,
  },
  {
    id: 'project_switcher',
    description: 'Alternar entre projetos',
    category: 'projects',
    defaultKey: 'Ctrl+P',
    handler: () => {},
    preventDefault: true,
  },
  {
    id: 'new_project',
    description: 'Criar novo projeto',
    category: 'projects',
    defaultKey: 'Ctrl+Shift+N',
    handler: () => {},
    preventDefault: true,
  },
  {
    id: 'search',
    description: 'Buscar globalmente',
    category: 'general',
    defaultKey: 'Ctrl+/',
    handler: () => {},
    preventDefault: true,
  },
  {
    id: 'help',
    description: 'Mostrar ajuda de atalhos',
    category: 'general',
    defaultKey: 'Ctrl+?',
    handler: () => {},
    preventDefault: true,
  },
];

// Utility function to normalize key combinations
function normalizeKey(key: string): string {
  return key
    .split('+')
    .map(part => part.trim())
    .map(part => {
      // Normalize modifier keys
      if (part.toLowerCase() === 'ctrl') return 'Ctrl';
      if (part.toLowerCase() === 'shift') return 'Shift';
      if (part.toLowerCase() === 'alt') return 'Alt';
      if (part.toLowerCase() === 'meta') return 'Meta';
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('+');
}

// Check if a keyboard event matches a key combination
function matchesKey(event: KeyboardEvent, keyCombo: string): boolean {
  const normalizedCombo = normalizeKey(keyCombo);
  const parts = normalizedCombo.split('+');
  
  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);
  
  // Check if the main key matches
  const keyMatches = event.key === key || 
                    event.code === key || 
                    event.key.toLowerCase() === key.toLowerCase();
  
  if (!keyMatches) return false;
  
  // Check modifiers
  const hasCtrl = modifiers.includes('Ctrl') ? event.ctrlKey : !event.ctrlKey;
  const hasShift = modifiers.includes('Shift') ? event.shiftKey : !event.shiftKey;
  const hasAlt = modifiers.includes('Alt') ? event.altKey : !event.altKey;
  const hasMeta = modifiers.includes('Meta') ? event.metaKey : !event.metaKey;
  
  return hasCtrl && hasShift && hasAlt && hasMeta;
}

// Detect conflicts between shortcuts
function detectConflicts(shortcuts: Map<string, ShortcutAction>): ShortcutConflict[] {
  const keyGroups = new Map<string, ShortcutAction[]>();

  // Group actions by their key combination
  for (const [actionId, action] of shortcuts) {
    const key = action.defaultKey;
    if (!keyGroups.has(key)) {
      keyGroups.set(key, []);
    }
    keyGroups.get(key)!.push(action);
  }

  const conflicts: ShortcutConflict[] = [];
  for (const [key, actions] of keyGroups) {
    if (actions.length > 1) {
      conflicts.push({
        key,
        conflictingActions: actions,
      });
    }
  }

  return conflicts;
}

export function useKeyboardShortcuts(config?: ShortcutsConfig) {
  const [state, setState] = useState<KeyboardShortcutsState>({
    shortcuts: new Map(),
    conflicts: [],
    enabled: config?.enabled ?? true,
    customKeys: config?.custom_shortcuts ?? {},
  });

  const handlersRef = useRef<Map<string, () => void>>(new Map());
  const stateRef = useRef(state);

  // Keep state ref updated
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  // Register a shortcut action
  const registerShortcut = useCallback((action: ShortcutAction) => {
    setState(prevState => {
      const newShortcuts = new Map(prevState.shortcuts);

      // Use custom key if available, otherwise use default
      const keyCombo = prevState.customKeys[action.id] || action.defaultKey;
      const normalizedKey = normalizeKey(keyCombo);

      // Store the handler
      handlersRef.current.set(action.id, action.handler);

      // Create action with normalized key
      const normalizedAction = {
        ...action,
        defaultKey: normalizedKey,
      };

      // Use action ID as key in the map
      newShortcuts.set(action.id, normalizedAction);

      // Check for conflicts
      const conflicts = detectConflicts(newShortcuts);

      return {
        ...prevState,
        shortcuts: newShortcuts,
        conflicts,
      };
    });
  }, []);
  
  // Unregister a shortcut
  const unregisterShortcut = useCallback((actionId: string) => {
    setState(prevState => {
      const newShortcuts = new Map(prevState.shortcuts);

      // Remove the shortcut by action ID
      newShortcuts.delete(actionId);
      handlersRef.current.delete(actionId);

      const conflicts = detectConflicts(newShortcuts);

      return {
        ...prevState,
        shortcuts: newShortcuts,
        conflicts,
      };
    });
  }, []);
  
  // Update custom key for a shortcut
  const updateShortcutKey = useCallback((actionId: string, newKey: string) => {
    setState(prevState => {
      const normalizedKey = normalizeKey(newKey);
      const newCustomKeys = {
        ...prevState.customKeys,
        [actionId]: normalizedKey,
      };

      // Update the specific shortcut with new key
      const newShortcuts = new Map(prevState.shortcuts);
      const existingAction = newShortcuts.get(actionId);

      if (existingAction) {
        newShortcuts.set(actionId, {
          ...existingAction,
          defaultKey: normalizedKey,
        });
      }

      const conflicts = detectConflicts(newShortcuts);

      return {
        ...prevState,
        shortcuts: newShortcuts,
        customKeys: newCustomKeys,
        conflicts,
      };
    });
  }, []);

  // Global keyboard event handler - use ref to avoid recreating on every state change
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const currentState = stateRef.current;
    if (!currentState.enabled) return;

    // Skip if user is typing in an input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true') {
      return;
    }

    // Find matching shortcut
    for (const [actionId, action] of currentState.shortcuts) {
      if (matchesKey(event, action.defaultKey)) {
        const handler = handlersRef.current.get(action.id);
        if (handler) {
          if (action.preventDefault) {
            event.preventDefault();
            event.stopPropagation();
          }

          try {
            handler();
          } catch (error) {
            console.error(`🎹 [SHORTCUTS] Error executing shortcut ${action.id}:`, error);
          }
        }
        break;
      }
    }
  }, []);
  
  // Set up global event listener
  useEffect(() => {
    if (state.enabled) {
      document.addEventListener('keydown', handleKeyDown, { capture: true });
      return () => {
        document.removeEventListener('keydown', handleKeyDown, { capture: true });
      };
    }
  }, [handleKeyDown, state.enabled]);
  
  // Enable/disable shortcuts
  const setEnabled = useCallback((enabled: boolean) => {
    setState(prevState => ({
      ...prevState,
      enabled,
    }));
  }, []);
  
  return useMemo(() => ({
    shortcuts: Array.from(state.shortcuts.values()),
    conflicts: state.conflicts,
    enabled: state.enabled,
    customKeys: state.customKeys,
    registerShortcut,
    unregisterShortcut,
    updateShortcutKey,
    setEnabled,
  }), [
    state.shortcuts,
    state.conflicts,
    state.enabled,
    state.customKeys,
    registerShortcut,
    unregisterShortcut,
    updateShortcutKey,
    setEnabled,
  ]);
}
