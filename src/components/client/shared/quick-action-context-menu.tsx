'use client';

import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
  ContextMenuLabel,
  ContextMenuGroup,
} from '@/components/ui/context-menu';
import {
  Edit,
  Copy,
  Trash2,
  Archive,
  Star,
  Share,
  Download,
  Eye,
  Settings,
  Users,
  MessageSquare,
  Plus,
  FolderOpen,
  Hash,
  Calendar,
  Clock,
  Flag,
  MoreHorizontal,
} from 'lucide-react';

export interface ContextAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  handler: () => void;
}

export interface ContextActionGroup {
  label?: string;
  actions: ContextAction[];
}

interface QuickActionContextMenuProps {
  children: React.ReactNode;
  actions: ContextActionGroup[];
  disabled?: boolean;
}

// Predefined action templates for common use cases
export const PROJECT_ACTIONS: ContextActionGroup[] = [
  {
    actions: [
      {
        id: 'open_project',
        label: 'Abrir Projeto',
        icon: <FolderOpen className="h-4 w-4" />,
        shortcut: 'Enter',
        handler: () => {},
      },
      {
        id: 'edit_project',
        label: 'Editar Projeto',
        icon: <Edit className="h-4 w-4" />,
        shortcut: 'Ctrl+E',
        handler: () => {},
      },
    ],
  },
  {
    label: 'Ações',
    actions: [
      {
        id: 'clone_project',
        label: 'Clonar Projeto',
        icon: <Copy className="h-4 w-4" />,
        handler: () => {},
      },
      {
        id: 'share_project',
        label: 'Compartilhar',
        icon: <Share className="h-4 w-4" />,
        handler: () => {},
      },
      {
        id: 'project_settings',
        label: 'Configurações',
        icon: <Settings className="h-4 w-4" />,
        handler: () => {},
      },
    ],
  },
  {
    actions: [
      {
        id: 'archive_project',
        label: 'Arquivar',
        icon: <Archive className="h-4 w-4" />,
        handler: () => {},
      },
      {
        id: 'delete_project',
        label: 'Excluir',
        icon: <Trash2 className="h-4 w-4" />,
        variant: 'destructive',
        handler: () => {},
      },
    ],
  },
];

export const TASK_ACTIONS: ContextActionGroup[] = [
  {
    actions: [
      {
        id: 'open_task',
        label: 'Abrir Tarefa',
        icon: <Eye className="h-4 w-4" />,
        shortcut: 'Enter',
        handler: () => {},
      },
      {
        id: 'edit_task',
        label: 'Editar Tarefa',
        icon: <Edit className="h-4 w-4" />,
        shortcut: 'Ctrl+E',
        handler: () => {},
      },
    ],
  },
  {
    label: 'Prioridade',
    actions: [
      {
        id: 'set_high_priority',
        label: 'Alta Prioridade',
        icon: <Flag className="h-4 w-4 text-red-500" />,
        handler: () => {},
      },
      {
        id: 'set_medium_priority',
        label: 'Média Prioridade',
        icon: <Flag className="h-4 w-4 text-yellow-500" />,
        handler: () => {},
      },
      {
        id: 'set_low_priority',
        label: 'Baixa Prioridade',
        icon: <Flag className="h-4 w-4 text-green-500" />,
        handler: () => {},
      },
    ],
  },
  {
    label: 'Ações',
    actions: [
      {
        id: 'duplicate_task',
        label: 'Duplicar',
        icon: <Copy className="h-4 w-4" />,
        handler: () => {},
      },
      {
        id: 'set_due_date',
        label: 'Definir Prazo',
        icon: <Calendar className="h-4 w-4" />,
        handler: () => {},
      },
      {
        id: 'assign_task',
        label: 'Atribuir',
        icon: <Users className="h-4 w-4" />,
        handler: () => {},
      },
    ],
  },
  {
    actions: [
      {
        id: 'delete_task',
        label: 'Excluir',
        icon: <Trash2 className="h-4 w-4" />,
        variant: 'destructive',
        handler: () => {},
      },
    ],
  },
];

export const CHAT_MESSAGE_ACTIONS: ContextActionGroup[] = [
  {
    actions: [
      {
        id: 'reply_message',
        label: 'Responder',
        icon: <MessageSquare className="h-4 w-4" />,
        handler: () => {},
      },
      {
        id: 'copy_message',
        label: 'Copiar Texto',
        icon: <Copy className="h-4 w-4" />,
        shortcut: 'Ctrl+C',
        handler: () => {},
      },
    ],
  },
  {
    actions: [
      {
        id: 'edit_message',
        label: 'Editar',
        icon: <Edit className="h-4 w-4" />,
        handler: () => {},
      },
      {
        id: 'delete_message',
        label: 'Excluir',
        icon: <Trash2 className="h-4 w-4" />,
        variant: 'destructive',
        handler: () => {},
      },
    ],
  },
];

function QuickActionContextMenu({ children, actions, disabled = false }: QuickActionContextMenuProps) {
  if (disabled || actions.length === 0) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {actions.map((group, groupIndex) => (
          <React.Fragment key={groupIndex}>
            {group.label && (
              <ContextMenuLabel className="text-xs text-muted-foreground">
                {group.label}
              </ContextMenuLabel>
            )}
            <ContextMenuGroup>
              {group.actions.map((action) => (
                <ContextMenuItem
                  key={action.id}
                  onClick={action.handler}
                  disabled={action.disabled}
                  variant={action.variant}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {action.icon}
                    <span>{action.label}</span>
                  </div>
                  {action.shortcut && (
                    <ContextMenuShortcut>
                      {action.shortcut}
                    </ContextMenuShortcut>
                  )}
                </ContextMenuItem>
              ))}
            </ContextMenuGroup>
            {groupIndex < actions.length - 1 && <ContextMenuSeparator />}
          </React.Fragment>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default QuickActionContextMenu;
