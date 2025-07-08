'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users,
  FolderOpen,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  Activity,
  Plus,
  ArrowUpRight,
  Zap,
  Target,
  BarChart3,
  Crown,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { DashboardService, DashboardStats, QuickAction } from '@/lib/services/dashboard-service';
import { ClientProfile } from '@/lib/auth/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ClientDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock profile for testing - in real app this would come from auth context
  const profile: ClientProfile = {
    id: '1',
    user_id: '1',
    client_id: '1',
    role: 'owner',
    first_name: 'João',
    last_name: 'Silva',
    is_active: true,
    client: {
      id: '1',
      name: 'Acme Corporation',
      plan_type: 'pro',
      status: 'active',
      max_users: 15,
      max_projects: 10,
    }
  };

  // Load dashboard data
  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        setError(null);

        const [dashboardStats, actions] = await Promise.all([
          DashboardService.getDashboardStats(),
          DashboardService.getQuickActions()
        ]);

        setStats(dashboardStats);
        setQuickActions(actions);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Falha ao carregar dados do dashboard');
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">Erro ao carregar dashboard</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Zap className="h-8 w-8 text-primary" />
              Bem-vindo, {profile.first_name}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Aqui está um resumo das atividades da {profile.client.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-medium",
                profile.client.plan_type === 'pro' && "border-amber-200 bg-amber-50 text-amber-700",
                profile.client.plan_type === 'basic' && "border-blue-200 bg-blue-50 text-blue-700"
              )}
            >
              <Crown className="h-3 w-3 mr-1" />
              {profile.client.plan_type.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Teams Card */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Times Ativos</CardTitle>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Users className="h-4 w-4 text-blue-500 cursor-help" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Times da Organização</h4>
                    <p className="text-xs text-muted-foreground">
                      Times ativos representam grupos de trabalho organizados para colaboração em projetos.
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats?.teams.active || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.teams.total === 0
                      ? 'Nenhum time criado ainda'
                      : `${stats?.teams.total} total`
                    }
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Projects Card */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <FolderOpen className="h-4 w-4 text-green-500 cursor-help" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Projetos em Andamento</h4>
                    <p className="text-xs text-muted-foreground">
                      Projetos ativos são aqueles em desenvolvimento ativo com tarefas sendo executadas.
                    </p>
                    {stats && (
                      <div className="text-xs space-y-1">
                        <div>• Ativos: {stats.projects.active}</div>
                        <div>• Concluídos: {stats.projects.completed}</div>
                        <div>• Arquivados: {stats.projects.archived}</div>
                      </div>
                    )}
                  </div>
                </HoverCardContent>
              </HoverCard>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600">
                    {stats?.projects.active || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.projects.total === 0
                      ? 'Nenhum projeto criado ainda'
                      : `${stats?.projects.total} total`
                    }
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tasks Card */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Clock className="h-4 w-4 text-orange-500 cursor-help" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Status das Tarefas</h4>
                    <p className="text-xs text-muted-foreground">
                      Tarefas pendentes incluem itens "A Fazer" e "Em Progresso".
                    </p>
                    {stats && (
                      <div className="text-xs space-y-1">
                        <div>• A Fazer: {stats.tasks.pending}</div>
                        <div>• Em Progresso: {stats.tasks.in_progress}</div>
                        <div>• Concluídas: {stats.tasks.completed}</div>
                      </div>
                    )}
                  </div>
                </HoverCardContent>
              </HoverCard>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-orange-600">
                    {(stats?.tasks.pending || 0) + (stats?.tasks.in_progress || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.tasks.total === 0
                      ? 'Nenhuma tarefa criada ainda'
                      : `${stats?.tasks.total} total`
                    }
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Completed Today Card */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídas Hoje</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-emerald-600">
                    {stats?.tasks.completed_today || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.tasks.completed_today === 0
                      ? 'Nenhuma tarefa concluída hoje'
                      : 'Parabéns pela produtividade!'
                    }
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Activity */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Atividade Recente
                  </CardTitle>
                  <CardDescription>
                    Últimas atividades da sua organização
                  </CardDescription>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/dashboard/projects">
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ver todos os projetos</TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats?.activity.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Nenhuma atividade recente
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Crie seu primeiro time ou projeto para começar
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {stats?.activity.map((activity, index) => (
                      <div key={activity.id} className="flex items-start space-x-3 group">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            {activity.type === 'project_created' && <FolderOpen className="h-4 w-4 text-primary" />}
                            {activity.type === 'task_completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            {activity.type === 'team_created' && <Users className="h-4 w-4 text-blue-500" />}
                            {activity.type === 'user_joined' && <TrendingUp className="h-4 w-4 text-purple-500" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            {activity.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.timestamp).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Primeiros Passos
                  </CardTitle>
                  <CardDescription>
                    Configure sua organização para começar
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {quickActions.filter(a => a.completed).length}/{quickActions.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-5 w-5 rounded" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                quickActions.map((action) => {
                  const IconComponent = action.icon === 'Users' ? Users :
                                      action.icon === 'FolderOpen' ? FolderOpen :
                                      TrendingUp;

                  return (
                    <div
                      key={action.id}
                      className={cn(
                        "group relative overflow-hidden rounded-lg border transition-all duration-200",
                        action.completed
                          ? "bg-green-50 border-green-200 hover:bg-green-100"
                          : "hover:bg-accent hover:shadow-sm"
                      )}
                    >
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                            action.completed
                              ? "bg-green-100 text-green-600"
                              : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                          )}>
                            {action.completed ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <IconComponent className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className={cn(
                              "font-medium transition-colors",
                              action.completed && "text-green-700"
                            )}>
                              {action.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {action.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {action.completed ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                              Concluído
                            </Badge>
                          ) : (
                            <>
                              <Badge
                                variant="outline"
                                className={cn(
                                  action.priority === 'high' && "border-red-200 text-red-700",
                                  action.priority === 'medium' && "border-orange-200 text-orange-700",
                                  action.priority === 'low' && "border-blue-200 text-blue-700"
                                )}
                              >
                                {action.priority === 'high' ? 'Alta' :
                                 action.priority === 'medium' ? 'Média' : 'Baixa'}
                              </Badge>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    asChild
                                  >
                                    <Link href={action.href}>
                                      <ArrowUpRight className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Começar agora</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Plan Information */}
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Informações do Plano
                </CardTitle>
                <CardDescription>
                  Detalhes do seu plano atual e uso de recursos
                </CardDescription>
              </div>
              <Crown className="h-6 w-6 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Plan Type */}
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                <Badge
                  variant="outline"
                  className={cn(
                    "mb-3 text-sm font-semibold",
                    profile.client.plan_type === 'pro' && "border-amber-200 bg-amber-50 text-amber-700",
                    profile.client.plan_type === 'basic' && "border-blue-200 bg-blue-50 text-blue-700"
                  )}
                >
                  {profile.client.plan_type.toUpperCase()}
                </Badge>
                <p className="text-sm font-medium text-muted-foreground">Plano Atual</p>
              </div>

              {/* Users Usage */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-center mb-3">
                  <p className="text-2xl font-bold">
                    {stats?.teams.active || 0}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{profile.client.max_users}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">Usuários Ativos</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Uso atual</span>
                    <span>{Math.round(((stats?.teams.active || 0) / profile.client.max_users) * 100)}%</span>
                  </div>
                  <Progress
                    value={((stats?.teams.active || 0) / profile.client.max_users) * 100}
                    className="h-2"
                  />
                </div>
              </div>

              {/* Projects Usage */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-center mb-3">
                  <p className="text-2xl font-bold">
                    {stats?.projects.total || 0}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{profile.client.max_projects}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">Projetos Criados</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Uso atual</span>
                    <span>{Math.round(((stats?.projects.total || 0) / profile.client.max_projects) * 100)}%</span>
                  </div>
                  <Progress
                    value={((stats?.projects.total || 0) / profile.client.max_projects) * 100}
                    className="h-2"
                  />
                </div>
              </div>
            </div>

            {/* Additional Plan Details */}
            <Separator className="my-6" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Recursos Inclusos
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                  <li>• Kanban boards ilimitados</li>
                  <li>• Chat em tempo real</li>
                  <li>• Videochamadas integradas</li>
                  <li>• Templates personalizados</li>
                  <li>• Relatórios e métricas</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Status da Conta
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Status:</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      {profile.client.status === 'active' ? 'Ativo' : profile.client.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Próxima cobrança:</span>
                    <span className="text-muted-foreground">
                      {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
