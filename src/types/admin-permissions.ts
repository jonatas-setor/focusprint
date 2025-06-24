/**
 * Platform Admin RBAC System
 * Complete implementation of PRD Section 3.2.2 and 5.4.2
 */

// Admin Roles as defined in PRD
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',           // Founders - full access
  OPERATIONS_ADMIN = 'operations_admin', // Client management & support
  FINANCIAL_ADMIN = 'financial_admin',   // Billing & financial reports
  TECHNICAL_ADMIN = 'technical_admin',   // System config & maintenance
  SUPPORT_ADMIN = 'support_admin'        // View-only & customer support
}

// Granular Permissions as defined in PRD
export enum AdminPermission {
  // Client Management
  MANAGE_CLIENTS = 'manage_clients',
  VIEW_CLIENTS = 'view_clients',
  SUSPEND_CLIENTS = 'suspend_clients',
  DELETE_CLIENTS = 'delete_clients',
  
  // License Management
  MANAGE_LICENSES = 'manage_licenses',
  VIEW_LICENSES = 'view_licenses',
  MODIFY_PLANS = 'modify_plans',
  
  // Financial Access
  VIEW_FINANCIALS = 'view_financials',
  MANAGE_BILLING = 'manage_billing',
  EXPORT_FINANCIAL_DATA = 'export_financial_data',
  MANAGE_STRIPE = 'manage_stripe',
  
  // Admin Management
  MANAGE_ADMINS = 'manage_admins',
  VIEW_ADMINS = 'view_admins',
  ASSIGN_PERMISSIONS = 'assign_permissions',
  RESET_2FA = 'reset_2fa',
  
  // System Configuration
  SYSTEM_CONFIG = 'system_config',
  FEATURE_FLAGS = 'feature_flags',
  MAINTENANCE_MODE = 'maintenance_mode',
  
  // Support & Impersonation
  CLIENT_IMPERSONATION = 'client_impersonation',
  VIEW_SUPPORT_TICKETS = 'view_support_tickets',
  MANAGE_SUPPORT_TICKETS = 'manage_support_tickets',
  
  // Audit & Security
  AUDIT_ACCESS = 'audit_access',
  SECURITY_MONITORING = 'security_monitoring',
  EXPORT_AUDIT_LOGS = 'export_audit_logs',
  
  // Metrics & Analytics
  VIEW_METRICS = 'view_metrics',
  EXPORT_METRICS = 'export_metrics',
  CUSTOM_REPORTS = 'custom_reports'
}

// Role-Permission Mapping as per PRD specifications
export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  [AdminRole.SUPER_ADMIN]: [
    // Full access to everything
    AdminPermission.MANAGE_CLIENTS,
    AdminPermission.VIEW_CLIENTS,
    AdminPermission.SUSPEND_CLIENTS,
    AdminPermission.DELETE_CLIENTS,
    AdminPermission.MANAGE_LICENSES,
    AdminPermission.VIEW_LICENSES,
    AdminPermission.MODIFY_PLANS,
    AdminPermission.VIEW_FINANCIALS,
    AdminPermission.MANAGE_BILLING,
    AdminPermission.EXPORT_FINANCIAL_DATA,
    AdminPermission.MANAGE_STRIPE,
    AdminPermission.MANAGE_ADMINS,
    AdminPermission.VIEW_ADMINS,
    AdminPermission.ASSIGN_PERMISSIONS,
    AdminPermission.RESET_2FA,
    AdminPermission.SYSTEM_CONFIG,
    AdminPermission.FEATURE_FLAGS,
    AdminPermission.MAINTENANCE_MODE,
    AdminPermission.CLIENT_IMPERSONATION,
    AdminPermission.VIEW_SUPPORT_TICKETS,
    AdminPermission.MANAGE_SUPPORT_TICKETS,
    AdminPermission.AUDIT_ACCESS,
    AdminPermission.SECURITY_MONITORING,
    AdminPermission.EXPORT_AUDIT_LOGS,
    AdminPermission.VIEW_METRICS,
    AdminPermission.EXPORT_METRICS,
    AdminPermission.CUSTOM_REPORTS
  ],
  
  [AdminRole.OPERATIONS_ADMIN]: [
    // Client management and support
    AdminPermission.MANAGE_CLIENTS,
    AdminPermission.VIEW_CLIENTS,
    AdminPermission.SUSPEND_CLIENTS,
    AdminPermission.MANAGE_LICENSES,
    AdminPermission.VIEW_LICENSES,
    AdminPermission.CLIENT_IMPERSONATION,
    AdminPermission.VIEW_SUPPORT_TICKETS,
    AdminPermission.MANAGE_SUPPORT_TICKETS,
    AdminPermission.VIEW_METRICS,
    AdminPermission.AUDIT_ACCESS
  ],
  
  [AdminRole.FINANCIAL_ADMIN]: [
    // Billing and financial reports
    AdminPermission.VIEW_CLIENTS,
    AdminPermission.VIEW_LICENSES,
    AdminPermission.VIEW_FINANCIALS,
    AdminPermission.MANAGE_BILLING,
    AdminPermission.EXPORT_FINANCIAL_DATA,
    AdminPermission.MANAGE_STRIPE,
    AdminPermission.VIEW_METRICS,
    AdminPermission.EXPORT_METRICS,
    AdminPermission.CUSTOM_REPORTS
  ],
  
  [AdminRole.TECHNICAL_ADMIN]: [
    // System configuration and maintenance
    AdminPermission.VIEW_CLIENTS,
    AdminPermission.VIEW_LICENSES,
    AdminPermission.SYSTEM_CONFIG,
    AdminPermission.FEATURE_FLAGS,
    AdminPermission.MAINTENANCE_MODE,
    AdminPermission.AUDIT_ACCESS,
    AdminPermission.SECURITY_MONITORING,
    AdminPermission.VIEW_METRICS
  ],
  
  [AdminRole.SUPPORT_ADMIN]: [
    // View-only and customer support
    AdminPermission.VIEW_CLIENTS,
    AdminPermission.VIEW_LICENSES,
    AdminPermission.CLIENT_IMPERSONATION,
    AdminPermission.VIEW_SUPPORT_TICKETS,
    AdminPermission.MANAGE_SUPPORT_TICKETS,
    AdminPermission.VIEW_METRICS
  ]
};

// Department mapping for admin roles
export const ROLE_DEPARTMENTS: Record<AdminRole, string> = {
  [AdminRole.SUPER_ADMIN]: 'Leadership',
  [AdminRole.OPERATIONS_ADMIN]: 'Operations',
  [AdminRole.FINANCIAL_ADMIN]: 'Finance',
  [AdminRole.TECHNICAL_ADMIN]: 'Engineering',
  [AdminRole.SUPPORT_ADMIN]: 'Customer Support'
};

// Role hierarchy for permission inheritance
export const ROLE_HIERARCHY: Record<AdminRole, number> = {
  [AdminRole.SUPER_ADMIN]: 5,
  [AdminRole.OPERATIONS_ADMIN]: 4,
  [AdminRole.FINANCIAL_ADMIN]: 3,
  [AdminRole.TECHNICAL_ADMIN]: 3,
  [AdminRole.SUPPORT_ADMIN]: 1
};

// Enhanced Admin Profile interface
export interface AdminProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  role: AdminRole;
  permissions: AdminPermission[];
  department: string;
  hire_date: string | null;
  created_at: string;
  updated_at: string;
}

// Permission check result
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: AdminRole;
  requiredPermission?: AdminPermission;
}

// Admin context for authentication
export interface AdminAuthContext {
  user_id: string;
  email: string;
  role: AdminRole;
  permissions: AdminPermission[];
  department: string;
  session_expires_at: Date;
}
