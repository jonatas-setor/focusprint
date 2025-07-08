'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Workflow, Clock, Calendar } from 'lucide-react';
import { useUserPreferences, UserPreferences } from '@/hooks/use-user-preferences';

interface WorkflowPreferencesProps {
  preferences: UserPreferences;
}

export default function WorkflowPreferences({ preferences }: WorkflowPreferencesProps) {
  const { updateSection } = useUserPreferences();

  const handleUpdate = async (updates: Partial<UserPreferences['workflow']>) => {
    await updateSection('workflow', updates);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Configurações de Fluxo de Trabalho
          </CardTitle>
          <CardDescription>
            Automatize e personalize seu processo de trabalho
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Prioridade Padrão das Tarefas</Label>
            <Select
              value={preferences.workflow.default_task_priority}
              onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                handleUpdate({ default_task_priority: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Formato de Hora</Label>
            <Select
              value={preferences.workflow.preferred_time_format}
              onValueChange={(value: '12h' | '24h') => 
                handleUpdate({ preferred_time_format: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12 horas (AM/PM)</SelectItem>
                <SelectItem value="24h">24 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Mostrar Tarefas Concluídas</Label>
              <p className="text-sm text-muted-foreground">
                Exibe tarefas finalizadas no Kanban
              </p>
            </div>
            <Switch
              checked={preferences.workflow.show_completed_tasks}
              onCheckedChange={(checked) => handleUpdate({ show_completed_tasks: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
