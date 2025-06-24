import { createClient } from '@/lib/supabase/server';

export interface ClientMetrics {
  client_id: string;
  client_name: string;
  client_plan: string;
  total_users: number;
  active_users_30d: number;
  active_users_7d: number;
  active_users_1d: number;
  total_projects: number;
  active_projects: number;
  total_tasks: number;
  completed_tasks: number;
  storage_used_mb: number;
  storage_limit_mb: number;
  api_calls_30d: number;
  last_activity: string;
  created_at: string;
  plan_status: 'active' | 'suspended' | 'trial' | 'expired';
  license_expires_at?: string;
}

export interface ClientUsageMetrics {
  client_id: string;
  metric_type: 'users' | 'projects' | 'tasks' | 'storage' | 'api_calls' | 'sessions';
  value: number;
  date: string;
  metadata?: Record<string, any>;
}

export interface PlatformOverviewMetrics {
  total_clients: number;
  active_clients: number;
  trial_clients: number;
  suspended_clients: number;
  total_users: number;
  active_users_30d: number;
  total_projects: number;
  total_tasks: number;
  storage_used_gb: number;
  api_calls_30d: number;
  avg_users_per_client: number;
  avg_projects_per_client: number;
  client_growth_30d: number;
  user_growth_30d: number;
}

export class ClientMetricsService {
  /**
   * Get comprehensive metrics for a specific client
   */
  static async getClientMetrics(clientId: string): Promise<ClientMetrics | null> {
    try {
      const supabase = await createClient();

      // Get client basic info
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, plan, status, created_at, license_expires_at')
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        console.error('Error fetching client:', clientError);
        return null;
      }

      // Get user metrics
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, last_sign_in_at, created_at')
        .eq('client_id', clientId);

      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      // Get project metrics
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, status, created_at, updated_at')
        .eq('client_id', clientId);

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
      }

      // Get task metrics
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, status, created_at')
        .eq('client_id', clientId);

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
      }

      // Get storage metrics
      const { data: files, error: filesError } = await supabase
        .from('file_attachments')
        .select('file_size')
        .eq('client_id', clientId);

      if (filesError) {
        console.error('Error fetching files:', filesError);
      }

      // Calculate metrics
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const totalUsers = users?.length || 0;
      const activeUsers30d = users?.filter(u => 
        u.last_sign_in_at && new Date(u.last_sign_in_at) > thirtyDaysAgo
      ).length || 0;
      const activeUsers7d = users?.filter(u => 
        u.last_sign_in_at && new Date(u.last_sign_in_at) > sevenDaysAgo
      ).length || 0;
      const activeUsers1d = users?.filter(u => 
        u.last_sign_in_at && new Date(u.last_sign_in_at) > oneDayAgo
      ).length || 0;

      const totalProjects = projects?.length || 0;
      const activeProjects = projects?.filter(p => p.status === 'active').length || 0;

      const totalTasks = tasks?.length || 0;
      const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;

      const storageUsedMb = files?.reduce((sum, file) => sum + (file.file_size || 0), 0) / (1024 * 1024) || 0;
      
      // Get storage limit based on plan
      const storageLimits = {
        'FREE': 100, // 100MB
        'PRO': 1000, // 1GB
        'BUSINESS': 10000, // 10GB
        'ENTERPRISE': 100000 // 100GB
      };
      const storageLimitMb = storageLimits[client.plan as keyof typeof storageLimits] || 100;

      // Get last activity
      const lastActivity = Math.max(
        ...users?.map(u => new Date(u.last_sign_in_at || 0).getTime()).filter(Boolean) || [0],
        ...projects?.map(p => new Date(p.updated_at || 0).getTime()).filter(Boolean) || [0],
        ...tasks?.map(t => new Date(t.created_at || 0).getTime()).filter(Boolean) || [0]
      );

      return {
        client_id: client.id,
        client_name: client.name,
        client_plan: client.plan,
        total_users: totalUsers,
        active_users_30d: activeUsers30d,
        active_users_7d: activeUsers7d,
        active_users_1d: activeUsers1d,
        total_projects: totalProjects,
        active_projects: activeProjects,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        storage_used_mb: Math.round(storageUsedMb * 100) / 100,
        storage_limit_mb: storageLimitMb,
        api_calls_30d: await this.getApiCalls30d(clientId),
        last_activity: lastActivity > 0 ? new Date(lastActivity).toISOString() : client.created_at,
        created_at: client.created_at,
        plan_status: client.status,
        license_expires_at: client.license_expires_at
      };

    } catch (error) {
      console.error('Error calculating client metrics:', error);
      return null;
    }
  }

  /**
   * Get metrics for all clients
   */
  static async getAllClientsMetrics(): Promise<ClientMetrics[]> {
    try {
      const supabase = await createClient();

      // Get all clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id')
        .order('created_at', { ascending: false });

      if (clientsError || !clients) {
        console.error('Error fetching clients:', clientsError);
        return [];
      }

      // Get metrics for each client
      const metricsPromises = clients.map(client => 
        this.getClientMetrics(client.id)
      );

      const allMetrics = await Promise.all(metricsPromises);
      return allMetrics.filter(Boolean) as ClientMetrics[];

    } catch (error) {
      console.error('Error getting all clients metrics:', error);
      return [];
    }
  }

  /**
   * Get platform overview metrics
   */
  static async getPlatformOverviewMetrics(): Promise<PlatformOverviewMetrics> {
    try {
      const allClientsMetrics = await this.getAllClientsMetrics();
      
      if (allClientsMetrics.length === 0) {
        return this.getEmptyPlatformMetrics();
      }

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const totalClients = allClientsMetrics.length;
      const activeClients = allClientsMetrics.filter(c => c.plan_status === 'active').length;
      const trialClients = allClientsMetrics.filter(c => c.plan_status === 'trial').length;
      const suspendedClients = allClientsMetrics.filter(c => c.plan_status === 'suspended').length;

      const totalUsers = allClientsMetrics.reduce((sum, c) => sum + c.total_users, 0);
      const activeUsers30d = allClientsMetrics.reduce((sum, c) => sum + c.active_users_30d, 0);
      const totalProjects = allClientsMetrics.reduce((sum, c) => sum + c.total_projects, 0);
      const totalTasks = allClientsMetrics.reduce((sum, c) => sum + c.total_tasks, 0);
      const storageUsedGb = allClientsMetrics.reduce((sum, c) => sum + c.storage_used_mb, 0) / 1024;
      const apiCalls30d = allClientsMetrics.reduce((sum, c) => sum + c.api_calls_30d, 0);

      const avgUsersPerClient = totalClients > 0 ? Math.round((totalUsers / totalClients) * 100) / 100 : 0;
      const avgProjectsPerClient = totalClients > 0 ? Math.round((totalProjects / totalClients) * 100) / 100 : 0;

      // Calculate growth (simplified - would need historical data for accurate calculation)
      const recentClients = allClientsMetrics.filter(c => 
        new Date(c.created_at) > thirtyDaysAgo
      ).length;
      const clientGrowth30d = Math.round((recentClients / Math.max(totalClients - recentClients, 1)) * 100);

      // Estimate user growth (simplified)
      const userGrowth30d = Math.round((activeUsers30d / Math.max(totalUsers - activeUsers30d, 1)) * 100);

      return {
        total_clients: totalClients,
        active_clients: activeClients,
        trial_clients: trialClients,
        suspended_clients: suspendedClients,
        total_users: totalUsers,
        active_users_30d: activeUsers30d,
        total_projects: totalProjects,
        total_tasks: totalTasks,
        storage_used_gb: Math.round(storageUsedGb * 100) / 100,
        api_calls_30d: apiCalls30d,
        avg_users_per_client: avgUsersPerClient,
        avg_projects_per_client: avgProjectsPerClient,
        client_growth_30d: clientGrowth30d,
        user_growth_30d: userGrowth30d
      };

    } catch (error) {
      console.error('Error calculating platform overview metrics:', error);
      return this.getEmptyPlatformMetrics();
    }
  }

  /**
   * Get API calls for a client in the last 30 days
   */
  private static async getApiCalls30d(clientId: string): Promise<number> {
    try {
      // This would typically come from API logs or usage tracking
      // For now, we'll estimate based on user activity
      const supabase = await createClient();
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const { data: recentActivity, error } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('client_id', clientId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) {
        console.error('Error fetching API calls:', error);
        return 0;
      }

      // Estimate API calls based on audit log entries (rough approximation)
      return (recentActivity?.length || 0) * 3; // Assume 3 API calls per logged action

    } catch (error) {
      console.error('Error calculating API calls:', error);
      return 0;
    }
  }

  /**
   * Get empty platform metrics for error cases
   */
  private static getEmptyPlatformMetrics(): PlatformOverviewMetrics {
    return {
      total_clients: 0,
      active_clients: 0,
      trial_clients: 0,
      suspended_clients: 0,
      total_users: 0,
      active_users_30d: 0,
      total_projects: 0,
      total_tasks: 0,
      storage_used_gb: 0,
      api_calls_30d: 0,
      avg_users_per_client: 0,
      avg_projects_per_client: 0,
      client_growth_30d: 0,
      user_growth_30d: 0
    };
  }

  /**
   * Record usage metric for a client
   */
  static async recordUsageMetric(
    clientId: string,
    metricType: ClientUsageMetrics['metric_type'],
    value: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const supabase = await createClient();

      const { error } = await supabase
        .from('usage_metrics')
        .insert({
          client_id: clientId,
          metric_type: metricType,
          value,
          date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
          metadata
        });

      if (error) {
        console.error('Error recording usage metric:', error);
      }

    } catch (error) {
      console.error('Error recording usage metric:', error);
    }
  }
}
