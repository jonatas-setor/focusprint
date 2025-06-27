import { NextRequest, NextResponse } from 'next/server';
import { TrialExpirationService } from '@/lib/trials/expiration-service';
import { logger } from '@/lib/logger';

/**
 * POST /api/cron/expire-trials - Cron job to expire overdue trials
 * 
 * This endpoint is designed to be called by a cron service (like Vercel Cron)
 * to automatically expire trials that have reached their end date.
 * 
 * Security: This endpoint should be protected by a cron secret or API key
 * in production to prevent unauthorized access.
 * 
 * Headers:
 * - Authorization: Bearer <CRON_SECRET> (optional, for security)
 * 
 * Returns:
 * - 200: Expiration process completed successfully
 * - 401: Unauthorized (if cron secret is required and invalid)
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      const providedSecret = authHeader?.replace('Bearer ', '');
      
      if (!providedSecret || providedSecret !== cronSecret) {
        logger.warn('Unauthorized cron job attempt to expire trials');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    logger.info('Starting scheduled trial expiration job');

    // Run the trial expiration service
    const expirationResult = await TrialExpirationService.expireOverdueTrials();

    // Get updated statistics
    const stats = await TrialExpirationService.getTrialStats();

    // Send notifications for trials expiring soon (optional)
    const notificationResult = await TrialExpirationService.notifyTrialsExpiringSoon(3);

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      expiration_result: {
        expired_count: expirationResult.expired_count,
        expired_licenses: expirationResult.expired_licenses,
        errors_count: expirationResult.errors.length,
        errors: expirationResult.errors
      },
      notification_result: {
        notified_count: notificationResult.notified_count,
        notified_licenses: notificationResult.notified_licenses,
        errors_count: notificationResult.errors.length,
        errors: notificationResult.errors
      },
      updated_stats: stats,
      summary: {
        total_processed: expirationResult.expired_count + notificationResult.notified_count,
        total_errors: expirationResult.errors.length + notificationResult.errors.length,
        job_duration_ms: Date.now() - new Date().getTime()
      }
    };

    // Log the results
    if (expirationResult.expired_count > 0) {
      logger.info(`Cron job expired ${expirationResult.expired_count} trials`);
    }
    
    if (notificationResult.notified_count > 0) {
      logger.info(`Cron job sent notifications for ${notificationResult.notified_count} expiring trials`);
    }

    if (expirationResult.errors.length > 0 || notificationResult.errors.length > 0) {
      logger.warn(`Cron job completed with ${expirationResult.errors.length + notificationResult.errors.length} errors`);
    }

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Cron job error in expire-trials:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/expire-trials - Get information about the cron job
 * 
 * This endpoint provides information about what the cron job would do
 * without actually running it.
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      const providedSecret = authHeader?.replace('Bearer ', '');
      
      if (!providedSecret || providedSecret !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Get current trial statistics
    const stats = await TrialExpirationService.getTrialStats();

    // Get trials expiring soon
    const expiringSoon = await TrialExpirationService.getTrialsExpiringSoon(3);

    return NextResponse.json({
      cron_job_info: {
        name: 'expire-trials',
        description: 'Automatically expire overdue trials and notify expiring trials',
        recommended_schedule: '0 */6 * * *', // Every 6 hours
        last_check: new Date().toISOString()
      },
      current_stats: stats,
      trials_expiring_soon: {
        count: expiringSoon.length,
        trials: expiringSoon.map(trial => ({
          id: trial.id,
          client_id: trial.client_id,
          plan_type: trial.plan_type,
          trial_ends_at: trial.trial_ends_at,
          days_remaining: Math.ceil(
            (new Date(trial.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
        }))
      },
      next_actions: {
        would_expire: 0, // This would require a database query to get exact count
        would_notify: expiringSoon.length
      }
    });

  } catch (error) {
    logger.error('Error getting cron job info:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
