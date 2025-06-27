'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plan } from '@/lib/licenses/service';
import { 
  Users, 
  FolderOpen, 
  HardDrive, 
  MessageCircle, 
  Kanban, 
  Video, 
  Zap, 
  BarChart, 
  Mail, 
  Palette, 
  Shield, 
  Check, 
  X,
  Calendar,
  DollarSign,
  Clock,
  UserPlus
} from 'lucide-react';

interface PlanViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null;
}

export default function PlanViewDialog({ isOpen, onClose, plan }: PlanViewDialogProps) {
  if (!plan) return null;

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency === 'BRL' ? 'BRL' : 'USD'
    }).format(price);
  };

  const formatCurrency = (cents: number, currency: string) => {
    return formatPrice(cents / 100, currency);
  };

  const getFeatureIcon = (feature: string) => {
    const icons: Record<string, React.ReactNode> = {
      chat: <MessageCircle className="h-4 w-4" />,
      kanban: <Kanban className="h-4 w-4" />,
      google_meet: <Video className="h-4 w-4" />,
      integrations: <Zap className="h-4 w-4" />,
      basic_reports: <BarChart className="h-4 w-4" />,
      email_support: <Mail className="h-4 w-4" />,
      custom_branding: <Palette className="h-4 w-4" />,
      advanced_reports: <BarChart className="h-4 w-4" />,
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
      advanced_reports: 'Relatórios Avançados',
      priority_support: 'Suporte Prioritário',
      sso: 'Single Sign-On',
      api_access: 'Acesso à API'
    };
    return labels[feature] || feature.replace(/_/g, ' ');
  };

  const getPlanBadgeColor = (code: string) => {
    switch (code) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'pro': return 'bg-blue-100 text-blue-800';
      case 'business': return 'bg-purple-100 text-purple-800';
      case 'enterprise': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl h-[95vh] max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl sm:text-2xl">{plan.name}</DialogTitle>
              <Badge className={getPlanBadgeColor(plan.code)}>
                {plan.code.toUpperCase()}
              </Badge>
              <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                {plan.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </div>
          {plan.description && (
            <p className="text-gray-600 mt-2">{plan.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Pricing Overview */}
          <Card className="border-2 border-blue-200 bg-blue-50/50">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-3xl font-bold text-blue-900 flex items-center justify-center gap-2">
                <DollarSign className="h-8 w-8" />
                {formatPrice(plan.price, plan.currency)}
                <span className="text-lg font-normal text-gray-600">
                  /{plan.interval === 'month' ? 'mês' : 'ano'}
                </span>
              </CardTitle>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pricing Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Detalhes de Preço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Preço Base:</span>
                  <span className="font-medium">{formatPrice(plan.price, plan.currency)}</span>
                </div>
                
                {plan.annual_price_cents && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Preço Anual:</span>
                      <span className="font-medium">{formatCurrency(plan.annual_price_cents, plan.currency)}</span>
                    </div>
                    {plan.annual_discount_percent && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Desconto Anual:</span>
                        <span className="font-medium text-green-600">{plan.annual_discount_percent}%</span>
                      </div>
                    )}
                  </>
                )}

                {plan.setup_fee_cents && plan.setup_fee_cents > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Taxa de Setup:</span>
                    <span className="font-medium">{formatCurrency(plan.setup_fee_cents, plan.currency)}</span>
                  </div>
                )}

                {plan.trial_days && plan.trial_days > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Período de Trial:
                    </span>
                    <span className="font-medium text-blue-600">{plan.trial_days} dias</span>
                  </div>
                )}

                {plan.price_per_additional_user_cents && plan.price_per_additional_user_cents > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <UserPlus className="h-4 w-4" />
                      Usuário Adicional:
                    </span>
                    <span className="font-medium">{formatCurrency(plan.price_per_additional_user_cents, plan.currency)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Limites do Plano
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Usuários</span>
                    </div>
                    <span className="text-lg font-bold">{plan.limits.max_users}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Projetos</span>
                    </div>
                    <span className="text-lg font-bold">{plan.limits.max_projects}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">Armazenamento</span>
                    </div>
                    <span className="text-lg font-bold">{plan.limits.storage_gb}GB</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Recursos Inclusos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(plan.features).map(([feature, enabled]) => (
                  <div 
                    key={feature} 
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      enabled 
                        ? 'bg-green-50 border-green-200 text-green-800' 
                        : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}
                  >
                    <div className={enabled ? 'text-green-600' : 'text-gray-400'}>
                      {enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </div>
                    <div className="flex items-center gap-2">
                      {getFeatureIcon(feature)}
                      <span className="text-sm font-medium">{getFeatureLabel(feature)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          {(plan.metadata?.target_audience || plan.metadata?.recommended_team_size || plan.metadata?.tags?.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Informações Adicionais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.metadata?.target_audience && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Público-alvo:</span>
                    <p className="text-sm text-gray-600 mt-1">{plan.metadata.target_audience}</p>
                  </div>
                )}
                {plan.metadata?.recommended_team_size && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Tamanho de equipe recomendado:</span>
                    <p className="text-sm text-gray-600 mt-1">{plan.metadata.recommended_team_size}</p>
                  </div>
                )}
                {plan.metadata?.tags && plan.metadata.tags.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Tags:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {plan.metadata.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end pt-6 border-t">
          <Button onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
