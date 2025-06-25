'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft,
  Edit,
  Trash2,
  Download,
  Shield,
  Users,
  CreditCard,
  Activity,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Building,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database
} from 'lucide-react';
import { Client } from '@/types/database';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ClientUsersManagement } from './client-users-management';

interface ClientDetailsData {
  client: Client;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    last_login: string | null;
    created_at: string;
  }>;
  licenses: Array<{
    id: string;
    plan: string;
    status: string;
    users_limit: number;
    users_current: number;
    expires_at: string;
    created_at: string;
  }>;
  support_tickets: {
    tickets: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      created_at: string;
    }>;
    summary: {
      total: number;
      open: number;
      in_progress: number;
      resolved: number;
      avg_resolution_time: number;
    };
  };
  usage_metrics: {
    current_month: {
      active_users: number;
      projects_created: number;
      tasks_completed: number;
      storage_used_gb: number;
      api_calls: number;
    };
    last_30_days: {
      login_frequency: number;
      feature_usage: {
        kanban: number;
        chat: number;
        video_calls: number;
        reports: number;
      };
    };
  };
  payment_history: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    description: string;
    paid_at: string;
    created_at: string;
  }>;
  backup_history: Array<{
    backup_id: string;
    created_at: string;
    created_by: string;
    reason: string;
    size_mb: number;
    retention_until: string;
    verified: boolean;
  }>;
}

interface ClientDetailsViewProps {
  clientId: string;
}

export function ClientDetailsView({ clientId }: ClientDetailsViewProps) {
  const router = useRouter();
  const [data, setData] = useState<ClientDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClientDetails();
  }, [clientId]);

  const fetchClientDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/clients/${clientId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Cliente não encontrado');
        }
        throw new Error('Erro ao carregar dados do cliente');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/admin/clients/${clientId}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirm_deletion: true,
          reason: 'Exclusão solicitada pelo administrador',
          backup_options: {
            include_users: true,
            include_projects: true,
            include_support_tickets: true,
            include_payment_history: true,
            include_usage_metrics: true,
            include_audit_logs: true,
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir cliente');
      }

      router.push('/admin/clients');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir cliente');
    }
  };

  const handleBackup = async () => {
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          backup_reason: 'Backup manual solicitado pelo administrador',
          include_users: true,
          include_projects: true,
          include_support_tickets: true,
          include_payment_history: true,
          include_usage_metrics: true,
          include_audit_logs: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar backup');
      }

      const result = await response.json();
      alert(`Backup criado com sucesso: ${result.backup_id}`);
      
      // Refresh data to show new backup
      fetchClientDetails();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao criar backup');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Ativo</Badge>;
      case 'suspended':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Suspenso</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Inativo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (planType: string) => {
    switch (planType) {
      case 'free':
        return <Badge variant="outline">Gratuito</Badge>;
      case 'pro':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Pro</Badge>;
      case 'business':
        return <Badge variant="default" className="bg-purple-100 text-purple-800">Business</Badge>;
      default:
        return <Badge variant="outline">{planType}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados do cliente...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erro ao carregar cliente</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { client, users, licenses, support_tickets, usage_metrics, payment_history, backup_history } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
            <div className="flex items-center space-x-2 mt-1">
              {getStatusBadge(client.status)}
              {getPlanBadge(client.plan_type)}
              <span className="text-sm text-muted-foreground">
                ID: {client.id}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleBackup}>
            <Database className="w-4 h-4 mr-2" />
            Backup
          </Button>
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              {usage_metrics.current_month.active_users} ativos este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage_metrics.current_month.projects_created}</div>
            <p className="text-xs text-muted-foreground">
              criados este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Armazenamento</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage_metrics.current_month.storage_used_gb} GB
            </div>
            <p className="text-xs text-muted-foreground">
              utilizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage_metrics.current_month.tasks_completed}
            </div>
            <p className="text-xs text-muted-foreground">
              concluídas este mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="billing">Faturamento</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Informações do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">{client.phone}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">{client.address}</span>
                    </div>
                  )}
                  {client.cnpj && (
                    <div className="flex items-center">
                      <Building className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">CNPJ: {client.cnpj}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">Criado em {formatDate(client.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plan Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Informações do Plano
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Plano Atual:</span>
                  {getPlanBadge(client.plan_type)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  {getStatusBadge(client.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Limite de Usuários:</span>
                  <span className="text-sm">{client.max_users}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Limite de Projetos:</span>
                  <span className="text-sm">{client.max_projects}</span>
                </div>
                {client.stripe_customer_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Stripe ID:</span>
                    <span className="text-sm font-mono text-xs">{client.stripe_customer_id}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <ClientUsersManagement clientId={client.id} />
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Métricas do Mês Atual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Usuários Ativos:</span>
                    <span className="font-medium">{usage_metrics.current_month.active_users}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Projetos Criados:</span>
                    <span className="font-medium">{usage_metrics.current_month.projects_created}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Tarefas Concluídas:</span>
                    <span className="font-medium">{usage_metrics.current_month.tasks_completed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Armazenamento Usado:</span>
                    <span className="font-medium">{usage_metrics.current_month.storage_used_gb} GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Chamadas API:</span>
                    <span className="font-medium">{usage_metrics.current_month.api_calls}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uso de Recursos (30 dias)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Frequência de Login:</span>
                    <span className="font-medium">{usage_metrics.last_30_days.login_frequency} dias</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Uso do Kanban:</span>
                    <span className="font-medium">{usage_metrics.last_30_days.feature_usage.kanban}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Uso do Chat:</span>
                    <span className="font-medium">{usage_metrics.last_30_days.feature_usage.chat}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Videochamadas:</span>
                    <span className="font-medium">{usage_metrics.last_30_days.feature_usage.video_calls}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Relatórios:</span>
                    <span className="font-medium">{usage_metrics.last_30_days.feature_usage.reports}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Histórico de Faturamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Histórico de faturamento será implementado em breve</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                Histórico de Backup
              </CardTitle>
              <CardDescription>
                Visualize e gerencie os backups deste cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {backup_history.length > 0 ? (
                  backup_history.map((backup) => (
                    <div key={backup.backup_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Database className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Backup {backup.backup_id.slice(-8)}</p>
                          <p className="text-sm text-muted-foreground">{backup.reason}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(backup.created_at)} por {backup.created_by}
                            </span>
                            <Badge variant={backup.verified ? "default" : "destructive"} className="text-xs">
                              {backup.verified ? "Verificado" : "Não Verificado"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{backup.size_mb} MB</p>
                        <p className="text-xs text-muted-foreground">
                          Expira: {formatDate(backup.retention_until)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum backup encontrado</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Log de Auditoria
              </CardTitle>
              <CardDescription>
                Histórico de ações realizadas neste cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Log de auditoria será implementado em breve</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
