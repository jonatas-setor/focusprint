'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ShieldCheck, ShieldX, Settings, AlertTriangle } from 'lucide-react';

interface TwoFactorStatusProps {
  enabled: boolean;
  hasActiveSession: boolean;
  canSetup: boolean;
  onSetup: () => void;
  onDisable?: () => void;
  onRegenerateBackupCodes?: () => void;
}

export function TwoFactorStatus({
  enabled,
  hasActiveSession,
  canSetup,
  onSetup,
  onDisable,
  onRegenerateBackupCodes
}: TwoFactorStatusProps) {
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    try {
      await onSetup();
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (onDisable) {
      setLoading(true);
      try {
        await onDisable();
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (onRegenerateBackupCodes) {
      setLoading(true);
      try {
        await onRegenerateBackupCodes();
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Display */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          {enabled ? (
            <ShieldCheck className="h-6 w-6 text-green-600" />
          ) : (
            <ShieldX className="h-6 w-6 text-gray-400" />
          )}
          <div>
            <h3 className="font-medium text-gray-900">
              Autenticação de Dois Fatores
            </h3>
            <p className="text-sm text-gray-600">
              {enabled 
                ? 'Sua conta está protegida com 2FA' 
                : 'Adicione uma camada extra de segurança'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={enabled ? "default" : "secondary"}
            className={enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
          >
            {enabled ? 'Ativado' : 'Desativado'}
          </Badge>
        </div>
      </div>

      {/* Active Setup Session Warning */}
      {hasActiveSession && !enabled && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Você tem uma sessão de configuração 2FA ativa. Complete a configuração ou ela expirará em alguns minutos.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {!enabled && canSetup && (
          <Button 
            onClick={handleSetup}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Shield className="h-4 w-4" />
            {loading ? 'Configurando...' : 'Configurar 2FA'}
          </Button>
        )}

        {enabled && (
          <>
            <Button 
              variant="outline"
              onClick={handleRegenerateBackupCodes}
              disabled={loading || !onRegenerateBackupCodes}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Gerar Novos Códigos de Backup
            </Button>
            
            <Button 
              variant="destructive"
              onClick={handleDisable}
              disabled={loading || !onDisable}
              className="flex items-center gap-2"
            >
              <ShieldX className="h-4 w-4" />
              Desativar 2FA
            </Button>
          </>
        )}
      </div>

      {/* Security Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Como funciona o 2FA?</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use um aplicativo como Google Authenticator ou Authy</li>
          <li>• Escaneie o código QR ou digite a chave manualmente</li>
          <li>• Digite o código de 6 dígitos sempre que fizer login</li>
          <li>• Guarde os códigos de backup em local seguro</li>
        </ul>
      </div>

      {/* Backup Codes Information */}
      {enabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-medium text-amber-900 mb-2">Códigos de Backup</h4>
          <p className="text-sm text-amber-800">
            Os códigos de backup permitem acessar sua conta se você perder acesso ao seu 
            dispositivo de autenticação. Cada código pode ser usado apenas uma vez.
          </p>
        </div>
      )}
    </div>
  );
}
