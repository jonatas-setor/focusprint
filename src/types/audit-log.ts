// Audit Log Types for Platform Admin
export interface AuditLog {
  id: string;
  timestamp: string;
  admin_id: string;
  admin_email: string;
  admin_name: string;
  action: AuditAction;
  resource_type: ResourceType;
  resource_id?: string;
  resource_name?: string;
  details: AuditDetails;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  severity: AuditSeverity;
  status: 'success' | 'failure' | 'warning';
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AuditLogInsert {
  id?: string;
  admin_id: string;
  admin_email: string;
  admin_name: string;
  action: AuditAction;
  resource_type: ResourceType;
  resource_id?: string;
  resource_name?: string;
  details: AuditDetails;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  severity?: AuditSeverity;
  status?: 'success' | 'failure' | 'warning';
  metadata?: Record<string, any>;
}

// Audit Actions
export enum AuditAction {
  // Authentication Actions
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
  PASSWORD_RESET = 'password_reset',
  
  // 2FA Actions
  TWO_FA_ENABLED = '2fa_enabled',
  TWO_FA_DISABLED = '2fa_disabled',
  TWO_FA_VERIFIED = '2fa_verified',
  TWO_FA_FAILED = '2fa_failed',
  BACKUP_CODE_USED = 'backup_code_used',
  
  // Admin Management
  ADMIN_CREATED = 'admin_created',
  ADMIN_UPDATED = 'admin_updated',
  ADMIN_DELETED = 'admin_deleted',
  ADMIN_ROLE_CHANGED = 'admin_role_changed',
  ADMIN_PERMISSIONS_CHANGED = 'admin_permissions_changed',
  
  // Client Management
  CLIENT_CREATED = 'client_created',
  CLIENT_UPDATED = 'client_updated',
  CLIENT_DELETED = 'client_deleted',
  CLIENT_STATUS_CHANGED = 'client_status_changed',
  CLIENT_IMPERSONATED = 'client_impersonated',
  CLIENT_IMPERSONATION_ENDED = 'client_impersonation_ended',
  
  // License Management
  LICENSE_CREATED = 'license_created',
  LICENSE_UPDATED = 'license_updated',
  LICENSE_DELETED = 'license_deleted',
  LICENSE_STATUS_CHANGED = 'license_status_changed',
  LICENSE_PLAN_CHANGED = 'license_plan_changed',
  
  // Plan Management
  PLAN_CREATED = 'plan_created',
  PLAN_UPDATED = 'plan_updated',
  PLAN_DELETED = 'plan_deleted',
  PLAN_ACTIVATED = 'plan_activated',
  PLAN_DEACTIVATED = 'plan_deactivated',
  
  // System Configuration
  SYSTEM_CONFIG_CHANGED = 'system_config_changed',
  SYSTEM_MAINTENANCE_MODE = 'system_maintenance_mode',
  SYSTEM_BACKUP_CREATED = 'system_backup_created',
  SYSTEM_RESTORE_PERFORMED = 'system_restore_performed',

  // Feature Flag Management
  FEATURE_FLAG_CREATED = 'feature_flag_created',
  FEATURE_FLAG_UPDATED = 'feature_flag_updated',
  FEATURE_FLAG_DELETED = 'feature_flag_deleted',
  FEATURE_FLAG_ENABLED = 'feature_flag_enabled',
  FEATURE_FLAG_DISABLED = 'feature_flag_disabled',
  FEATURE_FLAG_ARCHIVED = 'feature_flag_archived',

  // Support Ticket Management
  TICKET_CREATED = 'ticket_created',
  TICKET_UPDATED = 'ticket_updated',
  TICKET_ASSIGNED = 'ticket_assigned',
  TICKET_STATUS_CHANGED = 'ticket_status_changed',
  TICKET_COMMENTED = 'ticket_commented',
  TICKET_RESOLVED = 'ticket_resolved',
  TICKET_CLOSED = 'ticket_closed',

  // Bulk Operations
  BULK_OPERATION = 'bulk_operation',
  
  // Data Access
  DATA_EXPORTED = 'data_exported',
  DATA_IMPORTED = 'data_imported',
  BULK_OPERATION = 'bulk_operation',
  
  // Security Events
  PERMISSION_DENIED = 'permission_denied',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked'
}

// Resource Types
export enum ResourceType {
  ADMIN = 'admin',
  CLIENT = 'client',
  LICENSE = 'license',
  PLAN = 'plan',
  USER = 'user',
  SYSTEM = 'system',
  SESSION = 'session',
  API_KEY = 'api_key',
  WEBHOOK = 'webhook',
  INTEGRATION = 'integration',
  FEATURE_FLAG = 'feature_flag',
  TICKET = 'ticket'
}

// Audit Severity Levels
export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Audit Details Structure
export interface AuditDetails {
  description: string;
  changes?: AuditChange[];
  context?: Record<string, any>;
  error_message?: string;
  duration_ms?: number;
  affected_records?: number;
}

// Audit Change Tracking
export interface AuditChange {
  field: string;
  old_value: any;
  new_value: any;
  field_type?: string;
}

// Audit Log Filters
export interface AuditLogFilters {
  admin_id?: string;
  action?: AuditAction[];
  resource_type?: ResourceType[];
  severity?: AuditSeverity[];
  status?: ('success' | 'failure' | 'warning')[];
  date_from?: string;
  date_to?: string;
  search?: string;
  ip_address?: string;
}

// Audit Log Pagination
export interface AuditLogPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Audit Log Response
export interface AuditLogResponse {
  logs: AuditLog[];
  pagination: AuditLogPagination;
  filters: AuditLogFilters;
  summary: AuditLogSummary;
}

// Audit Log Summary
export interface AuditLogSummary {
  total_logs: number;
  success_count: number;
  failure_count: number;
  warning_count: number;
  critical_count: number;
  unique_admins: number;
  date_range: {
    from: string;
    to: string;
  };
}

// Real-time Audit Event
export interface AuditEvent {
  log: AuditLog;
  timestamp: string;
  channel: string;
}

// Audit Export Options
export interface AuditExportOptions {
  format: 'csv' | 'json' | 'pdf';
  filters: AuditLogFilters;
  include_metadata: boolean;
  date_range: {
    from: string;
    to: string;
  };
}
