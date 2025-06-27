// Trial Expiration Service for FocuSprint
// Handles automatic expiration of trial licenses that have reached their end date

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface TrialExpirationResult {
  expired_count: number;
  expired_licenses: string[];
  errors: Array<{
    license_id: string;
    error: string;
  }>;
}

export interface TrialNotificationResult {
  notified_count: number;
  notified_licenses: string[];
  errors: Array<{
    license_id: string;
    error: string;
  }>;
}

export class TrialExpirationService {
  /**
   * Expire all trials that have reached their end date
   */
  static async expireOverdueTrials(): Promise<TrialExpirationResult> {
    const supabase = await createClient();
    const now = new Date();
    
    const result: TrialExpirationResult = {
      expired_count: 0,
      expired_licenses: [],
      errors: []
    };

    try {
      // Find all trial licenses that have expired
      const { data: expiredTrials, error: fetchError } = await supabase
        .schema('platform_admin')
        .from('licenses')
        .select('id, client_id, plan_type, trial_ends_at, metadata')
        .eq('status', 'trial')
        .not('trial_ends_at', 'is', null)
        .lt('trial_ends_at', now.toISOString());

      if (fetchError) {
        logger.error('Error fetching expired trials:', fetchError);
        throw new Error(`Failed to fetch expired trials: ${fetchError.message}`);
      }

      if (!expiredTrials || expiredTrials.length === 0) {
        logger.info('No expired trials found');
        return result;
      }

      logger.info(`Found ${expiredTrials.length} expired trials to process`);

      // Process each expired trial
      for (const trial of expiredTrials) {
        try {
          // Update metadata to track automatic expiration
          const updatedMetadata = {
            ...trial.metadata,
            trial_expired_at: now.toISOString(),
            trial_expired_by: 'system',
            trial_expiration_reason: 'Trial period ended automatically',
            trial_expiration_type: 'automatic',
            original_trial_end: trial.trial_ends_at
          };

          // Update license status to expired
          const { error: updateError } = await supabase
            .schema('platform_admin')
            .from('licenses')
            .update({
              status: 'expired',
              metadata: updatedMetadata,
              updated_at: now.toISOString()
            })
            .eq('id', trial.id);

          if (updateError) {
            logger.error(`Error expiring trial ${trial.id}:`, updateError);
            result.errors.push({
              license_id: trial.id,
              error: updateError.message
            });
          } else {
            result.expired_count++;
            result.expired_licenses.push(trial.id);
            logger.info(`Successfully expired trial license ${trial.id}`);
          }
        } catch (error) {
          logger.error(`Error processing trial ${trial.id}:`, error);
          result.errors.push({
            license_id: trial.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      logger.info(`Trial expiration completed: ${result.expired_count} expired, ${result.errors.length} errors`);
      return result;

    } catch (error) {
      logger.error('Error in expireOverdueTrials:', error);
      throw error;
    }
  }

  /**
   * Get trials expiring soon (within specified days)
   */
  static async getTrialsExpiringSoon(days: number = 3): Promise<any[]> {
    const supabase = await createClient();
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + days);

    try {
      const { data: expiringSoon, error } = await supabase
        .schema('platform_admin')
        .from('licenses')
        .select(`
          id,
          client_id,
          plan_type,
          trial_ends_at,
          created_at,
          metadata
        `)
        .eq('status', 'trial')
        .not('trial_ends_at', 'is', null)
        .gte('trial_ends_at', now.toISOString())
        .lte('trial_ends_at', futureDate.toISOString())
        .order('trial_ends_at', { ascending: true });

      if (error) {
        logger.error('Error fetching trials expiring soon:', error);
        throw new Error(`Failed to fetch trials expiring soon: ${error.message}`);
      }

      return expiringSoon || [];
    } catch (error) {
      logger.error('Error in getTrialsExpiringSoon:', error);
      throw error;
    }
  }

  /**
   * Send notifications for trials expiring soon
   */
  static async notifyTrialsExpiringSoon(days: number = 3): Promise<TrialNotificationResult> {
    const result: TrialNotificationResult = {
      notified_count: 0,
      notified_licenses: [],
      errors: []
    };

    try {
      const expiringSoon = await this.getTrialsExpiringSoon(days);
      
      if (expiringSoon.length === 0) {
        logger.info('No trials expiring soon found');
        return result;
      }

      logger.info(`Found ${expiringSoon.length} trials expiring within ${days} days`);

      // For now, just log the notifications
      // In a real implementation, you would send emails or other notifications
      for (const trial of expiringSoon) {
        try {
          const daysRemaining = Math.ceil(
            (new Date(trial.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );

          logger.info(`Trial ${trial.id} expires in ${daysRemaining} days`);
          
          // TODO: Implement actual notification sending (email, in-app, etc.)
          // For now, just mark as notified
          result.notified_count++;
          result.notified_licenses.push(trial.id);

        } catch (error) {
          logger.error(`Error notifying trial ${trial.id}:`, error);
          result.errors.push({
            license_id: trial.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      logger.info(`Trial notifications completed: ${result.notified_count} notified, ${result.errors.length} errors`);
      return result;

    } catch (error) {
      logger.error('Error in notifyTrialsExpiringSoon:', error);
      throw error;
    }
  }

  /**
   * Get trial statistics
   */
  static async getTrialStats(): Promise<{
    total_trials: number;
    active_trials: number;
    expired_trials: number;
    expiring_soon: number;
    conversion_rate: number;
  }> {
    const supabase = await createClient();

    try {
      // Get all licenses with trial information
      const { data: licenses, error } = await supabase
        .schema('platform_admin')
        .from('licenses')
        .select('id, status, trial_ends_at, created_at')
        .not('trial_ends_at', 'is', null);

      if (error) {
        logger.error('Error fetching trial stats:', error);
        throw new Error(`Failed to fetch trial stats: ${error.message}`);
      }

      const now = new Date();
      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const totalTrials = licenses?.length || 0;
      const activeTrials = licenses?.filter(l => l.status === 'trial').length || 0;
      const expiredTrials = licenses?.filter(l => l.status === 'expired').length || 0;
      const expiringSoon = licenses?.filter(l => 
        l.status === 'trial' && 
        new Date(l.trial_ends_at) <= threeDaysFromNow &&
        new Date(l.trial_ends_at) > now
      ).length || 0;

      // Calculate conversion rate (trials that became active)
      const convertedTrials = licenses?.filter(l => 
        l.trial_ends_at && l.status === 'active'
      ).length || 0;

      const conversionRate = totalTrials > 0 ? (convertedTrials / totalTrials) * 100 : 0;

      return {
        total_trials: totalTrials,
        active_trials: activeTrials,
        expired_trials: expiredTrials,
        expiring_soon: expiringSoon,
        conversion_rate: Math.round(conversionRate * 100) / 100
      };

    } catch (error) {
      logger.error('Error in getTrialStats:', error);
      throw error;
    }
  }
}
