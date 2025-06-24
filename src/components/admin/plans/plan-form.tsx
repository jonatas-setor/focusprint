'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface PlanFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plan?: any; // For editing existing plans
}

interface PlanFormData {
  name: string;
  display_name: string;
  description: string;
  pricing: {
    currency: string;
    monthly_price_cents: number;
    billing_cycle: string;
  };
  limits: {
    max_users: number;
    max_projects: number;
    storage_gb: number;
  };
  features: {
    chat: boolean;
    kanban: boolean;
    google_meet: boolean;
    integrations: boolean;
    basic_reports: boolean;
    email_support: boolean;
    custom_branding: boolean;
    advanced_reports: boolean;
    priority_support: boolean;
    sso: boolean;
    api_access: boolean;
  };
  metadata: {
    target_audience: string;
    recommended_team_size: string;
    tags: string[];
  };
}

export default function PlanForm({ isOpen, onClose, onSuccess, plan }: PlanFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PlanFormData>({
    name: plan?.name || '',
    display_name: plan?.display_name || '',
    description: plan?.description || '',
    pricing: {
      currency: plan?.pricing?.currency || 'BRL',
      monthly_price_cents: plan?.pricing?.monthly_price_cents || 0,
      billing_cycle: plan?.pricing?.billing_cycle || 'monthly'
    },
    limits: {
      max_users: plan?.limits?.max_users || 5,
      max_projects: plan?.limits?.max_projects || 3,
      storage_gb: plan?.limits?.storage_gb || 1
    },
    features: {
      chat: plan?.features?.chat || true,
      kanban: plan?.features?.kanban || true,
      google_meet: plan?.features?.google_meet || false,
      integrations: plan?.features?.integrations || false,
      basic_reports: plan?.features?.basic_reports || true,
      email_support: plan?.features?.email_support || true,
      custom_branding: plan?.features?.custom_branding || false,
      advanced_reports: plan?.features?.advanced_reports || false,
      priority_support: plan?.features?.priority_support || false,
      sso: plan?.features?.sso || false,
      api_access: plan?.features?.api_access || false
    },
    metadata: {
      target_audience: plan?.metadata?.target_audience || 'small_teams',
      recommended_team_size: plan?.metadata?.recommended_team_size || '1-5 users',
      tags: plan?.metadata?.tags || []
    }
  });

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof PlanFormData],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleFeatureChange = (feature: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create plan');
      }

      const result = await response.json();
      toast.success('Plano criado com sucesso!');
      onSuccess();
    } catch (error) {
      console.error('Error creating plan:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar plano');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Informações Básicas</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Plano *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., premium"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_name">Nome de Exibição *</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => handleInputChange('display_name', e.target.value)}
                  placeholder="e.g., Premium Plan"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descrição do plano..."
                required
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Preços</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço Mensal (centavos)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.pricing.monthly_price_cents}
                  onChange={(e) => handleInputChange('pricing.monthly_price_cents', parseInt(e.target.value) || 0)}
                  placeholder="e.g., 9700 para R$ 97.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Moeda</Label>
                <Select 
                  value={formData.pricing.currency} 
                  onValueChange={(value) => handleInputChange('pricing.currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing_cycle">Ciclo de Cobrança</Label>
                <Select 
                  value={formData.pricing.billing_cycle} 
                  onValueChange={(value) => handleInputChange('pricing.billing_cycle', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Limites</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_users">Máximo de Usuários</Label>
                <Input
                  id="max_users"
                  type="number"
                  value={formData.limits.max_users}
                  onChange={(e) => handleInputChange('limits.max_users', parseInt(e.target.value) || 1)}
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_projects">Máximo de Projetos</Label>
                <Input
                  id="max_projects"
                  type="number"
                  value={formData.limits.max_projects}
                  onChange={(e) => handleInputChange('limits.max_projects', parseInt(e.target.value) || 1)}
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="storage_gb">Armazenamento (GB)</Label>
                <Input
                  id="storage_gb"
                  type="number"
                  step="0.1"
                  value={formData.limits.storage_gb}
                  onChange={(e) => handleInputChange('limits.storage_gb', parseFloat(e.target.value) || 0.1)}
                  min="0.1"
                />
              </div>
            </div>
          </div>

          {/* Features - Simplified for now */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Recursos</h3>
            <p className="text-sm text-gray-600">
              Os recursos serão configurados automaticamente baseados no tipo de plano.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : (plan ? 'Atualizar Plano' : 'Criar Plano')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
