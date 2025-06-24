'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Users, 
  CreditCard, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface StripeMetricsData {
  totalCustomers: number;
  activeSubscriptions: number;
  mrr: number;
  totalRevenue: number;
  churnRate: number;
  loading: boolean;
  error?: string;
}

export function StripeMetrics() {
  const [metrics, setMetrics] = useState<StripeMetricsData>({
    totalCustomers: 0,
    activeSubscriptions: 0,
    mrr: 0,
    totalRevenue: 0,
    churnRate: 0,
    loading: true
  });

  useEffect(() => {
    fetchStripeMetrics();
  }, []);

  const fetchStripeMetrics = async () => {
    try {
      setMetrics(prev => ({ ...prev, loading: true }));
      
      const response = await fetch('/api/admin/stripe/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch Stripe metrics');
      }
      
      const data = await response.json();
      setMetrics({
        ...data,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching Stripe metrics:', error);
      setMetrics(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount / 100); // Stripe amounts are in cents
  };

  if (metrics.loading) {
    return <MetricsSkeleton />;
  }

  if (metrics.error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Erro ao carregar métricas: {metrics.error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total de Clientes
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalCustomers}</div>
          <p className="text-xs text-muted-foreground">
            Clientes cadastrados no Stripe
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            MRR
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.mrr)}</div>
          <p className="text-xs text-muted-foreground">
            Monthly Recurring Revenue
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Assinaturas Ativas
          </CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.activeSubscriptions}</div>
          <p className="text-xs text-muted-foreground">
            Assinaturas em cobrança
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Receita Total
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
          <p className="text-xs text-muted-foreground">
            Receita acumulada
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

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
