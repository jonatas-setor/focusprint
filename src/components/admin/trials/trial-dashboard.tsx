'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Search,
  Filter,
  Calendar
} from 'lucide-react';
import { TrialStatus } from '@/components/admin/licenses/trial-status';

interface TrialLicense {
  id: string;
  status: 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired';
  trial_ends_at?: string;
  plan_name?: string;
  client_name?: string;
  client_email?: string;
  created_at: string;
  days_remaining?: number;
}

interface TrialStats {
  total_trials: number;
  active_trials: number;
  expiring_soon: number; // expires in 3 days or less
  expired_trials: number;
  conversion_rate: number;
}

export function TrialDashboard() {
  const [trials, setTrials] = useState<TrialLicense[]>([]);
  const [stats, setStats] = useState<TrialStats>({
    total_trials: 0,
    active_trials: 0,
    expiring_soon: 0,
    expired_trials: 0,
    conversion_rate: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('expires_soon');

  useEffect(() => {
    fetchTrials();
  }, []);

  const fetchTrials = async () => {
    try {
      setLoading(true);
      
      // Fetch trial licenses
      const response = await fetch('/api/admin/trials');
      if (!response.ok) throw new Error('Failed to fetch trials');
      
      const data = await response.json();
      setTrials(data.trials || []);
      setStats(data.stats || stats);
    } catch (error) {
      console.error('Error fetching trials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExtendTrial = async (licenseId: string, days: number) => {
    const response = await fetch(`/api/admin/licenses/${licenseId}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days })
    });

    if (!response.ok) {
      throw new Error('Failed to extend trial');
    }

    await fetchTrials(); // Refresh data
  };

  const handleConvertToActive = async (licenseId: string) => {
    const response = await fetch(`/api/admin/licenses/${licenseId}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Failed to convert trial');
    }

    await fetchTrials(); // Refresh data
  };

  const handleExpireTrial = async (licenseId: string) => {
    const response = await fetch(`/api/admin/licenses/${licenseId}/expire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Failed to expire trial');
    }

    await fetchTrials(); // Refresh data
  };

  const filteredTrials = trials
    .filter(trial => {
      const matchesSearch = !searchTerm || 
        trial.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trial.client_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trial.plan_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || trial.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'expires_soon':
          if (a.status === 'trial' && b.status === 'trial') {
            const aDays = a.days_remaining || 0;
            const bDays = b.days_remaining || 0;
            return aDays - bDays;
          }
          return a.status === 'trial' ? -1 : 1;
        case 'client_name':
          return (a.client_name || '').localeCompare(b.client_name || '');
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Trials</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_trials}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trials Ativos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active_trials}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expirando em Breve</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.expiring_soon}</div>
            <p className="text-xs text-muted-foreground">≤ 3 dias</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversion_rate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Trials</CardTitle>
          <CardDescription>
            Visualize e gerencie todos os períodos de trial dos clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, email ou plano..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="trial">Trial Ativo</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
                <SelectItem value="active">Convertido</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expires_soon">Expira em Breve</SelectItem>
                <SelectItem value="client_name">Nome do Cliente</SelectItem>
                <SelectItem value="created_at">Mais Recente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Trials List */}
          <div className="space-y-4">
            {filteredTrials.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum trial encontrado com os filtros aplicados.
              </div>
            ) : (
              filteredTrials.map((trial) => (
                <TrialStatus
                  key={trial.id}
                  license={trial}
                  onExtendTrial={handleExtendTrial}
                  onConvertToActive={handleConvertToActive}
                  onExpireTrial={handleExpireTrial}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
