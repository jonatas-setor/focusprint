'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlanService, Plan } from '@/lib/licenses/service';
import { Plus, Edit, Trash2, Eye, Globe, Crown, RefreshCw } from 'lucide-react';
import { PlansListSkeleton, EmptyState, LoadingButton } from '@/components/ui/loading-skeletons';
import { DeactivateConfirmation } from '@/components/ui/confirmation-dialog';
import PlanForm from './plan-form';
import PlanViewDialog from './plan-view-dialog';
import RegionalPricingManager from './regional-pricing-manager';
import EnterpriseManager from './enterprise-manager';

export default function PlanList() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deactivatingPlanId, setDeactivatingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [planToDeactivate, setPlanToDeactivate] = useState<Plan | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<Plan | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [planToView, setPlanToView] = useState<Plan | null>(null);
  const [activeTab, setActiveTab] = useState<string>('plans');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const plansData = await PlanService.getAllPlans();
      setPlans(plansData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar planos');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleDeactivateClick = (plan: Plan) => {
    setPlanToDeactivate(plan);
    setShowDeactivateConfirm(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!planToDeactivate) return;

    try {
      setDeactivatingPlanId(planToDeactivate.id);
      await PlanService.deactivatePlan(planToDeactivate.id);
      await loadPlans(); // Reload plans
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desativar plano');
    } finally {
      setDeactivatingPlanId(null);
      setShowDeactivateConfirm(false);
      setPlanToDeactivate(null);
    }
  };

  const handleDeactivateCancel = () => {
    setShowDeactivateConfirm(false);
    setPlanToDeactivate(null);
  };

  const handleViewPlan = (plan: Plan) => {
    setPlanToView(plan);
    setShowViewDialog(true);
  };

  const handleEditPlan = (plan: Plan) => {
    setPlanToEdit(plan);
    setShowEditForm(true);
  };

  const handlePricesClick = (plan: Plan) => {
    setSelectedPlanId(plan.id);
    setActiveTab('regional-pricing');
  };

  const handleCloseViewDialog = () => {
    setShowViewDialog(false);
    setPlanToView(null);
  };

  const handleCloseEditForm = () => {
    setShowEditForm(false);
    setPlanToEdit(null);
  };

  const handleEditSuccess = () => {
    setShowEditForm(false);
    setPlanToEdit(null);
    loadPlans(); // Reload plans after edit
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
    return <PlansListSkeleton />;
  }

  if (error) {
    return (
      <EmptyState
        title="Erro ao carregar planos"
        description={error}
        action={
          <LoadingButton
            onClick={() => loadPlans()}
            loading={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Tentar novamente
          </LoadingButton>
        }
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Gestão de Planos</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Gerencie os planos de assinatura e preços regionais da plataforma
          </p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 sm:flex-shrink-0">
          <LoadingButton
            onClick={() => loadPlans(true)}
            loading={refreshing}
            variant="outline"
            className="w-full sm:w-auto border border-gray-300 text-gray-700 hover:bg-gray-50"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            <span className="sm:inline">Atualizar</span>
          </LoadingButton>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="w-full sm:w-auto"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="sm:inline">Novo Plano</span>
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-10">
          <TabsTrigger value="plans" className="text-sm sm:text-base py-2">
            Planos
          </TabsTrigger>
          <TabsTrigger value="regional-pricing" className="flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base py-2">
            <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Preços Regionais</span>
            <span className="sm:hidden">Preços</span>
          </TabsTrigger>
          <TabsTrigger value="enterprise" className="flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base py-2">
            <Crown className="h-3 w-3 sm:h-4 sm:w-4" />
            Enterprise
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          {/* Plans Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative">
            <CardHeader className="pb-3 sm:pb-6">
              <div className="flex flex-col space-y-2 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
                <div className="min-w-0 flex-1">
                  <CardTitle className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:gap-2">
                    <span className="text-base sm:text-lg truncate">{plan.name}</span>
                    <Badge className={`${getPlanBadgeColor(plan.code)} text-xs self-start sm:self-auto`}>
                      {plan.code.toUpperCase()}
                    </Badge>
                  </CardTitle>
                  {plan.description && (
                    <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{plan.description}</p>
                  )}
                </div>
                <Badge
                  variant={plan.is_active ? 'default' : 'secondary'}
                  className="text-xs self-start sm:self-auto sm:flex-shrink-0"
                >
                  {plan.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-3 sm:space-y-4">
                {/* Price */}
                <div className="text-center bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {formatPrice(plan.price, plan.currency)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">
                    por {plan.interval === 'month' ? 'mês' : 'ano'}
                  </div>
                  {plan.setup_fee_cents && plan.setup_fee_cents > 0 && (
                    <div className="text-xs text-orange-600 mt-1">
                      + {formatPrice(plan.setup_fee_cents / 100, plan.currency)} taxa de setup
                    </div>
                  )}
                </div>

                {/* Limits */}
                <div className="space-y-2">
                  <h4 className="text-sm sm:text-base font-medium text-gray-900">Limites:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-1">
                    <div className="text-xs sm:text-sm text-gray-600 flex items-center">
                      <span className="mr-2">👥</span>
                      <span>{plan.limits.max_users} usuários</span>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 flex items-center">
                      <span className="mr-2">📁</span>
                      <span>{plan.limits.max_projects} projetos</span>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 flex items-center">
                      <span className="mr-2">💾</span>
                      <span>{plan.limits.storage_gb}GB storage</span>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  <h4 className="text-sm sm:text-base font-medium text-gray-900">Recursos:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs sm:text-sm text-gray-600">
                    {Object.entries(plan.features).slice(0, 6).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className={`text-xs ${value ? 'text-green-600' : 'text-red-600'}`}>
                          {value ? '✓' : '✗'}
                        </span>
                        <span className="capitalize truncate">
                          {key.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                    {Object.entries(plan.features).length > 6 && (
                      <div className="text-xs text-gray-500 col-span-full">
                        +{Object.entries(plan.features).length - 6} mais recursos...
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 sm:pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm"
                      onClick={() => handleViewPlan(plan)}
                    >
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden sm:inline">Ver</span>
                      <span className="sm:hidden">👁</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm"
                      onClick={() => handleEditPlan(plan)}
                    >
                      <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden sm:inline">Editar</span>
                      <span className="sm:hidden">✏️</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm"
                      onClick={() => handlePricesClick(plan)}
                    >
                      <Globe className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden sm:inline">Preços</span>
                      <span className="sm:hidden">💰</span>
                    </Button>
                    <LoadingButton
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm text-red-600 hover:text-red-700"
                      onClick={() => handleDeactivateClick(plan)}
                      loading={deactivatingPlanId === plan.id}
                      disabled={deactivatingPlanId === plan.id}
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden sm:inline">Desativar</span>
                      <span className="sm:hidden">🗑️</span>
                    </LoadingButton>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
          </div>

          {plans.length === 0 && (
            <EmptyState
              title="Nenhum plano encontrado"
              description="Crie seu primeiro plano para começar a gerenciar assinaturas."
              action={
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Plano
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="regional-pricing" className="space-y-6">
          <RegionalPricingManager planId={selectedPlanId || undefined} />
        </TabsContent>

        <TabsContent value="enterprise" className="space-y-6">
          <EnterpriseManager />
        </TabsContent>
      </Tabs>

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

      {/* Edit Plan Form */}
      {showEditForm && planToEdit && (
        <PlanForm
          isOpen={showEditForm}
          onClose={handleCloseEditForm}
          onSuccess={handleEditSuccess}
          plan={planToEdit}
        />
      )}

      {/* View Plan Dialog */}
      <PlanViewDialog
        isOpen={showViewDialog}
        onClose={handleCloseViewDialog}
        plan={planToView}
      />

      {/* Deactivate Confirmation Dialog */}
      <DeactivateConfirmation
        isOpen={showDeactivateConfirm}
        onClose={handleDeactivateCancel}
        onConfirm={handleDeactivateConfirm}
        itemName={planToDeactivate?.name || ''}
        itemType="plano"
        consequences={[
          'O plano ficará indisponível para novos clientes',
          'Clientes existentes manterão suas assinaturas ativas',
          'Pode ser reativado a qualquer momento',
          'Histórico de assinaturas será preservado'
        ]}
      />
    </div>
  );
}
