// Additional Users Billing Service for FocuSprint
// Handles billing calculations for users above plan limits

import { createClient } from '@/lib/supabase/server';
import { PlanService } from '@/lib/plans/service';
import { logger } from '@/lib/logger';

export interface AdditionalUsersBilling {
  license_id: string;
  plan_id: string;
  plan_name: string;
  max_users: number;
  current_users: number;
  additional_users: number;
  price_per_additional_user_cents: number;
  additional_users_cost_cents: number;
  base_plan_cost_cents: number;
  total_cost_cents: number;
  currency: string;
}

export interface UserCountUpdate {
  license_id: string;
  new_user_count: number;
  previous_user_count: number;
  billing_impact: {
    additional_users_change: number;
    cost_change_cents: number;
    new_total_cost_cents: number;
  };
}

export class AdditionalUsersService {
  /**
   * Calculate billing for additional users above plan limit
   */
  static async calculateAdditionalUsersBilling(licenseId: string): Promise<AdditionalUsersBilling | null> {
    const supabase = await createClient();

    try {
      // Get license with plan information
      const { data: license, error: licenseError } = await supabase
        .schema('platform_admin')
        .from('licenses')
        .select(`
          id,
          plan_id,
          max_users,
          current_users,
          client_id
        `)
        .eq('id', licenseId)
        .single();

      if (licenseError || !license) {
        logger.error(`License not found: ${licenseId}`, licenseError);
        return null;
      }

      if (!license.plan_id) {
        logger.warn(`License ${licenseId} has no plan_id`);
        return null;
      }

      // Get plan details
      const plan = await PlanService.getPlanById(license.plan_id);
      if (!plan) {
        logger.error(`Plan not found: ${license.plan_id}`);
        return null;
      }

      const currentUsers = license.current_users || 0;
      const maxUsers = license.max_users || plan.limits.max_users || 0;
      const additionalUsers = Math.max(0, currentUsers - maxUsers);
      const pricePerAdditionalUser = plan.price_per_additional_user_cents || 0;
      const additionalUsersCost = additionalUsers * pricePerAdditionalUser;
      const basePlanCost = plan.price * 100; // Convert to cents
      const totalCost = basePlanCost + additionalUsersCost;

      return {
        license_id: licenseId,
        plan_id: plan.id,
        plan_name: plan.name,
        max_users: maxUsers,
        current_users: currentUsers,
        additional_users: additionalUsers,
        price_per_additional_user_cents: pricePerAdditionalUser,
        additional_users_cost_cents: additionalUsersCost,
        base_plan_cost_cents: basePlanCost,
        total_cost_cents: totalCost,
        currency: plan.currency
      };

    } catch (error) {
      logger.error(`Error calculating additional users billing for license ${licenseId}:`, error);
      throw error;
    }
  }

  /**
   * Update user count for a license and calculate billing impact
   */
  static async updateUserCount(licenseId: string, newUserCount: number): Promise<UserCountUpdate> {
    const supabase = await createClient();

    try {
      // Get current license data
      const { data: currentLicense, error: fetchError } = await supabase
        .schema('platform_admin')
        .from('licenses')
        .select('current_users, max_users, plan_id')
        .eq('id', licenseId)
        .single();

      if (fetchError || !currentLicense) {
        throw new Error(`License not found: ${licenseId}`);
      }

      const previousUserCount = currentLicense.current_users || 0;

      // Calculate billing before and after
      const beforeBilling = await this.calculateAdditionalUsersBilling(licenseId);
      
      // Update user count
      const { error: updateError } = await supabase
        .schema('platform_admin')
        .from('licenses')
        .update({ 
          current_users: newUserCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', licenseId);

      if (updateError) {
        throw new Error(`Failed to update user count: ${updateError.message}`);
      }

      // Calculate billing after update
      const afterBilling = await this.calculateAdditionalUsersBilling(licenseId);

      const beforeCost = beforeBilling?.total_cost_cents || 0;
      const afterCost = afterBilling?.total_cost_cents || 0;
      const costChange = afterCost - beforeCost;

      const beforeAdditionalUsers = beforeBilling?.additional_users || 0;
      const afterAdditionalUsers = afterBilling?.additional_users || 0;
      const additionalUsersChange = afterAdditionalUsers - beforeAdditionalUsers;

      return {
        license_id: licenseId,
        new_user_count: newUserCount,
        previous_user_count: previousUserCount,
        billing_impact: {
          additional_users_change: additionalUsersChange,
          cost_change_cents: costChange,
          new_total_cost_cents: afterCost
        }
      };

    } catch (error) {
      logger.error(`Error updating user count for license ${licenseId}:`, error);
      throw error;
    }
  }

  /**
   * Get all licenses with additional users billing
   */
  static async getAllLicensesWithAdditionalUsersBilling(): Promise<AdditionalUsersBilling[]> {
    const supabase = await createClient();

    try {
      // Get all active licenses
      const { data: licenses, error } = await supabase
        .schema('platform_admin')
        .from('licenses')
        .select('id')
        .in('status', ['active', 'trial']);

      if (error || !licenses) {
        logger.error('Error fetching licenses for additional users billing:', error);
        return [];
      }

      const billingResults: AdditionalUsersBilling[] = [];

      // Calculate billing for each license
      for (const license of licenses) {
        try {
          const billing = await this.calculateAdditionalUsersBilling(license.id);
          if (billing && billing.additional_users > 0) {
            billingResults.push(billing);
          }
        } catch (error) {
          logger.error(`Error calculating billing for license ${license.id}:`, error);
          // Continue with other licenses
        }
      }

      return billingResults;

    } catch (error) {
      logger.error('Error getting all licenses with additional users billing:', error);
      throw error;
    }
  }

  /**
   * Sync user count from actual client_profiles data
   */
  static async syncUserCountFromProfiles(licenseId: string): Promise<UserCountUpdate> {
    const supabase = await createClient();

    try {
      // Get license with client_id
      const { data: license, error: licenseError } = await supabase
        .schema('platform_admin')
        .from('licenses')
        .select('client_id, current_users')
        .eq('id', licenseId)
        .single();

      if (licenseError || !license || !license.client_id) {
        throw new Error(`License not found or has no client_id: ${licenseId}`);
      }

      // Count actual users in client_profiles
      const { count: actualUserCount, error: countError } = await supabase
        .from('client_profiles')
        .select('user_id', { count: 'exact' })
        .eq('client_id', license.client_id);

      if (countError) {
        throw new Error(`Failed to count users: ${countError.message}`);
      }

      const newUserCount = actualUserCount || 0;

      // Update the license with actual user count
      return await this.updateUserCount(licenseId, newUserCount);

    } catch (error) {
      logger.error(`Error syncing user count for license ${licenseId}:`, error);
      throw error;
    }
  }

  /**
   * Get additional users statistics
   */
  static async getAdditionalUsersStats(): Promise<{
    total_licenses_with_additional_users: number;
    total_additional_users: number;
    total_additional_revenue_cents: number;
    average_additional_users_per_license: number;
    currency: string;
  }> {
    try {
      const allBilling = await this.getAllLicensesWithAdditionalUsersBilling();

      const totalLicenses = allBilling.length;
      const totalAdditionalUsers = allBilling.reduce((sum, billing) => sum + billing.additional_users, 0);
      const totalRevenue = allBilling.reduce((sum, billing) => sum + billing.additional_users_cost_cents, 0);
      const averageAdditionalUsers = totalLicenses > 0 ? totalAdditionalUsers / totalLicenses : 0;

      return {
        total_licenses_with_additional_users: totalLicenses,
        total_additional_users: totalAdditionalUsers,
        total_additional_revenue_cents: totalRevenue,
        average_additional_users_per_license: Math.round(averageAdditionalUsers * 100) / 100,
        currency: allBilling.length > 0 ? allBilling[0].currency : 'BRL'
      };

    } catch (error) {
      logger.error('Error getting additional users stats:', error);
      throw error;
    }
  }
}
