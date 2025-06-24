import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Users,
  CreditCard,
  TrendingUp,
  Activity,
  AlertCircle
} from 'lucide-react';
import { StripeMetrics } from '@/components/admin/stripe/stripe-metrics';
import { RecentSubscriptions } from '@/components/admin/stripe/recent-subscriptions';
import { StripeBalance } from '@/components/admin/stripe/stripe-balance';
import { StripeSyncPanel } from '@/components/admin/stripe/stripe-sync-panel';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard Administrativo
        </h1>
        <p className="text-muted-foreground">
          Visão geral da plataforma FocuSprint com dados em tempo real do Stripe
        </p>
      </div>

      {/* Stripe Metrics Overview */}
      <Suspense fallback={<MetricsSkeleton />}>
        <StripeMetrics />
      </Suspense>

      {/* Stripe Balance */}
      <Suspense fallback={<BalanceSkeleton />}>
        <StripeBalance />
      </Suspense>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<ActivitySkeleton />}>
          <RecentSubscriptions />
        </Suspense>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Status da Integração
            </CardTitle>
            <CardDescription>
              Status dos componentes da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusItem status="success" text="Stripe MCP Tool conectado" />
            <StatusItem status="success" text="Supabase Cloud configurado" />
            <StatusItem status="success" text="Platform Admin implementado" />
            <StatusItem status="success" text="Client Dashboard (Teams) implementado" />
            <StatusItem status="success" text="Webhooks Stripe implementados" />
            <StatusItem status="success" text="Sync automático de licenças implementado" />
            <StatusItem status="pending" text="Client Dashboard (Projects) pendente" />
          </CardContent>
        </Card>
      </div>

      {/* Stripe Sync Panel */}
      <Suspense fallback={<SyncSkeleton />}>
        <StripeSyncPanel />
      </Suspense>

    </div>
  );
}

// Loading skeletons
function MetricsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
            <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-muted rounded w-16 animate-pulse mb-1"></div>
            <div className="h-3 bg-muted rounded w-32 animate-pulse"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BalanceSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 bg-muted rounded w-32 animate-pulse"></div>
        <div className="h-4 bg-muted rounded w-48 animate-pulse"></div>
      </CardHeader>
      <CardContent>
        <div className="h-8 bg-muted rounded w-24 animate-pulse"></div>
      </CardContent>
    </Card>
  );
}

function ActivitySkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 bg-muted rounded w-40 animate-pulse"></div>
        <div className="h-4 bg-muted rounded w-56 animate-pulse"></div>
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-muted rounded-full animate-pulse"></div>
            <div className="space-y-1 flex-1">
              <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
              <div className="h-3 bg-muted rounded w-24 animate-pulse"></div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SyncSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 bg-muted rounded w-48 animate-pulse"></div>
        <div className="h-4 bg-muted rounded w-64 animate-pulse"></div>
      </CardHeader>
      <CardContent>
        <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
      </CardContent>
    </Card>
  );
}

// Status item component
function StatusItem({ status, text }: { status: 'success' | 'warning' | 'pending', text: string }) {
  const statusConfig = {
    success: { color: 'bg-green-500', icon: '✅' },
    warning: { color: 'bg-yellow-500', icon: '⚠️' },
    pending: { color: 'bg-gray-400', icon: '⏳' }
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center">
      <div className={`w-3 h-3 ${config.color} rounded-full mr-3`}></div>
      <span className="text-sm">
        {config.icon} {text}
      </span>
    </div>
  );
}
