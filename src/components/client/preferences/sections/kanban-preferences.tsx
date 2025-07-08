'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layout, Grid, Eye, RefreshCw } from 'lucide-react';
import { useUserPreferences, UserPreferences } from '@/hooks/use-user-preferences';

interface KanbanPreferencesProps {
  preferences: UserPreferences;
}

export default function KanbanPreferences({ preferences }: KanbanPreferencesProps) {
  const { updateSection } = useUserPreferences();

  const handleUpdate = async (updates: Partial<UserPreferences['kanban']>) => {
    await updateSection('kanban', updates);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Layout do Kanban
          </CardTitle>
          <CardDescription>
            Configure a aparência e comportamento do quadro Kanban
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Largura das Colunas</Label>
            <Select
              value={preferences.kanban.column_width}
              onValueChange={(value: 'small' | 'medium' | 'large') => 
                handleUpdate({ column_width: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Pequena</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="large">Grande</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Estilo dos Cards</Label>
            <Select
              value={preferences.kanban.card_style}
              onValueChange={(value: 'compact' | 'detailed') => 
                handleUpdate({ card_style: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compacto</SelectItem>
                <SelectItem value="detailed">Detalhado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Grid className="h-4 w-4" />
              <div>
                <Label>Mostrar Contador de Tarefas</Label>
                <p className="text-sm text-muted-foreground">
                  Exibe o número de tarefas em cada coluna
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.kanban.show_task_count}
              onCheckedChange={(checked) => handleUpdate({ show_task_count: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <div>
                <Label>Atualização Automática</Label>
                <p className="text-sm text-muted-foreground">
                  Atualiza automaticamente quando há mudanças
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.kanban.auto_refresh}
              onCheckedChange={(checked) => handleUpdate({ auto_refresh: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <div>
                <Label>Mostrar Limites das Colunas</Label>
                <p className="text-sm text-muted-foreground">
                  Exibe indicadores de limite WIP nas colunas
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.kanban.show_column_limits}
              onCheckedChange={(checked) => handleUpdate({ show_column_limits: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
