// Subscription Plans Management Types for Platform Admin

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  version: number;
  status: PlanStatus;
  pricing: PlanPricing;
  features: PlanFeatures;
  limits: PlanLimits;
  metadata: PlanMetadata;
  created_at: string;
  updated_at: string;
  created_by: string;
  created_by_name: string;
  is_current_version: boolean;
  previous_version_id?: string;
  next_version_id?: string;
}

export interface PlanInsert {
  name: string;
  display_name: string;
  description: string;
  pricing: PlanPricing;
  features: PlanFeatures;
  limits: PlanLimits;
  metadata?: PlanMetadata;
}

export interface PlanUpdate {
  display_name?: string;
  description?: string;
  pricing?: Partial<PlanPricing>;
  features?: Partial<PlanFeatures>;
  limits?: Partial<PlanLimits>;
  metadata?: Partial<PlanMetadata>;
  status?: PlanStatus;
}

// Plan Status
export type PlanStatus = 'active' | 'inactive' | 'deprecated' | 'draft';

// Plan Pricing
export interface PlanPricing {
  currency: string; // BRL, USD, EUR
  monthly_price_cents: number; // Price in cents
  annual_price_cents?: number; // Annual price with discount
  setup_fee_cents?: number; // One-time setup fee
  trial_days?: number; // Free trial period
  billing_cycle: BillingCycle;
  price_per_additional_user_cents?: number; // Cost for users above limit
}

export type BillingCycle = 'monthly' | 'annual' | 'one_time';

// Plan Features
export interface PlanFeatures {
  kanban_boards: boolean;
  real_time_chat: boolean;
  video_conferencing: boolean;
  file_attachments: boolean;
  advanced_reporting: boolean;
  api_access: boolean;
  custom_integrations: boolean;
  priority_support: boolean;
  white_labeling: boolean;
  advanced_security: boolean;
  audit_logs: boolean;
  custom_fields: boolean;
  automation_rules: boolean;
  advanced_permissions: boolean;
  data_export: boolean;
}

// Plan Limits
export interface PlanLimits {
  max_users: number; // -1 for unlimited
  max_projects: number; // -1 for unlimited
  max_tasks_per_project: number; // -1 for unlimited
  storage_gb: number; // Storage limit in GB
  api_calls_per_month: number; // API rate limit
  max_integrations: number; // Number of integrations allowed
  max_custom_fields: number; // Custom fields limit
  max_automation_rules: number; // Automation rules limit
  support_level: SupportLevel;
  data_retention_months: number; // How long data is kept
}

export type SupportLevel = 'community' | 'email' | 'priority' | 'dedicated';

// Plan Metadata
export interface PlanMetadata {
  target_audience: string; // 'individual', 'small_team', 'enterprise'
  recommended_team_size: string; // '1-5 users', '5-50 users', etc.
  popular?: boolean; // Mark as popular plan
  featured?: boolean; // Feature on pricing page
  legacy?: boolean; // Legacy plan no longer sold
  migration_path?: string; // Suggested upgrade path
  tags: string[]; // Tags for categorization
  notes?: string; // Internal notes
}

// Plan Version History
export interface PlanVersion {
  id: string;
  plan_id: string;
  version: number;
  changes_summary: string;
  created_at: string;
  created_by: string;
  created_by_name: string;
  is_current: boolean;
  plan_data: SubscriptionPlan;
}

// Plan Usage Statistics
export interface PlanUsageStats {
  plan_id: string;
  plan_name: string;
  total_subscribers: number;
  active_subscribers: number;
  trial_subscribers: number;
  churned_subscribers: number;
  monthly_revenue: number;
  average_usage: PlanUsageMetrics;
  growth_metrics: PlanGrowthMetrics;
}

export interface PlanUsageMetrics {
  avg_users_per_client: number;
  avg_projects_per_client: number;
  avg_storage_usage_gb: number;
  avg_api_calls_per_month: number;
  feature_adoption_rates: Record<string, number>; // Feature name -> adoption %
}

export interface PlanGrowthMetrics {
  new_subscribers_30d: number;
  churned_subscribers_30d: number;
  upgrade_rate: number; // % who upgrade to higher plan
  downgrade_rate: number; // % who downgrade
  retention_rate: number; // % who stay after trial
}

// Plan Migration
export interface PlanMigration {
  id: string;
  from_plan_id: string;
  to_plan_id: string;
  client_ids: string[];
  migration_type: MigrationType;
  scheduled_date?: string;
  completed_date?: string;
  status: MigrationStatus;
  reason: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  results?: MigrationResult[];
}

export type MigrationType = 'immediate' | 'scheduled' | 'next_billing_cycle';

export type MigrationStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface MigrationResult {
  client_id: string;
  client_name: string;
  success: boolean;
  error_message?: string;
  migrated_at?: string;
}

// Plan Comparison
export interface PlanComparison {
  plans: SubscriptionPlan[];
  feature_matrix: FeatureMatrix;
  pricing_comparison: PricingComparison;
  recommendations: PlanRecommendation[];
}

export interface FeatureMatrix {
  features: string[];
  plan_features: Record<string, boolean | string>; // plan_id -> feature value
}

export interface PricingComparison {
  plans: Array<{
    plan_id: string;
    plan_name: string;
    monthly_price: number;
    annual_price?: number;
    price_per_user?: number;
    value_score: number; // Calculated value score
  }>;
}

export interface PlanRecommendation {
  client_id: string;
  client_name: string;
  current_plan: string;
  recommended_plan: string;
  reason: string;
  potential_savings?: number;
  usage_analysis: {
    users_utilization: number; // % of user limit used
    storage_utilization: number; // % of storage used
    features_used: string[]; // Features actually being used
    underutilized_features: string[]; // Paid features not used
  };
}

// Plan Request/Response Types
export interface PlansListResponse {
  plans: SubscriptionPlan[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: {
    total_plans: number;
    active_plans: number;
    deprecated_plans: number;
    draft_plans: number;
  };
}

export interface PlanDetailsResponse {
  plan: SubscriptionPlan;
  versions: PlanVersion[];
  usage_stats: PlanUsageStats;
  clients: Array<{
    id: string;
    name: string;
    status: string;
    subscribed_at: string;
    usage: PlanUsageMetrics;
  }>;
  migration_history: PlanMigration[];
}

// Plan Filters
export interface PlanFilters {
  status?: PlanStatus[];
  currency?: string[];
  price_range?: {
    min_cents: number;
    max_cents: number;
  };
  target_audience?: string[];
  has_trial?: boolean;
  created_date_from?: string;
  created_date_to?: string;
  search?: string;
}

// Plan Validation
export interface PlanValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Default Plans Configuration
export const DEFAULT_PLANS = {
  FREE: {
    name: 'free',
    display_name: 'Free',
    pricing: { monthly_price_cents: 0, currency: 'BRL', billing_cycle: 'monthly' as BillingCycle },
    limits: { max_users: 3, max_projects: 3, storage_gb: 0.1 }
  },
  PRO: {
    name: 'pro',
    display_name: 'Pro',
    pricing: { monthly_price_cents: 9700, currency: 'BRL', billing_cycle: 'monthly' as BillingCycle },
    limits: { max_users: 5, max_projects: -1, storage_gb: 1 }
  },
  BUSINESS: {
    name: 'business',
    display_name: 'Business',
    pricing: { monthly_price_cents: 39900, currency: 'BRL', billing_cycle: 'monthly' as BillingCycle },
    limits: { max_users: 30, max_projects: -1, storage_gb: 10 }
  }
} as const;
