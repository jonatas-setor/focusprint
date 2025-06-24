import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  FolderOpen,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function ClientDashboardPage() {
  // Mock profile for testing
  const profile = {
    first_name: 'João',
    client: {
      name: 'Acme Corporation',
      plan_type: 'pro',
      max_users: 15,
      max_projects: 10,
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Bem-vindo, {profile.first_name}!
        </h1>
        <p className="text-muted-foreground">
          Aqui está um resumo das atividades da {profile.client.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Times Ativos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Nenhum time criado ainda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Projetos Ativos
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Nenhum projeto criado ainda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tarefas Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Nenhuma tarefa pendente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Concluídas Hoje
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Nenhuma tarefa concluída hoje
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>
              Últimas atividades da sua organização
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                Nenhuma atividade recente
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Crie seu primeiro time ou projeto para começar
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Primeiros Passos</CardTitle>
            <CardDescription>
              Configure sua organização para começar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Criar primeiro time</p>
                  <p className="text-sm text-muted-foreground">
                    Organize sua equipe em times
                  </p>
                </div>
              </div>
              <Badge variant="outline">Pendente</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <FolderOpen className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Criar primeiro projeto</p>
                  <p className="text-sm text-muted-foreground">
                    Inicie seu primeiro projeto
                  </p>
                </div>
              </div>
              <Badge variant="outline">Pendente</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="font-medium">Convidar membros</p>
                  <p className="text-sm text-muted-foreground">
                    Adicione sua equipe ao workspace
                  </p>
                </div>
              </div>
              <Badge variant="outline">Pendente</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Plano</CardTitle>
          <CardDescription>
            Detalhes do seu plano atual e limites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <Badge variant="outline" className="mb-2">
                {profile.client.plan_type.toUpperCase()}
              </Badge>
              <p className="text-sm font-medium">Plano Atual</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold">{profile.client.max_users}</p>
              <p className="text-sm text-muted-foreground">Usuários Máximos</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold">{profile.client.max_projects}</p>
              <p className="text-sm text-muted-foreground">Projetos Máximos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
