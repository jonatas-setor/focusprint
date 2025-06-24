'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  CreditCard,
  AlertCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Subscription {
  id: string;
  customer_id: string;
  customer_email?: string;
  status: string;
  current_period_end: number;
  amount: number;
  currency: string;
  plan_name?: string;
  created: number;
}

interface RecentSubscriptionsData {
  subscriptions: Subscription[];
  loading: boolean;
  error?: string;
}

export function RecentSubscriptions() {
  const [data, setData] = useState<RecentSubscriptionsData>({
    subscriptions: [],
    loading: true
  });

  useEffect(() => {
    fetchRecentSubscriptions();
  }, []);

  const fetchRecentSubscriptions = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }));
      
      const response = await fetch('/api/admin/stripe/subscriptions?limit=5');
      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }
      
      const subscriptions = await response.json();
      setData({
        subscriptions,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      setData(prev => ({
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
    }).format(amount / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, label: 'Ativa' },
      past_due: { variant: 'destructive' as const, label: 'Vencida' },
      canceled: { variant: 'secondary' as const, label: 'Cancelada' },
      incomplete: { variant: 'outline' as const, label: 'Incompleta' },
      trialing: { variant: 'secondary' as const, label: 'Trial' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { variant: 'outline' as const, label: status };

    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const getInitials = (email?: string) => {
    if (!email) return '?';
    return email.substring(0, 2).toUpperCase();
  };

  if (data.loading) {
    return <SubscriptionsSkeleton />;
  }

  if (data.error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Erro nas Assinaturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{data.error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchRecentSubscriptions}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Assinaturas Recentes
        </CardTitle>
        <CardDescription>
          Últimas assinaturas criadas ou atualizadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.subscriptions.length === 0 ? (
          <div className="text-center py-6">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma assinatura encontrada
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.subscriptions.map((subscription) => (
              <div key={subscription.id} className="flex items-center space-x-4">
                <Avatar>
                  <AvatarFallback>
                    {getInitials(subscription.customer_email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium leading-none">
                      {subscription.customer_email || 'Email não disponível'}
                    </p>
                    {getStatusBadge(subscription.status)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{formatCurrency(subscription.amount)}</span>
                    <span>•</span>
                    <span>Vence: {formatDate(subscription.current_period_end)}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <a 
                    href={`https://dashboard.stripe.com/subscriptions/${subscription.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchRecentSubscriptions}
            disabled={data.loading}
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${data.loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SubscriptionsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 bg-muted rounded w-40 animate-pulse"></div>
        <div className="h-4 bg-muted rounded w-56 animate-pulse"></div>
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-4">
            <div className="h-10 w-10 bg-muted rounded-full animate-pulse"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-48 animate-pulse"></div>
              <div className="h-3 bg-muted rounded w-32 animate-pulse"></div>
            </div>
            <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
