'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { QrCode, Key, Download, CheckCircle, AlertTriangle, Copy } from 'lucide-react';

interface TwoFactorSetupWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface SetupData {
  sessionId: string;
  qrCodeUrl: string;
  manualEntryKey: string;
  backupCodes: string[];
  expiresIn: number;
}

export function TwoFactorSetupWizard({ onComplete, onCancel }: TwoFactorSetupWizardProps) {
  const [step, setStep] = useState<'loading' | 'qr' | 'verify' | 'backup' | 'complete'>('loading');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    initializeSetup();
  }, []);

  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining]);

  const initializeSetup = async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize 2FA setup');
      }

      const data = await response.json();
      setSetupData(data);
      setTimeRemaining(data.expiresIn);
      setStep('qr');
    } catch (err) {
      console.error('Error initializing 2FA setup:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize setup');
    }
  };

  const verifyCode = async () => {
    if (!setupData || !verificationCode.trim()) {
      setError('Por favor, digite o código de verificação');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: setupData.sessionId,
          token: verificationCode.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      if (data.success) {
        setStep('backup');
      } else {
        throw new Error('Verification failed');
      }
    } catch (err) {
      console.error('Error verifying code:', err);
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    if (!setupData) return;

    const codesText = setupData.backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'focusprint-2fa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const completeSetup = () => {
    setStep('complete');
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  if (step === 'loading') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Inicializando configuração 2FA...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !setupData) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex gap-2">
            <Button onClick={initializeSetup}>Tentar Novamente</Button>
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Configurar Autenticação de Dois Fatores
        </CardTitle>
        <CardDescription>
          Siga os passos abaixo para configurar o 2FA em sua conta
        </CardDescription>
        {timeRemaining > 0 && (
          <Badge variant="outline" className="w-fit">
            Expira em: {formatTime(timeRemaining)}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 'qr' && setupData && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-medium mb-4">1. Escaneie o código QR</h3>
              <div className="bg-white p-4 rounded-lg border inline-block">
                <img 
                  src={setupData.qrCodeUrl} 
                  alt="QR Code para 2FA" 
                  className="w-48 h-48"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Key className="h-4 w-4" />
                Ou digite a chave manualmente:
              </h4>
              <div className="flex items-center gap-2">
                <code className="bg-white px-2 py-1 rounded text-sm font-mono flex-1">
                  {setupData.manualEntryKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(setupData.manualEntryKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setStep('verify')} className="flex-1">
                Continuar para Verificação
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-4">2. Digite o código de verificação</h3>
              <p className="text-sm text-gray-600 mb-4">
                Digite o código de 6 dígitos do seu aplicativo de autenticação:
              </p>
              <Input
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-lg font-mono"
                maxLength={6}
              />
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={verifyCode}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1"
              >
                {loading ? 'Verificando...' : 'Verificar Código'}
              </Button>
              <Button variant="outline" onClick={() => setStep('qr')}>
                Voltar
              </Button>
            </div>
          </div>
        )}

        {step === 'backup' && setupData && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Download className="h-4 w-4" />
                3. Salve os códigos de backup
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Guarde estes códigos em local seguro. Cada um pode ser usado apenas uma vez para acessar sua conta:
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {setupData.backupCodes.map((code, index) => (
                    <div key={index} className="bg-white px-2 py-1 rounded">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Importante:</strong> Salve estes códigos agora. Eles não serão mostrados novamente.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={downloadBackupCodes} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Baixar Códigos
              </Button>
              <Button onClick={completeSetup} className="flex-1">
                Finalizar Configuração
              </Button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <div>
              <h3 className="font-medium text-lg">2FA Configurado com Sucesso!</h3>
              <p className="text-gray-600">
                Sua conta agora está protegida com autenticação de dois fatores.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
