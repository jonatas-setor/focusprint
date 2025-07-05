'use client';

import { useState, useEffect } from 'react';
import { Plus, Calendar, Users, Copy, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import CloneProjectModal from '@/components/client/projects/clone-project-modal';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  team_id?: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'priority'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [projectToClone, setProjectToClone] = useState<Project | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    filterAndSortProjects();
  }, [projects, searchTerm, sortBy, sortOrder]);

  const filterAndSortProjects = () => {
    let filtered = projects;

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort projects
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredProjects(filtered);
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/client/projects');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load projects');
      }

      setProjects(data.projects || []);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    // Show confirmation toast with action buttons
    toast(`Tem certeza que deseja excluir o projeto "${projectName}"?`, {
      description: 'O projeto será movido para a lixeira e poderá ser recuperado em até 30 dias.',
      action: {
        label: 'Excluir',
        onClick: () => performDelete(projectId, projectName),
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => toast.dismiss(),
      },
      duration: 10000, // 10 seconds to decide
    });
  };

  const performDelete = async (projectId: string, projectName: string) => {
    // Show loading toast
    const loadingToast = toast.loading(`Excluindo projeto "${projectName}"...`);

    try {
      const response = await fetch(`/api/client/projects/${projectId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        // Remove o projeto da lista local
        setProjects(projects.filter(p => p.id !== projectId));

        // Dismiss loading toast
        toast.dismiss(loadingToast);

        // Show success toast with recovery info
        toast.success(`Projeto "${projectName}" excluído com sucesso!`, {
          description: result.recovery_info?.message || 'O projeto pode ser recuperado através da área de administração.',
          duration: 5000,
        });
      } else {
        // Dismiss loading toast
        toast.dismiss(loadingToast);

        // Show error toast
        toast.error('Erro ao excluir projeto', {
          description: result.error || 'Ocorreu um erro inesperado ao excluir o projeto.',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error deleting project:', error);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Show error toast
      toast.error('Erro ao excluir projeto', {
        description: 'Ocorreu um erro de conexão. Tente novamente.',
        duration: 5000,
      });
    }
  };

  const handleCloneProject = (projectId: string, projectName: string) => {
    console.log('🔄 [CLONE] Clone button clicked for project:', { projectId, projectName });

    // Find the project to clone
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setProjectToClone(project);
      setCloneModalOpen(true);
    }
  };

  const handleCloneConfirm = async (cloneOptions: {
    new_project_name: string;
    include_tasks: boolean;
    include_members: boolean;
    include_settings: boolean;
  }) => {
    if (!projectToClone) return;

    console.log('✅ [CLONE] User confirmed project clone with options:', cloneOptions);
    setIsCloning(true);

    // Show loading toast
    const loadingToast = toast.loading(`Clonando projeto "${projectToClone.name}"...`);

    try {
      const apiUrl = `/api/client/projects/${projectToClone.id}/clone`;
      console.log('🌐 [CLONE] Making API request:', {
        url: apiUrl,
        method: 'POST',
        payload: cloneOptions
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cloneOptions),
      });

      const result = await response.json();
      console.log('📊 [CLONE] API response data:', result);

      if (response.ok) {
        // Close modal and reset state
        setCloneModalOpen(false);
        setProjectToClone(null);

        // Dismiss loading toast
        toast.dismiss(loadingToast);
        console.log('✅ [CLONE] Project cloned successfully');

        // Show success toast
        toast.success(`Projeto clonado com sucesso!`, {
          description: `Novo projeto: "${result.cloned_project.name}"`,
          duration: 5000,
        });

        // Reload projects to show the new cloned project
        loadProjects();
      } else {
        console.error('❌ [CLONE] API request failed:', result);

        // Dismiss loading toast
        toast.dismiss(loadingToast);

        // Show error toast
        toast.error('Erro ao clonar projeto', {
          description: result.error || 'Ocorreu um erro inesperado ao clonar o projeto.',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('💥 [CLONE] Exception during clone process:', error);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Show error toast
      toast.error('Erro ao clonar projeto', {
        description: 'Ocorreu um erro de conexão. Tente novamente.',
        duration: 5000,
      });
    } finally {
      setIsCloning(false);
    }
  };

  const handleCloseCloneModal = () => {
    setCloneModalOpen(false);
    setProjectToClone(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Projects</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button
          onClick={() => router.push('/dashboard/projects/new')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar projetos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sort By */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'created_at' | 'priority')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="created_at">Data de Criação</option>
              <option value="name">Nome</option>
              <option value="priority">Prioridade</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadProjects}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {filteredProjects.length === 0 && !loading && !error ? (
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Calendar className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first project.</p>
          <button
            onClick={() => router.push('/dashboard/projects/new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 mx-auto"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </button>
        </div>
      ) : (
        <TooltipProvider>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="block bg-white rounded-lg border hover:border-primary/50 hover:shadow-md transition-all p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{project.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {project.team_id ? 'Com time' : 'Projeto individual'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            router.push(`/dashboard/projects/${project.id}/edit`);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Editar projeto</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleCloneProject(project.id, project.name);
                          }}
                          className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Clonar projeto</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteProject(project.id, project.name);
                          }}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Excluir projeto</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

              {project.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {project.description}
                </p>
              )}

              <div className="flex items-center gap-2 mb-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
                  {project.priority}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>Team</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))}
          </div>
        </TooltipProvider>
      )}

      {/* Clone Project Modal */}
      <CloneProjectModal
        project={projectToClone}
        isOpen={cloneModalOpen}
        onClose={handleCloseCloneModal}
        onClone={handleCloneConfirm}
        isLoading={isCloning}
      />
    </div>
  );
}
