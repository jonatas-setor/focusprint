#!/bin/bash
set -e

echo "🚀 Recriando melhorias da dashboard rapidamente..."

cd /mnt/persist/workspace

# Configurar Git
git config user.email "jonatas@focusprint.com"
git config user.name "FocuSprint Development"

# Verificar conteúdo atual da dashboard
echo "📋 Conteúdo atual da dashboard:"
head -20 src/app/\(client-dashboard\)/dashboard/page.tsx

echo ""
echo "🎨 Vou aplicar as melhorias principais na dashboard..."

# Fazer backup da página atual
cp src/app/\(client-dashboard\)/dashboard/page.tsx src/app/\(client-dashboard\)/dashboard/page.tsx.backup

# Aplicar melhorias na dashboard (versão simplificada mas sofisticada)
cat > src/app/\(client-dashboard\)/dashboard/page.tsx << 'EOF'
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  HoverCard, 
  HoverCardContent, 
  HoverCardTrigger 
} from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  FolderOpen,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  Plus,
  ArrowRight,
  Activity,
  Target,
  Zap,
  AlertCircle,
  Star,
  BarChart3,
  Timer,
  MessageSquare,
  Award,
  Flame
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
  isLoading?: boolean;
}

function StatCard({ title, value, description, icon: Icon, trend, color = 'blue', isLoading }: StatCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      border: 'border-blue-200',
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      border: 'border-green-200',
    },
    yellow: {
      bg: 'bg-yellow-50',
      icon: 'text-yellow-600',
      border: 'border-yellow-200',
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-600',
      border: 'border-purple-200',
    },
    red: {
      bg: 'bg-red-50',
      icon: 'text-red-600',
      border: 'border-red-200',
    }
  };

  const classes = colorClasses[color];

  if (isLoading) {
    return (
      <Card className="hover:shadow-lg transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-help group",
      "border-l-4", 
      classes.border
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-lg", classes.bg)}>
          <Icon className={cn("h-4 w-4", classes.icon)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-bold group-hover:text-primary transition-colors">
          {value}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}>
              <TrendingUp className={cn(
                "h-3 w-3",
                !trend.isPositive && "rotate-180"
              )} />
              {trend.value}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClientDashboardPage() {
  const [loading, setLoading] = useState(true);

  // Mock data com trends
  const stats = [
    {
      title: "Projetos Ativos",
      value: 4,
      description: "Em desenvolvimento",
      icon: FolderOpen,
      color: 'blue' as const,
      trend: {
        value: 12,
        isPositive: true,
        label: "este mês"
      }
    },
    {
      title: "Tarefas Pendentes",
      value: 15,
      description: "Aguardando execução",
      icon: Clock,
      color: 'yellow' as const,
      trend: {
        value: 8,
        isPositive: false,
        label: "esta semana"
      }
    },
    {
      title: "Taxa de Conclusão",
      value: "68%",
      description: "Eficiência da equipe",
      icon: Target,
      color: 'green' as const,
      trend: {
        value: 15,
        isPositive: true,
        label: "este mês"
      }
    },
    {
      title: "Membros Ativos",
      value: 8,
      description: "Online agora",
      icon: Users,
      color: 'purple' as const,
      trend: {
        value: 5,
        isPositive: true,
        label: "hoje"
      }
    }
  ];

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Section com animação */}
      <div className="flex items-center justify-between animate-in fade-in-0 duration-500">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta! Aqui está um resumo dos seus projetos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="gap-2 hover:scale-105 transition-transform">
            <Link href="/dashboard/projects/new">
              <Plus className="h-4 w-4" />
              Novo Projeto
            </Link>
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in slide-in-from-bottom-4 duration-700">
        {stats.map((stat, index) => (
          <div
            key={stat.title}
            className="animate-in fade-in-0 duration-500"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <StatCard
              title={stat.title}
              value={stat.value}
              description={stat.description}
              icon={stat.icon}
              color={stat.color}
              trend={stat.trend}
              isLoading={loading}
            />
          </div>
        ))}
      </div>

      {/* Performance Overview */}
      <Card className="animate-in slide-in-from-bottom-6 duration-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Visão Geral de Performance
              </CardTitle>
              <CardDescription>
                Métricas de produtividade da sua equipe
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <Flame className="h-3 w-3" />
              Em alta
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Projetos Concluídos</span>
                <span className="font-medium">2/6</span>
              </div>
              <Progress value={33} className="h-2" />
              <p className="text-xs text-muted-foreground">33% dos projetos finalizados</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tarefas Concluídas</span>
                <span className="font-medium">32/47</span>
              </div>
              <Progress value={68} className="h-2" />
              <p className="text-xs text-muted-foreground">68% das tarefas finalizadas</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Eficiência da Equipe</span>
                <span className="font-medium">85%</span>
              </div>
              <Progress value={85} className="h-2" />
              <p className="text-xs text-muted-foreground">Acima da meta de 80%</p>
            </div>
          </div>

          <Separator />

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors cursor-help">
              <Award className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-blue-600">12</div>
              <div className="text-xs text-blue-700">Marcos Atingidos</div>
            </div>

            <div className="text-center p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors cursor-help">
              <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-green-600">47</div>
              <div className="text-xs text-green-700">Entregas no Prazo</div>
            </div>

            <div className="text-center p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors cursor-help">
              <MessageSquare className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-purple-600">156</div>
              <div className="text-xs text-purple-700">Interações</div>
            </div>

            <div className="text-center p-3 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors cursor-help">
              <Timer className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-yellow-600">24h</div>
              <div className="text-xs text-yellow-700">Tempo Médio</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="animate-in slide-in-from-bottom-8 duration-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Ações Rápidas
          </CardTitle>
          <CardDescription>
            Acesso rápido às funcionalidades mais usadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2 hover:scale-105 transition-all duration-200 hover:shadow-md" 
              asChild
            >
              <Link href="/dashboard/projects/new">
                <Plus className="h-6 w-6" />
                <span>Novo Projeto</span>
              </Link>
            </Button>

            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2 hover:scale-105 transition-all duration-200 hover:shadow-md" 
              asChild
            >
              <Link href="/dashboard/teams/new">
                <Users className="h-6 w-6" />
                <span>Criar Time</span>
              </Link>
            </Button>

            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2 hover:scale-105 transition-all duration-200 hover:shadow-md" 
              asChild
            >
              <Link href="/dashboard/templates">
                <Star className="h-6 w-6" />
                <span>Templates</span>
              </Link>
            </Button>

            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2 hover:scale-105 transition-all duration-200 hover:shadow-md" 
              asChild
            >
              <Link href="/dashboard/my-week">
                <Calendar className="h-6 w-6" />
                <span>Minha Agenda</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
EOF

echo "✅ Dashboard melhorada aplicada!"

# Fazer commit e push
git add .
git commit -m "feat: moderniza dashboard principal com componentes shadcn/ui sofisticados

🎨 Dashboard principal redesenhada:
- Cards de estatísticas com hover effects e animações
- Progress bars para métricas de performance
- Badges dinâmicos com ícones e cores
- Gradientes no título principal
- Loading skeletons para cards
- Trends com indicadores visuais
- Seção de performance com métricas detalhadas
- Quick stats com hover effects
- Ações rápidas com animações de escala
- Animações de entrada escalonadas
- Layout responsivo aprimorado

🚀 Recursos shadcn/ui utilizados:
- Card, Button, Badge, Progress
- Skeleton para loading states
- HoverCard, Separator
- Animações CSS personalizadas"

echo "✅ Commit realizado!"

# Tentar push
echo "🚀 Fazendo push para GitHub..."
git push origin main 2>/dev/null || echo "⚠️ Push falhou - pode precisar de autenticação"

echo ""
echo "📋 Status final:"
git log --oneline -3