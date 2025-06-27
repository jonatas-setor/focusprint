'use client';

import { useState, useCallback } from 'react';

export interface ConfirmationOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'warning' | 'info';
  requiresTyping?: boolean;
  confirmationText?: string;
  details?: string[];
}

export interface ConfirmationState {
  isOpen: boolean;
  options: ConfirmationOptions | null;
  onConfirm: (() => Promise<void> | void) | null;
}

export function useConfirmation() {
  const [state, setState] = useState<ConfirmationState>({
    isOpen: false,
    options: null,
    onConfirm: null,
  });

  const confirm = useCallback((
    options: ConfirmationOptions,
    onConfirm: () => Promise<void> | void
  ) => {
    setState({
      isOpen: true,
      options,
      onConfirm,
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (state.onConfirm) {
      await state.onConfirm();
    }
    setState({
      isOpen: false,
      options: null,
      onConfirm: null,
    });
  }, [state.onConfirm]);

  const handleCancel = useCallback(() => {
    setState({
      isOpen: false,
      options: null,
      onConfirm: null,
    });
  }, []);

  return {
    ...state,
    confirm,
    handleConfirm,
    handleCancel,
  };
}

// Specialized hooks for common confirmation patterns
export function useDeleteConfirmation() {
  const confirmation = useConfirmation();

  const confirmDelete = useCallback((
    itemName: string,
    onConfirm: () => Promise<void> | void,
    options?: {
      itemType?: string;
      consequences?: string[];
      requiresTyping?: boolean;
    }
  ) => {
    const { itemType = 'item', consequences = [], requiresTyping = false } = options || {};
    
    const defaultConsequences = [
      'Esta ação não pode ser desfeita',
      'Todos os dados relacionados serão removidos',
      'Usuários podem perder acesso a funcionalidades'
    ];

    confirmation.confirm({
      title: `Excluir ${itemType}`,
      description: `Tem certeza que deseja excluir "${itemName}"?`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'destructive',
      requiresTyping,
      confirmationText: requiresTyping ? 'EXCLUIR' : '',
      details: consequences.length > 0 ? consequences : defaultConsequences,
    }, onConfirm);
  }, [confirmation]);

  return {
    ...confirmation,
    confirmDelete,
  };
}

export function useDeactivateConfirmation() {
  const confirmation = useConfirmation();

  const confirmDeactivate = useCallback((
    itemName: string,
    onConfirm: () => Promise<void> | void,
    options?: {
      itemType?: string;
      consequences?: string[];
    }
  ) => {
    const { itemType = 'item', consequences = [] } = options || {};
    
    const defaultConsequences = [
      'O item ficará indisponível para novos usuários',
      'Usuários existentes manterão acesso',
      'Pode ser reativado a qualquer momento'
    ];

    confirmation.confirm({
      title: `Desativar ${itemType}`,
      description: `Tem certeza que deseja desativar "${itemName}"?`,
      confirmText: 'Desativar',
      cancelText: 'Cancelar',
      variant: 'warning',
      details: consequences.length > 0 ? consequences : defaultConsequences,
    }, onConfirm);
  }, [confirmation]);

  return {
    ...confirmation,
    confirmDeactivate,
  };
}

export function useBulkActionConfirmation() {
  const confirmation = useConfirmation();

  const confirmBulkAction = useCallback((
    action: string,
    itemCount: number,
    onConfirm: () => Promise<void> | void,
    options?: {
      itemType?: string;
      consequences?: string[];
      requiresTyping?: boolean;
    }
  ) => {
    const { itemType = 'itens', consequences = [], requiresTyping = false } = options || {};

    confirmation.confirm({
      title: `${action} ${itemCount} ${itemType}`,
      description: `Tem certeza que deseja ${action.toLowerCase()} ${itemCount} ${itemType}?`,
      confirmText: action,
      cancelText: 'Cancelar',
      variant: 'destructive',
      requiresTyping,
      confirmationText: requiresTyping ? action.toUpperCase() : '',
      details: consequences.length > 0 ? consequences : [
        `Esta ação afetará ${itemCount} ${itemType}`,
        'Esta ação não pode ser desfeita',
        'Verifique se você selecionou os itens corretos'
      ],
    }, onConfirm);
  }, [confirmation]);

  return {
    ...confirmation,
    confirmBulkAction,
  };
}
