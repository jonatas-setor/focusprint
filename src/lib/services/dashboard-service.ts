import { createClient } from '@/lib/supabase/client';

export interface DashboardStats {
  teams: {
    total: number;
    active: number;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    archived: number;
  };
  tasks: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    completed_today: number;
  };
  activity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'project_created' | 'task_completed' | 'team_created' | 'user_joined';
  title: string;
  description: string;
  timestamp: string;
  user_name?: string;
  project_name?: string;
  team_name?: string;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

export class DashboardService {
  private static supabase = createClient();

  /**
   * Get comprehensive dashboard statistics
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      const [teamsStats, projectsStats, tasksStats, activity] = await Promise.all([
        this.getTeamsStats(),
        this.getProjectsStats(),
        this.getTasksStats(),
        this.getRecentActivity()
      ]);

      return {
        teams: teamsStats,
        projects: projectsStats,
        tasks: tasksStats,
        activity
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * Get teams statistics
   */
  private static async getTeamsStats() {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Get teams for the current user's client
      const { data: teams, error } = await this.supabase
        .rpc('get_user_teams', { p_user_id: user.user.id });

      if (error) throw error;

      const total = teams?.length || 0;
      const active = teams?.filter(team => !team.is_archived).length || 0;

      return { total, active };
    } catch (error) {
      console.error('Error fetching teams stats:', error);
      return { total: 0, active: 0 };
    }
  }

  /**
   * Get projects statistics
   */
  private static async getProjectsStats() {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Get projects for the current user
      const { data: projects, error } = await this.supabase
        .rpc('get_user_projects', { p_user_id: user.user.id });

      if (error) throw error;

      const total = projects?.length || 0;
      const active = projects?.filter(p => p.status === 'active').length || 0;
      const completed = projects?.filter(p => p.status === 'completed').length || 0;
      const archived = projects?.filter(p => p.status === 'archived').length || 0;

      return { total, active, completed, archived };
    } catch (error) {
      console.error('Error fetching projects stats:', error);
      return { total: 0, active: 0, completed: 0, archived: 0 };
    }
  }

  /**
   * Get tasks statistics
   */
  private static async getTasksStats() {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Get user's projects first
      const { data: projects } = await this.supabase
        .rpc('get_user_projects', { p_user_id: user.user.id });

      if (!projects || projects.length === 0) {
        return { total: 0, pending: 0, in_progress: 0, completed: 0, completed_today: 0 };
      }

      const projectIds = projects.map(p => p.id);

      // Get tasks for user's projects
      const { data: tasks, error } = await this.supabase
        .from('tasks')
        .select(`
          id,
          title,
          column_id,
          created_at,
          updated_at,
          columns!inner(name)
        `)
        .in('project_id', projectIds);

      if (error) throw error;

      const total = tasks?.length || 0;
      const pending = tasks?.filter(t => t.columns.name === 'A Fazer').length || 0;
      const in_progress = tasks?.filter(t => t.columns.name === 'Em Progresso').length || 0;
      const completed = tasks?.filter(t => t.columns.name === 'Concluído').length || 0;

      // Tasks completed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const completed_today = tasks?.filter(t => 
        t.columns.name === 'Concluído' && 
        new Date(t.updated_at) >= today
      ).length || 0;

      return { total, pending, in_progress, completed, completed_today };
    } catch (error) {
      console.error('Error fetching tasks stats:', error);
      return { total: 0, pending: 0, in_progress: 0, completed: 0, completed_today: 0 };
    }
  }

  /**
   * Get recent activity
   */
  private static async getRecentActivity(): Promise<ActivityItem[]> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Get recent projects
      const { data: projects } = await this.supabase
        .rpc('get_user_projects', { p_user_id: user.user.id });

      if (!projects || projects.length === 0) return [];

      // Convert recent projects to activity items
      const activity: ActivityItem[] = projects
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map(project => ({
          id: project.id,
          type: 'project_created' as const,
          title: `Projeto "${project.name}" criado`,
          description: `Novo projeto foi criado`,
          timestamp: project.created_at,
          project_name: project.name
        }));

      return activity;
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  /**
   * Get quick actions based on current state
   */
  static async getQuickActions(): Promise<QuickAction[]> {
    try {
      const stats = await this.getDashboardStats();

      const actions: QuickAction[] = [
        {
          id: 'create_team',
          title: 'Criar primeiro time',
          description: 'Organize sua equipe em times',
          icon: 'Users',
          href: '/dashboard/teams/new',
          completed: stats.teams.total > 0,
          priority: 'high'
        },
        {
          id: 'create_project',
          title: 'Criar primeiro projeto',
          description: 'Inicie seu primeiro projeto',
          icon: 'FolderOpen',
          href: '/dashboard/projects/new',
          completed: stats.projects.total > 0,
          priority: 'high'
        },
        {
          id: 'invite_members',
          title: 'Convidar membros',
          description: 'Adicione sua equipe ao workspace',
          icon: 'TrendingUp',
          href: '/dashboard/teams',
          completed: false, // This would need user count logic
          priority: 'medium'
        }
      ];

      return actions;
    } catch (error) {
      console.error('Error fetching quick actions:', error);
      return [];
    }
  }

  /**
   * Get empty stats for error cases
   */
  private static getEmptyStats(): DashboardStats {
    return {
      teams: { total: 0, active: 0 },
      projects: { total: 0, active: 0, completed: 0, archived: 0 },
      tasks: { total: 0, pending: 0, in_progress: 0, completed: 0, completed_today: 0 },
      activity: []
    };
  }
}
