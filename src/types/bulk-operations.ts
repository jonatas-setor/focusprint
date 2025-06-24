// Bulk Operations Types for Platform Admin

export interface BulkOperation {
  id: string;
  operation_type: BulkOperationType;
  target_type: BulkTargetType;
  target_ids: string[];
  parameters: Record<string, any>;
  reason?: string;
  status: BulkOperationStatus;
  progress: BulkOperationProgress;
  results: BulkOperationResult[];
  created_by: string;
  created_by_name: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface BulkOperationInsert {
  operation_type: BulkOperationType;
  target_type: BulkTargetType;
  target_ids: string[];
  parameters: Record<string, any>;
  reason?: string;
  metadata?: Record<string, any>;
}

// Bulk Operation Types
export enum BulkOperationType {
  // User Operations
  ENABLE_USERS = 'enable_users',
  DISABLE_USERS = 'disable_users',
  UPDATE_USER_ROLES = 'update_user_roles',
  RESET_PASSWORDS = 'reset_passwords',
  DELETE_USERS = 'delete_users',
  
  // License Operations
  ACTIVATE_LICENSES = 'activate_licenses',
  DEACTIVATE_LICENSES = 'deactivate_licenses',
  UPDATE_LICENSE_PLANS = 'update_license_plans',
  EXTEND_LICENSE_EXPIRATION = 'extend_license_expiration',
  TRANSFER_LICENSES = 'transfer_licenses',
  
  // Client Operations
  UPDATE_CLIENT_PLANS = 'update_client_plans',
  SUSPEND_CLIENTS = 'suspend_clients',
  REACTIVATE_CLIENTS = 'reactivate_clients',
  BILLING_ADJUSTMENTS = 'billing_adjustments',
  DELETE_CLIENTS = 'delete_clients',
  
  // Cross-System Operations
  CLIENT_MIGRATION = 'client_migration',
  AUDIT_EXPORT = 'audit_export',
  COMPLIANCE_REPORT = 'compliance_report',
  FEATURE_FLAG_SYNC = 'feature_flag_sync',
  BULK_NOTIFICATIONS = 'bulk_notifications',
  SYSTEM_MAINTENANCE = 'system_maintenance'
}

// Bulk Target Types
export enum BulkTargetType {
  USERS = 'users',
  LICENSES = 'licenses',
  CLIENTS = 'clients',
  FEATURE_FLAGS = 'feature_flags',
  TICKETS = 'tickets',
  AUDIT_LOGS = 'audit_logs',
  MIXED = 'mixed'
}

// Bulk Operation Status
export enum BulkOperationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PARTIAL_SUCCESS = 'partial_success'
}

// Bulk Operation Progress
export interface BulkOperationProgress {
  total_items: number;
  processed_items: number;
  successful_items: number;
  failed_items: number;
  percentage_complete: number;
  estimated_time_remaining_seconds?: number;
  current_item?: string;
  stage: BulkOperationStage;
}

export enum BulkOperationStage {
  INITIALIZING = 'initializing',
  VALIDATING = 'validating',
  PROCESSING = 'processing',
  FINALIZING = 'finalizing',
  COMPLETED = 'completed'
}

// Bulk Operation Result
export interface BulkOperationResult {
  target_id: string;
  target_name?: string;
  success: boolean;
  error_message?: string;
  warnings?: string[];
  processed_at: string;
  result_data?: Record<string, any>;
}

// Bulk Operation Request
export interface BulkOperationRequest {
  operation_type: BulkOperationType;
  target_type: BulkTargetType;
  target_ids: string[];
  parameters: Record<string, any>;
  reason?: string;
  dry_run?: boolean;
  batch_size?: number;
  metadata?: Record<string, any>;
}

// Bulk Operation Response
export interface BulkOperationResponse {
  operation: BulkOperation;
  validation_results?: BulkValidationResult[];
  estimated_duration_seconds?: number;
  warnings?: string[];
}

// Bulk Validation Result
export interface BulkValidationResult {
  target_id: string;
  target_name?: string;
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  can_proceed: boolean;
}

// User Bulk Operations
export interface UserBulkParameters {
  // For enable/disable operations
  enabled?: boolean;
  
  // For role updates
  new_role?: string;
  
  // For password resets
  send_email?: boolean;
  temporary_password?: boolean;
  
  // For deletions
  soft_delete?: boolean;
  backup_data?: boolean;
}

// License Bulk Parameters
export interface LicenseBulkParameters {
  // For activation/deactivation
  active?: boolean;
  
  // For plan updates
  new_plan?: string;
  effective_date?: string;
  
  // For expiration extension
  extension_days?: number;
  new_expiration_date?: string;
  
  // For transfers
  target_client_id?: string;
  transfer_reason?: string;
}

// Client Bulk Parameters
export interface ClientBulkParameters {
  // For plan updates
  new_plan?: string;
  effective_date?: string;
  prorate_billing?: boolean;
  
  // For suspension/reactivation
  suspended?: boolean;
  suspension_reason?: string;
  
  // For billing adjustments
  adjustment_type?: 'credit' | 'debit' | 'refund';
  adjustment_amount?: number;
  adjustment_reason?: string;
  
  // For deletions
  soft_delete?: boolean;
  data_retention_days?: number;
}

// Cross-System Bulk Parameters
export interface CrossSystemBulkParameters {
  // For client migration
  source_plan?: string;
  target_plan?: string;
  migration_date?: string;
  migrate_data?: boolean;
  
  // For audit export
  date_from?: string;
  date_to?: string;
  export_format?: 'csv' | 'json' | 'pdf';
  include_sensitive_data?: boolean;
  
  // For compliance reports
  report_type?: string;
  compliance_standards?: string[];
  
  // For feature flag sync
  source_environment?: string;
  target_environment?: string;
  flag_categories?: string[];
  
  // For notifications
  notification_type?: string;
  message_template?: string;
  delivery_method?: 'email' | 'sms' | 'push';
}

// Bulk Operation History
export interface BulkOperationHistory {
  operations: BulkOperation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: BulkOperationFilters;
  summary: BulkOperationSummary;
}

// Bulk Operation Filters
export interface BulkOperationFilters {
  operation_type?: BulkOperationType[];
  target_type?: BulkTargetType[];
  status?: BulkOperationStatus[];
  created_by?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// Bulk Operation Summary
export interface BulkOperationSummary {
  total_operations: number;
  pending_operations: number;
  running_operations: number;
  completed_operations: number;
  failed_operations: number;
  operations_by_type: Record<BulkOperationType, number>;
  operations_by_target: Record<BulkTargetType, number>;
  avg_completion_time_minutes: number;
  success_rate_percentage: number;
}

// Bulk Operation Queue
export interface BulkOperationQueue {
  pending_operations: BulkOperation[];
  running_operations: BulkOperation[];
  max_concurrent_operations: number;
  queue_position?: number;
  estimated_start_time?: string;
}

// Bulk Operation Notification
export interface BulkOperationNotification {
  operation_id: string;
  notification_type: 'started' | 'progress' | 'completed' | 'failed';
  recipient_email: string;
  subject: string;
  message: string;
  sent_at: string;
  delivery_status: 'pending' | 'sent' | 'failed';
}
