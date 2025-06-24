'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet,
  Clock,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StripeBalanceData {
  available: number;
  pending: number;
  currency: string;
  loading: boolean;
  error?: string;
  lastUpdated?: string;
}

export function StripeBalance() {
  const [balance, setBalance] = useState<StripeBalanceData>({
    available: 0,
    pending: 0,
    currency: 'brl',
    loading: true
  });

  useEffect(() => {
    fetchStripeBalance();
  }, []);

  const fetchStripeBalance = async () => {
    try {
      setBalance(prev => ({ ...prev, loading: true }));
      
      const response = await fetch('/api/admin/stripe/balance');
      if (!response.ok) {
        throw new Error('Failed to fetch Stripe balance');
      }
      
      const data = await response.json();
      setBalance({
        ...data,
        loading: false,
        lastUpdated: new Date().toLocaleString('pt-BR')
      });
    } catch (error) {
      console.error('Error fetching Stripe balance:', error);
      setBalance(prev => ({
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

  if (balance.loading) {
    return <BalanceSkeleton />;
  }

  if (balance.error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Erro no Saldo Stripe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{balance.error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchStripeBalance}
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
          <Wallet className="h-5 w-5" />
          Saldo Stripe
        </CardTitle>
        <CardDescription>
          Saldo disponível e pendente na conta Stripe
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Disponível
              </Badge>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(balance.available)}
            </div>
            <p className="text-xs text-muted-foreground">
              Pronto para saque
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                <Clock className="h-3 w-3 mr-1" />
                Pendente
              </Badge>
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(balance.pending)}
            </div>
            <p className="text-xs text-muted-foreground">
              Em processamento
            </p>
          </div>
        </div>

        {balance.lastUpdated && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Última atualização: {balance.lastUpdated}
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchStripeBalance}
                disabled={balance.loading}
              >
                <RefreshCw className={`h-4 w-4 ${balance.loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="h-6 bg-muted rounded w-20 animate-pulse"></div>
            <div className="h-8 bg-muted rounded w-24 animate-pulse"></div>
            <div className="h-3 bg-muted rounded w-32 animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <div className="h-6 bg-muted rounded w-20 animate-pulse"></div>
            <div className="h-8 bg-muted rounded w-24 animate-pulse"></div>
            <div className="h-3 bg-muted rounded w-32 animate-pulse"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
