'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, Shield, Info } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-skeletons';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'warning' | 'info';
  requiresTyping?: boolean;
  confirmationText?: string;
  details?: string[];
  icon?: React.ReactNode;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'destructive',
  requiresTyping = false,
  confirmationText = '',
  details = [],
  icon
}: ConfirmationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [typedText, setTypedText] = useState('');

  const handleConfirm = async () => {
    if (requiresTyping && typedText !== confirmationText) {
      return;
    }

    try {
      setLoading(true);
      await onConfirm();
      onClose();
    } catch (error) {
      // Error handling is done by the parent component
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setTypedText('');
      onClose();
    }
  };

  const getIcon = () => {
    if (icon) return icon;
    
    switch (variant) {
      case 'destructive':
        return <AlertTriangle className="h-6 w-6 text-red-600" />;
      case 'warning':
        return <Shield className="h-6 w-6 text-yellow-600" />;
      case 'info':
        return <Info className="h-6 w-6 text-blue-600" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-red-600" />;
    }
  };

  const getButtonVariant = () => {
    switch (variant) {
      case 'destructive':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
      default:
        return 'destructive';
    }
  };

  const isConfirmDisabled = requiresTyping && typedText !== confirmationText;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <DialogTitle className="text-lg font-semibold">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600 mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        {details.length > 0 && (
          <div className="my-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Esta ação irá:
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              {details.map((detail, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-gray-400 mr-2">•</span>
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        {requiresTyping && (
          <div className="my-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Para confirmar, digite: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{confirmationText}</code>
            </p>
            <input
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder={`Digite "${confirmationText}" para confirmar`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
        )}

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <LoadingButton
            variant={getButtonVariant()}
            onClick={handleConfirm}
            loading={loading}
            disabled={isConfirmDisabled}
            className="flex-1"
          >
            {confirmText}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Specialized confirmation dialogs for common use cases
export interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  itemName: string;
  itemType?: string;
  consequences?: string[];
  requiresTyping?: boolean;
}

export function DeleteConfirmation({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = 'item',
  consequences = [],
  requiresTyping = false
}: DeleteConfirmationProps) {
  const defaultConsequences = [
    'Esta ação não pode ser desfeita',
    'Todos os dados relacionados serão removidos',
    'Usuários podem perder acesso a funcionalidades'
  ];

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Excluir ${itemType}`}
      description={`Tem certeza que deseja excluir "${itemName}"?`}
      confirmText="Excluir"
      cancelText="Cancelar"
      variant="destructive"
      requiresTyping={requiresTyping}
      confirmationText={requiresTyping ? 'EXCLUIR' : ''}
      details={consequences.length > 0 ? consequences : defaultConsequences}
      icon={<Trash2 className="h-6 w-6 text-red-600" />}
    />
  );
}

export interface DeactivateConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  itemName: string;
  itemType?: string;
  consequences?: string[];
}

export function DeactivateConfirmation({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = 'item',
  consequences = []
}: DeactivateConfirmationProps) {
  const defaultConsequences = [
    'O item ficará indisponível para novos usuários',
    'Usuários existentes manterão acesso',
    'Pode ser reativado a qualquer momento'
  ];

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Desativar ${itemType}`}
      description={`Tem certeza que deseja desativar "${itemName}"?`}
      confirmText="Desativar"
      cancelText="Cancelar"
      variant="warning"
      details={consequences.length > 0 ? consequences : defaultConsequences}
      icon={<Shield className="h-6 w-6 text-yellow-600" />}
    />
  );
}
