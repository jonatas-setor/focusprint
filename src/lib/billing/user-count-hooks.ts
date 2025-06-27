// User Count Hooks for FocuSprint
// Automatically updates license user counts when users are added/removed

import { createClient } from '@/lib/supabase/server';
import { AdditionalUsersService } from './additional-users-service';
import { logger } from '@/lib/logger';

export class UserCountHooks {
  /**
   * Update license user count when a user is added to a client
   */
  static async onUserAdded(clientId: string, userId: string): Promise<void> {
    try {
      // Get the license for this client
      const supabase = await createClient();
      const { data: license, error } = await supabase
        .schema('platform_admin')
        .from('licenses')
        .select('id, current_users')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .single();

      if (error || !license) {
        logger.warn(`No active license found for client ${clientId} when adding user ${userId}`);
        return;
      }

      // Sync user count from actual profiles
      await AdditionalUsersService.syncUserCountFromProfiles(license.id);
      
      logger.info(`Updated user count for license ${license.id} after adding user ${userId} to client ${clientId}`);

    } catch (error) {
      logger.error(`Error updating user count after adding user ${userId} to client ${clientId}:`, error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Update license user count when a user is removed from a client
   */
  static async onUserRemoved(clientId: string, userId: string): Promise<void> {
    try {
      // Get the license for this client
      const supabase = await createClient();
      const { data: license, error } = await supabase
        .schema('platform_admin')
        .from('licenses')
        .select('id, current_users')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .single();

      if (error || !license) {
        logger.warn(`No active license found for client ${clientId} when removing user ${userId}`);
        return;
      }

      // Sync user count from actual profiles
      await AdditionalUsersService.syncUserCountFromProfiles(license.id);
      
      logger.info(`Updated user count for license ${license.id} after removing user ${userId} from client ${clientId}`);

    } catch (error) {
      logger.error(`Error updating user count after removing user ${userId} from client ${clientId}:`, error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Validate user limit before adding a user to a client
   */
  static async validateUserLimit(clientId: string): Promise<{
    canAddUser: boolean;
    reason?: string;
    currentUsers: number;
    maxUsers: number;
    additionalUserCost?: number;
    currency?: string;
  }> {
    try {
      const supabase = await createClient();

      // Get license information
      const { data: license, error } = await supabase
        .schema('platform_admin')
        .from('licenses')
        .select('id, max_users, current_users, plan_id, status')
        .eq('client_id', clientId)
        .single();

      if (error || !license) {
        return {
          canAddUser: false,
          reason: 'No license found for this client',
          currentUsers: 0,
          maxUsers: 0
        };
      }

      if (license.status !== 'active' && license.status !== 'trial') {
        return {
          canAddUser: false,
          reason: `License is ${license.status}`,
          currentUsers: license.current_users || 0,
          maxUsers: license.max_users || 0
        };
      }

      // Get current actual user count
      const { count: actualUserCount } = await supabase
        .from('client_profiles')
        .select('user_id', { count: 'exact' })
        .eq('client_id', clientId);

      const currentUsers = actualUserCount || 0;
      const maxUsers = license.max_users || 0;

      // If within limit, allow
      if (currentUsers < maxUsers) {
        return {
          canAddUser: true,
          currentUsers,
          maxUsers
        };
      }

      // Check if additional users are allowed (plan has price_per_additional_user_cents > 0)
      if (license.plan_id) {
        const { data: plan, error: planError } = await supabase
          .from('plans')
          .select('price_per_additional_user_cents, currency')
          .eq('id', license.plan_id)
          .single();

        if (!planError && plan && plan.price_per_additional_user_cents > 0) {
          return {
            canAddUser: true,
            currentUsers,
            maxUsers,
            additionalUserCost: plan.price_per_additional_user_cents,
            currency: plan.currency
          };
        }
      }

      // Additional users not allowed
      return {
        canAddUser: false,
        reason: `User limit reached (${maxUsers} users). Additional users not allowed for this plan.`,
        currentUsers,
        maxUsers
      };

    } catch (error) {
      logger.error(`Error validating user limit for client ${clientId}:`, error);
      return {
        canAddUser: false,
        reason: 'Error validating user limit',
        currentUsers: 0,
        maxUsers: 0
      };
    }
  }

  /**
   * Get billing preview for adding a user
   */
  static async getBillingPreview(clientId: string): Promise<{
    currentBilling?: any;
    newBilling?: any;
    costIncrease: number;
    currency: string;
  }> {
    try {
      const supabase = await createClient();

      // Get license
      const { data: license, error } = await supabase
        .schema('platform_admin')
        .from('licenses')
        .select('id')
        .eq('client_id', clientId)
        .single();

      if (error || !license) {
        return {
          costIncrease: 0,
          currency: 'BRL'
        };
      }

      // Get current billing
      const currentBilling = await AdditionalUsersService.calculateAdditionalUsersBilling(license.id);
      
      if (!currentBilling) {
        return {
          costIncrease: 0,
          currency: 'BRL'
        };
      }

      // Calculate billing with one more user
      const newUserCount = currentBilling.current_users + 1;
      const newAdditionalUsers = Math.max(0, newUserCount - currentBilling.max_users);
      const newAdditionalCost = newAdditionalUsers * currentBilling.price_per_additional_user_cents;
      const newTotalCost = currentBilling.base_plan_cost_cents + newAdditionalCost;

      const newBilling = {
        ...currentBilling,
        current_users: newUserCount,
        additional_users: newAdditionalUsers,
        additional_users_cost_cents: newAdditionalCost,
        total_cost_cents: newTotalCost
      };

      const costIncrease = newTotalCost - currentBilling.total_cost_cents;

      return {
        currentBilling,
        newBilling,
        costIncrease,
        currency: currentBilling.currency
      };

    } catch (error) {
      logger.error(`Error getting billing preview for client ${clientId}:`, error);
      return {
        costIncrease: 0,
        currency: 'BRL'
      };
    }
  }

  /**
   * Initialize user counts for all licenses (one-time setup)
   */
  static async initializeAllUserCounts(): Promise<{
    updated: number;
    errors: number;
    details: Array<{ license_id: string; status: 'success' | 'error'; message?: string }>;
  }> {
    try {
      const supabase = await createClient();

      // Get all licenses with client_id
      const { data: licenses, error } = await supabase
        .schema('platform_admin')
        .from('licenses')
        .select('id, client_id')
        .not('client_id', 'is', null);

      if (error || !licenses) {
        throw new Error(`Failed to fetch licenses: ${error?.message}`);
      }

      const results = {
        updated: 0,
        errors: 0,
        details: [] as Array<{ license_id: string; status: 'success' | 'error'; message?: string }>
      };

      for (const license of licenses) {
        try {
          await AdditionalUsersService.syncUserCountFromProfiles(license.id);
          results.updated++;
          results.details.push({
            license_id: license.id,
            status: 'success'
          });
        } catch (error) {
          results.errors++;
          results.details.push({
            license_id: license.id,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      logger.info(`User count initialization completed: ${results.updated} updated, ${results.errors} errors`);
      return results;

    } catch (error) {
      logger.error('Error initializing user counts:', error);
      throw error;
    }
  }
}
