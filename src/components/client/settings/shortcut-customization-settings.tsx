'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Keyboard, 
  RotateCcw, 
  Save, 
  AlertTriangle, 
  CheckCircle,
  Search,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_SHORTCUTS } from '@/hooks/use-keyboard-shortcuts';
import { ShortcutsConfig } from '@/types/database';

interface ShortcutItem {
  id: string;
  description: string;
  category: string;
  defaultKey: string;
  currentKey: string;
  isCustom: boolean;
  isDisabled: boolean;
}

interface ShortcutConflict {
  key: string;
  shortcuts: string[];
}

interface ShortcutCustomizationSettingsProps {
  className?: string;
}

export default function ShortcutCustomizationSettings({ 
  className 
}: ShortcutCustomizationSettingsProps) {
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>([]);
  const [conflicts, setConflicts] = useState<ShortcutConflict[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [tempKey, setTempKey] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Load shortcuts configuration from API
  const loadShortcuts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/client/profile/shortcuts');
      
      if (!response.ok) {
        throw new Error('Failed to load shortcuts configuration');
      }

      const data = await response.json();
      const config: ShortcutsConfig = data.shortcuts;

      // Convert DEFAULT_SHORTCUTS to ShortcutItem format
      const shortcutItems: ShortcutItem[] = DEFAULT_SHORTCUTS.map(shortcut => ({
        id: shortcut.id,
        description: shortcut.description,
        category: shortcut.category,
        defaultKey: shortcut.defaultKey,
        currentKey: config.custom_shortcuts[shortcut.id] || shortcut.defaultKey,
        isCustom: !!config.custom_shortcuts[shortcut.id],
        isDisabled: config.disabled_shortcuts.includes(shortcut.id)
      }));

      setShortcuts(shortcutItems);
      detectConflicts(shortcutItems);
    } catch (error) {
      console.error('Error loading shortcuts:', error);
      toast.error('Erro ao carregar configurações de atalhos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Detect conflicts between shortcuts
  const detectConflicts = useCallback((shortcutItems: ShortcutItem[]) => {
    const keyMap = new Map<string, string[]>();
    
    shortcutItems
      .filter(s => !s.isDisabled)
      .forEach(shortcut => {
        const key = shortcut.currentKey.toLowerCase();
        if (!keyMap.has(key)) {
          keyMap.set(key, []);
        }
        keyMap.get(key)!.push(shortcut.id);
      });

    const conflictList: ShortcutConflict[] = [];
    keyMap.forEach((shortcuts, key) => {
      if (shortcuts.length > 1) {
        conflictList.push({ key, shortcuts });
      }
    });

    setConflicts(conflictList);
  }, []);

  // Initialize component
  useEffect(() => {
    loadShortcuts();
  }, [loadShortcuts]);

  // Filter shortcuts based on search term
  const filteredShortcuts = shortcuts.filter(shortcut =>
    shortcut.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shortcut.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shortcut.currentKey.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group shortcuts by category
  const groupedShortcuts = filteredShortcuts.reduce((groups, shortcut) => {
    const category = shortcut.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(shortcut);
    return groups;
  }, {} as Record<string, ShortcutItem[]>);

  // Category display names
  const categoryNames: Record<string, string> = {
    general: 'Geral',
    navigation: 'Navegação',
    projects: 'Projetos',
    tasks: 'Tarefas',
    chat: 'Chat'
  };

  // Handle shortcut key change
  const handleShortcutChange = useCallback((shortcutId: string, newKey: string) => {
    setShortcuts(prev => {
      const updated = prev.map(shortcut => {
        if (shortcut.id === shortcutId) {
          return {
            ...shortcut,
            currentKey: newKey,
            isCustom: newKey !== shortcut.defaultKey
          };
        }
        return shortcut;
      });
      
      detectConflicts(updated);
      setHasChanges(true);
      return updated;
    });
  }, [detectConflicts]);

  // Handle shortcut disable/enable
  const handleShortcutToggle = useCallback((shortcutId: string, disabled: boolean) => {
    setShortcuts(prev => {
      const updated = prev.map(shortcut => {
        if (shortcut.id === shortcutId) {
          return { ...shortcut, isDisabled: disabled };
        }
        return shortcut;
      });
      
      detectConflicts(updated);
      setHasChanges(true);
      return updated;
    });
  }, [detectConflicts]);

  // Reset shortcut to default
  const resetShortcut = useCallback((shortcutId: string) => {
    setShortcuts(prev => {
      const updated = prev.map(shortcut => {
        if (shortcut.id === shortcutId) {
          return {
            ...shortcut,
            currentKey: shortcut.defaultKey,
            isCustom: false,
            isDisabled: false
          };
        }
        return shortcut;
      });
      
      detectConflicts(updated);
      setHasChanges(true);
      return updated;
    });
  }, [detectConflicts]);

  // Reset all shortcuts to defaults
  const resetAllShortcuts = useCallback(() => {
    setShortcuts(prev => {
      const updated = prev.map(shortcut => ({
        ...shortcut,
        currentKey: shortcut.defaultKey,
        isCustom: false,
        isDisabled: false
      }));

      detectConflicts(updated);
      setHasChanges(true);
      return updated;
    });

    toast.success('Todos os atalhos foram restaurados para os padrões');
  }, [detectConflicts]);

  // Save shortcuts configuration
  const saveShortcuts = useCallback(async () => {
    if (conflicts.length > 0) {
      toast.error('Resolva os conflitos antes de salvar');
      return;
    }

    try {
      setIsSaving(true);

      // Build configuration object
      const config: ShortcutsConfig = {
        enabled: true,
        custom_shortcuts: {},
        disabled_shortcuts: []
      };

      shortcuts.forEach(shortcut => {
        if (shortcut.isCustom) {
          config.custom_shortcuts[shortcut.id] = shortcut.currentKey;
        }
        if (shortcut.isDisabled) {
          config.disabled_shortcuts.push(shortcut.id);
        }
      });

      const response = await fetch('/api/client/profile/shortcuts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to save shortcuts configuration');
      }

      setHasChanges(false);
      toast.success('Configurações de atalhos salvas com sucesso');

      // Reload to ensure consistency
      await loadShortcuts();
    } catch (error) {
      console.error('Error saving shortcuts:', error);
      toast.error('Erro ao salvar configurações de atalhos');
    } finally {
      setIsSaving(false);
    }
  }, [shortcuts, conflicts, loadShortcuts]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Personalização de Atalhos
          </CardTitle>
          <CardDescription>
            Carregando configurações...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          Personalização de Atalhos
        </CardTitle>
        <CardDescription>
          Personalize os atalhos de teclado para melhorar sua produtividade
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar atalhos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetAllShortcuts}
              disabled={isSaving}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar Padrões
            </Button>
          </div>
        </div>

        {/* Conflicts Alert */}
        {conflicts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Conflitos detectados:</strong> {conflicts.length} atalho(s) têm a mesma combinação de teclas.
              Resolva os conflitos antes de salvar.
            </AlertDescription>
          </Alert>
        )}

        {/* Changes Alert */}
        {hasChanges && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Você tem alterações não salvas. Clique em "Salvar Alterações" para aplicar.
            </AlertDescription>
          </Alert>
        )}

        {/* Shortcuts List */}
        <div className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-3">
                {categoryNames[category] || category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut) => {
                  const isConflicted = conflicts.some(conflict =>
                    conflict.shortcuts.includes(shortcut.id)
                  );

                  return (
                    <div
                      key={shortcut.id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        isConflicted ? 'border-destructive bg-destructive/5' : 'border-border'
                      } ${shortcut.isDisabled ? 'opacity-50' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{shortcut.description}</p>
                            {isConflicted && (
                              <p className="text-xs text-destructive mt-1">
                                Conflito: mesmo atalho usado por outros comandos
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Current Key Display/Editor */}
                            {editingShortcut === shortcut.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={tempKey}
                                  onChange={(e) => setTempKey(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleShortcutChange(shortcut.id, tempKey);
                                      setEditingShortcut(null);
                                      setTempKey('');
                                    } else if (e.key === 'Escape') {
                                      setEditingShortcut(null);
                                      setTempKey('');
                                    }
                                  }}
                                  placeholder="Ex: Ctrl+T"
                                  className="w-24 h-8 text-xs"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    handleShortcutChange(shortcut.id, tempKey);
                                    setEditingShortcut(null);
                                    setTempKey('');
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingShortcut(null);
                                    setTempKey('');
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingShortcut(shortcut.id);
                                  setTempKey(shortcut.currentKey);
                                }}
                                disabled={shortcut.isDisabled}
                                className="h-8 px-3 text-xs font-mono"
                              >
                                {shortcut.currentKey}
                              </Button>
                            )}

                            {/* Custom/Default Badge */}
                            {shortcut.isCustom && (
                              <Badge variant="secondary" className="text-xs">
                                Personalizado
                              </Badge>
                            )}

                            {/* Reset Button */}
                            {shortcut.isCustom && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resetShortcut(shortcut.id)}
                                className="h-8 w-8 p-0"
                                title="Restaurar padrão"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            )}

                            {/* Enable/Disable Toggle */}
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`toggle-${shortcut.id}`} className="text-xs">
                                {shortcut.isDisabled ? 'Desabilitado' : 'Ativo'}
                              </Label>
                              <Switch
                                id={`toggle-${shortcut.id}`}
                                checked={!shortcut.isDisabled}
                                onCheckedChange={(checked) =>
                                  handleShortcutToggle(shortcut.id, !checked)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        {hasChanges && (
          <>
            <Separator />
            <div className="flex justify-end">
              <Button
                onClick={saveShortcuts}
                disabled={isSaving || conflicts.length > 0}
                className="min-w-[120px]"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Empty State */}
        {filteredShortcuts.length === 0 && searchTerm && (
          <div className="text-center py-8">
            <Keyboard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Nenhum atalho encontrado para "{searchTerm}"
            </p>
            <Button
              variant="ghost"
              onClick={() => setSearchTerm('')}
              className="mt-2"
            >
              Limpar busca
            </Button>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Dicas:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Use combinações como "Ctrl+T", "Cmd+Shift+P", "Alt+F4"</li>
            <li>Evite atalhos já usados pelo navegador (Ctrl+R, Ctrl+W, etc.)</li>
            <li>Pressione Enter para confirmar ou Escape para cancelar a edição</li>
            <li>Desabilite atalhos que você não usa para evitar ativação acidental</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
