'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlanService, Plan } from '@/lib/licenses/service';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import PlanForm from './plan-form';

export default function PlanList() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const plansData = await PlanService.getAllPlans();
      setPlans(plansData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (planId: string) => {
    if (!confirm('Tem certeza que deseja desativar este plano?')) {
      return;
    }

    try {
      await PlanService.deactivatePlan(planId);
      await loadPlans(); // Reload plans
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desativar plano');
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency === 'BRL' ? 'BRL' : 'USD'
    }).format(price);
  };

  const getPlanBadgeColor = (code: string) => {
    switch (code) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'pro': return 'bg-blue-100 text-blue-800';
      case 'business': return 'bg-purple-100 text-purple-800';
      case 'enterprise': return 'bg-gold-100 text-gold-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando planos...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Erro: {error}
            <Button 
              onClick={loadPlans} 
              variant="outline" 
              size="sm" 
              className="ml-2"
            >
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Planos</h2>
          <p className="text-gray-600">Gerencie os planos disponíveis na plataforma</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {plan.name}
                    <Badge className={getPlanBadgeColor(plan.code)}>
                      {plan.code.toUpperCase()}
                    </Badge>
                  </CardTitle>
                  {plan.description && (
                    <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                  )}
                </div>
                <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                  {plan.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {/* Price */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {formatPrice(plan.price, plan.currency)}
                  </div>
                  <div className="text-sm text-gray-600">
                    por {plan.interval === 'month' ? 'mês' : 'ano'}
                  </div>
                </div>

                {/* Limits */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Limites:</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>👥 {plan.limits.max_users} usuários</div>
                    <div>📁 {plan.limits.max_projects} projetos</div>
                    <div>💾 {plan.limits.storage_gb}GB armazenamento</div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Recursos:</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    {Object.entries(plan.features).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className={value ? 'text-green-600' : 'text-red-600'}>
                          {value ? '✓' : '✗'}
                        </span>
                        <span className="capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="w-4 h-4 mr-1" />
                    Ver
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-red-600 hover:text-red-700"
                    onClick={() => handleDeactivate(plan.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Desativar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {plans.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">
              <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nenhum plano encontrado</h3>
              <p className="text-sm mb-4">Crie o primeiro plano para começar</p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Plano
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Creation Form */}
      {showCreateForm && (
        <PlanForm
          isOpen={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            loadPlans(); // Reload plans after creation
          }}
        />
      )}
    </div>
  );
}
