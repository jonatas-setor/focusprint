'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Users,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

interface SyncStatus {
  synced_licenses: number;
  clients_without_stripe: number;
  licenses: Array<{
    id: string;
    status: string;
    plan_code: string;
    stripe_subscription_id: string;
    clients: {
      name: string;
      email: string;
    };
  }>;
  clients_without_stripe: Array<{
    id: string;
    name: string;
    email: string;
    plan_type: string;
  }>;
}

export function StripeSyncPanel() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchSyncStatus();
  }, []);

  const fetchSyncStatus = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/stripe/sync');
      if (!response.ok) {
        throw new Error('Failed to fetch sync status');
      }
      
      const data = await response.json();
      setSyncStatus(data);
    } catch (error) {
      console.error('Error fetching sync status:', error);
      toast.error('Erro ao carregar status de sincronização');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      
      const response = await fetch('/api/admin/stripe/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'sync-all' }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync');
      }

      const result = await response.json();
      toast.success(`Sincronização concluída: ${result.result.success} sucessos, ${result.result.errors} erros`);
      
      // Refresh status
      await fetchSyncStatus();
      
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Erro na sincronização');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <SyncSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5" />
          Sincronização Stripe
        </CardTitle>
        <CardDescription>
          Sincronize assinaturas do Stripe com licenças locais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sync Status Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">Licenças Sincronizadas</p>
              <p className="text-2xl font-bold text-green-600">
                {syncStatus?.synced_licenses || 0}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-yellow-900">Clientes sem Stripe</p>
              <p className="text-2xl font-bold text-yellow-600">
                {syncStatus?.clients_without_stripe || 0}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <CreditCard className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">Total de Clientes</p>
              <p className="text-2xl font-bold text-blue-600">
                {(syncStatus?.synced_licenses || 0) + (syncStatus?.clients_without_stripe || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Sync Actions */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button 
            onClick={handleSyncAll}
            disabled={syncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar Tudo'}
          </Button>
          
          <Button 
            variant="outline"
            onClick={fetchSyncStatus}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Status
          </Button>
        </div>

        {/* Detailed Status */}
        {syncStatus && (
          <div className="space-y-4 pt-4 border-t">
            {/* Synced Licenses */}
            {syncStatus.licenses && syncStatus.licenses.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Licenças Sincronizadas
                </h4>
                <div className="space-y-2">
                  {syncStatus.licenses.slice(0, 3).map((license) => (
                    <div key={license.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <div>
                        <p className="text-sm font-medium">{license.clients.name}</p>
                        <p className="text-xs text-muted-foreground">{license.clients.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">{license.plan_code}</Badge>
                        <Badge variant="secondary">{license.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {syncStatus.licenses.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{syncStatus.licenses.length - 3} mais...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Clients without Stripe */}
            {syncStatus.clients_without_stripe && syncStatus.clients_without_stripe.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  Clientes sem Stripe
                </h4>
                <div className="space-y-2">
                  {syncStatus.clients_without_stripe.slice(0, 3).map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                      <div>
                        <p className="text-sm font-medium">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.email}</p>
                      </div>
                      <Badge variant="outline">{client.plan_type.toUpperCase()}</Badge>
                    </div>
                  ))}
                  {syncStatus.clients_without_stripe.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{syncStatus.clients_without_stripe.length - 3} mais...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
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
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 bg-muted rounded-lg">
              <div className="h-4 bg-muted-foreground/20 rounded w-24 animate-pulse mb-2"></div>
              <div className="h-8 bg-muted-foreground/20 rounded w-12 animate-pulse"></div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 pt-4 border-t">
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
        </div>
      </CardContent>
    </Card>
  );
}
