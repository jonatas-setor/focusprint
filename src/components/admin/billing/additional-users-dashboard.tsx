'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { LoadingButton, StatsCardsSkeleton, InlineLoading } from '@/components/ui/loading-skeletons';
import {
  Users,
  DollarSign,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface AdditionalUsersBilling {
  license_id: string;
  plan_id: string;
  plan_name: string;
  max_users: number;
  current_users: number;
  additional_users: number;
  price_per_additional_user_cents: number;
  additional_users_cost_cents: number;
  base_plan_cost_cents: number;
  total_cost_cents: number;
  currency: string;
}

interface AdditionalUsersStats {
  total_licenses_with_additional_users: number;
  total_additional_users: number;
  total_additional_revenue_cents: number;
  average_additional_users_per_license: number;
  currency: string;
}

export function AdditionalUsersDashboard() {
  const [billing, setBilling] = useState<AdditionalUsersBilling[]>([]);
  const [stats, setStats] = useState<AdditionalUsersStats>({
    total_licenses_with_additional_users: 0,
    total_additional_users: 0,
    total_additional_revenue_cents: 0,
    average_additional_users_per_license: 0,
    currency: 'BRL'
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/billing/additional-users');
      if (!response.ok) throw new Error('Failed to fetch billing data');
      
      const data = await response.json();
      setBilling(data.billing || []);
      setStats(data.stats || stats);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncUserCounts = async (dryRun: boolean = false) => {
    try {
      setSyncing(true);
      
      const response = await fetch('/api/admin/billing/additional-users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: dryRun })
      });

      if (!response.ok) throw new Error('Failed to sync user counts');
      
      const result = await response.json();
      
      if (!dryRun) {
        await fetchBillingData(); // Refresh data after sync
      }
      
      toast.success(`Sync ${dryRun ? 'preview' : 'completed'}: ${result.summary.successful_syncs} licenses processed`);
    } catch (error) {
      toast.error('Error syncing user counts. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const formatCurrency = (cents: number, currency: string = 'BRL') => {
    const value = cents / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  const filteredBilling = billing.filter(item =>
    item.plan_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.license_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <StatsCardsSkeleton count={4} />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Licenças com Usuários Extras</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_licenses_with_additional_users}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuários Extras</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.total_additional_users}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Adicional</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.total_additional_revenue_cents, stats.currency)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Licença</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.average_additional_users_per_license.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">usuários extras</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Usuários Adicionais</CardTitle>
          <CardDescription>
            Visualize e gerencie o faturamento de usuários acima dos limites dos planos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Buscar por plano ou ID da licença..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <LoadingButton
                variant="outline"
                onClick={() => handleSyncUserCounts(true)}
                loading={syncing}
                className="border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Preview Sync
              </LoadingButton>
              <LoadingButton
                onClick={() => handleSyncUserCounts(false)}
                loading={syncing}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizar Contadores
              </LoadingButton>
              <LoadingButton
                variant="outline"
                onClick={fetchBillingData}
                loading={loading}
                className="border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </LoadingButton>
            </div>
          </div>

          {/* Billing List */}
          <div className="space-y-4">
            {filteredBilling.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {billing.length === 0 
                  ? "Nenhuma licença com usuários adicionais encontrada."
                  : "Nenhuma licença encontrada com os filtros aplicados."
                }
              </div>
            ) : (
              filteredBilling.map((item) => (
                <Card key={item.license_id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{item.plan_name}</h3>
                          <Badge variant="secondary">{item.license_id.slice(0, 8)}...</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Limite do Plano:</span>
                            <div className="font-medium">{item.max_users} usuários</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Usuários Atuais:</span>
                            <div className="font-medium">{item.current_users} usuários</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Usuários Extras:</span>
                            <div className="font-medium text-blue-600">+{item.additional_users} usuários</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Preço por Extra:</span>
                            <div className="font-medium">
                              {formatCurrency(item.price_per_additional_user_cents, item.currency)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Custo Adicional</div>
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(item.additional_users_cost_cents, item.currency)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total: {formatCurrency(item.total_cost_cents, item.currency)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
