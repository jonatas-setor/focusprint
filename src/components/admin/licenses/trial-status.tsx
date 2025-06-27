'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Plus
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TrialStatusProps {
  license: {
    id: string;
    status: 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired';
    trial_ends_at?: string;
    plan_name?: string;
    client_name?: string;
  };
  onExtendTrial?: (licenseId: string, days: number) => Promise<void>;
  onConvertToActive?: (licenseId: string) => Promise<void>;
  onExpireTrial?: (licenseId: string) => Promise<void>;
}

export function TrialStatus({ 
  license, 
  onExtendTrial, 
  onConvertToActive, 
  onExpireTrial 
}: TrialStatusProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const isTrialActive = license.status === 'trial';
  const trialEndDate = license.trial_ends_at ? new Date(license.trial_ends_at) : null;
  const now = new Date();
  const isExpired = trialEndDate ? now > trialEndDate : false;
  const daysRemaining = trialEndDate && !isExpired 
    ? Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const getStatusBadge = () => {
    if (!isTrialActive) {
      const statusConfig = {
        active: { variant: 'default' as const, label: 'Ativa', icon: CheckCircle },
        suspended: { variant: 'secondary' as const, label: 'Suspensa', icon: AlertTriangle },
        cancelled: { variant: 'destructive' as const, label: 'Cancelada', icon: XCircle },
        expired: { variant: 'destructive' as const, label: 'Expirada', icon: XCircle }
      };

      const config = statusConfig[license.status as keyof typeof statusConfig] || 
                     { variant: 'outline' as const, label: license.status, icon: AlertTriangle };
      
      const Icon = config.icon;
      
      return (
        <Badge variant={config.variant} className="flex items-center gap-1">
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
      );
    }

    if (isExpired) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Trial Expirado
        </Badge>
      );
    }

    if (daysRemaining <= 3) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Trial expira em {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''}
        </Badge>
      );
    }

    if (daysRemaining <= 7) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Trial expira em {daysRemaining} dias
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Trial ativo - {daysRemaining} dias restantes
      </Badge>
    );
  };

  const handleExtendTrial = async () => {
    if (!onExtendTrial) return;
    
    const days = prompt('Quantos dias estender o trial? (padrão: 30)');
    if (!days) return;
    
    const daysNumber = parseInt(days);
    if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
      alert('Por favor, insira um número válido entre 1 e 365 dias.');
      return;
    }

    try {
      setLoading('extend');
      await onExtendTrial(license.id, daysNumber);
    } catch (error) {
      console.error('Error extending trial:', error);
      alert('Erro ao estender trial. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  const handleConvertToActive = async () => {
    if (!onConvertToActive) return;
    
    if (!confirm('Converter trial para assinatura ativa? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setLoading('convert');
      await onConvertToActive(license.id);
    } catch (error) {
      console.error('Error converting trial:', error);
      alert('Erro ao converter trial. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  const handleExpireTrial = async () => {
    if (!onExpireTrial) return;
    
    if (!confirm('Expirar trial? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setLoading('expire');
      await onExpireTrial(license.id);
    } catch (error) {
      console.error('Error expiring trial:', error);
      alert('Erro ao expirar trial. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Status do Trial
          </span>
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          {license.client_name && `Cliente: ${license.client_name} • `}
          Plano: {license.plan_name || 'N/A'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isTrialActive && trialEndDate && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span>
                Trial expira em: {format(trialEndDate, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {isExpired 
                ? 'Trial expirado'
                : `${formatDistanceToNow(trialEndDate, { locale: ptBR, addSuffix: true })}`
              }
            </div>
          </div>
        )}

        {isExpired && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              O período de trial expirou. O cliente precisa fazer upgrade para continuar usando o serviço.
            </AlertDescription>
          </Alert>
        )}

        {isTrialActive && daysRemaining <= 3 && !isExpired && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Trial expira em breve! Considere entrar em contato com o cliente para fazer upgrade.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        {isTrialActive && (
          <div className="flex flex-wrap gap-2">
            {onExtendTrial && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleExtendTrial}
                disabled={loading === 'extend'}
              >
                <Plus className="h-4 w-4 mr-2" />
                {loading === 'extend' ? 'Estendendo...' : 'Estender Trial'}
              </Button>
            )}
            
            {onConvertToActive && (
              <Button
                size="sm"
                onClick={handleConvertToActive}
                disabled={loading === 'convert'}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {loading === 'convert' ? 'Convertendo...' : 'Converter para Ativo'}
              </Button>
            )}
            
            {onExpireTrial && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleExpireTrial}
                disabled={loading === 'expire'}
              >
                <XCircle className="h-4 w-4 mr-2" />
                {loading === 'expire' ? 'Expirando...' : 'Expirar Trial'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
