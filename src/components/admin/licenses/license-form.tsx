'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LicenseService, CreateLicenseData } from '@/lib/licenses/service';

interface LicenseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PLAN_OPTIONS = [
  {
    value: 'free' as const,
    label: 'Free',
    description: 'Plano gratuito com recursos básicos',
    max_users: 5,
    max_projects: 3,
    price: 0
  },
  {
    value: 'pro' as const,
    label: 'Pro',
    description: 'Plano profissional para pequenas equipes',
    max_users: 15,
    max_projects: 10,
    price: 97
  },
  {
    value: 'business' as const,
    label: 'Business',
    description: 'Plano empresarial para grandes equipes',
    max_users: 50,
    max_projects: 50,
    price: 399
  }
];

export default function LicenseForm({ onSuccess, onCancel }: LicenseFormProps) {
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'business'>('free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      const selectedPlanData = PLAN_OPTIONS.find(p => p.value === selectedPlan)!;
      
      const licenseData: CreateLicenseData = {
        plan_type: selectedPlan,
        status: 'active',
        max_users: selectedPlanData.max_users,
        max_projects: selectedPlanData.max_projects,
        current_period_start: new Date().toISOString(),
        current_period_end: selectedPlan !== 'free' 
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
          : undefined
      };

      await LicenseService.createLicense(licenseData);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error creating license:', err);
      setError(err instanceof Error ? err.message : 'Failed to create license');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Nova Licença</CardTitle>
        <CardDescription>
          Criar uma nova licença para um cliente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Selecionar Plano
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLAN_OPTIONS.map((plan) => (
                <div
                  key={plan.value}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedPlan === plan.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPlan(plan.value)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{plan.label}</h3>
                    <Badge variant={plan.value === 'free' ? 'secondary' : 'default'}>
                      {plan.price === 0 ? 'Grátis' : `R$ ${plan.price}/mês`}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div>👥 Até {plan.max_users} usuários</div>
                    <div>📁 Até {plan.max_projects} projetos</div>
                  </div>
                  <div className="mt-3">
                    <input
                      type="radio"
                      name="plan"
                      value={plan.value}
                      checked={selectedPlan === plan.value}
                      onChange={() => setSelectedPlan(plan.value)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedPlan === plan.value
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedPlan === plan.value && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Resumo da Licença</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div>Plano: <span className="font-medium">{PLAN_OPTIONS.find(p => p.value === selectedPlan)?.label}</span></div>
              <div>Usuários: <span className="font-medium">{PLAN_OPTIONS.find(p => p.value === selectedPlan)?.max_users}</span></div>
              <div>Projetos: <span className="font-medium">{PLAN_OPTIONS.find(p => p.value === selectedPlan)?.max_projects}</span></div>
              <div>Preço: <span className="font-medium">
                {PLAN_OPTIONS.find(p => p.value === selectedPlan)?.price === 0 
                  ? 'Gratuito' 
                  : `R$ ${PLAN_OPTIONS.find(p => p.value === selectedPlan)?.price}/mês`}
              </span></div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Licença'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
