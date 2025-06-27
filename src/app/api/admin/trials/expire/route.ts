import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { TrialExpirationService } from '@/lib/trials/expiration-service';
import { logApiError } from '@/lib/logger';

/**
 * POST /api/admin/trials/expire - Expire overdue trials
 * 
 * This endpoint runs the trial expiration service to automatically expire
 * all trials that have reached their end date.
 * 
 * Body parameters:
 * - dry_run (optional): If true, only returns what would be expired without making changes
 * 
 * Returns:
 * - 200: Expiration process completed
 * - 403: Insufficient permissions
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  let authResult: any = null;
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_LICENSES, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json().catch(() => ({}));
    const { dry_run = false } = body;

    if (dry_run) {
      // Get trials that would be expired without actually expiring them
      const now = new Date();
      const { data: expiredTrials, error: fetchError } = await supabase
        .schema('platform_admin')
        .from('licenses')
        .select('id, client_id, plan_type, trial_ends_at, created_at')
        .eq('status', 'trial')
        .not('trial_ends_at', 'is', null)
        .lt('trial_ends_at', now.toISOString());

      if (fetchError) {
        console.error('Error fetching expired trials for dry run:', fetchError);
        return NextResponse.json({ error: 'Failed to fetch expired trials' }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Dry run completed',
        dry_run: true,
        would_expire_count: expiredTrials?.length || 0,
        would_expire_licenses: expiredTrials?.map(t => ({
          id: t.id,
          client_id: t.client_id,
          plan_type: t.plan_type,
          trial_ends_at: t.trial_ends_at,
          days_overdue: Math.ceil((now.getTime() - new Date(t.trial_ends_at).getTime()) / (1000 * 60 * 60 * 24))
        })) || [],
        performed_by: {
          admin_id: authResult.user.id,
          admin_email: authResult.user.email,
          performed_at: new Date().toISOString()
        }
      });
    }

    // Run the actual expiration process
    const result = await TrialExpirationService.expireOverdueTrials();

    // Get updated trial statistics
    const stats = await TrialExpirationService.getTrialStats();

    return NextResponse.json({
      message: `Trial expiration completed: ${result.expired_count} trials expired`,
      expiration_result: result,
      updated_stats: stats,
      performed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        performed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Expire Trials API Error:', error);
    
    // Log the error for monitoring
    logApiError('POST', '/api/admin/trials/expire', error instanceof Error ? error : new Error('Unknown error'), undefined, authResult?.user?.id);
    
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

/**
 * GET /api/admin/trials/expire - Get trials that would be expired
 * 
 * This endpoint returns information about trials that are overdue for expiration
 * without actually expiring them.
 */
export async function GET(request: NextRequest) {
  let authResult: any = null;
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_LICENSES, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get trials that are overdue for expiration
    const now = new Date();
    const { data: expiredTrials, error: fetchError } = await supabase
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
      .lt('trial_ends_at', now.toISOString())
      .order('trial_ends_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching overdue trials:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch overdue trials' }, { status: 500 });
    }

    // Get client information for the overdue trials
    const clientIds = expiredTrials?.map(t => t.client_id).filter(Boolean) || [];
    let clientsData: any[] = [];
    
    if (clientIds.length > 0) {
      const { data: clients, error: clientsError } = await supabase
        .schema('platform_admin')
        .from('clients')
        .select('id, name, email')
        .in('id', clientIds);

      if (!clientsError) {
        clientsData = clients || [];
      }
    }

    // Process the overdue trials with client information
    const processedTrials = expiredTrials?.map(trial => {
      const client = clientsData.find(c => c.id === trial.client_id);
      const daysOverdue = Math.ceil(
        (now.getTime() - new Date(trial.trial_ends_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...trial,
        client_name: client?.name,
        client_email: client?.email,
        days_overdue: daysOverdue
      };
    }) || [];

    return NextResponse.json({
      overdue_trials: processedTrials,
      count: processedTrials.length,
      summary: {
        total_overdue: processedTrials.length,
        most_overdue_days: processedTrials.length > 0 ? Math.max(...processedTrials.map(t => t.days_overdue)) : 0,
        average_overdue_days: processedTrials.length > 0 
          ? Math.round(processedTrials.reduce((sum, t) => sum + t.days_overdue, 0) / processedTrials.length)
          : 0
      },
      checked_at: now.toISOString()
    });

  } catch (error) {
    console.error('Get Overdue Trials API Error:', error);
    
    // Log the error for monitoring
    logApiError('GET', '/api/admin/trials/expire', error instanceof Error ? error : new Error('Unknown error'), undefined, authResult?.user?.id);
    
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
