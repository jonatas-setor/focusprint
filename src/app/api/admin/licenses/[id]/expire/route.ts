import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { logApiError } from '@/lib/logger';

/**
 * POST /api/admin/licenses/[id]/expire - Expire trial license
 * 
 * This endpoint expires a trial license, setting its status to 'expired'.
 * The trial_ends_at date is preserved for audit purposes.
 * 
 * Body parameters:
 * - reason (optional): Reason for expiration for audit purposes
 * - immediate (optional): Whether to expire immediately or set to trial end date
 * 
 * Returns:
 * - 200: License expired successfully
 * - 400: Invalid request or license not in trial
 * - 404: License not found
 * - 403: Insufficient permissions
 * - 500: Server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let authResult: any = null;
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_LICENSES, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json().catch(() => ({}));
    const { reason, immediate = true } = body;

    // Get current license
    const { data: currentLicense, error: fetchError } = await supabase
      .schema('platform_admin')
      .from('licenses')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'License not found' }, { status: 404 });
      }
      console.error('Error fetching license:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch license' }, { status: 500 });
    }

    // Validate that license has trial information
    if (!currentLicense.trial_ends_at) {
      return NextResponse.json({ 
        error: 'License does not have trial information',
        current_status: currentLicense.status
      }, { status: 400 });
    }

    // Check if trial is already expired naturally
    const trialEndDate = new Date(currentLicense.trial_ends_at);
    const now = new Date();
    const isNaturallyExpired = now > trialEndDate;

    // Update metadata to track expiration
    const updatedMetadata = {
      ...currentLicense.metadata,
      trial_expired_at: new Date().toISOString(),
      trial_expired_by: authResult.user.email,
      trial_expiration_reason: reason || (immediate ? 'Manually expired by admin' : 'Trial period ended'),
      trial_expiration_type: immediate ? 'manual' : 'automatic',
      was_naturally_expired: isNaturallyExpired,
      original_trial_end: currentLicense.trial_ends_at
    };

    // Prepare update data
    const updateData: any = {
      status: 'expired',
      metadata: updatedMetadata,
      updated_at: new Date().toISOString()
    };

    // If not immediate expiration, set trial_ends_at to now
    if (!immediate) {
      updateData.trial_ends_at = now.toISOString();
    }

    // Update license to expired status
    const { data: license, error } = await supabase
      .schema('platform_admin')
      .from('licenses')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error expiring trial:', error);
      return NextResponse.json({ error: 'Failed to expire trial' }, { status: 500 });
    }

    // Log successful expiration
    console.log(`Trial license ${params.id} expired by admin ${authResult.user.email}`);

    return NextResponse.json({ 
      message: 'Trial expired successfully',
      license,
      expiration_details: {
        expired_at: updateData.updated_at,
        expired_by: authResult.user.email,
        expiration_type: immediate ? 'manual' : 'automatic',
        original_trial_end: currentLicense.trial_ends_at,
        was_naturally_expired: isNaturallyExpired,
        reason: reason || (immediate ? 'Manually expired by admin' : 'Trial period ended')
      }
    });

  } catch (error) {
    console.error('Expire Trial API Error:', error);
    
    // Log the error for monitoring
    logApiError('POST', `/api/admin/licenses/${params.id}/expire`, error instanceof Error ? error : new Error('Unknown error'), undefined, authResult?.user?.id);
    
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
