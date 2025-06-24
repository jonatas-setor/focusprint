import {
  AuditLog,
  AuditLogInsert,
  AuditAction,
  ResourceType,
  AuditSeverity,
  AuditDetails,
  AuditChange,
  AuditLogFilters,
  AuditLogResponse
} from '@/types/audit-log';
import { createClient } from '@/lib/supabase/server';

// Main Audit Service
export class AuditService {
  /**
   * Log an audit event to database
   */
  static async log(auditData: AuditLogInsert, request?: Request): Promise<AuditLog> {
    try {
      const supabase = await createClient();

      // Extract request information if available
      let ip_address: string | undefined;
      let user_agent: string | undefined;

      if (request) {
        ip_address = this.getClientIP(request);
        user_agent = request.headers.get('user-agent') || undefined;
      }

      // Prepare audit log data for database
      const auditLogData = {
        action: auditData.action,
        resource_type: auditData.resource_type,
        resource_id: auditData.resource_id,
        resource_name: auditData.resource_name,
        admin_id: auditData.admin_id,
        admin_email: auditData.admin_email,
        admin_name: auditData.admin_name,
        changes: auditData.details?.changes || null,
        severity: auditData.severity || this.determineSeverity(auditData.action),
        ip_address: auditData.ip_address || ip_address,
        user_agent: auditData.user_agent || user_agent
      };

      // Insert into database
      const { data: insertedLog, error } = await supabase
        .from('audit_logs')
        .insert(auditLogData)
        .select()
        .single();

      if (error) {
        // Don't throw error to avoid breaking the main operation
        // Just return a mock audit log
        const mockLog: AuditLog = {
          id: `mock_${Date.now()}`,
          timestamp: new Date().toISOString(),
          admin_id: auditData.admin_id,
          admin_email: auditData.admin_email,
          admin_name: auditData.admin_name,
          action: auditData.action,
          resource_type: auditData.resource_type,
          resource_id: auditData.resource_id,
          resource_name: auditData.resource_name,
          details: auditData.details || { description: 'Audit log failed to save' },
          ip_address: auditLogData.ip_address,
          user_agent: auditLogData.user_agent,
          severity: auditLogData.severity,
          status: 'failure',
          created_at: new Date().toISOString()
        };
        return mockLog;
      }

      // Convert database record to AuditLog format
      const auditLog: AuditLog = {
        id: insertedLog.id,
        timestamp: insertedLog.created_at,
        admin_id: insertedLog.admin_id,
        admin_email: insertedLog.admin_email,
        admin_name: insertedLog.admin_name,
        action: insertedLog.action as AuditAction,
        resource_type: insertedLog.resource_type as ResourceType,
        resource_id: insertedLog.resource_id,
        resource_name: insertedLog.resource_name,
        details: {
          description: `${insertedLog.resource_type} ${insertedLog.action}`,
          changes: insertedLog.changes || []
        },
        ip_address: insertedLog.ip_address,
        user_agent: insertedLog.user_agent,
        severity: insertedLog.severity as AuditSeverity,
        status: 'success',
        created_at: insertedLog.created_at
      };



      return auditLog;

    } catch (error) {
      // Return a mock log to avoid breaking the main operation
      return {
        id: `error_${Date.now()}`,
        timestamp: new Date().toISOString(),
        admin_id: auditData.admin_id,
        admin_email: auditData.admin_email,
        admin_name: auditData.admin_name,
        action: auditData.action,
        resource_type: auditData.resource_type,
        resource_id: auditData.resource_id,
        resource_name: auditData.resource_name,
        details: auditData.details || { description: 'Audit log error' },
        severity: AuditSeverity.HIGH,
        status: 'failure',
        created_at: new Date().toISOString()
      };
    }
  }

  /**
   * Get audit logs with filtering and pagination from database
   */
  static async getLogs(
    filters: AuditLogFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<AuditLogResponse> {
    try {
      const supabase = await createClient();

      // Build query
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.admin_id) {
        query = query.eq('admin_id', filters.admin_id);
      }

      if (filters.action && filters.action.length > 0) {
        query = query.in('action', filters.action);
      }

      if (filters.resource_type && filters.resource_type.length > 0) {
        query = query.in('resource_type', filters.resource_type);
      }

      if (filters.severity && filters.severity.length > 0) {
        query = query.in('severity', filters.severity);
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      if (filters.search) {
        query = query.or(`admin_email.ilike.%${filters.search}%,admin_name.ilike.%${filters.search}%,resource_name.ilike.%${filters.search}%`);
      }

      if (filters.ip_address) {
        query = query.eq('ip_address', filters.ip_address);
      }

      // Apply pagination and ordering
      const offset = (page - 1) * limit;
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: logs, error, count } = await query;

      if (error) {
        return {
          logs: [],
          pagination: { page, limit, total: 0, pages: 0 },
          filters,
          summary: {
            total_logs: 0,
            success_count: 0,
            failure_count: 0,
            warning_count: 0,
            critical_count: 0,
            unique_admins: 0,
            date_range: { from: '', to: '' }
          }
        };
      }

      const total = count || 0;
      const pages = Math.ceil(total / limit);

      // Convert database records to AuditLog format
      const auditLogs: AuditLog[] = (logs || []).map(log => ({
        id: log.id,
        timestamp: log.created_at,
        admin_id: log.admin_id,
        admin_email: log.admin_email,
        admin_name: log.admin_name,
        action: log.action as AuditAction,
        resource_type: log.resource_type as ResourceType,
        resource_id: log.resource_id,
        resource_name: log.resource_name,
        details: {
          description: `${log.resource_type} ${log.action}`,
          changes: log.changes || []
        },
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        severity: log.severity as AuditSeverity,
        status: 'success', // Default status
        created_at: log.created_at
      }));

      // Calculate summary (simplified for now)
      const summary = {
        total_logs: total,
        success_count: total, // Simplified - all logs are considered successful
        failure_count: 0,
        warning_count: 0,
        critical_count: auditLogs.filter(log => log.severity === AuditSeverity.CRITICAL).length,
        unique_admins: new Set(auditLogs.map(log => log.admin_id)).size,
        date_range: {
          from: auditLogs.length > 0 ? auditLogs[auditLogs.length - 1].timestamp : '',
          to: auditLogs.length > 0 ? auditLogs[0].timestamp : ''
        }
      };

      return {
        logs: auditLogs,
        pagination: { page, limit, total, pages },
        filters,
        summary
      };

    } catch (error) {
      return {
        logs: [],
        pagination: { page, limit, total: 0, pages: 0 },
        filters,
        summary: {
          total_logs: 0,
          success_count: 0,
          failure_count: 0,
          warning_count: 0,
          critical_count: 0,
          unique_admins: 0,
          date_range: { from: '', to: '' }
        }
      };
    }
  }

  /**
   * Log admin authentication events
   */
  static async logAuth(
    action: AuditAction.LOGIN | AuditAction.LOGOUT | AuditAction.LOGIN_FAILED,
    adminId: string,
    adminEmail: string,
    adminName: string,
    details: string,
    request?: Request,
    status: 'success' | 'failure' = 'success'
  ): Promise<AuditLog> {
    return this.log({
      admin_id: adminId,
      admin_email: adminEmail,
      admin_name: adminName,
      action,
      resource_type: ResourceType.SESSION,
      details: {
        description: details,
        context: {
          timestamp: new Date().toISOString()
        }
      },
      status
    }, request);
  }

  /**
   * Log CRUD operations with change tracking
   */
  static async logCRUD(
    action: AuditAction,
    adminId: string,
    adminEmail: string,
    adminName: string,
    resourceType: ResourceType,
    resourceId: string,
    resourceName: string,
    changes: AuditChange[] = [],
    request?: Request
  ): Promise<AuditLog> {
    const actionMap = {
      [AuditAction.CLIENT_CREATED]: 'created',
      [AuditAction.CLIENT_UPDATED]: 'updated',
      [AuditAction.CLIENT_DELETED]: 'deleted',
      [AuditAction.LICENSE_CREATED]: 'created',
      [AuditAction.LICENSE_UPDATED]: 'updated',
      [AuditAction.LICENSE_DELETED]: 'deleted',
      [AuditAction.ADMIN_CREATED]: 'created',
      [AuditAction.ADMIN_UPDATED]: 'updated',
      [AuditAction.ADMIN_DELETED]: 'deleted'
    };

    const actionVerb = actionMap[action] || 'modified';

    return this.log({
      admin_id: adminId,
      admin_email: adminEmail,
      admin_name: adminName,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      resource_name: resourceName,
      details: {
        description: `${resourceType} "${resourceName}" was ${actionVerb}`,
        changes,
        affected_records: 1
      }
    }, request);
  }

  /**
   * Log security events
   */
  static async logSecurity(
    action: AuditAction,
    adminId: string,
    adminEmail: string,
    adminName: string,
    details: string,
    severity: AuditSeverity = AuditSeverity.MEDIUM,
    request?: Request,
    status: 'success' | 'failure' | 'warning' = 'warning'
  ): Promise<AuditLog> {
    return this.log({
      admin_id: adminId,
      admin_email: adminEmail,
      admin_name: adminName,
      action,
      resource_type: ResourceType.SYSTEM,
      details: {
        description: details,
        context: {
          security_event: true,
          timestamp: new Date().toISOString()
        }
      },
      severity,
      status
    }, request);
  }

  /**
   * Get audit statistics from database
   */
  static async getStatistics(): Promise<{
    total_logs: number;
    logs_today: number;
    logs_this_week: number;
    top_actions: Array<{ action: string; count: number }>;
    top_admins: Array<{ admin: string; count: number }>;
  }> {
    try {
      const supabase = await createClient();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Get total logs count
      const { count: totalLogs } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });

      // Get logs today count
      const { count: logsToday } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // Get logs this week count
      const { count: logsThisWeek } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo);

      // Get top actions (simplified query)
      const { data: actionData } = await supabase
        .from('audit_logs')
        .select('action')
        .limit(1000); // Limit for performance

      const actionCounts = (actionData || []).reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topActions = Object.entries(actionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([action, count]) => ({ action, count }));

      // Get top admins (simplified query)
      const { data: adminData } = await supabase
        .from('audit_logs')
        .select('admin_email')
        .limit(1000); // Limit for performance

      const adminCounts = (adminData || []).reduce((acc, log) => {
        acc[log.admin_email] = (acc[log.admin_email] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topAdmins = Object.entries(adminCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([admin, count]) => ({ admin, count }));

      return {
        total_logs: totalLogs || 0,
        logs_today: logsToday || 0,
        logs_this_week: logsThisWeek || 0,
        top_actions: topActions,
        top_admins: topAdmins
      };

    } catch (error) {
      return {
        total_logs: 0,
        logs_today: 0,
        logs_this_week: 0,
        top_actions: [],
        top_admins: []
      };
    }
  }

  /**
   * Determine severity based on action
   */
  private static determineSeverity(action: AuditAction): AuditSeverity {
    const criticalActions = [
      AuditAction.ADMIN_DELETED,
      AuditAction.SYSTEM_CONFIG_CHANGED,
      AuditAction.PERMISSION_DENIED,
      AuditAction.SUSPICIOUS_ACTIVITY
    ];

    const highActions = [
      AuditAction.ADMIN_CREATED,
      AuditAction.ADMIN_ROLE_CHANGED,
      AuditAction.CLIENT_IMPERSONATED,
      AuditAction.TWO_FA_DISABLED,
      AuditAction.LOGIN_FAILED
    ];

    const mediumActions = [
      AuditAction.CLIENT_CREATED,
      AuditAction.CLIENT_UPDATED,
      AuditAction.LICENSE_CREATED,
      AuditAction.TWO_FA_ENABLED
    ];

    if (criticalActions.includes(action)) return AuditSeverity.CRITICAL;
    if (highActions.includes(action)) return AuditSeverity.HIGH;
    if (mediumActions.includes(action)) return AuditSeverity.MEDIUM;
    return AuditSeverity.LOW;
  }

  /**
   * Extract client IP from request
   */
  private static getClientIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    return 'unknown';
  }

  /**
   * Clear all audit logs (for testing) - Database version
   */
  static async clearLogs(): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (error) {
      // Error clearing audit logs - handled silently in production
    }
  }
}
