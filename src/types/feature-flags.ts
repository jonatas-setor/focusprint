// Feature Flags Types for Platform Admin

export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  type: FeatureFlagType;
  default_value: any;
  current_value: any;
  is_enabled: boolean;
  environment: Environment;
  rollout_percentage: number;
  target_audience: TargetAudience;
  conditions: FeatureFlagCondition[];
  client_overrides: ClientOverride[];
  created_by: string;
  created_by_name: string;
  updated_by: string;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  tags: string[];
  category: FeatureFlagCategory;
  status: FeatureFlagStatus;
  metadata?: Record<string, any>;
}

export interface FeatureFlagInsert {
  id?: string;
  name: string;
  key: string;
  description: string;
  type: FeatureFlagType;
  default_value: any;
  environment?: Environment;
  rollout_percentage?: number;
  target_audience?: TargetAudience;
  conditions?: FeatureFlagCondition[];
  expires_at?: string;
  tags?: string[];
  category: FeatureFlagCategory;
  metadata?: Record<string, any>;
}

// Feature Flag Types
export enum FeatureFlagType {
  BOOLEAN = 'boolean',
  STRING = 'string',
  NUMBER = 'number',
  JSON = 'json',
  PERCENTAGE = 'percentage'
}

// Environment Types
export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  ALL = 'all'
}

// Target Audience
export enum TargetAudience {
  ALL_USERS = 'all_users',
  BETA_USERS = 'beta_users',
  PREMIUM_USERS = 'premium_users',
  SPECIFIC_CLIENTS = 'specific_clients',
  ADMIN_ONLY = 'admin_only',
  INTERNAL_TESTING = 'internal_testing'
}

// Feature Flag Categories
export enum FeatureFlagCategory {
  UI_FEATURES = 'ui_features',
  API_FEATURES = 'api_features',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  BILLING = 'billing',
  INTEGRATIONS = 'integrations',
  EXPERIMENTAL = 'experimental',
  MAINTENANCE = 'maintenance'
}

// Feature Flag Status
export enum FeatureFlagStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
  DEPRECATED = 'deprecated'
}

// Feature Flag Conditions
export interface FeatureFlagCondition {
  id: string;
  type: ConditionType;
  operator: ConditionOperator;
  field: string;
  value: any;
  description?: string;
}

export enum ConditionType {
  CLIENT_PLAN = 'client_plan',
  CLIENT_ID = 'client_id',
  USER_ROLE = 'user_role',
  USER_EMAIL = 'user_email',
  REGISTRATION_DATE = 'registration_date',
  USAGE_METRICS = 'usage_metrics',
  CUSTOM_ATTRIBUTE = 'custom_attribute'
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  IN = 'in',
  NOT_IN = 'not_in'
}

// Client-specific Overrides
export interface ClientOverride {
  client_id: string;
  client_name: string;
  value: any;
  is_enabled: boolean;
  reason: string;
  created_by: string;
  created_at: string;
  expires_at?: string;
}

// Feature Flag Evaluation Result
export interface FeatureFlagEvaluation {
  flag_key: string;
  value: any;
  is_enabled: boolean;
  reason: EvaluationReason;
  matched_condition?: FeatureFlagCondition;
  client_override?: ClientOverride;
  rollout_bucket?: number;
  evaluation_context: EvaluationContext;
  evaluated_at: string;
}

export enum EvaluationReason {
  DEFAULT_VALUE = 'default_value',
  CLIENT_OVERRIDE = 'client_override',
  CONDITION_MATCH = 'condition_match',
  ROLLOUT_PERCENTAGE = 'rollout_percentage',
  FLAG_DISABLED = 'flag_disabled',
  FLAG_NOT_FOUND = 'flag_not_found',
  EVALUATION_ERROR = 'evaluation_error'
}

// Evaluation Context
export interface EvaluationContext {
  client_id?: string;
  client_plan?: string;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  environment: Environment;
  custom_attributes?: Record<string, any>;
}

// Feature Flag Filters
export interface FeatureFlagFilters {
  environment?: Environment;
  category?: FeatureFlagCategory;
  status?: FeatureFlagStatus;
  type?: FeatureFlagType;
  target_audience?: TargetAudience;
  is_enabled?: boolean;
  created_by?: string;
  tags?: string[];
  search?: string;
  date_from?: string;
  date_to?: string;
}

// Feature Flag Response
export interface FeatureFlagResponse {
  flags: FeatureFlag[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: FeatureFlagFilters;
  summary: FeatureFlagSummary;
}

// Feature Flag Summary
export interface FeatureFlagSummary {
  total_flags: number;
  active_flags: number;
  inactive_flags: number;
  archived_flags: number;
  flags_by_category: Record<FeatureFlagCategory, number>;
  flags_by_environment: Record<Environment, number>;
  recent_changes: number;
}

// Feature Flag History
export interface FeatureFlagHistory {
  id: string;
  flag_id: string;
  flag_key: string;
  action: FeatureFlagAction;
  old_value?: any;
  new_value?: any;
  changed_by: string;
  changed_by_name: string;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export enum FeatureFlagAction {
  CREATED = 'created',
  UPDATED = 'updated',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
  CLIENT_OVERRIDE_ADDED = 'client_override_added',
  CLIENT_OVERRIDE_REMOVED = 'client_override_removed',
  CONDITION_ADDED = 'condition_added',
  CONDITION_REMOVED = 'condition_removed'
}

// Bulk Operations
export interface BulkFeatureFlagOperation {
  action: 'enable' | 'disable' | 'archive' | 'delete';
  flag_ids: string[];
  reason?: string;
  environment?: Environment;
}

export interface BulkOperationResult {
  success_count: number;
  failure_count: number;
  results: Array<{
    flag_id: string;
    flag_key: string;
    success: boolean;
    error?: string;
  }>;
  operation: BulkFeatureFlagOperation;
  performed_by: string;
  performed_at: string;
}
