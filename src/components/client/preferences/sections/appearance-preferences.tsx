'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Palette,
  Type,
  Minimize2,
  Eye,
  Zap
} from 'lucide-react';
import { useUserPreferences, UserPreferences } from '@/hooks/use-user-preferences';
import { toast } from 'sonner';

interface AppearancePreferencesProps {
  preferences: UserPreferences;
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
] as const;

const COLOR_SCHEMES = [
  { value: 'blue', label: 'Azul', color: 'bg-blue-500' },
  { value: 'green', label: 'Verde', color: 'bg-green-500' },
  { value: 'purple', label: 'Roxo', color: 'bg-purple-500' },
  { value: 'orange', label: 'Laranja', color: 'bg-orange-500' },
  { value: 'red', label: 'Vermelho', color: 'bg-red-500' },
] as const;

const FONT_SIZES = [
  { value: 'small', label: 'Pequeno' },
  { value: 'medium', label: 'Médio' },
  { value: 'large', label: 'Grande' },
] as const;

export default function AppearancePreferences({ preferences }: AppearancePreferencesProps) {
  const { updateSection } = useUserPreferences();
  const [isUpdating, setIsUpdating] = useState(false);

  console.log('🎨 [APPEARANCE PREFERENCES] Component rendered:', {
    currentTheme: preferences.appearance.theme,
    colorScheme: preferences.appearance.color_scheme,
    fontSize: preferences.appearance.font_size
  });

  const handleUpdate = async (updates: Partial<UserPreferences['appearance']>) => {
    console.log('📝 [APPEARANCE PREFERENCES] Updating appearance:', updates);
    setIsUpdating(true);
    
    try {
      await updateSection('appearance', updates);
    } catch (err) {
      console.error('❌ [APPEARANCE PREFERENCES] Error updating appearance:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleThemeChange = (theme: UserPreferences['appearance']['theme']) => {
    handleUpdate({ theme });
  };

  const handleColorSchemeChange = (color_scheme: UserPreferences['appearance']['color_scheme']) => {
    handleUpdate({ color_scheme });
  };

  const handleFontSizeChange = (font_size: UserPreferences['appearance']['font_size']) => {
    handleUpdate({ font_size });
  };

  const handleToggleChange = (key: keyof UserPreferences['appearance'], value: boolean) => {
    handleUpdate({ [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Tema
          </CardTitle>
          <CardDescription>
            Escolha entre tema claro, escuro ou automático baseado no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = preferences.appearance.theme === option.value;
              
              return (
                <Button
                  key={option.value}
                  variant={isSelected ? "default" : "outline"}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => handleThemeChange(option.value)}
                  disabled={isUpdating}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm">{option.label}</span>
                  {isSelected && (
                    <Badge variant="secondary" className="text-xs">
                      Ativo
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Color Scheme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Esquema de Cores
          </CardTitle>
          <CardDescription>
            Personalize as cores principais da interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {COLOR_SCHEMES.map((scheme) => {
              const isSelected = preferences.appearance.color_scheme === scheme.value;
              
              return (
                <Button
                  key={scheme.value}
                  variant={isSelected ? "default" : "outline"}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => handleColorSchemeChange(scheme.value)}
                  disabled={isUpdating}
                >
                  <div className={`w-6 h-6 rounded-full ${scheme.color}`} />
                  <span className="text-xs">{scheme.label}</span>
                  {isSelected && (
                    <Badge variant="secondary" className="text-xs">
                      Ativo
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Font Size */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Type className="h-4 w-4" />
            Tamanho da Fonte
          </CardTitle>
          <CardDescription>
            Ajuste o tamanho do texto para melhor legibilidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={preferences.appearance.font_size}
            onValueChange={handleFontSizeChange}
            disabled={isUpdating}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((size) => (
                <SelectItem key={size.value} value={size.value}>
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Interface Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opções da Interface</CardTitle>
          <CardDescription>
            Configure comportamentos visuais e de interação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Minimize2 className="h-4 w-4" />
              <div>
                <Label htmlFor="compact-mode">Modo Compacto</Label>
                <p className="text-sm text-muted-foreground">
                  Reduz espaçamentos para mostrar mais conteúdo
                </p>
              </div>
            </div>
            <Switch
              id="compact-mode"
              checked={preferences.appearance.compact_mode}
              onCheckedChange={(checked) => handleToggleChange('compact_mode', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Minimize2 className="h-4 w-4" />
              <div>
                <Label htmlFor="sidebar-collapsed">Sidebar Recolhida</Label>
                <p className="text-sm text-muted-foreground">
                  Mantém a barra lateral recolhida por padrão
                </p>
              </div>
            </div>
            <Switch
              id="sidebar-collapsed"
              checked={preferences.appearance.sidebar_collapsed}
              onCheckedChange={(checked) => handleToggleChange('sidebar_collapsed', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <div>
                <Label htmlFor="high-contrast">Alto Contraste</Label>
                <p className="text-sm text-muted-foreground">
                  Aumenta o contraste para melhor acessibilidade
                </p>
              </div>
            </div>
            <Switch
              id="high-contrast"
              checked={preferences.appearance.high_contrast}
              onCheckedChange={(checked) => handleToggleChange('high_contrast', checked)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <div>
                <Label htmlFor="reduce-animations">Reduzir Animações</Label>
                <p className="text-sm text-muted-foreground">
                  Diminui animações para melhor performance
                </p>
              </div>
            </div>
            <Switch
              id="reduce-animations"
              checked={preferences.appearance.reduce_animations}
              onCheckedChange={(checked) => handleToggleChange('reduce_animations', checked)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
