import {
  FeatureFlag,
  FeatureFlagInsert,
  FeatureFlagType,
  Environment,
  TargetAudience,
  FeatureFlagCategory,
  FeatureFlagStatus,
  FeatureFlagCondition,
  ClientOverride,
  FeatureFlagEvaluation,
  EvaluationReason,
  EvaluationContext,
  FeatureFlagFilters,
  FeatureFlagResponse,
  FeatureFlagHistory,
  FeatureFlagAction,
  BulkFeatureFlagOperation,
  BulkOperationResult
} from '@/types/feature-flags';

// In-memory storage for feature flags (in production, this would be a database)
class FeatureFlagStorage {
  private static flags: FeatureFlag[] = [];
  private static history: FeatureFlagHistory[] = [];
  private static maxHistory = 10000; // Keep last 10,000 history entries

  static add(flag: FeatureFlag): void {
    this.flags.push(flag);
  }

  static getAll(): FeatureFlag[] {
    return [...this.flags];
  }

  static getById(flagId: string): FeatureFlag | null {
    return this.flags.find(flag => flag.id === flagId) || null;
  }

  static getByKey(key: string, environment?: Environment): FeatureFlag | null {
    return this.flags.find(flag =>
      flag.key === key &&
      (environment ? flag.environment === environment || flag.environment === Environment.ALL : true)
    ) || null;
  }

  static update(flagId: string, updates: Partial<FeatureFlag>): boolean {
    const index = this.flags.findIndex(flag => flag.id === flagId);
    if (index === -1) return false;

    this.flags[index] = {
      ...this.flags[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return true;
  }

  static delete(flagId: string): boolean {
    const index = this.flags.findIndex(flag => flag.id === flagId);
    if (index === -1) return false;

    this.flags.splice(index, 1);
    return true;
  }

  static filter(filters: FeatureFlagFilters): FeatureFlag[] {
    let filteredFlags = [...this.flags];

    if (filters.environment) {
      filteredFlags = filteredFlags.filter(flag =>
        flag.environment === filters.environment || flag.environment === Environment.ALL
      );
    }

    if (filters.category) {
      filteredFlags = filteredFlags.filter(flag => flag.category === filters.category);
    }

    if (filters.status) {
      filteredFlags = filteredFlags.filter(flag => flag.status === filters.status);
    }

    if (filters.type) {
      filteredFlags = filteredFlags.filter(flag => flag.type === filters.type);
    }

    if (filters.target_audience) {
      filteredFlags = filteredFlags.filter(flag => flag.target_audience === filters.target_audience);
    }

    if (filters.is_enabled !== undefined) {
      filteredFlags = filteredFlags.filter(flag => flag.is_enabled === filters.is_enabled);
    }

    if (filters.created_by) {
      filteredFlags = filteredFlags.filter(flag => flag.created_by === filters.created_by);
    }

    if (filters.tags && filters.tags.length > 0) {
      filteredFlags = filteredFlags.filter(flag =>
        filters.tags!.some(tag => flag.tags.includes(tag))
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredFlags = filteredFlags.filter(flag =>
        flag.name.toLowerCase().includes(searchLower) ||
        flag.key.toLowerCase().includes(searchLower) ||
        flag.description.toLowerCase().includes(searchLower) ||
        flag.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    if (filters.date_from) {
      filteredFlags = filteredFlags.filter(flag => flag.created_at >= filters.date_from!);
    }

    if (filters.date_to) {
      filteredFlags = filteredFlags.filter(flag => flag.created_at <= filters.date_to!);
    }

    return filteredFlags;
  }

  static addHistory(entry: FeatureFlagHistory): void {
    this.history.unshift(entry); // Add to beginning for chronological order

    // Keep only the most recent entries
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory);
    }
  }

  static getHistory(flagId?: string): FeatureFlagHistory[] {
    if (flagId) {
      return this.history.filter(entry => entry.flag_id === flagId);
    }
    return [...this.history];
  }

  static clear(): void {
    this.flags = [];
    this.history = [];
  }

  static initializeDefaultFlags(): void {
    // Initialize with some default feature flags
    const defaultFlags: FeatureFlag[] = [
      {
        id: 'flag_001',
        name: 'Enhanced Dashboard',
        key: 'enhanced_dashboard',
        description: 'Enable the new enhanced dashboard with real-time metrics',
        type: FeatureFlagType.BOOLEAN,
        default_value: false,
        current_value: true,
        is_enabled: true,
        environment: Environment.ALL,
        rollout_percentage: 100,
        target_audience: TargetAudience.ALL_USERS,
        conditions: [],
        client_overrides: [],
        created_by: 'system',
        created_by_name: 'System',
        updated_by: 'system',
        updated_by_name: 'System',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: ['dashboard', 'ui'],
        category: FeatureFlagCategory.UI_FEATURES,
        status: FeatureFlagStatus.ACTIVE
      },
      {
        id: 'flag_002',
        name: 'Beta Video Calls',
        key: 'beta_video_calls',
        description: 'Enable beta video calling functionality',
        type: FeatureFlagType.BOOLEAN,
        default_value: false,
        current_value: false,
        is_enabled: false,
        environment: Environment.STAGING,
        rollout_percentage: 25,
        target_audience: TargetAudience.BETA_USERS,
        conditions: [],
        client_overrides: [],
        created_by: 'system',
        created_by_name: 'System',
        updated_by: 'system',
        updated_by_name: 'System',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: ['video', 'beta', 'communication'],
        category: FeatureFlagCategory.EXPERIMENTAL,
        status: FeatureFlagStatus.ACTIVE
      },
      {
        id: 'flag_003',
        name: 'Premium Features',
        key: 'premium_features',
        description: 'Enable premium features for paid plans',
        type: FeatureFlagType.BOOLEAN,
        default_value: false,
        current_value: true,
        is_enabled: true,
        environment: Environment.PRODUCTION,
        rollout_percentage: 100,
        target_audience: TargetAudience.PREMIUM_USERS,
        conditions: [
          {
            id: 'cond_001',
            type: 'client_plan' as any,
            operator: 'in' as any,
            field: 'plan_type',
            value: ['PRO', 'BUSINESS'],
            description: 'Enable for PRO and BUSINESS plans'
          }
        ],
        client_overrides: [],
        created_by: 'system',
        created_by_name: 'System',
        updated_by: 'system',
        updated_by_name: 'System',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: ['premium', 'billing'],
        category: FeatureFlagCategory.BILLING,
        status: FeatureFlagStatus.ACTIVE
      }
    ];

    this.flags = defaultFlags;
  }
}

// Main Feature Flag Service
export class FeatureFlagService {
  /**
   * Initialize the service with default flags
   */
  static initialize(): void {
    FeatureFlagStorage.initializeDefaultFlags();
  }

  /**
   * Create a new feature flag
   */
  static async createFlag(
    flagData: FeatureFlagInsert,
    createdBy: string,
    createdByName: string,
    requestInfo?: { ip_address?: string; user_agent?: string }
  ): Promise<FeatureFlag> {
    try {
      // Validate flag key uniqueness
      const existingFlag = FeatureFlagStorage.getByKey(flagData.key, flagData.environment);
      if (existingFlag) {
        throw new Error(`Feature flag with key '${flagData.key}' already exists in ${flagData.environment || 'all'} environment(s)`);
      }

      // Generate flag ID
      const flagId = `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // Create feature flag
      const flag: FeatureFlag = {
        id: flagId,
        name: flagData.name,
        key: flagData.key,
        description: flagData.description,
        type: flagData.type,
        default_value: flagData.default_value,
        current_value: flagData.default_value,
        is_enabled: true, // New flags are enabled by default
        environment: flagData.environment || Environment.ALL,
        rollout_percentage: flagData.rollout_percentage || 100,
        target_audience: flagData.target_audience || TargetAudience.ALL_USERS,
        conditions: flagData.conditions || [],
        client_overrides: [],
        created_by: createdBy,
        created_by_name: createdByName,
        updated_by: createdBy,
        updated_by_name: createdByName,
        created_at: now,
        updated_at: now,
        expires_at: flagData.expires_at,
        tags: flagData.tags || [],
        category: flagData.category,
        status: FeatureFlagStatus.ACTIVE,
        metadata: flagData.metadata
      };

      // Store the flag
      FeatureFlagStorage.add(flag);

      // Log the creation
      await this.logFlagHistory(
        flag,
        FeatureFlagAction.CREATED,
        undefined,
        flag.current_value,
        createdBy,
        createdByName,
        'Feature flag created',
        requestInfo
      );

      return flag;

    } catch (error) {
      console.error('Error creating feature flag:', error);
      throw new Error(`Failed to create feature flag: ${error.message}`);
    }
  }

  /**
   * Update an existing feature flag
   */
  static async updateFlag(
    flagId: string,
    updates: Partial<FeatureFlag>,
    updatedBy: string,
    updatedByName: string,
    reason?: string,
    requestInfo?: { ip_address?: string; user_agent?: string }
  ): Promise<FeatureFlag> {
    try {
      const existingFlag = FeatureFlagStorage.getById(flagId);
      if (!existingFlag) {
        throw new Error('Feature flag not found');
      }

      // Track what changed
      const changes: Array<{ field: string; old_value: any; new_value: any }> = [];

      Object.keys(updates).forEach(key => {
        if (key !== 'updated_at' && key !== 'updated_by' && key !== 'updated_by_name') {
          const oldValue = existingFlag[key as keyof FeatureFlag];
          const newValue = updates[key as keyof FeatureFlag];
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes.push({ field: key, old_value: oldValue, new_value: newValue });
          }
        }
      });

      // Update the flag
      const updated = FeatureFlagStorage.update(flagId, {
        ...updates,
        updated_by: updatedBy,
        updated_by_name: updatedByName
      });

      if (!updated) {
        throw new Error('Failed to update feature flag');
      }

      const updatedFlag = FeatureFlagStorage.getById(flagId)!;

      // Log the update
      await this.logFlagHistory(
        updatedFlag,
        FeatureFlagAction.UPDATED,
        existingFlag.current_value,
        updatedFlag.current_value,
        updatedBy,
        updatedByName,
        reason || 'Feature flag updated',
        requestInfo,
        { changes }
      );

      return updatedFlag;

    } catch (error) {
      console.error('Error updating feature flag:', error);
      throw new Error(`Failed to update feature flag: ${error.message}`);
    }
  }

  /**
   * Toggle feature flag enabled/disabled state
   */
  static async toggleFlag(
    flagId: string,
    enabled: boolean,
    updatedBy: string,
    updatedByName: string,
    reason?: string,
    requestInfo?: { ip_address?: string; user_agent?: string }
  ): Promise<FeatureFlag> {
    try {
      const flag = FeatureFlagStorage.getById(flagId);
      if (!flag) {
        throw new Error('Feature flag not found');
      }

      const updated = FeatureFlagStorage.update(flagId, {
        is_enabled: enabled,
        updated_by: updatedBy,
        updated_by_name: updatedByName
      });

      if (!updated) {
        throw new Error('Failed to toggle feature flag');
      }

      const updatedFlag = FeatureFlagStorage.getById(flagId)!;

      // Log the toggle
      await this.logFlagHistory(
        updatedFlag,
        enabled ? FeatureFlagAction.ENABLED : FeatureFlagAction.DISABLED,
        !enabled,
        enabled,
        updatedBy,
        updatedByName,
        reason || `Feature flag ${enabled ? 'enabled' : 'disabled'}`,
        requestInfo
      );

      return updatedFlag;

    } catch (error) {
      console.error('Error toggling feature flag:', error);
      throw new Error(`Failed to toggle feature flag: ${error.message}`);
    }
  }

  /**
   * Get feature flags with filtering and pagination
   */
  static async getFlags(
    filters: FeatureFlagFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<FeatureFlagResponse> {
    const filteredFlags = FeatureFlagStorage.filter(filters);
    const total = filteredFlags.length;
    const pages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const flags = filteredFlags.slice(offset, offset + limit);

    // Calculate summary
    const allFlags = FeatureFlagStorage.getAll();
    const summary = {
      total_flags: allFlags.length,
      active_flags: allFlags.filter(f => f.status === FeatureFlagStatus.ACTIVE).length,
      inactive_flags: allFlags.filter(f => f.status === FeatureFlagStatus.INACTIVE).length,
      archived_flags: allFlags.filter(f => f.status === FeatureFlagStatus.ARCHIVED).length,
      flags_by_category: this.calculateFlagsByCategory(allFlags),
      flags_by_environment: this.calculateFlagsByEnvironment(allFlags),
      recent_changes: this.calculateRecentChanges(allFlags)
    };

    return {
      flags,
      pagination: { page, limit, total, pages },
      filters,
      summary
    };
  }

  /**
   * Get a single feature flag by ID
   */
  static async getFlagById(flagId: string): Promise<FeatureFlag | null> {
    return FeatureFlagStorage.getById(flagId);
  }

  /**
   * Get a feature flag by key
   */
  static async getFlagByKey(key: string, environment?: Environment): Promise<FeatureFlag | null> {
    return FeatureFlagStorage.getByKey(key, environment);
  }

  /**
   * Evaluate a feature flag for a specific context
   */
  static async evaluateFlag(
    key: string,
    context: EvaluationContext
  ): Promise<FeatureFlagEvaluation> {
    try {
      const flag = FeatureFlagStorage.getByKey(key, context.environment);

      if (!flag) {
        return {
          flag_key: key,
          value: null,
          is_enabled: false,
          reason: EvaluationReason.FLAG_NOT_FOUND,
          evaluation_context: context,
          evaluated_at: new Date().toISOString()
        };
      }

      if (!flag.is_enabled || flag.status !== FeatureFlagStatus.ACTIVE) {
        return {
          flag_key: key,
          value: flag.default_value,
          is_enabled: false,
          reason: EvaluationReason.FLAG_DISABLED,
          evaluation_context: context,
          evaluated_at: new Date().toISOString()
        };
      }

      // Check for client-specific override
      if (context.client_id) {
        const clientOverride = flag.client_overrides.find(override =>
          override.client_id === context.client_id &&
          override.is_enabled &&
          (!override.expires_at || new Date(override.expires_at) > new Date())
        );

        if (clientOverride) {
          return {
            flag_key: key,
            value: clientOverride.value,
            is_enabled: true,
            reason: EvaluationReason.CLIENT_OVERRIDE,
            client_override: clientOverride,
            evaluation_context: context,
            evaluated_at: new Date().toISOString()
          };
        }
      }

      // Check conditions
      for (const condition of flag.conditions) {
        if (this.evaluateCondition(condition, context)) {
          return {
            flag_key: key,
            value: flag.current_value,
            is_enabled: true,
            reason: EvaluationReason.CONDITION_MATCH,
            matched_condition: condition,
            evaluation_context: context,
            evaluated_at: new Date().toISOString()
          };
        }
      }

      // Check rollout percentage
      if (flag.rollout_percentage < 100) {
        const rolloutBucket = this.calculateRolloutBucket(key, context.client_id || context.user_id || 'anonymous');
        if (rolloutBucket > flag.rollout_percentage) {
          return {
            flag_key: key,
            value: flag.default_value,
            is_enabled: false,
            reason: EvaluationReason.ROLLOUT_PERCENTAGE,
            rollout_bucket: rolloutBucket,
            evaluation_context: context,
            evaluated_at: new Date().toISOString()
          };
        }
      }

      // Return current value
      return {
        flag_key: key,
        value: flag.current_value,
        is_enabled: true,
        reason: EvaluationReason.DEFAULT_VALUE,
        evaluation_context: context,
        evaluated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error evaluating feature flag:', error);
      return {
        flag_key: key,
        value: null,
        is_enabled: false,
        reason: EvaluationReason.EVALUATION_ERROR,
        evaluation_context: context,
        evaluated_at: new Date().toISOString()
      };
    }
  }

  /**
   * Helper method to evaluate a condition
   */
  private static evaluateCondition(condition: FeatureFlagCondition, context: EvaluationContext): boolean {
    // Mock implementation - would implement actual condition evaluation
    return false;
  }

  /**
   * Calculate rollout bucket for percentage-based rollouts
   */
  private static calculateRolloutBucket(flagKey: string, identifier: string): number {
    // Simple hash-based bucketing (0-100)
    const hash = this.simpleHash(flagKey + identifier);
    return hash % 101; // 0-100
  }

  /**
   * Simple hash function for rollout bucketing
   */
  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Calculate flags by category for summary
   */
  private static calculateFlagsByCategory(flags: FeatureFlag[]): Record<FeatureFlagCategory, number> {
    const result = {} as Record<FeatureFlagCategory, number>;
    Object.values(FeatureFlagCategory).forEach(category => {
      result[category] = flags.filter(flag => flag.category === category).length;
    });
    return result;
  }

  /**
   * Calculate flags by environment for summary
   */
  private static calculateFlagsByEnvironment(flags: FeatureFlag[]): Record<Environment, number> {
    const result = {} as Record<Environment, number>;
    Object.values(Environment).forEach(env => {
      result[env] = flags.filter(flag => flag.environment === env).length;
    });
    return result;
  }

  /**
   * Calculate recent changes (last 24 hours)
   */
  private static calculateRecentChanges(flags: FeatureFlag[]): number {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return flags.filter(flag => flag.updated_at >= yesterday).length;
  }

  /**
   * Log feature flag history
   */
  private static async logFlagHistory(
    flag: FeatureFlag,
    action: FeatureFlagAction,
    oldValue: any,
    newValue: any,
    changedBy: string,
    changedByName: string,
    reason?: string,
    requestInfo?: { ip_address?: string; user_agent?: string },
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const historyEntry: FeatureFlagHistory = {
        id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        flag_id: flag.id,
        flag_key: flag.key,
        action,
        old_value: oldValue,
        new_value: newValue,
        changed_by: changedBy,
        changed_by_name: changedByName,
        reason,
        ip_address: requestInfo?.ip_address,
        user_agent: requestInfo?.user_agent,
        created_at: new Date().toISOString(),
        metadata
      };

      FeatureFlagStorage.addHistory(historyEntry);

      // Also log to audit system
      const { AuditService } = await import('../audit/audit-service');
      const { AuditAction, ResourceType, AuditSeverity } = await import('../../types/audit-log');

      const auditActionMap = {
        [FeatureFlagAction.CREATED]: AuditAction.FEATURE_FLAG_CREATED,
        [FeatureFlagAction.UPDATED]: AuditAction.FEATURE_FLAG_UPDATED,
        [FeatureFlagAction.ENABLED]: AuditAction.FEATURE_FLAG_ENABLED,
        [FeatureFlagAction.DISABLED]: AuditAction.FEATURE_FLAG_DISABLED,
        [FeatureFlagAction.ARCHIVED]: AuditAction.FEATURE_FLAG_ARCHIVED,
        [FeatureFlagAction.DELETED]: AuditAction.FEATURE_FLAG_DELETED,
        [FeatureFlagAction.CLIENT_OVERRIDE_ADDED]: AuditAction.FEATURE_FLAG_UPDATED,
        [FeatureFlagAction.CLIENT_OVERRIDE_REMOVED]: AuditAction.FEATURE_FLAG_UPDATED,
        [FeatureFlagAction.CONDITION_ADDED]: AuditAction.FEATURE_FLAG_UPDATED,
        [FeatureFlagAction.CONDITION_REMOVED]: AuditAction.FEATURE_FLAG_UPDATED
      };

      const auditAction = auditActionMap[action] || AuditAction.FEATURE_FLAG_UPDATED;
      const description = `Feature flag '${flag.name}' (${flag.key}) ${action.replace('_', ' ')}`;

      await AuditService.log({
        admin_id: changedBy,
        admin_email: changedBy, // Would get actual email in real implementation
        admin_name: changedByName,
        action: auditAction,
        resource_type: ResourceType.FEATURE_FLAG,
        resource_id: flag.id,
        resource_name: flag.name,
        details: {
          description,
          context: {
            flag_key: flag.key,
            action,
            old_value: oldValue,
            new_value: newValue,
            reason,
            environment: flag.environment,
            category: flag.category
          }
        },
        severity: AuditSeverity.MEDIUM,
        status: 'success',
        ip_address: requestInfo?.ip_address,
        user_agent: requestInfo?.user_agent
      });

    } catch (error) {
      console.error('Failed to log feature flag history:', error);
    }
  }

  /**
   * Get feature flag history
   */
  static async getFlagHistory(flagId?: string): Promise<FeatureFlagHistory[]> {
    return FeatureFlagStorage.getHistory(flagId);
  }

  /**
   * Perform bulk operations on feature flags
   */
  static async bulkOperation(
    operation: BulkFeatureFlagOperation,
    performedBy: string,
    performedByName: string,
    requestInfo?: { ip_address?: string; user_agent?: string }
  ): Promise<BulkOperationResult> {
    const results: BulkOperationResult['results'] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const flagId of operation.flag_ids) {
      try {
        const flag = FeatureFlagStorage.getById(flagId);
        if (!flag) {
          results.push({
            flag_id: flagId,
            flag_key: 'unknown',
            success: false,
            error: 'Feature flag not found'
          });
          failureCount++;
          continue;
        }

        switch (operation.action) {
          case 'enable':
            await this.toggleFlag(flagId, true, performedBy, performedByName, operation.reason, requestInfo);
            break;
          case 'disable':
            await this.toggleFlag(flagId, false, performedBy, performedByName, operation.reason, requestInfo);
            break;
          case 'archive':
            await this.updateFlag(flagId, { status: FeatureFlagStatus.ARCHIVED }, performedBy, performedByName, operation.reason, requestInfo);
            break;
          case 'delete':
            FeatureFlagStorage.delete(flagId);
            await this.logFlagHistory(flag, FeatureFlagAction.DELETED, flag.current_value, null, performedBy, performedByName, operation.reason, requestInfo);
            break;
        }

        results.push({
          flag_id: flagId,
          flag_key: flag.key,
          success: true
        });
        successCount++;

      } catch (error) {
        results.push({
          flag_id: flagId,
          flag_key: 'unknown',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failureCount++;
      }
    }

    return {
      success_count: successCount,
      failure_count: failureCount,
      results,
      operation,
      performed_by: performedBy,
      performed_at: new Date().toISOString()
    };
  }

  /**
   * Initialize service with default flags
   */
  static initializeService(): void {
    FeatureFlagStorage.initializeDefaultFlags();
  }

  /**
   * Get service statistics
   */
  static getStatistics(): {
    total_flags: number;
    active_flags: number;
    total_history_entries: number;
    flags_by_environment: Record<Environment, number>;
    flags_by_category: Record<FeatureFlagCategory, number>;
  } {
    const flags = FeatureFlagStorage.getAll();
    const history = FeatureFlagStorage.getHistory();

    return {
      total_flags: flags.length,
      active_flags: flags.filter(f => f.is_enabled && f.status === FeatureFlagStatus.ACTIVE).length,
      total_history_entries: history.length,
      flags_by_environment: this.calculateFlagsByEnvironment(flags),
      flags_by_category: this.calculateFlagsByCategory(flags)
    };
  }
}