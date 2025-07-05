'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useCommandPalette } from '@/hooks/use-command-palette';
import CommandPalette from '@/components/client/shared/command-palette';
import ShortcutsHelpModal from '@/components/client/shared/shortcuts-help-modal';
import { toast } from 'sonner';

interface GlobalShortcutsProviderProps {
  children: React.ReactNode;
}

interface RecentProject {
  id: string;
  name: string;
  lastAccessed: Date;
}

export default function GlobalShortcutsProvider({ children }: GlobalShortcutsProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  
  // Load recent projects from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('focusprint-recent-projects');
    if (stored) {
      try {
        const projects = JSON.parse(stored);
        setRecentProjects(projects.map((p: any) => ({
          ...p,
          lastAccessed: new Date(p.lastAccessed)
        })));
      } catch (error) {
        console.error('Error loading recent projects:', error);
      }
    }
  }, []);
  
  // Save recent projects to localStorage
  const saveRecentProjects = useCallback((projects: RecentProject[]) => {
    localStorage.setItem('focusprint-recent-projects', JSON.stringify(projects));
    setRecentProjects(projects);
  }, []);
  
  // Add project to recent list
  const addToRecentProjects = useCallback((projectId: string, projectName: string) => {
    setRecentProjects(prev => {
      const filtered = prev.filter(p => p.id !== projectId);
      const updated = [
        { id: projectId, name: projectName, lastAccessed: new Date() },
        ...filtered
      ].slice(0, 9); // Keep only 9 recent projects (for Ctrl+1-9)
      
      saveRecentProjects(updated);
      return updated;
    });
  }, [saveRecentProjects]);
  
  // Navigation handlers
  const handleProjectSwitcher = useCallback(() => {
    // Open command palette with project focus
    commandPalette.open();
    toast.success('Seletor de projetos aberto (Ctrl+P)');
  }, []);
  
  const handleNewProject = useCallback(() => {
    router.push('/dashboard/projects/new');
    toast.success('Criando novo projeto (Ctrl+Shift+N)');
  }, [router]);
  
  const handleGoToProject = useCallback((index: number) => {
    if (index >= 0 && index < recentProjects.length) {
      const project = recentProjects[index];
      router.push(`/dashboard/projects/${project.id}`);
      toast.success(`Navegando para: ${project.name}`);
    } else {
      toast.error(`Projeto ${index + 1} não encontrado nos recentes`);
    }
  }, [recentProjects, router]);
  
  // Help modal handlers
  const handleShowHelp = useCallback(() => {
    setIsHelpModalOpen(true);
    toast.success('Ajuda de atalhos (Ctrl+?)');
  }, []);

  const handleCloseHelp = useCallback(() => {
    setIsHelpModalOpen(false);
  }, []);

  // Command palette integration
  const commandPalette = useCommandPalette({
    onNewProject: handleNewProject,
    onShowHelp: handleShowHelp,
  });
  
  // Keyboard shortcuts integration
  const shortcuts = useKeyboardShortcuts();
  
  // Register global shortcuts
  useEffect(() => {
    // Project switcher
    shortcuts.registerShortcut({
      id: 'project_switcher',
      description: 'Alternar entre projetos',
      category: 'navigation',
      defaultKey: 'Cmd+Shift+O',
      handler: handleProjectSwitcher,
      preventDefault: true,
    });
    
    // New project
    shortcuts.registerShortcut({
      id: 'new_project_global',
      description: 'Criar novo projeto',
      category: 'projects',
      defaultKey: 'Cmd+Shift+N',
      handler: handleNewProject,
      preventDefault: true,
    });
    
    // Global command palette
    shortcuts.registerShortcut({
      id: 'command_palette_global',
      description: 'Abrir paleta de comandos',
      category: 'general',
      defaultKey: 'Cmd+K',
      handler: commandPalette.open,
      preventDefault: true,
    });
    
    // Recent projects (Ctrl+1 through Ctrl+9)
    for (let i = 1; i <= 9; i++) {
      shortcuts.registerShortcut({
        id: `recent_project_${i}`,
        description: `Ir para projeto recente ${i}`,
        category: 'navigation',
        defaultKey: `Cmd+${i}`,
        handler: () => handleGoToProject(i - 1),
        preventDefault: true,
      });
    }
    
    // Global navigation shortcuts
    shortcuts.registerShortcut({
      id: 'go_dashboard',
      description: 'Ir para Dashboard',
      category: 'navigation',
      defaultKey: 'Cmd+H',
      handler: () => {
        router.push('/dashboard');
        toast.success('Navegando para Dashboard');
      },
      preventDefault: true,
    });
    
    shortcuts.registerShortcut({
      id: 'go_projects',
      description: 'Ir para Projetos',
      category: 'navigation',
      defaultKey: 'Cmd+Shift+P',
      handler: () => {
        router.push('/dashboard/projects');
        toast.success('Navegando para Projetos');
      },
      preventDefault: true,
    });
    
    shortcuts.registerShortcut({
      id: 'go_teams',
      description: 'Ir para Times',
      category: 'navigation',
      defaultKey: 'Cmd+Shift+T',
      handler: () => {
        router.push('/dashboard/teams');
        toast.success('Navegando para Times');
      },
      preventDefault: true,
    });
    
    shortcuts.registerShortcut({
      id: 'go_my_week',
      description: 'Ir para Minha Semana',
      category: 'navigation',
      defaultKey: 'Ctrl+Shift+W',
      handler: () => {
        router.push('/dashboard/my-week');
        toast.success('Navegando para Minha Semana');
      },
      preventDefault: true,
    });

    shortcuts.registerShortcut({
      id: 'help_shortcuts',
      description: 'Mostrar ajuda e atalhos',
      category: 'general',
      defaultKey: 'Ctrl+?',
      handler: handleShowHelp,
      preventDefault: true,
    });

    // Cleanup shortcuts when component unmounts
    // Note: We don't need to unregister shortcuts during unmount as the entire
    // keyboard shortcuts context will be destroyed anyway
    return () => {
      // No cleanup needed - shortcuts will be cleaned up with the context
    };
  }, [
    handleProjectSwitcher,
    handleNewProject,
    handleGoToProject,
    commandPalette.open,
    router
  ]);
  
  // Auto-detect project visits and add to recent list
  useEffect(() => {
    const projectMatch = pathname.match(/\/dashboard\/projects\/([^\/]+)/);
    if (projectMatch) {
      const projectId = projectMatch[1];

      // Fetch project name from API
      const fetchProjectName = async () => {
        try {
          const response = await fetch(`/api/client/projects/${projectId}`);
          if (response.ok) {
            const data = await response.json();
            const projectName = data.project?.name || `Project ${projectId}`;
            addToRecentProjects(projectId, projectName);
          } else {
            // Fallback to ID if API call fails
            addToRecentProjects(projectId, `Project ${projectId}`);
          }
        } catch (error) {
          console.error('Error fetching project name:', error);
          // Fallback to ID if API call fails
          addToRecentProjects(projectId, `Project ${projectId}`);
        }
      };

      fetchProjectName();
    }
  }, [pathname, addToRecentProjects]);
  
  return (
    <>
      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        actions={commandPalette.actions}
        placeholder="Digite um comando ou busque projetos..."
      />

      {/* Shortcuts Help Modal */}
      <ShortcutsHelpModal
        isOpen={isHelpModalOpen}
        onClose={handleCloseHelp}
      />

      {children}
    </>
  );
}
