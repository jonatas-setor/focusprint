'use client';

import { AlertTriangle, XCircle, Info, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ActionableError } from '@/lib/utils/error-messages';

interface ErrorDisplayProps {
  error: ActionableError;
  className?: string;
}

export function ErrorDisplay({ error, className = '' }: ErrorDisplayProps) {
  const getIcon = () => {
    switch (error.type) {
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

  const getVariant = () => {
    switch (error.type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
      default:
        return 'destructive';
    }
  };

  const getButtonVariant = (actionVariant?: string) => {
    switch (actionVariant) {
      case 'primary':
        return 'default';
      case 'secondary':
        return 'outline';
      case 'destructive':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Alert variant={getVariant()} className={className}>
      {getIcon()}
      <AlertTitle>{error.title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-4">{error.message}</p>
        {error.actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {error.actions.map((action, index) => (
              <Button
                key={index}
                variant={getButtonVariant(action.variant)}
                size="sm"
                onClick={action.action}
                className="text-sm"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function InlineError({ 
  message, 
  onRetry, 
  retryLabel = 'Tentar Novamente',
  className = '' 
}: InlineErrorProps) {
  return (
    <div className={`flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-md ${className}`}>
      <div className="flex items-center">
        <XCircle className="h-4 w-4 text-red-500 mr-2" />
        <span className="text-sm text-red-700">{message}</span>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="ml-3 text-red-700 border-red-300 hover:bg-red-100"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

interface FormErrorProps {
  errors: Record<string, string>;
  className?: string;
}

export function FormError({ errors, className = '' }: FormErrorProps) {
  const errorEntries = Object.entries(errors);
  
  if (errorEntries.length === 0) return null;

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Erro de Validação</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 space-y-1">
          {errorEntries.map(([field, message]) => (
            <li key={field} className="text-sm">
              <strong>{field}:</strong> {message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

interface NetworkErrorProps {
  onRetry: () => void;
  className?: string;
}

export function NetworkError({ onRetry, className = '' }: NetworkErrorProps) {
  return (
    <Alert variant="destructive" className={className}>
      <XCircle className="h-4 w-4" />
      <AlertTitle>Erro de Conexão</AlertTitle>
      <AlertDescription>
        <p className="mb-3">
          Não foi possível conectar ao servidor. Verifique sua conexão com a internet.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Tentar Novamente
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open('/admin/system-status', '_blank')}
          >
            Verificar Status
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface PermissionErrorProps {
  resource?: string;
  className?: string;
}

export function PermissionError({ resource = 'este recurso', className = '' }: PermissionErrorProps) {
  return (
    <Alert variant="destructive" className={className}>
      <XCircle className="h-4 w-4" />
      <AlertTitle>Acesso Negado</AlertTitle>
      <AlertDescription>
        <p className="mb-3">
          Você não tem permissão para acessar {resource}. Entre em contato com o administrador.
        </p>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.href = '/admin/login'}
          >
            Fazer Login Novamente
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open('mailto:suporte@focusprint.com', '_blank')}
          >
            Contatar Suporte
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface ValidationErrorProps {
  errors: Array<{ field: string; message: string }>;
  onFocusField?: (field: string) => void;
  className?: string;
}

export function ValidationError({ 
  errors, 
  onFocusField,
  className = '' 
}: ValidationErrorProps) {
  if (errors.length === 0) return null;

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Dados Inválidos</AlertTitle>
      <AlertDescription>
        <p className="mb-2">Corrija os seguintes erros:</p>
        <ul className="space-y-1">
          {errors.map((error, index) => (
            <li key={index} className="flex items-center justify-between text-sm">
              <span>
                <strong>{error.field}:</strong> {error.message}
              </span>
              {onFocusField && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFocusField(error.field)}
                  className="ml-2 h-6 px-2 text-xs"
                >
                  Corrigir
                </Button>
              )}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
