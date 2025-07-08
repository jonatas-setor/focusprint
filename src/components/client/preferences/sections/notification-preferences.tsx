'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Mail, Globe } from 'lucide-react';
import { useUserPreferences, UserPreferences } from '@/hooks/use-user-preferences';

interface NotificationPreferencesProps {
  preferences: UserPreferences;
}

export default function NotificationPreferences({ preferences }: NotificationPreferencesProps) {
  const { updateSection } = useUserPreferences();

  const handleUpdate = async (updates: Partial<UserPreferences['notifications']>) => {
    await updateSection('notifications', updates);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Configurações de Notificações
          </CardTitle>
          <CardDescription>
            Controle como e quando receber alertas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <div>
                <Label>Notificações por Email</Label>
                <p className="text-sm text-muted-foreground">
                  Receba alertas importantes por email
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.notifications.email_enabled}
              onCheckedChange={(checked) => handleUpdate({ email_enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <div>
                <Label>Notificações do Navegador</Label>
                <p className="text-sm text-muted-foreground">
                  Receba notificações push no navegador
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.notifications.browser_enabled}
              onCheckedChange={(checked) => handleUpdate({ browser_enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Atualizações de Tarefas</Label>
              <p className="text-sm text-muted-foreground">
                Notifica sobre mudanças em tarefas
              </p>
            </div>
            <Switch
              checked={preferences.notifications.task_updates}
              onCheckedChange={(checked) => handleUpdate({ task_updates: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Mensagens do Chat</Label>
              <p className="text-sm text-muted-foreground">
                Notifica sobre novas mensagens
              </p>
            </div>
            <Switch
              checked={preferences.notifications.chat_messages}
              onCheckedChange={(checked) => handleUpdate({ chat_messages: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
