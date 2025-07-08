'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Grid, List } from 'lucide-react';
import { useUserPreferences, UserPreferences } from '@/hooks/use-user-preferences';

interface DashboardPreferencesProps {
  preferences: UserPreferences;
}

export default function DashboardPreferences({ preferences }: DashboardPreferencesProps) {
  const { updateSection } = useUserPreferences();

  const handleUpdate = async (updates: Partial<UserPreferences['dashboard']>) => {
    await updateSection('dashboard', updates);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações do Dashboard
          </CardTitle>
          <CardDescription>
            Personalize a visualização dos seus projetos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Visualização Padrão</Label>
            <Select
              value={preferences.dashboard.default_view}
              onValueChange={(value: 'grid' | 'list') => 
                handleUpdate({ default_view: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grade</SelectItem>
                <SelectItem value="list">Lista</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Mostrar Projetos Arquivados</Label>
              <p className="text-sm text-muted-foreground">
                Inclui projetos arquivados na listagem
              </p>
            </div>
            <Switch
              checked={preferences.dashboard.show_archived}
              onCheckedChange={(checked) => handleUpdate({ show_archived: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Estatísticas dos Projetos</Label>
              <p className="text-sm text-muted-foreground">
                Exibe contadores e métricas nos cards
              </p>
            </div>
            <Switch
              checked={preferences.dashboard.show_project_stats}
              onCheckedChange={(checked) => handleUpdate({ show_project_stats: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
