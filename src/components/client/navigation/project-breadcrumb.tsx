'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, Home, FolderOpen, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  status: string;
  teams: {
    name: string;
  };
}

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  current?: boolean;
}

interface ProjectBreadcrumbProps {
  projectId?: string;
  currentPage?: string;
  customItems?: BreadcrumbItem[];
}

export default function ProjectBreadcrumb({ 
  projectId, 
  currentPage = 'project',
  customItems 
}: ProjectBreadcrumbProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(!!projectId);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/client/projects/${projectId}`);
      const data = await response.json();

      if (response.ok) {
        setProject(data.project);
      }
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
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

  // Build breadcrumb items
  const items: BreadcrumbItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: Home,
    },
  ];

  if (project) {
    items.push({
      label: 'Projetos',
      href: '/dashboard/projects',
      icon: FolderOpen,
    });

    items.push({
      label: project.name,
      href: `/dashboard/projects/${project.id}`,
      current: currentPage === 'project',
    });

    // Add specific page items based on current page
    if (currentPage === 'tasks') {
      items.push({
        label: 'Tarefas',
        current: true,
      });
    } else if (currentPage === 'members') {
      items.push({
        label: 'Membros',
        current: true,
      });
    } else if (currentPage === 'settings') {
      items.push({
        label: 'Configurações',
        current: true,
      });
    }
  } else if (customItems) {
    items.push(...customItems);
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground/50" />
          )}
          
          {item.current ? (
            <div className="flex items-center gap-2">
              {item.icon && <item.icon className="h-4 w-4" />}
              <span className="font-medium text-foreground">
                {item.label}
              </span>
              {project && index === items.length - 2 && (
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs ml-2", getStatusColor(project.status))}
                >
                  {project.status}
                </Badge>
              )}
            </div>
          ) : (
            <Link
              href={item.href || '#'}
              className="flex items-center gap-2 hover:text-foreground transition-colors"
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              <span>{item.label}</span>
            </Link>
          )}
        </div>
      ))}
      
      {loading && projectId && (
        <>
          <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground/50" />
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          </div>
        </>
      )}
    </nav>
  );
}
