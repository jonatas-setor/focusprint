'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Smartphone, Vibrate, RotateCcw, Hand } from 'lucide-react';
import { useUserPreferences, UserPreferences } from '@/hooks/use-user-preferences';

interface MobilePreferencesProps {
  preferences: UserPreferences;
}

export default function MobilePreferences({ preferences }: MobilePreferencesProps) {
  const { updateSection } = useUserPreferences();

  const handleUpdate = async (updates: Partial<UserPreferences['mobile']>) => {
    await updateSection('mobile', updates);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Configurações Mobile
          </CardTitle>
          <CardDescription>
            Otimize a experiência em dispositivos móveis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Sensibilidade do Toque</Label>
            <Select
              value={preferences.mobile.touch_sensitivity}
              onValueChange={(value: 'low' | 'medium' | 'high') => 
                handleUpdate({ touch_sensitivity: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hand className="h-4 w-4" />
              <div>
                <Label>Gestos de Deslizar</Label>
                <p className="text-sm text-muted-foreground">
                  Permite navegar deslizando entre abas
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.mobile.swipe_gestures}
              onCheckedChange={(checked) => handleUpdate({ swipe_gestures: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Vibrate className="h-4 w-4" />
              <div>
                <Label>Feedback Tátil</Label>
                <p className="text-sm text-muted-foreground">
                  Vibração ao tocar em elementos
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.mobile.haptic_feedback}
              onCheckedChange={(checked) => handleUpdate({ haptic_feedback: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              <div>
                <Label>Rotação Automática</Label>
                <p className="text-sm text-muted-foreground">
                  Permite rotação da tela automaticamente
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.mobile.auto_rotate}
              onCheckedChange={(checked) => handleUpdate({ auto_rotate: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
