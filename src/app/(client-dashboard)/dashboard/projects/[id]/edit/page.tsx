'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProjectForm from '@/components/client/projects/project-form';
import { toast } from 'sonner';

interface ProjectFormData {
  name: string;
  description: string;
  team_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: Date;
  end_date?: Date;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  team_id?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: string;
  end_date?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function EditProjectPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setIsLoadingProject(true);
      const response = await fetch(`/api/client/projects/${projectId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar projeto');
      }

      setProject(result.project);
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar projeto');
      router.push('/dashboard/projects');
    } finally {
      setIsLoadingProject(false);
    }
  };

  const handleSubmit = async (data: ProjectFormData) => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/client/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          start_date: data.start_date?.toISOString().split('T')[0],
          end_date: data.end_date?.toISOString().split('T')[0],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar projeto');
      }

      toast.success('Projeto atualizado com sucesso!');
      router.push('/dashboard/projects');
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar projeto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/projects');
  };

  if (isLoadingProject) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Carregando projeto...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-red-600">Projeto não encontrado</p>
        </div>
      </div>
    );
  }

  const initialData: Partial<ProjectFormData> = {
    name: project.name,
    description: project.description || '',
    team_id: project.team_id || '',
    priority: project.priority,
    start_date: project.start_date ? new Date(project.start_date) : undefined,
    end_date: project.end_date ? new Date(project.end_date) : undefined,
  };

  return (
    <div className="container mx-auto py-8">
      <ProjectForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        submitLabel="Atualizar Projeto"
      />
    </div>
  );
}
