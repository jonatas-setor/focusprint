import {
  SubscriptionPlan,
  PlanInsert,
  PlanUpdate,
  PlanStatus,
  PlanVersion,
  PlanUsageStats,
  PlanMigration,
  PlansListResponse,
  PlanDetailsResponse,
  PlanFilters,
  PlanValidationResult,
  MigrationType,
  MigrationStatus,
  BillingCycle,
  SupportLevel,
  DEFAULT_PLANS
} from '@/types/subscription-plans';

// In-memory storage for subscription plans (in production, this would be a database)
class PlanStorage {
  private static plans: SubscriptionPlan[] = [];
  private static versions: PlanVersion[] = [];
  private static migrations: PlanMigration[] = [];
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) return;

    // Initialize with default plans
    const now = new Date().toISOString();
    const systemUser = 'system';

    // Create default plans
    Object.entries(DEFAULT_PLANS).forEach(([key, defaultPlan], index) => {
      const plan: SubscriptionPlan = {
        id: `plan_${key.toLowerCase()}`,
        name: defaultPlan.name,
        display_name: defaultPlan.display_name,
        description: this.getDefaultDescription(key),
        version: 1,
        status: 'active' as PlanStatus,
        pricing: {
          ...defaultPlan.pricing,
          trial_days: key === 'FREE' ? 0 : 14
        },
        features: this.getDefaultFeatures(key),
        limits: {
          ...defaultPlan.limits,
          max_tasks_per_project: -1,
          api_calls_per_month: this.getApiLimit(key),
          max_integrations: this.getIntegrationsLimit(key),
          max_custom_fields: this.getCustomFieldsLimit(key),
          max_automation_rules: this.getAutomationLimit(key),
          support_level: this.getSupportLevel(key),
          data_retention_months: key === 'FREE' ? 3 : 12
        },
        metadata: {
          target_audience: this.getTargetAudience(key),
          recommended_team_size: this.getTeamSize(key),
          popular: key === 'PRO',
          tags: [key.toLowerCase(), 'default'],
          notes: `Default ${key} plan`
        },
        created_at: now,
        updated_at: now,
        created_by: systemUser,
        created_by_name: 'System',
        is_current_version: true
      };

      this.plans.push(plan);

      // Create version history
      const version: PlanVersion = {
        id: `version_${plan.id}_1`,
        plan_id: plan.id,
        version: 1,
        changes_summary: 'Initial plan creation',
        created_at: now,
        created_by: systemUser,
        created_by_name: 'System',
        is_current: true,
        plan_data: plan
      };

      this.versions.push(version);
    });

    this.initialized = true;
  }

  static getAll(): SubscriptionPlan[] {
    this.initialize();
    return [...this.plans];
  }

  static getById(planId: string): SubscriptionPlan | null {
    this.initialize();
    return this.plans.find(plan => plan.id === planId) || null;
  }

  static add(plan: SubscriptionPlan): void {
    this.initialize();
    this.plans.push(plan);
  }

  static update(planId: string, updates: Partial<SubscriptionPlan>): boolean {
    this.initialize();
    const index = this.plans.findIndex(plan => plan.id === planId);
    if (index === -1) return false;

    this.plans[index] = { ...this.plans[index], ...updates };
    return true;
  }

  static delete(planId: string): boolean {
    this.initialize();
    const index = this.plans.findIndex(plan => plan.id === planId);
    if (index === -1) return false;

    this.plans.splice(index, 1);
    return true;
  }

  static getVersions(planId: string): PlanVersion[] {
    this.initialize();
    return this.versions.filter(version => version.plan_id === planId);
  }

  static addVersion(version: PlanVersion): void {
    this.initialize();
    this.versions.push(version);
  }

  static getMigrations(): PlanMigration[] {
    this.initialize();
    return [...this.migrations];
  }

  static addMigration(migration: PlanMigration): void {
    this.initialize();
    this.migrations.push(migration);
  }

  static updateMigration(migrationId: string, updates: Partial<PlanMigration>): boolean {
    this.initialize();
    const index = this.migrations.findIndex(m => m.id === migrationId);
    if (index === -1) return false;

    this.migrations[index] = { ...this.migrations[index], ...updates };
    return true;
  }

  static filter(filters: PlanFilters): SubscriptionPlan[] {
    this.initialize();
    let filteredPlans = [...this.plans];

    if (filters.status && filters.status.length > 0) {
      filteredPlans = filteredPlans.filter(plan => filters.status!.includes(plan.status));
    }

    if (filters.currency && filters.currency.length > 0) {
      filteredPlans = filteredPlans.filter(plan => filters.currency!.includes(plan.pricing.currency));
    }

    if (filters.price_range) {
      filteredPlans = filteredPlans.filter(plan => 
        plan.pricing.monthly_price_cents >= filters.price_range!.min_cents &&
        plan.pricing.monthly_price_cents <= filters.price_range!.max_cents
      );
    }

    if (filters.target_audience && filters.target_audience.length > 0) {
      filteredPlans = filteredPlans.filter(plan => 
        filters.target_audience!.includes(plan.metadata.target_audience)
      );
    }

    if (filters.has_trial !== undefined) {
      filteredPlans = filteredPlans.filter(plan => 
        filters.has_trial ? (plan.pricing.trial_days || 0) > 0 : (plan.pricing.trial_days || 0) === 0
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredPlans = filteredPlans.filter(plan =>
        plan.name.toLowerCase().includes(searchLower) ||
        plan.display_name.toLowerCase().includes(searchLower) ||
        plan.description.toLowerCase().includes(searchLower)
      );
    }

    return filteredPlans;
  }

  // Helper methods for default plan creation
  private static getDefaultDescription(planType: string): string {
    const descriptions = {
      FREE: 'Perfect for individuals and small teams getting started with project management',
      PRO: 'Ideal for growing teams that need advanced features and collaboration tools',
      BUSINESS: 'Comprehensive solution for larger teams with enterprise-grade features'
    };
    return descriptions[planType as keyof typeof descriptions] || 'Custom subscription plan';
  }

  private static getDefaultFeatures(planType: string): any {
    const baseFeatures = {
      kanban_boards: true,
      real_time_chat: true,
      video_conferencing: false,
      file_attachments: true,
      advanced_reporting: false,
      api_access: false,
      custom_integrations: false,
      priority_support: false,
      white_labeling: false,
      advanced_security: false,
      audit_logs: false,
      custom_fields: false,
      automation_rules: false,
      advanced_permissions: false,
      data_export: false
    };

    if (planType === 'PRO') {
      return {
        ...baseFeatures,
        video_conferencing: true,
        advanced_reporting: true,
        api_access: true,
        custom_fields: true,
        data_export: true
      };
    }

    if (planType === 'BUSINESS') {
      return {
        ...baseFeatures,
        video_conferencing: true,
        advanced_reporting: true,
        api_access: true,
        custom_integrations: true,
        priority_support: true,
        advanced_security: true,
        audit_logs: true,
        custom_fields: true,
        automation_rules: true,
        advanced_permissions: true,
        data_export: true
      };
    }

    return baseFeatures; // FREE plan
  }

  private static getApiLimit(planType: string): number {
    const limits = { FREE: 1000, PRO: 10000, BUSINESS: 100000 };
    return limits[planType as keyof typeof limits] || 1000;
  }

  private static getIntegrationsLimit(planType: string): number {
    const limits = { FREE: 1, PRO: 5, BUSINESS: -1 };
    return limits[planType as keyof typeof limits] || 1;
  }

  private static getCustomFieldsLimit(planType: string): number {
    const limits = { FREE: 0, PRO: 10, BUSINESS: -1 };
    return limits[planType as keyof typeof limits] || 0;
  }

  private static getAutomationLimit(planType: string): number {
    const limits = { FREE: 0, PRO: 5, BUSINESS: -1 };
    return limits[planType as keyof typeof limits] || 0;
  }

  private static getSupportLevel(planType: string): SupportLevel {
    const levels = {
      FREE: 'community' as SupportLevel,
      PRO: 'email' as SupportLevel,
      BUSINESS: 'priority' as SupportLevel
    };
    return levels[planType as keyof typeof levels] || 'community' as SupportLevel;
  }

  private static getTargetAudience(planType: string): string {
    const audiences = { FREE: 'individual', PRO: 'small_team', BUSINESS: 'enterprise' };
    return audiences[planType as keyof typeof audiences] || 'individual';
  }

  private static getTeamSize(planType: string): string {
    const sizes = { FREE: '1-3 users', PRO: '3-10 users', BUSINESS: '10-50 users' };
    return sizes[planType as keyof typeof sizes] || '1-3 users';
  }
}

// Main Subscription Plans Service
export class SubscriptionPlansService {
  /**
   * Get all subscription plans with filtering and pagination
   */
  static async getPlans(
    filters: PlanFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PlansListResponse> {
    try {
      const filteredPlans = PlanStorage.filter(filters);
      const total = filteredPlans.length;
      const pages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const plans = filteredPlans.slice(offset, offset + limit);

      // Calculate summary
      const allPlans = PlanStorage.getAll();
      const summary = {
        total_plans: allPlans.length,
        active_plans: allPlans.filter(p => p.status === PlanStatus.ACTIVE).length,
        deprecated_plans: allPlans.filter(p => p.status === PlanStatus.DEPRECATED).length,
        draft_plans: allPlans.filter(p => p.status === PlanStatus.DRAFT).length
      };

      return {
        plans,
        pagination: { page, limit, total, pages },
        summary
      };

    } catch (error) {
      console.error('Error getting plans:', error);
      throw new Error('Failed to fetch subscription plans');
    }
  }

  /**
   * Get a specific plan by ID with detailed information
   */
  static async getPlanDetails(planId: string): Promise<PlanDetailsResponse | null> {
    try {
      const plan = PlanStorage.getById(planId);
      if (!plan) return null;

      const versions = PlanStorage.getVersions(planId);
      const usageStats = await this.calculatePlanUsageStats(planId);
      const clients = await this.getPlanClients(planId);
      const migrationHistory = PlanStorage.getMigrations().filter(m => 
        m.from_plan_id === planId || m.to_plan_id === planId
      );

      return {
        plan,
        versions,
        usage_stats: usageStats,
        clients,
        migration_history: migrationHistory
      };

    } catch (error) {
      console.error('Error getting plan details:', error);
      return null;
    }
  }

  /**
   * Create a new subscription plan
   */
  static async createPlan(
    planData: PlanInsert,
    createdBy: string,
    createdByName: string
  ): Promise<SubscriptionPlan> {
    try {
      // Validate plan data
      const validation = this.validatePlanData(planData);
      if (!validation.is_valid) {
        throw new Error(`Plan validation failed: ${validation.errors.join(', ')}`);
      }

      // Generate plan ID
      const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // Create plan
      const plan: SubscriptionPlan = {
        id: planId,
        name: planData.name,
        display_name: planData.display_name,
        description: planData.description,
        version: 1,
        status: 'draft' as PlanStatus,
        pricing: planData.pricing,
        features: planData.features,
        limits: planData.limits,
        metadata: planData.metadata || {
          target_audience: 'individual',
          recommended_team_size: '1-5 users',
          tags: []
        },
        created_at: now,
        updated_at: now,
        created_by: createdBy,
        created_by_name: createdByName,
        is_current_version: true
      };

      // Store plan
      PlanStorage.add(plan);

      // Create version history
      const version: PlanVersion = {
        id: `version_${planId}_1`,
        plan_id: planId,
        version: 1,
        changes_summary: 'Initial plan creation',
        created_at: now,
        created_by: createdBy,
        created_by_name: createdByName,
        is_current: true,
        plan_data: plan
      };

      PlanStorage.addVersion(version);

      // Log the creation
      await this.logPlanEvent(plan, 'created', createdBy, createdByName, 'New subscription plan created');

      return plan;

    } catch (error) {
      console.error('Error creating plan:', error);
      throw new Error(`Failed to create plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an existing subscription plan
   */
  static async updatePlan(
    planId: string,
    updates: PlanUpdate,
    updatedBy: string,
    updatedByName: string,
    reason?: string
  ): Promise<SubscriptionPlan | null> {
    try {
      const existingPlan = PlanStorage.getById(planId);
      if (!existingPlan) {
        throw new Error('Plan not found');
      }

      // Create new version if significant changes
      const isSignificantChange = this.isSignificantChange(existingPlan, updates);
      const now = new Date().toISOString();

      let updatedPlan: SubscriptionPlan;

      if (isSignificantChange) {
        // Create new version
        const newVersion = existingPlan.version + 1;

        updatedPlan = {
          ...existingPlan,
          ...updates,
          version: newVersion,
          updated_at: now,
          previous_version_id: existingPlan.id
        };

        // Mark old version as not current
        PlanStorage.update(planId, { is_current_version: false, next_version_id: updatedPlan.id });

        // Create version history
        const version: PlanVersion = {
          id: `version_${planId}_${newVersion}`,
          plan_id: planId,
          version: newVersion,
          changes_summary: reason || 'Plan updated',
          created_at: now,
          created_by: updatedBy,
          created_by_name: updatedByName,
          is_current: true,
          plan_data: updatedPlan
        };

        PlanStorage.addVersion(version);
      } else {
        // Minor update, same version
        updatedPlan = {
          ...existingPlan,
          ...updates,
          updated_at: now
        };
      }

      // Update plan
      PlanStorage.update(planId, updatedPlan);

      // Log the update
      await this.logPlanEvent(updatedPlan, 'updated', updatedBy, updatedByName, reason || 'Plan updated');

      return updatedPlan;

    } catch (error) {
      console.error('Error updating plan:', error);
      throw new Error(`Failed to update plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete/deactivate a subscription plan
   */
  static async deletePlan(
    planId: string,
    deletedBy: string,
    deletedByName: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const plan = PlanStorage.getById(planId);
      if (!plan) {
        return { success: false, message: 'Plan not found' };
      }

      // Check if plan has active subscribers
      const clients = await this.getPlanClients(planId);
      const activeClients = clients.filter(client => client.status === 'active');

      if (activeClients.length > 0) {
        return {
          success: false,
          message: `Cannot delete plan with ${activeClients.length} active subscribers. Migrate clients first.`
        };
      }

      // Mark as deprecated instead of deleting
      const updated = PlanStorage.update(planId, {
        status: 'deprecated' as PlanStatus,
        updated_at: new Date().toISOString()
      });

      if (!updated) {
        return { success: false, message: 'Failed to update plan status' };
      }

      // Log the deletion
      const updatedPlan = PlanStorage.getById(planId)!;
      await this.logPlanEvent(updatedPlan, 'deleted', deletedBy, deletedByName, reason || 'Plan deleted');

      return { success: true, message: 'Plan marked as deprecated successfully' };

    } catch (error) {
      console.error('Error deleting plan:', error);
      return { success: false, message: `Failed to delete plan: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  /**
   * Get clients subscribed to a specific plan
   */
  private static async getPlanClients(planId: string): Promise<Array<{
    id: string;
    name: string;
    status: string;
    subscribed_at: string;
    usage: any;
  }>> {
    try {
      // Mock implementation - in real app, would query clients table
      const plan = PlanStorage.getById(planId);
      if (!plan) return [];

      // Generate mock clients based on plan type
      const clientCount = plan.name === 'free' ? 15 : plan.name === 'pro' ? 8 : 3;
      const clients = [];

      for (let i = 1; i <= clientCount; i++) {
        clients.push({
          id: `client_${plan.name}_${i}`,
          name: `${plan.display_name} Client ${i}`,
          status: Math.random() > 0.1 ? 'active' : 'trial',
          subscribed_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          usage: {
            users_count: Math.floor(Math.random() * (plan.limits.max_users > 0 ? plan.limits.max_users : 10)) + 1,
            projects_count: Math.floor(Math.random() * 20) + 1,
            storage_used_gb: Math.round(Math.random() * plan.limits.storage_gb * 100) / 100
          }
        });
      }

      return clients;

    } catch (error) {
      console.error('Error getting plan clients:', error);
      return [];
    }
  }

  /**
   * Calculate usage statistics for a plan
   */
  private static async calculatePlanUsageStats(planId: string): Promise<PlanUsageStats> {
    try {
      const plan = PlanStorage.getById(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      const clients = await this.getPlanClients(planId);
      const activeClients = clients.filter(c => c.status === 'active');
      const trialClients = clients.filter(c => c.status === 'trial');

      // Calculate averages
      const avgUsers = clients.length > 0 ?
        clients.reduce((sum, c) => sum + c.usage.users_count, 0) / clients.length : 0;
      const avgProjects = clients.length > 0 ?
        clients.reduce((sum, c) => sum + c.usage.projects_count, 0) / clients.length : 0;
      const avgStorage = clients.length > 0 ?
        clients.reduce((sum, c) => sum + c.usage.storage_used_gb, 0) / clients.length : 0;

      return {
        plan_id: planId,
        plan_name: plan.display_name,
        total_subscribers: clients.length,
        active_subscribers: activeClients.length,
        trial_subscribers: trialClients.length,
        churned_subscribers: 0, // Would calculate from historical data
        monthly_revenue: activeClients.length * (plan.pricing.monthly_price_cents / 100),
        average_usage: {
          avg_users_per_client: Math.round(avgUsers * 100) / 100,
          avg_projects_per_client: Math.round(avgProjects * 100) / 100,
          avg_storage_usage_gb: Math.round(avgStorage * 100) / 100,
          avg_api_calls_per_month: Math.floor(Math.random() * plan.limits.api_calls_per_month * 0.3),
          feature_adoption_rates: this.calculateFeatureAdoption(plan.features)
        },
        growth_metrics: {
          new_subscribers_30d: Math.floor(clients.length * 0.2),
          churned_subscribers_30d: Math.floor(clients.length * 0.05),
          upgrade_rate: plan.name === 'free' ? 15.5 : plan.name === 'pro' ? 8.2 : 0,
          downgrade_rate: plan.name === 'business' ? 2.1 : plan.name === 'pro' ? 1.5 : 0,
          retention_rate: plan.name === 'free' ? 65.0 : plan.name === 'pro' ? 85.5 : 92.3
        }
      };

    } catch (error) {
      console.error('Error calculating plan usage stats:', error);
      throw new Error('Failed to calculate usage statistics');
    }
  }

  /**
   * Validate plan data
   */
  private static validatePlanData(planData: PlanInsert): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Required fields validation
    if (!planData.name || planData.name.trim().length === 0) {
      errors.push('Plan name is required');
    }

    if (!planData.display_name || planData.display_name.trim().length === 0) {
      errors.push('Display name is required');
    }

    if (!planData.description || planData.description.trim().length === 0) {
      errors.push('Description is required');
    }

    // Pricing validation
    if (!planData.pricing) {
      errors.push('Pricing information is required');
    } else {
      if (planData.pricing.monthly_price_cents < 0) {
        errors.push('Monthly price cannot be negative');
      }

      if (!planData.pricing.currency) {
        errors.push('Currency is required');
      }

      if (planData.pricing.trial_days && planData.pricing.trial_days < 0) {
        errors.push('Trial days cannot be negative');
      }
    }

    // Limits validation
    if (!planData.limits) {
      errors.push('Plan limits are required');
    } else {
      if (planData.limits.max_users < -1 || planData.limits.max_users === 0) {
        errors.push('Max users must be -1 (unlimited) or positive number');
      }

      if (planData.limits.max_projects < -1 || planData.limits.max_projects === 0) {
        errors.push('Max projects must be -1 (unlimited) or positive number');
      }

      if (planData.limits.storage_gb <= 0) {
        errors.push('Storage limit must be positive');
      }
    }

    // Business logic warnings
    if (planData.pricing && planData.pricing.monthly_price_cents === 0 && planData.limits) {
      if (planData.limits.max_users > 5) {
        warnings.push('Free plans typically have lower user limits');
      }
    }

    if (planData.pricing && planData.pricing.monthly_price_cents > 0 && planData.pricing.trial_days === 0) {
      suggestions.push('Consider adding a trial period for paid plans');
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Check if plan changes are significant enough to create new version
   */
  private static isSignificantChange(existingPlan: SubscriptionPlan, updates: PlanUpdate): boolean {
    // Pricing changes are always significant
    if (updates.pricing) {
      if (updates.pricing.monthly_price_cents !== undefined &&
          updates.pricing.monthly_price_cents !== existingPlan.pricing.monthly_price_cents) {
        return true;
      }
    }

    // Limit changes are significant
    if (updates.limits) {
      const significantLimitChanges = [
        'max_users', 'max_projects', 'storage_gb', 'api_calls_per_month'
      ];

      for (const field of significantLimitChanges) {
        if (updates.limits[field as keyof typeof updates.limits] !== undefined &&
            updates.limits[field as keyof typeof updates.limits] !== existingPlan.limits[field as keyof typeof existingPlan.limits]) {
          return true;
        }
      }
    }

    // Feature changes are significant
    if (updates.features) {
      const criticalFeatures = [
        'api_access', 'advanced_reporting', 'priority_support', 'white_labeling'
      ];

      for (const feature of criticalFeatures) {
        if (updates.features[feature as keyof typeof updates.features] !== undefined &&
            updates.features[feature as keyof typeof updates.features] !== existingPlan.features[feature as keyof typeof existingPlan.features]) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate feature adoption rates
   */
  private static calculateFeatureAdoption(features: any): Record<string, number> {
    const adoption: Record<string, number> = {};

    Object.entries(features).forEach(([feature, enabled]) => {
      if (enabled) {
        // Simulate adoption rates based on feature type
        const baseRate = Math.random() * 40 + 30; // 30-70% base adoption
        const featureMultiplier = this.getFeatureAdoptionMultiplier(feature);
        adoption[feature] = Math.min(95, Math.round((baseRate * featureMultiplier) * 100) / 100);
      } else {
        adoption[feature] = 0;
      }
    });

    return adoption;
  }

  /**
   * Get feature adoption multiplier based on feature importance
   */
  private static getFeatureAdoptionMultiplier(feature: string): number {
    const multipliers: Record<string, number> = {
      kanban_boards: 1.8, // High adoption
      real_time_chat: 1.5,
      file_attachments: 1.6,
      video_conferencing: 0.8, // Lower adoption
      advanced_reporting: 1.2,
      api_access: 0.6, // Technical feature
      custom_integrations: 0.7,
      priority_support: 1.4,
      white_labeling: 0.5, // Niche feature
      advanced_security: 1.3,
      audit_logs: 1.1,
      custom_fields: 1.0,
      automation_rules: 0.9,
      advanced_permissions: 1.1,
      data_export: 1.3
    };

    return multipliers[feature] || 1.0;
  }

  /**
   * Log plan events for audit trail
   */
  private static async logPlanEvent(
    plan: SubscriptionPlan,
    action: string,
    performedBy: string,
    performedByName: string,
    details: string
  ): Promise<void> {
    try {
      // In a real implementation, this would log to the audit system
      console.log(`Plan Event: ${action} - Plan: ${plan.name} (${plan.id}) - By: ${performedByName} - Details: ${details}`);
    } catch (error) {
      console.error('Error logging plan event:', error);
    }
  }

  /**
   * Create a new version of an existing plan
   */
  static async createPlanVersion(
    planId: string,
    changes: PlanUpdate,
    changesSummary: string,
    createdBy: string,
    createdByName: string
  ): Promise<SubscriptionPlan | null> {
    try {
      const existingPlan = PlanStorage.getById(planId);
      if (!existingPlan) {
        throw new Error('Plan not found');
      }

      const newVersion = existingPlan.version + 1;
      const now = new Date().toISOString();

      // Create new version of the plan
      const newPlan: SubscriptionPlan = {
        ...existingPlan,
        ...changes,
        version: newVersion,
        updated_at: now,
        previous_version_id: existingPlan.id,
        is_current_version: true
      };

      // Mark old version as not current
      PlanStorage.update(planId, {
        is_current_version: false,
        next_version_id: newPlan.id
      });

      // Update with new version
      PlanStorage.update(planId, newPlan);

      // Create version history entry
      const version: PlanVersion = {
        id: `version_${planId}_${newVersion}`,
        plan_id: planId,
        version: newVersion,
        changes_summary: changesSummary,
        created_at: now,
        created_by: createdBy,
        created_by_name: createdByName,
        is_current: true,
        plan_data: newPlan
      };

      PlanStorage.addVersion(version);

      // Log the version creation
      await this.logPlanEvent(newPlan, 'version_created', createdBy, createdByName, changesSummary);

      return newPlan;

    } catch (error) {
      console.error('Error creating plan version:', error);
      throw new Error(`Failed to create plan version: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get plan by name (for backward compatibility)
   */
  static async getPlanByName(planName: string): Promise<SubscriptionPlan | null> {
    try {
      const plans = PlanStorage.getAll();
      return plans.find(plan => plan.name === planName && plan.is_current_version) || null;
    } catch (error) {
      console.error('Error getting plan by name:', error);
      return null;
    }
  }

  /**
   * Get active plans only
   */
  static async getActivePlans(): Promise<SubscriptionPlan[]> {
    try {
      const plans = PlanStorage.getAll();
      return plans.filter(plan => plan.status === 'active' && plan.is_current_version);
    } catch (error) {
      console.error('Error getting active plans:', error);
      return [];
    }
  }
}
