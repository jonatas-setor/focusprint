'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LicenseService, License } from '@/lib/licenses/service';

interface LicenseActionsProps {
  license: License;
  onUpdate?: () => void;
}

export default function LicenseActions({ license, onUpdate }: LicenseActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: string, actionFn: () => Promise<any>) => {
    try {
      setLoading(action);
      setError(null);
      await actionFn();
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error(`Error ${action}:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setLoading(null);
    }
  };

  const suspendLicense = () => handleAction(
    'suspend',
    () => LicenseService.suspendLicense(license.id)
  );

  const activateLicense = () => handleAction(
    'activate',
    () => LicenseService.activateLicense(license.id)
  );

  const upgradeToPro = () => handleAction(
    'upgrade',
    () => LicenseService.changePlan(license.id, 'pro')
  );

  const upgradeToBusiness = () => handleAction(
    'upgrade',
    () => LicenseService.changePlan(license.id, 'business')
  );

  const downgradeTo = (plan: 'free' | 'pro') => handleAction(
    'downgrade',
    () => LicenseService.changePlan(license.id, plan)
  );

  const extendTrial = async () => {
    const days = prompt('Quantos dias estender o trial? (padrão: 30)');
    const reason = prompt('Motivo da extensão (opcional):');

    try {
      setLoading('extend');
      setError(null);

      const response = await fetch(`/api/admin/licenses/${license.id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days: days ? parseInt(days) : 30,
          reason
        })
      });

      if (!response.ok) {
        throw new Error('Failed to extend trial');
      }

      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error('Error extending trial:', err);
      setError(err instanceof Error ? err.message : 'Failed to extend trial');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* License Status Actions */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">Status da Licença</h4>
        <div className="flex items-center space-x-2">
          <Badge className={
            license.status === 'active' ? 'bg-green-100 text-green-800' :
            license.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }>
            {license.status}
          </Badge>
          
          {license.status === 'active' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={suspendLicense}
              disabled={loading === 'suspend'}
            >
              {loading === 'suspend' ? 'Suspendendo...' : 'Suspender'}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={activateLicense}
              disabled={loading === 'activate'}
            >
              {loading === 'activate' ? 'Ativando...' : 'Ativar'}
            </Button>
          )}

          {/* Extend Trial Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={extendTrial}
            disabled={loading === 'extend'}
          >
            {loading === 'extend' ? 'Estendendo...' : 'Estender Trial'}
          </Button>
        </div>
      </div>

      {/* Plan Change Actions */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">Alterar Plano</h4>
        <div className="flex items-center space-x-2">
          <Badge className={
            license.plan_type === 'free' ? 'bg-gray-100 text-gray-800' :
            license.plan_type === 'pro' ? 'bg-blue-100 text-blue-800' :
            'bg-purple-100 text-purple-800'
          }>
            {license.plan_type.toUpperCase()}
          </Badge>
          
          <div className="flex space-x-1">
            {license.plan_type !== 'pro' && (
              <Button
                size="sm"
                variant="outline"
                onClick={upgradeToPro}
                disabled={loading === 'upgrade'}
              >
                {loading === 'upgrade' ? 'Alterando...' : 'Pro'}
              </Button>
            )}
            
            {license.plan_type !== 'business' && (
              <Button
                size="sm"
                variant="outline"
                onClick={upgradeToBusiness}
                disabled={loading === 'upgrade'}
              >
                {loading === 'upgrade' ? 'Alterando...' : 'Business'}
              </Button>
            )}
            
            {license.plan_type !== 'free' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => downgradeTo('free')}
                disabled={loading === 'downgrade'}
              >
                {loading === 'downgrade' ? 'Alterando...' : 'Free'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* License Details */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">Detalhes</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>ID: <span className="font-mono">{license.id}</span></div>
          <div>Usuários: <span className="font-medium">{license.max_users}</span></div>
          <div>Projetos: <span className="font-medium">{license.max_projects}</span></div>
          <div>Criado: <span className="font-medium">
            {new Date(license.created_at).toLocaleDateString('pt-BR')}
          </span></div>
          {license.current_period_end && (
            <div>Expira: <span className="font-medium">
              {new Date(license.current_period_end).toLocaleDateString('pt-BR')}
            </span></div>
          )}
        </div>
      </div>

      {/* Revenue Information */}
      {license.plan_type !== 'free' && license.status === 'active' && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Receita</h4>
          <div className="text-sm text-gray-600">
            <div>Valor mensal: <span className="font-medium text-green-600">
              R$ {license.plan_type === 'pro' ? '97' : '399'}
            </span></div>
          </div>
        </div>
      )}
    </div>
  );
}
