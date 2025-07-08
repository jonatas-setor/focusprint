'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Palette, 
  Bell, 
  Layout, 
  MessageSquare, 
  Workflow,
  Smartphone,
  RotateCcw,
  Save,
  Loader2
} from 'lucide-react';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { toast } from 'sonner';

// Import preference section components
import AppearancePreferences from './sections/appearance-preferences';
import KanbanPreferences from './sections/kanban-preferences';
import ChatPreferences from './sections/chat-preferences';
import DashboardPreferences from './sections/dashboard-preferences';
import NotificationPreferences from './sections/notification-preferences';
import WorkflowPreferences from './sections/workflow-preferences';
import MobilePreferences from './sections/mobile-preferences';

interface UserPreferencesPanelProps {
  className?: string;
}

const PREFERENCE_SECTIONS = [
  {
    id: 'appearance',
    label: 'Aparência',
    description: 'Tema, cores e layout visual',
    icon: Palette,
    component: AppearancePreferences,
  },
  {
    id: 'kanban',
    label: 'Kanban',
    description: 'Configurações do quadro Kanban',
    icon: Layout,
    component: KanbanPreferences,
  },
  {
    id: 'chat',
    label: 'Chat',
    description: 'Configurações de mensagens',
    icon: MessageSquare,
    component: ChatPreferences,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Visualização de projetos',
    icon: Settings,
    component: DashboardPreferences,
  },
  {
    id: 'notifications',
    label: 'Notificações',
    description: 'Alertas e avisos',
    icon: Bell,
    component: NotificationPreferences,
  },
  {
    id: 'workflow',
    label: 'Fluxo de Trabalho',
    description: 'Automações e padrões',
    icon: Workflow,
    component: WorkflowPreferences,
  },
  {
    id: 'mobile',
    label: 'Mobile',
    description: 'Configurações para dispositivos móveis',
    icon: Smartphone,
    component: MobilePreferences,
  },
] as const;

export default function UserPreferencesPanel({ className }: UserPreferencesPanelProps) {
  const { preferences, loading, error, resetToDefaults } = useUserPreferences();
  const [activeTab, setActiveTab] = useState('appearance');
  const [isResetting, setIsResetting] = useState(false);

  console.log('🎨 [USER PREFERENCES PANEL] Component rendered:', {
    loading,
    hasPreferences: !!preferences,
    activeTab,
    error
  });

  const handleResetToDefaults = async () => {
    console.log('🔄 [USER PREFERENCES PANEL] Resetting to defaults...');
    setIsResetting(true);
    
    try {
      const success = await resetToDefaults();
      if (success) {
        toast.success('Todas as preferências foram restauradas para os padrões');
      }
    } catch (err) {
      console.error('❌ [USER PREFERENCES PANEL] Error resetting preferences:', err);
      toast.error('Erro ao restaurar preferências');
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Carregando preferências...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-destructive mb-4">Erro ao carregar preferências</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Nenhuma preferência encontrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Preferências do Usuário
              </CardTitle>
              <CardDescription>
                Personalize sua experiência no FocuSprint
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToDefaults}
              disabled={isResetting}
              className="flex items-center gap-2"
            >
              {isResetting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Restaurar Padrões
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
              {PREFERENCE_SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <TabsTrigger
                    key={section.id}
                    value={section.id}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{section.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {PREFERENCE_SECTIONS.map((section) => {
              const Component = section.component;
              return (
                <TabsContent key={section.id} value={section.id} className="mt-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <section.icon className="h-5 w-5" />
                        {section.label}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                    <Separator />
                    <Component preferences={preferences} />
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
