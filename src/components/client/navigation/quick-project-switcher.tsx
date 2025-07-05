'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Command, Search, FolderOpen, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  teams: {
    name: string;
  };
  updated_at: string;
}

interface QuickProjectSwitcherProps {
  currentProjectId?: string;
  trigger?: React.ReactNode;
}

export default function QuickProjectSwitcher({ 
  currentProjectId, 
  trigger 
}: QuickProjectSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentProjects, setRecentProjects] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (open && projects.length === 0) {
      loadProjects();
    }
  }, [open]);

  useEffect(() => {
    // Load recent projects from localStorage
    const recent = localStorage.getItem('recentProjects');
    if (recent) {
      setRecentProjects(JSON.parse(recent));
    }
  }, []);

  useEffect(() => {
    // Filter projects based on search query
    if (!searchQuery.trim()) {
      setFilteredProjects(projects);
    } else {
      const filtered = projects.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.teams.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProjects(filtered);
    }
  }, [searchQuery, projects]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/client/projects');
      const data = await response.json();

      if (response.ok) {
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (projectId: string) => {
    // Add to recent projects
    const updatedRecent = [projectId, ...recentProjects.filter(id => id !== projectId)].slice(0, 5);
    setRecentProjects(updatedRecent);
    localStorage.setItem('recentProjects', JSON.stringify(updatedRecent));

    setOpen(false);
    router.push(`/dashboard/projects/${projectId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setOpen(true);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown as any);
    return () => document.removeEventListener('keydown', handleKeyDown as any);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecentProjects = () => {
    return recentProjects
      .map(id => projects.find(p => p.id === id))
      .filter(Boolean) as Project[];
  };

  const getActiveProjects = () => {
    return projects.filter(p => p.status === 'active');
  };

  const defaultTrigger = (
    <Button
      variant="outline"
      className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
      onClick={() => setOpen(true)}
    >
      <Search className="h-4 w-4 xl:mr-2" />
      <span className="hidden xl:inline-flex">Buscar projetos...</span>
      <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  );

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        defaultTrigger
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Command className="h-5 w-5" />
              Trocar de Projeto
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar projetos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="space-y-4 pb-6">
                {/* Recent Projects */}
                {!searchQuery && getRecentProjects().length > 0 && (
                  <div className="px-6">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                      <Clock className="h-4 w-4" />
                      Recentes
                    </h3>
                    <div className="space-y-1">
                      {getRecentProjects().map((project) => (
                        <button
                          key={project.id}
                          onClick={() => handleProjectSelect(project.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left",
                            currentProjectId === project.id && "bg-secondary"
                          )}
                        >
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{project.name}</span>
                              <Badge 
                                variant="secondary" 
                                className={cn("text-xs", getStatusColor(project.status))}
                              >
                                {project.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {project.teams.name}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Projects */}
                <div className="px-6">
                  <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                    <FolderOpen className="h-4 w-4" />
                    {searchQuery ? 'Resultados da Busca' : 'Todos os Projetos'}
                  </h3>
                  <div className="space-y-1">
                    {filteredProjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        {searchQuery ? 'Nenhum projeto encontrado' : 'Nenhum projeto disponível'}
                      </p>
                    ) : (
                      filteredProjects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => handleProjectSelect(project.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left",
                            currentProjectId === project.id && "bg-secondary"
                          )}
                        >
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{project.name}</span>
                              <Badge 
                                variant="secondary" 
                                className={cn("text-xs", getStatusColor(project.status))}
                              >
                                {project.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {project.teams.name}
                            </p>
                            {project.description && (
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {project.description}
                              </p>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
