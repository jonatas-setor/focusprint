'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CommandAction } from '@/components/client/shared/command-palette';

interface UseCommandPaletteOptions {
  projectId?: string;
  onNewTask?: () => void;
  onFocusChat?: () => void;
  onNewProject?: () => void;
  onShowHelp?: () => void;
}

export function useCommandPalette(options: UseCommandPaletteOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  
  const {
    projectId,
    onNewTask,
    onFocusChat,
    onNewProject,
    onShowHelp,
  } = options;
  
  // Default actions available in the command palette
  const defaultActions = useMemo((): CommandAction[] => {
    const actions: CommandAction[] = [
      // Navigation actions
      {
        id: 'go_dashboard',
        title: 'Ir para Dashboard',
        description: 'Voltar para a página principal',
        category: 'navigation',
        icon: 'Home',
        shortcut: 'Ctrl+H',
        handler: () => router.push('/dashboard'),
        keywords: ['home', 'início', 'principal'],
      },
      {
        id: 'go_projects',
        title: 'Ver Todos os Projetos',
        description: 'Lista completa de projetos',
        category: 'navigation',
        icon: 'FolderOpen',
        handler: () => router.push('/dashboard/projects'),
        keywords: ['projetos', 'lista'],
      },
      {
        id: 'go_teams',
        title: 'Gerenciar Times',
        description: 'Visualizar e gerenciar times',
        category: 'navigation',
        icon: 'Users',
        handler: () => router.push('/dashboard/teams'),
        keywords: ['times', 'equipes', 'membros'],
      },
      {
        id: 'go_settings',
        title: 'Configurações',
        description: 'Configurações da conta e preferências',
        category: 'navigation',
        icon: 'Settings',
        handler: () => router.push('/dashboard/settings'),
        keywords: ['configurações', 'preferências', 'conta'],
      },

      // Project actions
      {
        id: 'new_project',
        title: 'Criar Novo Projeto',
        description: 'Iniciar um novo projeto',
        category: 'projects',
        icon: 'Plus',
        shortcut: 'Ctrl+Shift+N',
        handler: () => {
          if (onNewProject) {
            onNewProject();
          } else {
            router.push('/dashboard/projects/new');
          }
        },
        keywords: ['novo', 'criar', 'projeto'],
      },
      {
        id: 'search_projects',
        title: 'Buscar Projetos',
        description: 'Encontrar projetos específicos',
        category: 'projects',
        icon: 'Search',
        handler: () => router.push('/dashboard/projects?search=true'),
        keywords: ['buscar', 'encontrar', 'procurar'],
      },

      // General actions
      {
        id: 'global_search',
        title: 'Busca Global',
        description: 'Buscar em todos os projetos e tarefas',
        category: 'general',
        icon: 'Search',
        shortcut: 'Ctrl+/',
        handler: () => {
          // TODO: Implement global search
          console.log('Global search not implemented yet');
        },
        keywords: ['buscar', 'global', 'tudo'],
      },
      {
        id: 'help',
        title: 'Ajuda e Atalhos',
        description: 'Ver todos os atalhos de teclado',
        category: 'general',
        icon: 'HelpCircle',
        shortcut: 'Ctrl+?',
        handler: () => {
          if (onShowHelp) {
            onShowHelp();
          } else {
            // TODO: Implement help modal
            console.log('Help modal not implemented yet');
          }
        },
        keywords: ['ajuda', 'help', 'atalhos', 'shortcuts'],
      },
    ];
    
    // Add project-specific actions if we're in a project context
    if (projectId) {
      actions.push(
        {
          id: 'new_task',
          title: 'Criar Nova Tarefa',
          description: 'Adicionar tarefa ao projeto atual',
          category: 'tasks',
          icon: 'Plus',
          shortcut: 'Ctrl+T',
          handler: () => {
            if (onNewTask) {
              onNewTask();
            } else {
              // TODO: Implement task creation
              console.log('Task creation not implemented yet');
            }
          },
          keywords: ['nova', 'tarefa', 'task', 'criar'],
        },
        {
          id: 'focus_chat',
          title: 'Focar no Chat',
          description: 'Mover foco para o chat do projeto',
          category: 'chat',
          icon: 'MessageSquare',
          shortcut: 'Ctrl+M',
          handler: () => {
            if (onFocusChat) {
              onFocusChat();
            } else {
              // Focus chat input if available
              const chatInput = document.querySelector('[data-chat-input]') as HTMLElement;
              if (chatInput) {
                chatInput.focus();
              }
            }
          },
          keywords: ['chat', 'mensagem', 'conversa'],
        },
        {
          id: 'project_settings',
          title: 'Configurações do Projeto',
          description: 'Editar configurações do projeto atual',
          category: 'projects',
          icon: 'Settings',
          handler: () => router.push(`/dashboard/projects/${projectId}/settings`),
          keywords: ['configurações', 'projeto', 'editar'],
        },
        {
          id: 'project_members',
          title: 'Membros do Projeto',
          description: 'Gerenciar membros do projeto',
          category: 'projects',
          icon: 'Users',
          handler: () => router.push(`/dashboard/projects/${projectId}/members`),
          keywords: ['membros', 'equipe', 'usuários'],
        }
      );
    }
    
    return actions;
  }, [router, projectId, onNewTask, onFocusChat, onNewProject, onShowHelp]);
  
  // Custom actions that can be added dynamically
  const [customActions, setCustomActions] = useState<CommandAction[]>([]);
  
  // Combined actions
  const allActions = useMemo(() => {
    return [...defaultActions, ...customActions];
  }, [defaultActions, customActions]);
  
  // Open command palette
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);
  
  // Close command palette
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);
  
  // Toggle command palette
  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);
  
  // Add custom action
  const addAction = useCallback((action: CommandAction) => {
    setCustomActions(prev => [...prev, action]);
  }, []);
  
  // Remove custom action
  const removeAction = useCallback((actionId: string) => {
    setCustomActions(prev => prev.filter(action => action.id !== actionId));
  }, []);
  
  // Clear all custom actions
  const clearCustomActions = useCallback(() => {
    setCustomActions([]);
  }, []);
  
  return {
    isOpen,
    actions: allActions,
    open,
    close,
    toggle,
    addAction,
    removeAction,
    clearCustomActions,
  };
}
