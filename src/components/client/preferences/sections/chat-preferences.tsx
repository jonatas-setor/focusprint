'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MessageSquare, Volume2, Eye, Scroll } from 'lucide-react';
import { useUserPreferences, UserPreferences } from '@/hooks/use-user-preferences';

interface ChatPreferencesProps {
  preferences: UserPreferences;
}

export default function ChatPreferences({ preferences }: ChatPreferencesProps) {
  const { updateSection } = useUserPreferences();

  const handleUpdate = async (updates: Partial<UserPreferences['chat']>) => {
    await updateSection('chat', updates);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Configurações do Chat
          </CardTitle>
          <CardDescription>
            Personalize a experiência de mensagens em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              <div>
                <Label>Som de Notificação</Label>
                <p className="text-sm text-muted-foreground">
                  Reproduz som ao receber mensagens
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.chat.notification_sound}
              onCheckedChange={(checked) => handleUpdate({ notification_sound: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <div>
                <Label>Indicador de Digitação</Label>
                <p className="text-sm text-muted-foreground">
                  Mostra quando alguém está digitando
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.chat.show_typing_indicator}
              onCheckedChange={(checked) => handleUpdate({ show_typing_indicator: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scroll className="h-4 w-4" />
              <div>
                <Label>Rolagem Automática</Label>
                <p className="text-sm text-muted-foreground">
                  Rola automaticamente para novas mensagens
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.chat.auto_scroll}
              onCheckedChange={(checked) => handleUpdate({ auto_scroll: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <div>
                <Label>Pré-visualização de Mensagens</Label>
                <p className="text-sm text-muted-foreground">
                  Mostra prévia do conteúdo das mensagens
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.chat.message_preview}
              onCheckedChange={(checked) => handleUpdate({ message_preview: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
