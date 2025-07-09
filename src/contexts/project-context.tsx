'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority?: string;
  start_date?: string;
  end_date?: string;
  progress?: number;
  team_id?: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  column_id: string;
  priority: string;
}

interface ProjectContextType {
  project: Project | null;
  tasks: Task[];
  loading: boolean;
  setProjectData: (project: Project | null, tasks: Task[], loading?: boolean) => void;
  clearProjectData: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const setProjectData = (newProject: Project | null, newTasks: Task[], isLoading = false) => {
    setProject(newProject);
    setTasks(newTasks);
    setLoading(isLoading);
  };

  const clearProjectData = () => {
    setProject(null);
    setTasks([]);
    setLoading(false);
  };

  return (
    <ProjectContext.Provider value={{
      project,
      tasks,
      loading,
      setProjectData,
      clearProjectData
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
}

// Hook para usar apenas quando há projeto (retorna null se não houver)
export function useOptionalProjectContext() {
  const context = useContext(ProjectContext);
  return context;
}
