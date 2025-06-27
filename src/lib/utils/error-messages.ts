/**
 * Contextual and actionable error messages for the plans CRUD system
 */

export interface ErrorContext {
  operation: 'create' | 'update' | 'delete' | 'fetch' | 'validate';
  resource: 'plan' | 'pricing' | 'enterprise' | 'quote' | 'migration';
  details?: Record<string, any>;
}

export interface ActionableError {
  title: string;
  message: string;
  actions: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary' | 'destructive';
  }>;
  type: 'error' | 'warning' | 'info';
}

/**
 * Generate contextual error messages based on error type and context
 */
export function getContextualErrorMessage(
  error: Error | string,
  context: ErrorContext
): ActionableError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorLower = errorMessage.toLowerCase();

  // Network/Connection Errors
  if (errorLower.includes('connection') || errorLower.includes('network') || errorLower.includes('fetch')) {
    return {
      title: 'Problema de Conexão',
      message: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.',
      actions: [
        {
          label: 'Tentar Novamente',
          action: () => window.location.reload(),
          variant: 'primary'
        },
        {
          label: 'Verificar Status',
          action: () => window.open('/admin/system-status', '_blank'),
          variant: 'secondary'
        }
      ],
      type: 'error'
    };
  }

  // Permission Errors
  if (errorLower.includes('permission') || errorLower.includes('unauthorized') || errorLower.includes('forbidden')) {
    return {
      title: 'Acesso Negado',
      message: 'Você não tem permissão para realizar esta ação. Entre em contato com o administrador.',
      actions: [
        {
          label: 'Fazer Login Novamente',
          action: () => window.location.href = '/admin/login',
          variant: 'primary'
        },
        {
          label: 'Contatar Suporte',
          action: () => window.open('mailto:suporte@focusprint.com', '_blank'),
          variant: 'secondary'
        }
      ],
      type: 'error'
    };
  }

  // Validation Errors
  if (errorLower.includes('validation') || errorLower.includes('invalid') || errorLower.includes('required')) {
    const planValidationMessages = {
      create: 'Verifique se todos os campos obrigatórios estão preenchidos corretamente.',
      update: 'Os dados fornecidos não são válidos. Revise as informações inseridas.',
      delete: 'Não é possível excluir este plano devido a restrições de dados.',
      fetch: 'Erro ao validar os dados do plano.',
      validate: 'Os dados não atendem aos critérios de validação.'
    };

    return {
      title: 'Dados Inválidos',
      message: planValidationMessages[context.operation],
      actions: [
        {
          label: 'Revisar Formulário',
          action: () => {
            // Focus on first invalid field
            const firstError = document.querySelector('[aria-invalid="true"]') as HTMLElement;
            firstError?.focus();
          },
          variant: 'primary'
        },
        {
          label: 'Ver Requisitos',
          action: () => window.open('/admin/help/plan-requirements', '_blank'),
          variant: 'secondary'
        }
      ],
      type: 'warning'
    };
  }

  // Duplicate/Conflict Errors
  if (errorLower.includes('duplicate') || errorLower.includes('already exists') || errorLower.includes('conflict')) {
    const conflictMessages = {
      plan: 'Um plano com este código já existe. Use um código único.',
      pricing: 'Já existe um preço configurado para esta região.',
      enterprise: 'Esta cotação enterprise já foi criada.',
      quote: 'Cotação duplicada encontrada.',
      migration: 'Esta migração já foi processada.'
    };

    return {
      title: 'Recurso Já Existe',
      message: conflictMessages[context.resource],
      actions: [
        {
          label: 'Usar Código Diferente',
          action: () => {
            const codeField = document.querySelector('[name="code"]') as HTMLInputElement;
            if (codeField) {
              codeField.focus();
              codeField.select();
            }
          },
          variant: 'primary'
        },
        {
          label: 'Ver Planos Existentes',
          action: () => window.location.href = '/admin/plans',
          variant: 'secondary'
        }
      ],
      type: 'warning'
    };
  }

  // Not Found Errors
  if (errorLower.includes('not found') || errorLower.includes('404')) {
    const notFoundMessages = {
      plan: 'O plano solicitado não foi encontrado ou foi removido.',
      pricing: 'Configuração de preço não encontrada.',
      enterprise: 'Plano enterprise não configurado.',
      quote: 'Cotação não encontrada.',
      migration: 'Migração não encontrada.'
    };

    return {
      title: 'Recurso Não Encontrado',
      message: notFoundMessages[context.resource],
      actions: [
        {
          label: 'Voltar à Lista',
          action: () => window.location.href = '/admin/plans',
          variant: 'primary'
        },
        {
          label: 'Criar Novo',
          action: () => {
            const createButton = document.querySelector('[data-action="create"]') as HTMLElement;
            createButton?.click();
          },
          variant: 'secondary'
        }
      ],
      type: 'info'
    };
  }

  // Rate Limit Errors
  if (errorLower.includes('rate limit') || errorLower.includes('too many requests')) {
    return {
      title: 'Muitas Tentativas',
      message: 'Você fez muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
      actions: [
        {
          label: 'Aguardar e Tentar',
          action: () => {
            setTimeout(() => window.location.reload(), 60000);
          },
          variant: 'primary'
        }
      ],
      type: 'warning'
    };
  }

  // Server Errors
  if (errorLower.includes('server error') || errorLower.includes('500') || errorLower.includes('internal')) {
    return {
      title: 'Erro do Servidor',
      message: 'Ocorreu um erro interno no servidor. Nossa equipe foi notificada.',
      actions: [
        {
          label: 'Tentar Novamente',
          action: () => window.location.reload(),
          variant: 'primary'
        },
        {
          label: 'Reportar Problema',
          action: () => window.open('mailto:suporte@focusprint.com?subject=Erro do Servidor - Plans CRUD', '_blank'),
          variant: 'secondary'
        }
      ],
      type: 'error'
    };
  }

  // Default error message
  return {
    title: 'Erro Inesperado',
    message: errorMessage || 'Ocorreu um erro inesperado. Tente novamente.',
    actions: [
      {
        label: 'Tentar Novamente',
        action: () => window.location.reload(),
        variant: 'primary'
      },
      {
        label: 'Contatar Suporte',
        action: () => window.open('mailto:suporte@focusprint.com', '_blank'),
        variant: 'secondary'
      }
    ],
    type: 'error'
  };
}

/**
 * Format validation errors from Zod or similar validators
 */
export function formatValidationErrors(errors: Array<{ path: string[]; message: string }>): string {
  if (errors.length === 0) return 'Erro de validação desconhecido';
  
  if (errors.length === 1) {
    const error = errors[0];
    const fieldName = error.path.join('.');
    return `${fieldName}: ${error.message}`;
  }

  const errorList = errors
    .map(error => `• ${error.path.join('.')}: ${error.message}`)
    .join('\n');
  
  return `Múltiplos erros encontrados:\n${errorList}`;
}

/**
 * Get user-friendly field names for error messages
 */
export function getFieldDisplayName(fieldPath: string): string {
  const fieldNames: Record<string, string> = {
    'name': 'Nome do Plano',
    'code': 'Código do Plano',
    'description': 'Descrição',
    'price': 'Preço',
    'currency': 'Moeda',
    'interval': 'Intervalo de Cobrança',
    'annual_price_cents': 'Preço Anual',
    'setup_fee_cents': 'Taxa de Setup',
    'trial_days': 'Dias de Trial',
    'features': 'Recursos',
    'limits.max_users': 'Limite de Usuários',
    'limits.max_projects': 'Limite de Projetos',
    'limits.storage_gb': 'Limite de Armazenamento',
    'contact_email': 'Email de Contato',
    'company_name': 'Nome da Empresa',
    'estimated_users': 'Usuários Estimados',
    'estimated_projects': 'Projetos Estimados'
  };

  return fieldNames[fieldPath] || fieldPath;
}
