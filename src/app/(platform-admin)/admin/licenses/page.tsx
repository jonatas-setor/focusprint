'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LicenseService, License } from '@/lib/licenses/service';
import LicenseForm from '@/components/admin/licenses/license-form';
import LicenseActions from '@/components/admin/licenses/license-actions';

// Note: metadata cannot be exported from client components
// Metadata is handled by the layout or parent server component

interface LicenseStats {
  total: number;
  active: number;
  free: number;
  pro: number;
  business: number;
  mrr: number;
}

const planColors = {
  free: 'bg-gray-100 text-gray-800',
  pro: 'bg-blue-100 text-blue-800',
  business: 'bg-purple-100 text-purple-800'
};

const statusColors = {
  active: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [stats, setStats] = useState<LicenseStats>({
    total: 0,
    active: 0,
    free: 0,
    pro: 0,
    business: 0,
    mrr: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);

  useEffect(() => {
    loadLicenses();
  }, []);

  const loadLicenses = async () => {
    try {
      setLoading(true);
      setError(null);

      const [licensesData, statsData] = await Promise.all([
        LicenseService.getAllLicenses(),
        LicenseService.getLicenseStats()
      ]);

      setLicenses(licensesData);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading licenses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load licenses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    loadLicenses();
  };

  const handleLicenseUpdate = () => {
    loadLicenses();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Erro ao carregar licenças</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <Button onClick={loadLicenses} className="mt-3" variant="outline">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nova Licença</h1>
            <p className="text-gray-600 mt-1">
              Criar uma nova licença para um cliente
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowCreateForm(false)}>
            ← Voltar
          </Button>
        </div>

        <LicenseForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreateForm(false)}
        />
      </div>
    );
  }

  if (selectedLicense) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detalhes da Licença</h1>
            <p className="text-gray-600 mt-1">
              Gerenciar licença {selectedLicense.id.slice(0, 8)}...
            </p>
          </div>
          <Button variant="outline" onClick={() => setSelectedLicense(null)}>
            ← Voltar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Informações da Licença</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Plano</label>
                      <div className="mt-1">
                        <Badge className={
                          selectedLicense.plan_type === 'free' ? 'bg-gray-100 text-gray-800' :
                          selectedLicense.plan_type === 'pro' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }>
                          {selectedLicense.plan_type.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div className="mt-1">
                        <Badge className={
                          selectedLicense.status === 'active' ? 'bg-green-100 text-green-800' :
                          selectedLicense.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {selectedLicense.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Máximo de Usuários</label>
                      <p className="text-lg font-semibold">{selectedLicense.max_users}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Máximo de Projetos</label>
                      <p className="text-lg font-semibold">{selectedLicense.max_projects}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Data de Criação</label>
                      <p className="text-sm">{new Date(selectedLicense.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    {selectedLicense.current_period_end && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Data de Expiração</label>
                        <p className="text-sm">{new Date(selectedLicense.current_period_end).toLocaleDateString('pt-BR')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Ações</CardTitle>
              </CardHeader>
              <CardContent>
                <LicenseActions
                  license={selectedLicense}
                  onUpdate={handleLicenseUpdate}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Licenças</h1>
          <p className="text-gray-600 mt-1">
            Gerenciar licenças e planos dos clientes da plataforma FocuSprint
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          + Nova Licença
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Licenças</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-500">{stats.active} ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Planos Pro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pro}</div>
            <p className="text-xs text-gray-500">R$ 97/mês cada</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Planos Free</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.free}</div>
            <p className="text-xs text-gray-500">Sem cobrança</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.mrr}</div>
            <p className="text-xs text-gray-500">Monthly Recurring Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Licenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Licenças</CardTitle>
          <CardDescription>
            Todas as licenças ativas e seus detalhes de uso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Cliente</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Plano</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Usuários</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Projetos</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Criado</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((license) => (
                  <tr key={license.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {license.client_name || 'Sem cliente'}
                        </div>
                        <div className="text-sm text-gray-500">ID: {license.id.slice(0, 8)}...</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={planColors[license.plan_type as keyof typeof planColors]}>
                        {license.plan_type.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={statusColors[license.status as keyof typeof statusColors]}>
                        {license.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">
                        {license.usage_users || `--/${license.max_users}`}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">
                        {license.usage_projects || `--/${license.max_projects}`}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-500">
                        {new Date(license.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLicense(license)}
                        >
                          Gerenciar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              <span>✅ Página de licenças criada</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
              <span>🔄 Próximo: Conectar com database real</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-300 rounded-full mr-3"></div>
              <span>⏳ Pendente: CRUD completo de licenças</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-300 rounded-full mr-3"></div>
              <span>⏳ Pendente: Integração Stripe</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
