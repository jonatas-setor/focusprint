import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Métricas de Negócio - Platform Admin',
  description: 'Dashboard executivo com métricas e KPIs da plataforma FocuSprint',
};

// Dados temporários para demonstração
const mockMetrics = {
  overview: {
    totalClients: 2,
    activeClients: 2,
    mrr: 97,
    churnRate: 0,
    newClientsThisMonth: 2,
    totalRevenue: 194
  },
  planDistribution: [
    { plan: 'Free', count: 1, percentage: 50 },
    { plan: 'Pro', count: 1, percentage: 50 },
    { plan: 'Business', count: 0, percentage: 0 }
  ],
  recentActivity: [
    { date: '2025-06-12', event: 'Nova licença Pro criada', client: 'Empresa Demo' },
    { date: '2025-06-10', event: 'Cliente Free registrado', client: 'Startup ABC' },
    { date: '2025-06-01', event: 'Primeiro pagamento recebido', client: 'Empresa Demo' }
  ]
};

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function MetricsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Métricas de Negócio</h1>
        <p className="text-gray-600 mt-1">
          Dashboard executivo com KPIs e métricas da plataforma FocuSprint
        </p>
      </div>

      {/* KPIs Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{mockMetrics.overview.totalClients}</div>
            <p className="text-xs text-green-600 mt-1">
              +{mockMetrics.overview.newClientsThisMonth} este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              R$ {mockMetrics.overview.mrr}
            </div>
            <p className="text-xs text-gray-500 mt-1">Monthly Recurring Revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Churn Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">
              {mockMetrics.overview.churnRate}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Receita Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              R$ {mockMetrics.overview.totalRevenue}
            </div>
            <p className="text-xs text-gray-500 mt-1">Desde o início</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Planos</CardTitle>
            <CardDescription>
              Percentual de clientes por tipo de plano
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockMetrics.planDistribution.map((item) => (
                <div key={item.plan} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge 
                      variant={item.plan === 'Free' ? 'secondary' : 
                              item.plan === 'Pro' ? 'default' : 'outline'}
                    >
                      {item.plan}
                    </Badge>
                    <span className="text-sm text-gray-600">{item.count} clientes</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>
              Últimas atividades na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockMetrics.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.event}</p>
                    <p className="text-xs text-gray-500">{activity.client}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(activity.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução da Receita</CardTitle>
          <CardDescription>
            Gráfico de receita mensal (será implementado com dados reais)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-gray-600 font-medium">Gráfico de Receita</p>
              <p className="text-sm text-gray-500">Será implementado com Chart.js ou Recharts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status da Implementação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span>✅ Página de métricas criada</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span>✅ KPIs básicos implementados</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
              <span>🔄 Próximo: Conectar com dados reais</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-300 rounded-full mr-3"></div>
              <span>⏳ Pendente: Gráficos interativos</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-300 rounded-full mr-3"></div>
              <span>⏳ Pendente: Relatórios exportáveis</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
