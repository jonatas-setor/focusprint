import { createClient } from '@/lib/supabase/server';

export interface SystemMetrics {
  uptime_percentage: number;
  avg_response_time_ms: number;
  error_rate_percentage: number;
  total_requests_24h: number;
  failed_requests_24h: number;
  database_connections: number;
  memory_usage_percentage: number;
  cpu_usage_percentage: number;
  storage_usage_gb: number;
  active_sessions: number;
  peak_concurrent_users: number;
  last_updated: string;
}

export interface PerformanceMetrics {
  endpoint: string;
  avg_response_time: number;
  requests_count: number;
  error_count: number;
  success_rate: number;
  p95_response_time: number;
  p99_response_time: number;
}

export interface ErrorMetrics {
  error_type: string;
  count: number;
  percentage: number;
  last_occurrence: string;
  affected_endpoints: string[];
}

export interface UsageMetrics {
  hour: string;
  requests: number;
  unique_users: number;
  errors: number;
  avg_response_time: number;
}

export class SystemMetricsService {
  /**
   * Get current system metrics
   */
  static async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get request metrics from audit logs (proxy for API requests)
      const requestMetrics = await this.getRequestMetrics(last24h);
      
      // Get error metrics
      const errorMetrics = await this.getErrorMetrics(last24h);
      
      // Get session metrics
      const sessionMetrics = await this.getSessionMetrics();
      
      // Calculate uptime (simplified - based on error rate)
      const uptimePercentage = errorMetrics.total_errors > 0 ? 
        Math.max(95, 100 - (errorMetrics.error_rate * 10)) : 99.9;

      return {
        uptime_percentage: Math.round(uptimePercentage * 100) / 100,
        avg_response_time_ms: requestMetrics.avg_response_time,
        error_rate_percentage: errorMetrics.error_rate,
        total_requests_24h: requestMetrics.total_requests,
        failed_requests_24h: errorMetrics.total_errors,
        database_connections: await this.getDatabaseConnections(),
        memory_usage_percentage: this.getEstimatedMemoryUsage(),
        cpu_usage_percentage: this.getEstimatedCpuUsage(),
        storage_usage_gb: await this.getStorageUsage(),
        active_sessions: sessionMetrics.active_sessions,
        peak_concurrent_users: sessionMetrics.peak_concurrent_users,
        last_updated: now.toISOString()
      };

    } catch (error) {
      console.error('Error getting system metrics:', error);
      return this.getEmptySystemMetrics();
    }
  }

  /**
   * Get performance metrics by endpoint
   */
  static async getPerformanceMetrics(): Promise<PerformanceMetrics[]> {
    try {
      const supabase = await createClient();
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get audit logs as proxy for API requests
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('action, status, created_at, details')
        .gte('created_at', last24h.toISOString());

      if (error || !logs) {
        console.error('Error fetching performance data:', error);
        return [];
      }

      // Group by endpoint/action
      const endpointMetrics = logs.reduce((acc, log) => {
        const endpoint = log.action || 'unknown';
        if (!acc[endpoint]) {
          acc[endpoint] = {
            requests: [],
            errors: 0,
            total: 0
          };
        }

        acc[endpoint].total++;
        
        // Simulate response times based on action type
        const responseTime = this.getSimulatedResponseTime(endpoint);
        acc[endpoint].requests.push(responseTime);

        if (log.status === 'error') {
          acc[endpoint].errors++;
        }

        return acc;
      }, {} as Record<string, { requests: number[]; errors: number; total: number }>);

      return Object.entries(endpointMetrics).map(([endpoint, data]) => {
        const avgResponseTime = data.requests.length > 0 ? 
          data.requests.reduce((sum, time) => sum + time, 0) / data.requests.length : 0;
        
        const sortedTimes = data.requests.sort((a, b) => a - b);
        const p95Index = Math.floor(sortedTimes.length * 0.95);
        const p99Index = Math.floor(sortedTimes.length * 0.99);

        return {
          endpoint,
          avg_response_time: Math.round(avgResponseTime),
          requests_count: data.total,
          error_count: data.errors,
          success_rate: data.total > 0 ? ((data.total - data.errors) / data.total) * 100 : 100,
          p95_response_time: sortedTimes[p95Index] || 0,
          p99_response_time: sortedTimes[p99Index] || 0
        };
      }).sort((a, b) => b.requests_count - a.requests_count);

    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return [];
    }
  }

  /**
   * Get error metrics breakdown
   */
  static async getErrorMetrics(): Promise<ErrorMetrics[]> {
    try {
      const supabase = await createClient();
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const { data: errorLogs, error } = await supabase
        .from('audit_logs')
        .select('action, details, created_at')
        .eq('status', 'error')
        .gte('created_at', last24h.toISOString());

      if (error || !errorLogs) {
        console.error('Error fetching error metrics:', error);
        return [];
      }

      // Group errors by type
      const errorTypes = errorLogs.reduce((acc, log) => {
        const errorType = this.categorizeError(log.action, log.details);
        if (!acc[errorType]) {
          acc[errorType] = {
            count: 0,
            lastOccurrence: log.created_at,
            endpoints: new Set<string>()
          };
        }

        acc[errorType].count++;
        acc[errorType].endpoints.add(log.action);
        
        if (new Date(log.created_at) > new Date(acc[errorType].lastOccurrence)) {
          acc[errorType].lastOccurrence = log.created_at;
        }

        return acc;
      }, {} as Record<string, { count: number; lastOccurrence: string; endpoints: Set<string> }>);

      const totalErrors = errorLogs.length;

      return Object.entries(errorTypes).map(([errorType, data]) => ({
        error_type: errorType,
        count: data.count,
        percentage: totalErrors > 0 ? Math.round((data.count / totalErrors) * 100) : 0,
        last_occurrence: data.lastOccurrence,
        affected_endpoints: Array.from(data.endpoints)
      })).sort((a, b) => b.count - a.count);

    } catch (error) {
      console.error('Error getting error metrics:', error);
      return [];
    }
  }

  /**
   * Get hourly usage metrics for the last 24 hours
   */
  static async getHourlyUsageMetrics(): Promise<UsageMetrics[]> {
    try {
      const supabase = await createClient();
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('admin_id, created_at, status, action')
        .gte('created_at', last24h.toISOString());

      if (error || !logs) {
        console.error('Error fetching usage metrics:', error);
        return [];
      }

      // Group by hour
      const hourlyData = logs.reduce((acc, log) => {
        const hour = log.created_at.slice(0, 13); // YYYY-MM-DDTHH
        if (!acc[hour]) {
          acc[hour] = {
            requests: 0,
            uniqueUsers: new Set<string>(),
            errors: 0,
            responseTimes: []
          };
        }

        acc[hour].requests++;
        acc[hour].uniqueUsers.add(log.admin_id);
        
        if (log.status === 'error') {
          acc[hour].errors++;
        }

        // Simulate response time
        acc[hour].responseTimes.push(this.getSimulatedResponseTime(log.action));

        return acc;
      }, {} as Record<string, { 
        requests: number; 
        uniqueUsers: Set<string>; 
        errors: number; 
        responseTimes: number[] 
      }>);

      // Generate array for last 24 hours
      const usageMetrics: UsageMetrics[] = [];
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString().slice(0, 13);
        const data = hourlyData[hour];

        usageMetrics.push({
          hour,
          requests: data?.requests || 0,
          unique_users: data?.uniqueUsers.size || 0,
          errors: data?.errors || 0,
          avg_response_time: data?.responseTimes.length ? 
            Math.round(data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length) : 0
        });
      }

      return usageMetrics;

    } catch (error) {
      console.error('Error getting hourly usage metrics:', error);
      return [];
    }
  }

  /**
   * Get request metrics for a time period
   */
  private static async getRequestMetrics(since: Date): Promise<{ total_requests: number; avg_response_time: number }> {
    try {
      const supabase = await createClient();

      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('action, created_at')
        .gte('created_at', since.toISOString());

      if (error || !logs) {
        return { total_requests: 0, avg_response_time: 0 };
      }

      const totalRequests = logs.length;
      
      // Simulate response times based on action types
      const responseTimes = logs.map(log => this.getSimulatedResponseTime(log.action));
      const avgResponseTime = responseTimes.length > 0 ? 
        Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length) : 0;

      return {
        total_requests: totalRequests,
        avg_response_time: avgResponseTime
      };

    } catch (error) {
      console.error('Error getting request metrics:', error);
      return { total_requests: 0, avg_response_time: 0 };
    }
  }

  /**
   * Get error metrics for a time period
   */
  private static async getErrorMetrics(since: Date): Promise<{ total_errors: number; error_rate: number }> {
    try {
      const supabase = await createClient();

      const { data: allLogs, error: allError } = await supabase
        .from('audit_logs')
        .select('status')
        .gte('created_at', since.toISOString());

      const { data: errorLogs, error: errorError } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('status', 'error')
        .gte('created_at', since.toISOString());

      if (allError || errorError || !allLogs) {
        return { total_errors: 0, error_rate: 0 };
      }

      const totalRequests = allLogs.length;
      const totalErrors = errorLogs?.length || 0;
      const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

      return {
        total_errors: totalErrors,
        error_rate: Math.round(errorRate * 100) / 100
      };

    } catch (error) {
      console.error('Error getting error metrics:', error);
      return { total_errors: 0, error_rate: 0 };
    }
  }

  /**
   * Get session metrics
   */
  private static async getSessionMetrics(): Promise<{ active_sessions: number; peak_concurrent_users: number }> {
    try {
      const supabase = await createClient();
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get unique users in last 24h as proxy for active sessions
      const { data: recentActivity, error } = await supabase
        .from('audit_logs')
        .select('admin_id')
        .gte('created_at', last24h.toISOString());

      if (error || !recentActivity) {
        return { active_sessions: 0, peak_concurrent_users: 0 };
      }

      const uniqueUsers = new Set(recentActivity.map(log => log.admin_id));
      const activeSessions = uniqueUsers.size;

      // Estimate peak concurrent users (simplified)
      const peakConcurrentUsers = Math.ceil(activeSessions * 1.3);

      return {
        active_sessions: activeSessions,
        peak_concurrent_users: peakConcurrentUsers
      };

    } catch (error) {
      console.error('Error getting session metrics:', error);
      return { active_sessions: 0, peak_concurrent_users: 0 };
    }
  }

  /**
   * Get database connections (estimated)
   */
  private static async getDatabaseConnections(): Promise<number> {
    // In a real implementation, this would query the database for active connections
    // For now, return an estimated value based on activity
    try {
      const supabase = await createClient();
      const last5min = new Date(Date.now() - 5 * 60 * 1000);

      const { data: recentActivity } = await supabase
        .from('audit_logs')
        .select('id')
        .gte('created_at', last5min.toISOString());

      // Estimate connections based on recent activity
      const baseConnections = 5; // Minimum pool
      const activityConnections = Math.ceil((recentActivity?.length || 0) / 10);
      
      return Math.min(baseConnections + activityConnections, 20); // Max 20 connections

    } catch (error) {
      console.error('Error getting database connections:', error);
      return 5;
    }
  }

  /**
   * Get storage usage
   */
  private static async getStorageUsage(): Promise<number> {
    try {
      const supabase = await createClient();

      const { data: files, error } = await supabase
        .from('file_attachments')
        .select('file_size');

      if (error || !files) {
        return 0;
      }

      const totalBytes = files.reduce((sum, file) => sum + (file.file_size || 0), 0);
      return Math.round((totalBytes / (1024 * 1024 * 1024)) * 100) / 100; // Convert to GB

    } catch (error) {
      console.error('Error getting storage usage:', error);
      return 0;
    }
  }

  /**
   * Get estimated memory usage
   */
  private static getEstimatedMemoryUsage(): number {
    // Simulate memory usage based on system load
    const baseUsage = 45; // 45% base usage
    const variableUsage = Math.random() * 20; // 0-20% variable
    return Math.round((baseUsage + variableUsage) * 100) / 100;
  }

  /**
   * Get estimated CPU usage
   */
  private static getEstimatedCpuUsage(): number {
    // Simulate CPU usage based on system load
    const baseUsage = 25; // 25% base usage
    const variableUsage = Math.random() * 30; // 0-30% variable
    return Math.round((baseUsage + variableUsage) * 100) / 100;
  }

  /**
   * Simulate response time based on action type
   */
  private static getSimulatedResponseTime(action: string): number {
    const baseTimes = {
      'login': 150,
      'logout': 50,
      'client_created': 300,
      'client_updated': 200,
      'impersonation_started': 400,
      'feature_flag_updated': 100,
      'bulk_operation': 800,
      'ticket_created': 250,
      'audit_log_created': 75
    };

    const baseTime = baseTimes[action as keyof typeof baseTimes] || 150;
    const variation = (Math.random() - 0.5) * 100; // ±50ms variation
    
    return Math.max(50, Math.round(baseTime + variation));
  }

  /**
   * Categorize error types
   */
  private static categorizeError(action: string, details: any): string {
    if (action.includes('auth') || action.includes('login')) {
      return 'Authentication Error';
    }
    if (action.includes('permission') || action.includes('access')) {
      return 'Authorization Error';
    }
    if (action.includes('database') || action.includes('query')) {
      return 'Database Error';
    }
    if (action.includes('api') || action.includes('request')) {
      return 'API Error';
    }
    if (action.includes('validation')) {
      return 'Validation Error';
    }
    return 'System Error';
  }

  /**
   * Get empty system metrics for error cases
   */
  private static getEmptySystemMetrics(): SystemMetrics {
    return {
      uptime_percentage: 0,
      avg_response_time_ms: 0,
      error_rate_percentage: 0,
      total_requests_24h: 0,
      failed_requests_24h: 0,
      database_connections: 0,
      memory_usage_percentage: 0,
      cpu_usage_percentage: 0,
      storage_usage_gb: 0,
      active_sessions: 0,
      peak_concurrent_users: 0,
      last_updated: new Date().toISOString()
    };
  }
}
