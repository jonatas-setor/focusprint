import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { AdditionalUsersService } from '@/lib/billing/additional-users-service';
import { logApiError } from '@/lib/logger';

/**
 * GET /api/admin/billing/additional-users - Get all licenses with additional users billing
 * 
 * Returns billing information for all licenses that have users above their plan limits.
 * 
 * Query parameters:
 * - license_id (optional): Get billing for specific license
 * - stats_only (optional): Return only statistics
 * 
 * Returns:
 * - 200: Billing information retrieved successfully
 * - 403: Insufficient permissions
 * - 500: Server error
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

    const { searchParams } = new URL(request.url);
    const licenseId = searchParams.get('license_id');
    const statsOnly = searchParams.get('stats_only') === 'true';

    if (statsOnly) {
      // Return only statistics
      const stats = await AdditionalUsersService.getAdditionalUsersStats();
      return NextResponse.json({
        stats,
        retrieved_at: new Date().toISOString()
      });
    }

    if (licenseId) {
      // Return billing for specific license
      const billing = await AdditionalUsersService.calculateAdditionalUsersBilling(licenseId);
      
      if (!billing) {
        return NextResponse.json({ error: 'License not found or has no additional users billing' }, { status: 404 });
      }

      return NextResponse.json({
        billing,
        retrieved_at: new Date().toISOString()
      });
    }

    // Return all licenses with additional users billing
    const allBilling = await AdditionalUsersService.getAllLicensesWithAdditionalUsersBilling();
    const stats = await AdditionalUsersService.getAdditionalUsersStats();

    return NextResponse.json({
      billing: allBilling,
      stats,
      count: allBilling.length,
      retrieved_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Additional Users Billing API Error:', error);
    
    // Log the error for monitoring
    logApiError('GET', '/api/admin/billing/additional-users', error instanceof Error ? error : new Error('Unknown error'), undefined, authResult?.user?.id);
    
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
 * POST /api/admin/billing/additional-users - Update user count for a license
 * 
 * Updates the user count for a license and calculates the billing impact.
 * 
 * Body parameters:
 * - license_id (required): License ID to update
 * - user_count (optional): New user count (if not provided, syncs from client_profiles)
 * - sync_from_profiles (optional): Whether to sync from actual client_profiles data
 * 
 * Returns:
 * - 200: User count updated successfully
 * - 400: Invalid request parameters
 * - 403: Insufficient permissions
 * - 404: License not found
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

    const body = await request.json();
    const { license_id, user_count, sync_from_profiles = false } = body;

    // Validate required fields
    if (!license_id) {
      return NextResponse.json(
        { error: 'license_id is required' },
        { status: 400 }
      );
    }

    let updateResult;

    if (sync_from_profiles) {
      // Sync user count from actual client_profiles data
      updateResult = await AdditionalUsersService.syncUserCountFromProfiles(license_id);
    } else {
      // Update with provided user count
      if (user_count === undefined || user_count < 0) {
        return NextResponse.json(
          { error: 'user_count must be a non-negative number when not syncing from profiles' },
          { status: 400 }
        );
      }

      updateResult = await AdditionalUsersService.updateUserCount(license_id, user_count);
    }

    // Get updated billing information
    const updatedBilling = await AdditionalUsersService.calculateAdditionalUsersBilling(license_id);

    return NextResponse.json({
      message: 'User count updated successfully',
      update_result: updateResult,
      updated_billing: updatedBilling,
      updated_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Update User Count API Error:', error);
    
    // Log the error for monitoring
    logApiError('POST', '/api/admin/billing/additional-users', error instanceof Error ? error : new Error('Unknown error'), undefined, authResult?.user?.id);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'License not found' },
        { status: 404 }
      );
    }
    
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
 * PUT /api/admin/billing/additional-users - Sync all licenses user counts
 * 
 * Syncs user counts for all licenses from their actual client_profiles data.
 * This is useful for ensuring billing accuracy.
 * 
 * Body parameters:
 * - dry_run (optional): If true, only returns what would be updated without making changes
 * 
 * Returns:
 * - 200: Sync completed successfully
 * - 403: Insufficient permissions
 * - 500: Server error
 */
export async function PUT(request: NextRequest) {
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

    // Get all active licenses with client_id
    const { data: licenses, error } = await supabase
      .schema('platform_admin')
      .from('licenses')
      .select('id, client_id, current_users')
      .in('status', ['active', 'trial'])
      .not('client_id', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch licenses: ${error.message}`);
    }

    const syncResults = [];
    const errors = [];

    for (const license of licenses || []) {
      try {
        if (dry_run) {
          // Just calculate what would change without updating
          const { count: actualUserCount } = await supabase
            .from('client_profiles')
            .select('user_id', { count: 'exact' })
            .eq('client_id', license.client_id);

          syncResults.push({
            license_id: license.id,
            current_user_count: license.current_users || 0,
            actual_user_count: actualUserCount || 0,
            would_change: (actualUserCount || 0) !== (license.current_users || 0)
          });
        } else {
          // Actually sync the user count
          const updateResult = await AdditionalUsersService.syncUserCountFromProfiles(license.id);
          syncResults.push(updateResult);
        }
      } catch (error) {
        errors.push({
          license_id: license.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const summary = {
      total_licenses: licenses?.length || 0,
      successful_syncs: syncResults.length,
      errors_count: errors.length,
      total_cost_impact_cents: dry_run ? 0 : syncResults.reduce((sum, result) => 
        sum + (result.billing_impact?.cost_change_cents || 0), 0
      )
    };

    return NextResponse.json({
      message: dry_run ? 'Dry run completed' : 'User count sync completed',
      dry_run,
      summary,
      sync_results: syncResults,
      errors,
      performed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        performed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Sync User Counts API Error:', error);
    
    // Log the error for monitoring
    logApiError('PUT', '/api/admin/billing/additional-users', error instanceof Error ? error : new Error('Unknown error'), undefined, authResult?.user?.id);
    
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
