// Plan migration service for FocuSprint
// Manages client plan upgrades, downgrades, and migrations

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface PlanMigration {
  id: string;
  client_id: string;
  from_plan_id: string | null;
  to_plan_id: string;
  from_plan_type: string | null;
  to_plan_type: string;
  migration_type: 'upgrade' | 'downgrade' | 'lateral' | 'promotional';
  migration_reason: string | null;
  effective_date: string;
  proration_amount: number;
  proration_currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  stripe_invoice_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  created_by: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export interface MigrationRequest {
  client_id: string;
  to_plan_id: string;
  migration_reason?: string;
  effective_date?: string;
  force_migration?: boolean;
}

export interface MigrationValidation {
  is_valid: boolean;
  migration_type: 'upgrade' | 'downgrade' | 'lateral' | 'promotional';
  warnings: string[];
  blockers: string[];
  proration_estimate: number;
  feature_changes: {
    gained_features: string[];
    lost_features: string[];
    limit_changes: Record<string, { from: any; to: any }>;
  };
}

export class PlanMigrationService {
  /**
   * Validate a plan migration before executing
   */
  static async validateMigration(request: MigrationRequest): Promise<MigrationValidation> {
    const supabase = await createClient();

    try {
      // Get client current plan
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, plan_type, max_users, max_projects, status')
        .eq('id', request.client_id)
        .single();

      if (clientError || !client) {
        throw new Error(`Client not found: ${request.client_id}`);
      }

      // Get target plan
      const { data: targetPlan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', request.to_plan_id)
        .single();

      if (planError || !targetPlan) {
        throw new Error(`Target plan not found: ${request.to_plan_id}`);
      }

      // Get current plan details
      const { data: currentPlan } = await supabase
        .from('plans')
        .select('*')
        .eq('code', client.plan_type)
        .single();

      const validation: MigrationValidation = {
        is_valid: true,
        migration_type: 'lateral',
        warnings: [],
        blockers: [],
        proration_estimate: 0,
        feature_changes: {
          gained_features: [],
          lost_features: [],
          limit_changes: {}
        }
      };

      // Determine migration type
      if (currentPlan && targetPlan.price > currentPlan.price) {
        validation.migration_type = 'upgrade';
      } else if (currentPlan && targetPlan.price < currentPlan.price) {
        validation.migration_type = 'downgrade';
      } else if (targetPlan.is_promotional) {
        validation.migration_type = 'promotional';
      }

      // Check if client is active
      if (client.status !== 'active') {
        validation.blockers.push('Client account is not active');
        validation.is_valid = false;
      }

      // Check if target plan is active
      if (!targetPlan.is_active) {
        validation.blockers.push('Target plan is not active');
        validation.is_valid = false;
      }

      // Check promotional plan validity
      if (targetPlan.is_promotional) {
        const now = new Date();
        const startDate = targetPlan.promo_start_date ? new Date(targetPlan.promo_start_date) : null;
        const endDate = targetPlan.promo_end_date ? new Date(targetPlan.promo_end_date) : null;

        if (startDate && now < startDate) {
          validation.blockers.push('Promotional plan has not started yet');
          validation.is_valid = false;
        }

        if (endDate && now > endDate) {
          validation.blockers.push('Promotional plan has expired');
          validation.is_valid = false;
        }
      }

      // Check usage limits for downgrades
      if (validation.migration_type === 'downgrade' && currentPlan) {
        const targetLimits = targetPlan.limits as any;
        
        // Check user limit
        if (targetLimits.max_users && client.max_users > targetLimits.max_users) {
          validation.warnings.push(`Current usage (${client.max_users} users) exceeds target plan limit (${targetLimits.max_users} users)`);
        }

        // Check project limit
        if (targetLimits.max_projects && targetLimits.max_projects !== -1 && client.max_projects > targetLimits.max_projects) {
          validation.warnings.push(`Current usage (${client.max_projects} projects) exceeds target plan limit (${targetLimits.max_projects} projects)`);
        }
      }

      // Calculate feature changes
      if (currentPlan) {
        const currentFeatures = currentPlan.features as Record<string, boolean>;
        const targetFeatures = targetPlan.features as Record<string, boolean>;

        for (const [feature, enabled] of Object.entries(targetFeatures)) {
          if (enabled && !currentFeatures[feature]) {
            validation.feature_changes.gained_features.push(feature);
          } else if (!enabled && currentFeatures[feature]) {
            validation.feature_changes.lost_features.push(feature);
          }
        }

        // Calculate limit changes
        const currentLimits = currentPlan.limits as any;
        const targetLimits = targetPlan.limits as any;

        for (const [limit, value] of Object.entries(targetLimits)) {
          if (currentLimits[limit] !== value) {
            validation.feature_changes.limit_changes[limit] = {
              from: currentLimits[limit],
              to: value
            };
          }
        }
      }

      // Estimate proration (simplified calculation)
      if (currentPlan && validation.migration_type === 'upgrade') {
        const priceDiff = targetPlan.price - currentPlan.price;
        // Assume 15 days remaining in billing cycle for estimation
        validation.proration_estimate = (priceDiff * 15) / 30;
      }

      return validation;

    } catch (error) {
      logger.error('Failed to validate plan migration', error instanceof Error ? error : new Error('Unknown error'), 'PLAN_MIGRATION', {
        clientId: request.client_id,
        toPlanId: request.to_plan_id
      });
      throw error;
    }
  }

  /**
   * Execute a plan migration
   */
  static async executeMigration(
    request: MigrationRequest,
    performedBy: string
  ): Promise<PlanMigration> {
    const supabase = await createClient();

    try {
      // Validate migration first
      const validation = await this.validateMigration(request);

      if (!validation.is_valid && !request.force_migration) {
        throw new Error(`Migration validation failed: ${validation.blockers.join(', ')}`);
      }

      // Get client and plans
      const { data: client } = await supabase
        .from('clients')
        .select('id, plan_type')
        .eq('id', request.client_id)
        .single();

      const { data: currentPlan } = await supabase
        .from('plans')
        .select('*')
        .eq('code', client?.plan_type)
        .single();

      const { data: targetPlan } = await supabase
        .from('plans')
        .select('*')
        .eq('id', request.to_plan_id)
        .single();

      // Create migration record
      const { data: migration, error: migrationError } = await supabase
        .from('plan_migrations')
        .insert([{
          client_id: request.client_id,
          from_plan_id: currentPlan?.id || null,
          to_plan_id: request.to_plan_id,
          from_plan_type: client?.plan_type || null,
          to_plan_type: targetPlan?.code,
          migration_type: validation.migration_type,
          migration_reason: request.migration_reason || 'Plan migration via admin interface',
          effective_date: request.effective_date || new Date().toISOString(),
          proration_amount: validation.proration_estimate,
          status: 'pending',
          created_by: performedBy
        }])
        .select()
        .single();

      if (migrationError) {
        throw new Error(`Failed to create migration record: ${migrationError.message}`);
      }

      // Update client plan
      const targetLimits = targetPlan?.limits as any;
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          plan_type: targetPlan?.code,
          max_users: targetLimits?.max_users || 5,
          max_projects: targetLimits?.max_projects || 3,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.client_id);

      if (updateError) {
        // Mark migration as failed
        await supabase
          .from('plan_migrations')
          .update({
            status: 'failed',
            error_message: updateError.message
          })
          .eq('id', migration.id);

        throw new Error(`Failed to update client plan: ${updateError.message}`);
      }

      // Mark migration as completed
      const { data: completedMigration } = await supabase
        .from('plan_migrations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', migration.id)
        .select()
        .single();

      logger.info(`Plan migration completed: ${request.client_id} -> ${targetPlan?.code}`, 'PLAN_MIGRATION', {
        clientId: request.client_id,
        fromPlan: client?.plan_type,
        toPlan: targetPlan?.code,
        migrationType: validation.migration_type,
        performedBy
      });

      return completedMigration || migration;

    } catch (error) {
      logger.error('Failed to execute plan migration', error instanceof Error ? error : new Error('Unknown error'), 'PLAN_MIGRATION', {
        clientId: request.client_id,
        toPlanId: request.to_plan_id,
        performedBy
      });
      throw error;
    }
  }

  /**
   * Get migration history for a client
   */
  static async getClientMigrationHistory(clientId: string): Promise<PlanMigration[]> {
    const supabase = await createClient();

    try {
      const { data: migrations, error } = await supabase
        .from('plan_migrations')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch migration history: ${error.message}`);
      }

      return migrations || [];

    } catch (error) {
      logger.error('Failed to get client migration history', error instanceof Error ? error : new Error('Unknown error'), 'PLAN_MIGRATION', {
        clientId
      });
      throw error;
    }
  }

  /**
   * Get all pending migrations
   */
  static async getPendingMigrations(): Promise<PlanMigration[]> {
    const supabase = await createClient();

    try {
      const { data: migrations, error } = await supabase
        .from('plan_migrations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch pending migrations: ${error.message}`);
      }

      return migrations || [];

    } catch (error) {
      logger.error('Failed to get pending migrations', error instanceof Error ? error : new Error('Unknown error'), 'PLAN_MIGRATION');
      throw error;
    }
  }
}
