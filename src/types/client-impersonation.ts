// Client Impersonation Types for Platform Admin

export interface ClientImpersonationSession {
  id: string;
  admin_id: string;
  admin_email: string;
  admin_name: string;
  client_id: string;
  client_name: string;
  client_email: string;
  impersonated_user_id: string;
  impersonated_user_email: string;
  impersonated_user_name: string;
  session_token: string;
  reason: string;
  ip_address?: string;
  user_agent?: string;
  started_at: string;
  expires_at: string;
  ended_at?: string;
  status: 'active' | 'expired' | 'terminated';
  permissions: ImpersonationPermission[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ClientImpersonationSessionInsert {
  id?: string;
  admin_id: string;
  admin_email: string;
  admin_name: string;
  client_id: string;
  client_name: string;
  client_email: string;
  impersonated_user_id: string;
  impersonated_user_email: string;
  impersonated_user_name: string;
  reason: string;
  duration_minutes?: number;
  permissions?: ImpersonationPermission[];
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

// Impersonation Permissions
export enum ImpersonationPermission {
  VIEW_PROJECTS = 'view_projects',
  VIEW_TEAMS = 'view_teams',
  VIEW_TASKS = 'view_tasks',
  VIEW_CHAT = 'view_chat',
  VIEW_FILES = 'view_files',
  VIEW_SETTINGS = 'view_settings',
  MODIFY_PROJECTS = 'modify_projects',
  MODIFY_TEAMS = 'modify_teams',
  MODIFY_TASKS = 'modify_tasks',
  MODIFY_SETTINGS = 'modify_settings',
  FULL_ACCESS = 'full_access'
}

// Impersonation Request
export interface ImpersonationRequest {
  client_id: string;
  user_id: string;
  reason: string;
  duration_minutes: number;
  permissions: ImpersonationPermission[];
  require_approval?: boolean;
}

// Impersonation Response
export interface ImpersonationResponse {
  session: ClientImpersonationSession;
  access_token: string;
  dashboard_url: string;
  expires_at: string;
  permissions: ImpersonationPermission[];
  warnings?: string[];
}

// Impersonation Status
export interface ImpersonationStatus {
  is_impersonating: boolean;
  session?: ClientImpersonationSession;
  original_admin?: {
    id: string;
    email: string;
    name: string;
  };
  impersonated_user?: {
    id: string;
    email: string;
    name: string;
    client_name: string;
  };
  permissions: ImpersonationPermission[];
  time_remaining?: number;
}

// Impersonation History
export interface ImpersonationHistory {
  sessions: ClientImpersonationSession[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: ImpersonationFilters;
  summary: ImpersonationSummary;
}

// Impersonation Filters
export interface ImpersonationFilters {
  admin_id?: string;
  client_id?: string;
  user_id?: string;
  status?: ('active' | 'expired' | 'terminated')[];
  date_from?: string;
  date_to?: string;
  search?: string;
}

// Impersonation Summary
export interface ImpersonationSummary {
  total_sessions: number;
  active_sessions: number;
  expired_sessions: number;
  terminated_sessions: number;
  unique_admins: number;
  unique_clients: number;
  average_duration_minutes: number;
  date_range: {
    from: string;
    to: string;
  };
}

// Impersonation Reasons (predefined)
export enum ImpersonationReason {
  TECHNICAL_SUPPORT = 'technical_support',
  BUG_INVESTIGATION = 'bug_investigation',
  FEATURE_DEMONSTRATION = 'feature_demonstration',
  DATA_RECOVERY = 'data_recovery',
  ACCOUNT_SETUP = 'account_setup',
  TRAINING_SUPPORT = 'training_support',
  SECURITY_INVESTIGATION = 'security_investigation',
  BILLING_SUPPORT = 'billing_support',
  CUSTOM = 'custom'
}

// Impersonation Validation
export interface ImpersonationValidation {
  is_valid: boolean;
  can_impersonate: boolean;
  errors: string[];
  warnings: string[];
  client_status: 'active' | 'suspended' | 'inactive';
  user_status: 'active' | 'suspended' | 'inactive';
  admin_permissions: string[];
}

// Impersonation Event for real-time monitoring
export interface ImpersonationEvent {
  type: 'session_started' | 'session_ended' | 'session_expired' | 'permission_violation';
  session_id: string;
  admin_id: string;
  client_id: string;
  user_id: string;
  timestamp: string;
  details: Record<string, any>;
}

// Impersonation Configuration
export interface ImpersonationConfig {
  max_duration_minutes: number;
  default_duration_minutes: number;
  require_approval_for_sensitive_clients: boolean;
  allowed_permissions_by_admin_role: Record<string, ImpersonationPermission[]>;
  audit_all_actions: boolean;
  session_timeout_warning_minutes: number;
  max_concurrent_sessions_per_admin: number;
}
