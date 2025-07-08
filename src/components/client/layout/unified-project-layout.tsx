'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageSquare, Kanban, Menu, X, Sparkles } from 'lucide-react';
import KanbanBoard from '@/components/client/kanban/kanban-board';
import ProjectChat from '@/components/client/chat/project-chat';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useCommandPalette } from '@/hooks/use-command-palette';
import CommandPalette from '@/components/client/shared/command-palette';
import { useSwipeGestures, useMobileNavigation, useMobileKeyboard } from '@/hooks/use-mobile-navigation';
import SaveAsTemplateModal from '@/components/client/projects/save-as-template-modal';
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

interface Milestone {
  id: string;
  name: string;
  progress_percentage: number;
  status: string;
}

export default function UnifiedProjectLayout({ projectId }: UnifiedLayoutProps) {
  // Removed excessive logging to prevent console spam

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState<'kanban' | 'chat'>('kanban');
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [saveAsTemplateLoading, setSaveAsTemplateLoading] = useState(false);
  const [saveAsTemplateModalOpen, setSaveAsTemplateModalOpen] = useState(false);

  // Mobile navigation hooks - temporarily disabled to debug infinite loop
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const isKeyboardOpen = false;
  const keyboardHeight = 0;

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Function to handle saving project as template
  const handleSaveAsTemplate = () => {
    if (!project) return;

    console.log('🎨 [SAVE AS TEMPLATE] Opening template creation modal for project:', {
      projectId: project.id,
      projectName: project.name
    });

    setSaveAsTemplateModalOpen(true);
  };

  const handleSaveAsTemplateSuccess = () => {
    setSaveAsTemplateModalOpen(false);
    // Optionally refresh project data or show additional feedback
  };

  // Swipe gesture handlers for mobile navigation - memoized to prevent infinite loops
  const handleSwipeLeft = useCallback(() => {
    setActiveView(prev => {
      if (prev === 'kanban') {
        toast.success('Mudou para Chat');
        return 'chat';
      }
      return prev;
    });
  }, []);

  const handleSwipeRight = useCallback(() => {
    setActiveView(prev => {
      if (prev === 'chat') {
        toast.success('Mudou para Kanban');
        return 'kanban';
      }
      return prev;
    });
  }, []);

  // Temporarily disabled swipe handlers to debug infinite loop
  const swipeHandlers = useMemo(() => {
    return {};
  }, []);

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

  // Device detection is now handled by useMobileNavigation hook

  // Memoize command palette open handler to prevent recreation
  const commandPaletteOpen = useCallback(() => {
    commandPalette.open();
  }, [commandPalette.open]);

  // Temporarily disabled keyboard shortcuts to debug infinite loop
  // useEffect(() => {
  //   // Register project-specific shortcuts
  //   shortcuts.registerShortcut({
  //     id: 'new_task',
  //     description: 'Criar nova tarefa',
  //     category: 'tasks',
  //     defaultKey: 'Ctrl+T',
  //     handler: handleNewTask,
  //     context: 'project',
  //     preventDefault: true,
  //   });

  //   shortcuts.registerShortcut({
  //     id: 'focus_chat',
  //     description: 'Focar no chat',
  //     category: 'chat',
  //     defaultKey: 'Ctrl+M',
  //     handler: handleFocusChat,
  //     context: 'project',
  //     preventDefault: true,
  //   });

  //   shortcuts.registerShortcut({
  //     id: 'command_palette',
  //     description: 'Abrir paleta de comandos',
  //     category: 'general',
  //     defaultKey: 'Ctrl+K',
  //     handler: commandPaletteOpen,
  //     context: 'project',
  //     preventDefault: true,
  //   });

  //   shortcuts.registerShortcut({
  //     id: 'help',
  //     description: 'Mostrar ajuda',
  //     category: 'general',
  //     defaultKey: 'Ctrl+?',
  //     handler: handleShowHelp,
  //     context: 'project',
  //     preventDefault: true,
  //   });

  //   // Cleanup shortcuts when component unmounts
  //   return () => {
  //     shortcuts.unregisterShortcut('new_task');
  //     shortcuts.unregisterShortcut('focus_chat');
  //     shortcuts.unregisterShortcut('command_palette');
  //     shortcuts.unregisterShortcut('help');
  //   };
  // }, [shortcuts, handleNewTask, handleFocusChat, handleShowHelp, commandPaletteOpen]);

  const loadProject = useCallback(async () => {
    console.log('🚀 [UNIFIED LAYOUT] loadProject started for projectId:', projectId);
    try {
      setLoading(true);
      setError('');

      console.log('📡 [UNIFIED LAYOUT] Making parallel API calls...');
      // Load project, tasks, and milestones in parallel
      const [projectResponse, tasksResponse, milestonesResponse] = await Promise.all([
        fetch(`/api/client/projects/${projectId}`),
        fetch(`/api/client/projects/${projectId}/tasks`),
        fetch(`/api/client/projects/${projectId}/milestones`)
      ]);

      console.log('📊 [UNIFIED LAYOUT] API responses:', {
        project: projectResponse.status,
        tasks: tasksResponse.status,
        milestones: milestonesResponse.status
      });

      if (!projectResponse.ok) {
        console.error('❌ [UNIFIED LAYOUT] Project API failed:', projectResponse.status);
        const projectData = await projectResponse.json();
        throw new Error(projectData.error || 'Failed to load project');
      }

      const projectData = await projectResponse.json();
      setProject(projectData.project);
      console.log('✅ [UNIFIED LAYOUT] Project loaded:', projectData.project?.name);

      // Load tasks if available (don't fail if tasks can't be loaded)
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setTasks(tasksData.tasks || []);
        console.log('✅ [UNIFIED LAYOUT] Tasks loaded:', tasksData.tasks?.length || 0);
      } else {
        console.warn('⚠️ [UNIFIED LAYOUT] Failed to load tasks for task references');
        setTasks([]);
      }

      // Load milestones if available (don't fail if milestones can't be loaded)
      if (milestonesResponse.ok) {
        const milestonesData = await milestonesResponse.json();
        setMilestones(milestonesData.milestones || []);
        console.log('✅ [UNIFIED LAYOUT] Milestones loaded:', milestonesData.milestones?.length || 0);
      } else {
        console.warn('⚠️ [UNIFIED LAYOUT] Failed to load milestones for milestone references');
        setMilestones([]);
      }
    } catch (err) {
      console.error('❌ [UNIFIED LAYOUT] Error loading project:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load project';
      setError(errorMessage);
      console.error('❌ [UNIFIED LAYOUT] Error details:', errorMessage);
    } finally {
      console.log('🏁 [UNIFIED LAYOUT] loadProject finished');
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

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
    <div className={`mobile-layout mobile-optimized ${isMobile ? 'mobile-container' : 'min-h-screen'} bg-background`}>
      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        actions={commandPalette.actions}
        placeholder="Digite um comando ou busque..."
      />

      {/* Project Header with Breadcrumb Navigation */}
      <header className={`${isMobile ? 'mobile-header' : 'border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'}`}>
        <div className={`flex ${isMobile ? 'h-14' : 'h-16'} items-center justify-between ${isMobile ? 'px-4' : 'px-6'}`}>
          <div className="flex items-center gap-4">
            {/* Breadcrumb Navigation - Simplified for mobile */}
            <nav className={`flex items-center gap-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {!isMobile ? (
                <>
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
                </>
              ) : (
                <a
                  href="/dashboard/projects"
                  className="text-muted-foreground hover:text-foreground transition-colors touch-target"
                >
                  ← Projetos
                </a>
              )}
              <span className={`text-foreground font-medium ${isMobile ? 'truncate max-w-32' : ''}`} title={project.name}>
                {project.name}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Project Actions - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={handleSaveAsTemplate}
                disabled={saveAsTemplateLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors touch-target disabled:opacity-50 disabled:cursor-not-allowed"
                title="Salvar projeto como template personalizado"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden lg:inline">
                  {saveAsTemplateLoading ? 'Salvando...' : 'Salvar como Template'}
                </span>
              </button>
              <a
                href={`/dashboard/projects/${projectId}/settings`}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors touch-target"
              >
                Settings
              </a>
            </div>

            {/* Chat Toggle for Desktop/Tablet */}
            {!isMobile && (
              <button
                onClick={() => setChatCollapsed(!chatCollapsed)}
                className="touch-target-comfortable flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                title={chatCollapsed ? 'Mostrar Chat' : 'Ocultar Chat'}
              >
                <MessageSquare className="h-4 w-4" />
                {!chatCollapsed && <span className="hidden lg:inline">Chat</span>}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Tab Bar - Fixed at bottom with swipe indicator */}
        {isMobile && (
          <div className="mobile-tab-bar">
            <div className="flex bg-secondary/50 rounded-lg p-1 mx-4 relative">
              {/* Swipe indicator */}
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-muted-foreground/30 rounded-full"></div>

              <button
                onClick={() => setActiveView('kanban')}
                className={`touch-target-comfortable flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'kanban'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Kanban className="h-4 w-4" />
                <span>Kanban</span>
              </button>
              <button
                onClick={() => setActiveView('chat')}
                className={`touch-target-comfortable flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'chat'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span>Chat</span>
              </button>
            </div>

            {/* Swipe hint text */}
            <div className="text-center mt-1 mb-2">
              <span className="text-xs text-muted-foreground">
                Deslize para navegar entre as abas
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area - Responsive Layout with Swipe Gestures */}
      <div
        className={`mobile-content ${isMobile ? 'h-[calc(100vh-7.5rem)]' : 'h-[calc(100vh-4rem)]'} flex flex-row overflow-hidden`}
        {...(isMobile ? swipeHandlers : {})}
      >
        {/* Mobile: Single View with Tab Navigation and Swipe Support */}
        {isMobile ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="mobile-content touch-scroll overflow-auto"
                 style={{
                   paddingBottom: isKeyboardOpen ? `${keyboardHeight}px` : '0px',
                   transition: 'padding-bottom 0.3s ease-in-out'
                 }}>
              {activeView === 'kanban' ? (
                <div className="mobile-kanban-container">
                  <KanbanBoard projectId={projectId} />
                </div>
              ) : (
                <div className="mobile-chat-container">
                  <ProjectChat
                    projectId={projectId}
                    availableTasks={tasks.map(task => ({ id: task.id, title: task.title }))}
                    availableMilestones={milestones.map(milestone => ({
                      id: milestone.id,
                      name: milestone.name,
                      progress_percentage: milestone.progress_percentage,
                      status: milestone.status
                    }))}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Desktop/Tablet: True 70/30 Layout */
          <>
            {/* Kanban Section - 70% width */}
            <div className={`${chatCollapsed ? 'flex-1' : 'w-[70%]'} flex flex-col overflow-hidden transition-all duration-300`}>
              <div className="flex-1 p-6 overflow-auto touch-scroll">
                <div className="h-full">
                  <KanbanBoard projectId={projectId} />
                </div>
              </div>
            </div>

            {/* Chat Section - 30% width, permanently visible */}
            {!chatCollapsed && (
              <div className="w-[30%] border-l flex flex-col overflow-hidden transition-all duration-300">
                <ProjectChat
                  projectId={projectId}
                  availableTasks={tasks.map(task => ({ id: task.id, title: task.title }))}
                  availableMilestones={milestones.map(milestone => ({
                    id: milestone.id,
                    name: milestone.name,
                    progress_percentage: milestone.progress_percentage,
                    status: milestone.status
                  }))}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Save as Template Modal */}
      <SaveAsTemplateModal
        isOpen={saveAsTemplateModalOpen}
        onClose={() => setSaveAsTemplateModalOpen(false)}
        project={project}
        onSuccess={handleSaveAsTemplateSuccess}
      />
    </div>
  );
}
