'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log error to monitoring service (e.g., Sentry)
    this.logErrorToService(error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
    // In production, send to error monitoring service
    console.error('Error logged:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  };

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent 
          error={this.state.error!} 
          resetError={this.resetError} 
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Algo deu errado</CardTitle>
          <CardDescription>
            Ocorreu um erro inesperado. Nossa equipe foi notificada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDevelopment && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm font-medium text-destructive mb-2">
                Erro de Desenvolvimento:
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {error.message}
              </p>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button onClick={resetError} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar Novamente
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/admin'}
              className="flex-1"
            >
              <Home className="mr-2 h-4 w-4" />
              Início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Specific error fallback for admin pages
export function AdminErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Erro no Painel Administrativo</CardTitle>
          <CardDescription>
            Ocorreu um erro ao carregar esta seção do painel administrativo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDevelopment && (
            <details className="rounded-md bg-muted p-3">
              <summary className="text-sm font-medium text-destructive cursor-pointer mb-2">
                Detalhes do Erro (Desenvolvimento)
              </summary>
              <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
                {error.stack}
              </pre>
            </details>
          )}
          
          <div className="flex gap-2">
            <Button onClick={resetError} size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Recarregar
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/admin'}
            >
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for handling async errors
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    console.error('Async error caught:', error);
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, resetError };
}

// Utility function for API error handling
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return 'Ocorreu um erro inesperado';
}

// Network error handler
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && error.message.includes('fetch');
}

// Validation error handler
export function isValidationError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('validation');
}

export default ErrorBoundary;
