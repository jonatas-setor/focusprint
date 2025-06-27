'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { LoadingButton, FormSkeleton } from '@/components/ui/loading-skeletons';
import { ErrorDisplay, ValidationError } from '@/components/ui/error-display';
import { getContextualErrorMessage, formatValidationErrors } from '@/lib/utils/error-messages';
import { formatCurrency, calculateFirstPayment, formatSetupFeeDisplay } from '@/lib/utils/pricing';
import { Eye, Edit, Check, X, Users, FolderOpen, HardDrive, MessageCircle, Kanban, Video, Zap, BarChart, Mail, Palette, Shield } from 'lucide-react';

interface PlanFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plan?: any;
}

interface PlanFormData {
  name: string;
  display_name: string;
  description: string;
  pricing: {
    currency: string;
    monthly_price_cents: number;
    billing_cycle: string;
    annual_price_cents?: number;
    annual_discount_percent?: number;
    has_annual_discount: boolean;
    setup_fee_cents?: number;
    trial_days?: number;
    price_per_additional_user_cents?: number;
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Array<{ field: string; message: string }>>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [formData, setFormData] = useState<PlanFormData>({
    name: plan?.name || '',
    display_name: plan?.display_name || '',
    description: plan?.description || '',
    pricing: {
      currency: plan?.currency || 'BRL',
      monthly_price_cents: plan?.price ? Math.round(plan.price * 100) : 0,
      billing_cycle: plan?.interval === 'year' ? 'yearly' : 'monthly',
      annual_price_cents: plan?.annual_price_cents || 0,
      annual_discount_percent: plan?.annual_discount_percent || 20,
      has_annual_discount: plan?.has_annual_discount || false,
      setup_fee_cents: plan?.setup_fee_cents || 0,
      trial_days: plan?.trial_days || 0,
      price_per_additional_user_cents: plan?.price_per_additional_user_cents || 0
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
      target_audience: plan?.metadata?.target_audience || '',
      recommended_team_size: plan?.metadata?.recommended_team_size || '',
      tags: plan?.metadata?.tags || []
    }
  });

  const handleInputChange = (field: string, value: any) => {
    const keys = field.split('.');
    setFormData(prev => {
      const newData = { ...prev };
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
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

  // Calculate annual pricing
  const calculateAnnualPrice = (monthlyPriceCents: number, discountPercent: number) => {
    const yearlyPrice = monthlyPriceCents * 12;
    const discountAmount = yearlyPrice * (discountPercent / 100);
    return Math.round(yearlyPrice - discountAmount);
  };

  const handlePricingChange = (field: string, value: any) => {
    handleInputChange(field, value);
    
    // Auto-calculate annual price if annual discount is enabled
    if (field === 'pricing.monthly_price_cents' || field === 'pricing.annual_discount_percent') {
      if (formData.pricing.has_annual_discount) {
        const monthlyPrice = field === 'pricing.monthly_price_cents' ? value : formData.pricing.monthly_price_cents;
        const discountPercent = field === 'pricing.annual_discount_percent' ? value : (formData.pricing.annual_discount_percent || 20);
        
        if (monthlyPrice > 0 && discountPercent > 0) {
          const annualPrice = calculateAnnualPrice(monthlyPrice, discountPercent);
          setTimeout(() => {
            handleInputChange('pricing.annual_price_cents', annualPrice);
          }, 0);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Transform form data to match API schema
      const apiData = {
        name: formData.name,
        code: formData.name.toLowerCase().replace(/\s+/g, '_'),
        description: formData.description,
        price: formData.pricing.monthly_price_cents / 100,
        currency: formData.pricing.currency,
        interval: formData.pricing.billing_cycle === 'yearly' ? 'year' : 'month',
        annual_price_cents: formData.pricing.has_annual_discount ? formData.pricing.annual_price_cents : undefined,
        annual_discount_percent: formData.pricing.has_annual_discount ? formData.pricing.annual_discount_percent : undefined,
        has_annual_discount: formData.pricing.has_annual_discount,
        setup_fee_cents: formData.pricing.setup_fee_cents || 0,
        trial_days: formData.pricing.trial_days || 0,
        price_per_additional_user_cents: formData.pricing.price_per_additional_user_cents || 0,
        features: formData.features,
        limits: formData.limits,
        metadata: formData.metadata,
        is_active: true,
        version: 1
      };

      const response = await fetch(plan ? `/api/admin/plans/${plan.id}` : '/api/admin/plans', {
        method: plan ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create plan');
      }

      toast.success(plan ? 'Plano atualizado com sucesso!' : 'Plano criado com sucesso!');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Erro ao ${plan ? 'atualizar' : 'criar'} plano`);
    } finally {
      setSubmitting(false);
    }
  };

  const renderPreview = () => {
    const getFeatureIcon = (feature: string) => {
      const icons: Record<string, React.ReactNode> = {
        chat: <MessageCircle className="h-4 w-4" />,
        kanban: <Kanban className="h-4 w-4" />,
        google_meet: <Video className="h-4 w-4" />,
        integrations: <Zap className="h-4 w-4" />,
        basic_reports: <BarChart className="h-4 w-4" />,
        email_support: <Mail className="h-4 w-4" />,
        custom_branding: <Palette className="h-4 w-4" />,
        priority_support: <Mail className="h-4 w-4" />,
        sso: <Shield className="h-4 w-4" />,
        api_access: <Zap className="h-4 w-4" />
      };
      return icons[feature] || <Check className="h-4 w-4" />;
    };

    const getFeatureLabel = (feature: string) => {
      const labels: Record<string, string> = {
        chat: 'Chat em Tempo Real',
        kanban: 'Quadro Kanban',
        google_meet: 'Google Meet',
        integrations: 'Integrações',
        basic_reports: 'Relatórios Básicos',
        email_support: 'Suporte por Email',
        custom_branding: 'Marca Personalizada',
        priority_support: 'Suporte Prioritário',
        sso: 'Single Sign-On',
        api_access: 'Acesso à API'
      };
      return labels[feature] || feature;
    };

    const enabledFeatures = Object.entries(formData.features)
      .filter(([_, enabled]) => enabled)
      .map(([feature, _]) => feature);

    return (
      <div className="space-y-6">
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Badge variant="outline" className="bg-white">
                {formData.name || 'Nome do Plano'}
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-blue-900">
              {formatCurrency(formData.pricing.monthly_price_cents, formData.pricing.currency)}
              <span className="text-sm font-normal text-gray-600">/mês</span>
            </CardTitle>
            {formData.description && (
              <p className="text-gray-600 mt-2">{formData.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pricing Details */}
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="font-medium mb-3">Detalhes de Preço</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Preço Mensal:</span>
                  <span className="font-medium">
                    {formatCurrency(formData.pricing.monthly_price_cents, formData.pricing.currency)}
                  </span>
                </div>
                {formData.pricing.has_annual_discount && (
                  <>
                    <div className="flex justify-between">
                      <span>Preço Anual:</span>
                      <span className="font-medium">
                        {formatCurrency(formData.pricing.annual_price_cents || 0, formData.pricing.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Desconto Anual:</span>
                      <span className="font-medium">{formData.pricing.annual_discount_percent}%</span>
                    </div>
                  </>
                )}
                {formData.pricing.setup_fee_cents > 0 && (
                  <div className="flex justify-between">
                    <span>Taxa de Setup:</span>
                    <span className="font-medium">
                      {formatCurrency(formData.pricing.setup_fee_cents, formData.pricing.currency)}
                    </span>
                  </div>
                )}
                {formData.pricing.trial_days > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Período de Trial:</span>
                    <span className="font-medium">{formData.pricing.trial_days} dias</span>
                  </div>
                )}
              </div>
            </div>

            {/* Limits */}
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="font-medium mb-3">Limites</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <Users className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                  <div className="font-medium">{formData.limits.max_users}</div>
                  <div className="text-gray-500">Usuários</div>
                </div>
                <div className="text-center">
                  <FolderOpen className="h-6 w-6 mx-auto mb-1 text-green-600" />
                  <div className="font-medium">{formData.limits.max_projects}</div>
                  <div className="text-gray-500">Projetos</div>
                </div>
                <div className="text-center">
                  <HardDrive className="h-6 w-6 mx-auto mb-1 text-purple-600" />
                  <div className="font-medium">{formData.limits.storage_gb}GB</div>
                  <div className="text-gray-500">Armazenamento</div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="font-medium mb-3">Recursos Inclusos</h4>
              <div className="grid grid-cols-2 gap-2">
                {enabledFeatures.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <div className="text-green-600">
                      {getFeatureIcon(feature)}
                    </div>
                    <span>{getFeatureLabel(feature)}</span>
                  </div>
                ))}
                {enabledFeatures.length === 0 && (
                  <p className="text-gray-500 text-sm col-span-2">Nenhum recurso selecionado</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl h-[95vh] max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg sm:text-xl">{plan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'form' | 'preview')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="form" className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Formulário</span>
              <span className="sm:hidden">Form</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Visualizar</span>
              <span className="sm:hidden">Preview</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="mt-0">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Basic Information */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-medium">Informações Básicas</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Nome do Plano *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ex: Plano Pro"
                  required
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_name" className="text-sm font-medium">Nome de Exibição</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => handleInputChange('display_name', e.target.value)}
                  placeholder="Ex: Pro"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Descrição *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descrição do plano..."
                required
                className="text-sm min-h-[80px] sm:min-h-[100px]"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-medium">Preços</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço Mensal (centavos)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.pricing.monthly_price_cents}
                  onChange={(e) => handlePricingChange('pricing.monthly_price_cents', parseInt(e.target.value) || 0)}
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

            {/* Setup Fee */}
            <div className="space-y-2">
              <Label htmlFor="setup_fee_cents">Taxa de Setup (centavos)</Label>
              <Input
                id="setup_fee_cents"
                type="number"
                min="0"
                value={formData.pricing.setup_fee_cents || 0}
                onChange={(e) => handleInputChange('pricing.setup_fee_cents', parseInt(e.target.value) || 0)}
                placeholder="e.g., 5000 para R$ 50.00"
              />
              <p className="text-xs text-gray-500">
                Taxa única cobrada na primeira assinatura. Deixe 0 para sem taxa.
              </p>

              {/* Setup Fee Preview */}
              {formData.pricing.setup_fee_cents > 0 && (
                <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <p className="text-sm font-medium text-orange-800">
                    {formatSetupFeeDisplay(formData.pricing.setup_fee_cents, formData.pricing.currency)}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Primeira cobrança: {calculateFirstPayment(
                      formData.pricing.monthly_price_cents,
                      formData.pricing.setup_fee_cents,
                      formData.pricing.currency
                    ).totalFirstPayment}
                  </p>
                </div>
              )}
            </div>

            {/* Trial Period Section */}
            <div className="space-y-2">
              <Label htmlFor="trial_days">Período de Trial (dias)</Label>
              <Input
                id="trial_days"
                type="number"
                min="0"
                max="365"
                value={formData.pricing.trial_days || 0}
                onChange={(e) => handleInputChange('pricing.trial_days', parseInt(e.target.value) || 0)}
                placeholder="e.g., 14 para 14 dias de trial"
              />
              <p className="text-xs text-gray-500">
                Período gratuito antes da primeira cobrança. Deixe 0 para sem trial.
              </p>

              {/* Trial Preview */}
              {formData.pricing.trial_days > 0 && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-medium text-blue-800">
                    Trial de {formData.pricing.trial_days} dias
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Clientes terão {formData.pricing.trial_days} dias gratuitos antes da primeira cobrança
                  </p>
                </div>
              )}
            </div>

            {/* Additional Users Pricing Section */}
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="price_per_additional_user_cents">Preço por Usuário Adicional (centavos)</Label>
              <Input
                id="price_per_additional_user_cents"
                type="number"
                min="0"
                value={formData.pricing.price_per_additional_user_cents || 0}
                onChange={(e) => handlePricingChange('pricing.price_per_additional_user_cents', parseInt(e.target.value) || 0)}
                placeholder="e.g., 1500 para R$ 15.00 por usuário extra"
              />
              <p className="text-xs text-gray-500">
                Valor cobrado por cada usuário acima do limite do plano. Deixe 0 para não permitir usuários adicionais.
              </p>

              {/* Additional Users Preview */}
              {formData.pricing.price_per_additional_user_cents > 0 && (
                <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <p className="text-sm font-medium text-purple-800">
                    Usuários Adicionais: {formatCurrency(formData.pricing.price_per_additional_user_cents, formData.pricing.currency)} por usuário/mês
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    Exemplo: Cliente com {formData.limits.max_users + 5} usuários pagará {formatCurrency(formData.pricing.price_per_additional_user_cents * 5, formData.pricing.currency)} extra
                  </p>
                </div>
              )}
            </div>

            {/* Annual Discount Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="has_annual_discount"
                  checked={formData.pricing.has_annual_discount}
                  onChange={(e) => handleInputChange('pricing.has_annual_discount', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="has_annual_discount">Oferecer desconto anual</Label>
              </div>

              {formData.pricing.has_annual_discount && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="annual_price_cents">Preço Anual (centavos)</Label>
                      <Input
                        id="annual_price_cents"
                        type="number"
                        value={formData.pricing.annual_price_cents || 0}
                        onChange={(e) => handleInputChange('pricing.annual_price_cents', parseInt(e.target.value) || 0)}
                        placeholder="e.g., 93120 para R$ 931.20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="annual_discount_percent">Desconto Anual (%)</Label>
                      <Input
                        id="annual_discount_percent"
                        type="number"
                        min="0.01"
                        max="50"
                        step="0.01"
                        value={formData.pricing.annual_discount_percent || 0}
                        onChange={(e) => handlePricingChange('pricing.annual_discount_percent', parseFloat(e.target.value) || 0)}
                        placeholder="e.g., 20 para 20%"
                      />
                    </div>
                  </div>

                  {/* Savings Indicator */}
                  {formData.pricing.monthly_price_cents > 0 && formData.pricing.annual_discount_percent > 0 && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-sm text-green-800">
                        <strong>Economia anual:</strong> {formatCurrency(
                          (formData.pricing.monthly_price_cents * 12) - (formData.pricing.annual_price_cents || 0),
                          formData.pricing.currency
                        )}
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        Preço mensal efetivo: {formatCurrency(
                          (formData.pricing.annual_price_cents || 0) / 12,
                          formData.pricing.currency
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Limits Configuration */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-medium">Limites do Plano</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_users" className="text-sm font-medium">Máximo de Usuários *</Label>
                <Input
                  id="max_users"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.limits.max_users}
                  onChange={(e) => handleInputChange('limits.max_users', parseInt(e.target.value) || 1)}
                  placeholder="Ex: 15"
                  required
                  className="text-sm"
                />
                <p className="text-xs text-gray-500">Número máximo de usuários permitidos</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_projects" className="text-sm font-medium">Máximo de Projetos *</Label>
                <Input
                  id="max_projects"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.limits.max_projects}
                  onChange={(e) => handleInputChange('limits.max_projects', parseInt(e.target.value) || 1)}
                  placeholder="Ex: 50"
                  required
                  className="text-sm"
                />
                <p className="text-xs text-gray-500">Número máximo de projetos permitidos</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storage_gb" className="text-sm font-medium">Armazenamento (GB) *</Label>
                <Input
                  id="storage_gb"
                  type="number"
                  min="1"
                  max="10000"
                  value={formData.limits.storage_gb}
                  onChange={(e) => handleInputChange('limits.storage_gb', parseInt(e.target.value) || 1)}
                  placeholder="Ex: 100"
                  required
                  className="text-sm"
                />
                <p className="text-xs text-gray-500">Espaço de armazenamento em GB</p>
              </div>
            </div>
          </div>

          {/* Features Configuration */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-medium">Recursos do Plano</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Core Features */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Recursos Principais</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-blue-600" />
                      <div>
                        <Label htmlFor="chat" className="text-sm font-medium">Chat em Tempo Real</Label>
                        <p className="text-xs text-gray-500">Sistema de chat integrado</p>
                      </div>
                    </div>
                    <Switch
                      id="chat"
                      checked={formData.features.chat}
                      onCheckedChange={(checked) => handleInputChange('features.chat', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Kanban className="h-4 w-4 text-green-600" />
                      <div>
                        <Label htmlFor="kanban" className="text-sm font-medium">Quadro Kanban</Label>
                        <p className="text-xs text-gray-500">Gestão visual de tarefas</p>
                      </div>
                    </div>
                    <Switch
                      id="kanban"
                      checked={formData.features.kanban}
                      onCheckedChange={(checked) => handleInputChange('features.kanban', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-purple-600" />
                      <div>
                        <Label htmlFor="google_meet" className="text-sm font-medium">Google Meet</Label>
                        <p className="text-xs text-gray-500">Integração com videoconferência</p>
                      </div>
                    </div>
                    <Switch
                      id="google_meet"
                      checked={formData.features.google_meet}
                      onCheckedChange={(checked) => handleInputChange('features.google_meet', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      <div>
                        <Label htmlFor="integrations" className="text-sm font-medium">Integrações</Label>
                        <p className="text-xs text-gray-500">Conectar com outras ferramentas</p>
                      </div>
                    </div>
                    <Switch
                      id="integrations"
                      checked={formData.features.integrations}
                      onCheckedChange={(checked) => handleInputChange('features.integrations', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <BarChart className="h-4 w-4 text-indigo-600" />
                      <div>
                        <Label htmlFor="basic_reports" className="text-sm font-medium">Relatórios Básicos</Label>
                        <p className="text-xs text-gray-500">Relatórios de produtividade</p>
                      </div>
                    </div>
                    <Switch
                      id="basic_reports"
                      checked={formData.features.basic_reports}
                      onCheckedChange={(checked) => handleInputChange('features.basic_reports', checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Features */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Recursos Avançados</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <div>
                        <Label htmlFor="email_support" className="text-sm font-medium">Suporte por Email</Label>
                        <p className="text-xs text-gray-500">Suporte técnico via email</p>
                      </div>
                    </div>
                    <Switch
                      id="email_support"
                      checked={formData.features.email_support}
                      onCheckedChange={(checked) => handleInputChange('features.email_support', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-pink-600" />
                      <div>
                        <Label htmlFor="custom_branding" className="text-sm font-medium">Marca Personalizada</Label>
                        <p className="text-xs text-gray-500">Logo e cores personalizadas</p>
                      </div>
                    </div>
                    <Switch
                      id="custom_branding"
                      checked={formData.features.custom_branding}
                      onCheckedChange={(checked) => handleInputChange('features.custom_branding', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <BarChart className="h-4 w-4 text-red-600" />
                      <div>
                        <Label htmlFor="advanced_reports" className="text-sm font-medium">Relatórios Avançados</Label>
                        <p className="text-xs text-gray-500">Analytics e insights detalhados</p>
                      </div>
                    </div>
                    <Switch
                      id="advanced_reports"
                      checked={formData.features.advanced_reports}
                      onCheckedChange={(checked) => handleInputChange('features.advanced_reports', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-orange-600" />
                      <div>
                        <Label htmlFor="priority_support" className="text-sm font-medium">Suporte Prioritário</Label>
                        <p className="text-xs text-gray-500">Atendimento com prioridade</p>
                      </div>
                    </div>
                    <Switch
                      id="priority_support"
                      checked={formData.features.priority_support}
                      onCheckedChange={(checked) => handleInputChange('features.priority_support', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-600" />
                      <div>
                        <Label htmlFor="sso" className="text-sm font-medium">Single Sign-On</Label>
                        <p className="text-xs text-gray-500">Autenticação unificada</p>
                      </div>
                    </div>
                    <Switch
                      id="sso"
                      checked={formData.features.sso}
                      onCheckedChange={(checked) => handleInputChange('features.sso', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-cyan-600" />
                      <div>
                        <Label htmlFor="api_access" className="text-sm font-medium">Acesso à API</Label>
                        <p className="text-xs text-gray-500">Integração via API REST</p>
                      </div>
                    </div>
                    <Switch
                      id="api_access"
                      checked={formData.features.api_access}
                      onCheckedChange={(checked) => handleInputChange('features.api_access', checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Configuration */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-medium">Informações Adicionais</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target_audience" className="text-sm font-medium">Público-alvo</Label>
                <Textarea
                  id="target_audience"
                  value={formData.metadata.target_audience}
                  onChange={(e) => handleInputChange('metadata.target_audience', e.target.value)}
                  placeholder="Ex: Pequenas empresas, startups, equipes de desenvolvimento..."
                  className="text-sm min-h-[60px]"
                />
                <p className="text-xs text-gray-500">Descreva o público-alvo ideal para este plano</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recommended_team_size" className="text-sm font-medium">Tamanho de equipe recomendado</Label>
                <Input
                  id="recommended_team_size"
                  value={formData.metadata.recommended_team_size}
                  onChange={(e) => handleInputChange('metadata.recommended_team_size', e.target.value)}
                  placeholder="Ex: 5-15 pessoas, Até 50 colaboradores..."
                  className="text-sm"
                />
                <p className="text-xs text-gray-500">Tamanho ideal da equipe para este plano</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags" className="text-sm font-medium">Tags</Label>
                <Input
                  id="tags"
                  value={formData.metadata.tags.join(', ')}
                  onChange={(e) => handleInputChange('metadata.tags', e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0))}
                  placeholder="Ex: popular, recomendado, empresarial..."
                  className="text-sm"
                />
                <p className="text-xs text-gray-500">Tags separadas por vírgula para categorização</p>
                {formData.metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.metadata.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('preview')}
                  disabled={submitting}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </Button>
                <LoadingButton
                  type="submit"
                  loading={submitting}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {plan ? 'Atualizar Plano' : 'Criar Plano'}
                </LoadingButton>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="preview">
            {renderPreview()}
            <div className="flex justify-end space-x-2 mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab('form')}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <LoadingButton
                onClick={handleSubmit}
                loading={submitting}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {plan ? 'Atualizar Plano' : 'Criar Plano'}
              </LoadingButton>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
