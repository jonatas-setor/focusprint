'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, Plus, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
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
}

interface ProjectSelectorProps {
  currentProjectId?: string;
  onProjectSelect?: (projectId: string) => void;
}

export default function ProjectSelector({ currentProjectId, onProjectSelect }: ProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const currentProject = projects.find(p => p.id === currentProjectId);

  useEffect(() => {
    loadProjects();
  }, []);

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

  const handleProjectSelect = (projectId: string) => {
    setOpen(false);
    
    if (onProjectSelect) {
      onProjectSelect(projectId);
    } else {
      router.push(`/dashboard/projects/${projectId}`);
    }
  };

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
      <div className="w-full max-w-sm">
        <Button variant="outline" disabled className="w-full justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            <span>Carregando projetos...</span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-sm">
        <Button 
          variant="outline" 
          onClick={loadProjects}
          className="w-full justify-between text-red-600"
        >
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            <span>Erro ao carregar</span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FolderOpen className="h-4 w-4 shrink-0" />
              {currentProject ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{currentProject.name}</span>
                  <Badge 
                    variant="secondary" 
                    className={cn("text-xs", getStatusColor(currentProject.status))}
                  >
                    {currentProject.status}
                  </Badge>
                </div>
              ) : (
                <span className="text-muted-foreground">Selecionar projeto...</span>
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0">
          <Command>
            <CommandInput placeholder="Buscar projeto..." />
            <CommandList>
              <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
              <CommandGroup>
                {projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={project.name}
                    onSelect={() => handleProjectSelect(project.id)}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          currentProjectId === project.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{project.name}</span>
                          <Badge 
                            variant="secondary" 
                            className={cn("text-xs", getStatusColor(project.status))}
                          >
                            {project.status}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getPriorityColor(project.priority))}
                          >
                            {project.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="truncate">{project.teams.name}</span>
                        </div>
                        {project.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    router.push('/dashboard/projects/new');
                  }}
                  className="flex items-center gap-3 p-3 text-primary"
                >
                  <Plus className="h-4 w-4" />
                  <span>Criar novo projeto</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
