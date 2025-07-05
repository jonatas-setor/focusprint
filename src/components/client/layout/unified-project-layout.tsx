'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageSquare, Kanban, Menu, X } from 'lucide-react';
import KanbanBoard from '@/components/client/kanban/kanban-board';
import ProjectChat from '@/components/client/chat/project-chat';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useCommandPalette } from '@/hooks/use-command-palette';
import CommandPalette from '@/components/client/shared/command-palette';
import { toast } from 'sonner';

interface UnifiedLayoutProps {
  projectId: string;
  children?: React.ReactNode;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: string;
  due_date?: string;
  assigned_to?: string;
  column_id: string;
  position: number;
  created_at: string;
}

export default function UnifiedProjectLayout({ projectId }: UnifiedLayoutProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState<'kanban' | 'chat'>('kanban');
  const [isMobile, setIsMobile] = useState(false);

  // Refs for focusing elements
  const chatInputRef = useRef<HTMLInputElement>(null);
  const kanbanRef = useRef<HTMLDivElement>(null);

  // Callback functions for shortcuts
  const handleNewTask = useCallback(() => {
    // TODO: Implement new task creation
    toast.success('Atalho: Criar nova tarefa (Ctrl+T)');
  }, []);

  const handleFocusChat = useCallback(() => {
    // Focus on chat input
    const chatInput = document.querySelector('[data-chat-input]') as HTMLInputElement;
    if (chatInput) {
      chatInput.focus();
      toast.success('Chat focado');
    } else {
      // If on mobile, switch to chat view
      if (isMobile) {
        setActiveView('chat');
        toast.success('Mudou para visualização do chat');
      }
    }
  }, [isMobile]);

  const handleShowHelp = useCallback(() => {
    toast.success('Atalho: Mostrar ajuda (Ctrl+?)');
    // TODO: Implement help modal
  }, []);

  // Memoize command palette options to prevent recreation
  const commandPaletteOptions = useMemo(() => ({
    projectId,
    onNewTask: handleNewTask,
    onFocusChat: handleFocusChat,
    onShowHelp: handleShowHelp,
  }), [projectId, handleNewTask, handleFocusChat, handleShowHelp]);

  // Command palette integration
  const commandPalette = useCommandPalette(commandPaletteOptions);

  // Keyboard shortcuts integration
  const shortcuts = useKeyboardShortcuts();

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Memoize command palette open handler to prevent recreation
  const commandPaletteOpen = useCallback(() => {
    commandPalette.open();
  }, [commandPalette.open]);

  // Register keyboard shortcuts
  useEffect(() => {
    // Register project-specific shortcuts
    shortcuts.registerShortcut({
      id: 'new_task',
      description: 'Criar nova tarefa',
      category: 'tasks',
      defaultKey: 'Ctrl+T',
      handler: handleNewTask,
      context: 'project',
      preventDefault: true,
    });

    shortcuts.registerShortcut({
      id: 'focus_chat',
      description: 'Focar no chat',
      category: 'chat',
      defaultKey: 'Ctrl+M',
      handler: handleFocusChat,
      context: 'project',
      preventDefault: true,
    });

    shortcuts.registerShortcut({
      id: 'command_palette',
      description: 'Abrir paleta de comandos',
      category: 'general',
      defaultKey: 'Ctrl+K',
      handler: commandPaletteOpen,
      context: 'project',
      preventDefault: true,
    });

    shortcuts.registerShortcut({
      id: 'help',
      description: 'Mostrar ajuda',
      category: 'general',
      defaultKey: 'Ctrl+?',
      handler: handleShowHelp,
      context: 'project',
      preventDefault: true,
    });

    // Cleanup shortcuts when component unmounts
    return () => {
      shortcuts.unregisterShortcut('new_task');
      shortcuts.unregisterShortcut('focus_chat');
      shortcuts.unregisterShortcut('command_palette');
      shortcuts.unregisterShortcut('help');
    };
  }, [shortcuts, handleNewTask, handleFocusChat, handleShowHelp, commandPaletteOpen]);

  const loadProject = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Load project and tasks in parallel
      const [projectResponse, tasksResponse] = await Promise.all([
        fetch(`/api/client/projects/${projectId}`),
        fetch(`/api/client/projects/${projectId}/tasks`)
      ]);

      if (!projectResponse.ok) {
        const projectData = await projectResponse.json();
        throw new Error(projectData.error || 'Failed to load project');
      }

      const projectData = await projectResponse.json();
      setProject(projectData.project);

      // Load tasks if available (don't fail if tasks can't be loaded)
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setTasks(tasksData.tasks || []);
      } else {
        console.warn('Failed to load tasks for task references');
        setTasks([]);
      }
    } catch (err) {
      console.error('Error loading project:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId, loadProject]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button 
            onClick={loadProject}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        actions={commandPalette.actions}
        placeholder="Digite um comando ou busque..."
      />

      {/* Project Header with Breadcrumb Navigation */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 text-sm">
              <a
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </a>
              <span className="text-muted-foreground">/</span>
              <a
                href="/dashboard/projects"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Projetos
              </a>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground font-medium">{project.name}</span>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Project Actions */}
            <div className="hidden md:flex items-center gap-2">
              <a
                href={`/dashboard/projects/${projectId}/settings`}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
              >
                Settings
              </a>
            </div>

            {/* Mobile View Switcher */}
            {isMobile && (
              <div className="flex bg-secondary rounded-lg p-1">
                <button
                  onClick={() => setActiveView('kanban')}
                  className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'kanban'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Kanban className="h-4 w-4" />
                  Kanban
                </button>
                <button
                  onClick={() => setActiveView('chat')}
                  className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'chat'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area - Full Width 70/30 Layout */}
      <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
        {/* Desktop: 70/30 Layout, Mobile: Single View */}
        {!isMobile ? (
          <>
            {/* Kanban Section - 70% */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 p-6 overflow-auto">
                <div className="h-full">
                  <KanbanBoard projectId={projectId} />
                </div>
              </div>
            </div>

            {/* Chat Section - 30% */}
            <div className="w-96 border-l flex flex-col overflow-hidden">
              <ProjectChat
                projectId={projectId}
                availableTasks={tasks.map(task => ({ id: task.id, title: task.title }))}
              />
            </div>
          </>
        ) : (
          /* Mobile: Single View */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 p-4 overflow-auto">
              {activeView === 'kanban' ? (
                <div className="h-full">
                  <KanbanBoard projectId={projectId} />
                </div>
              ) : (
                <div className="h-full">
                  <ProjectChat
                    projectId={projectId}
                    availableTasks={tasks.map(task => ({ id: task.id, title: task.title }))}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
