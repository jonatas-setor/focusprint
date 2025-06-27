import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { logApiError } from '@/lib/logger';

/**
 * POST /api/admin/licenses/[id]/convert - Convert trial license to active subscription
 * 
 * This endpoint converts a trial license to an active subscription.
 * It removes the trial_ends_at date and sets status to 'active'.
 * 
 * Body parameters:
 * - stripe_subscription_id (optional): Stripe subscription ID if payment was processed
 * - reason (optional): Reason for conversion for audit purposes
 * 
 * Returns:
 * - 200: License converted successfully
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
    const { stripe_subscription_id, reason } = body;

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

    // Validate that license is in trial status
    if (currentLicense.status !== 'trial') {
      return NextResponse.json({ 
        error: 'License is not in trial status',
        current_status: currentLicense.status
      }, { status: 400 });
    }

    // Update metadata to track conversion
    const updatedMetadata = {
      ...currentLicense.metadata,
      trial_converted_at: new Date().toISOString(),
      trial_converted_by: authResult.user.email,
      trial_conversion_reason: reason || 'Trial converted to active subscription',
      original_trial_end: currentLicense.trial_ends_at
    };

    // Prepare update data
    const updateData: any = {
      status: 'active',
      trial_ends_at: null,
      metadata: updatedMetadata,
      updated_at: new Date().toISOString()
    };

    // Add Stripe subscription ID if provided
    if (stripe_subscription_id) {
      updateData.stripe_subscription_id = stripe_subscription_id;
    }

    // Set current period dates for active subscription
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    updateData.current_period_start = now.toISOString();
    updateData.current_period_end = nextMonth.toISOString();

    // Update license to active status
    const { data: license, error } = await supabase
      .schema('platform_admin')
      .from('licenses')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error converting trial to active:', error);
      return NextResponse.json({ error: 'Failed to convert trial to active' }, { status: 500 });
    }

    // Log successful conversion
    console.log(`Trial license ${params.id} converted to active by admin ${authResult.user.email}`);

    return NextResponse.json({ 
      message: 'Trial converted to active subscription successfully',
      license,
      conversion_details: {
        converted_at: updateData.updated_at,
        converted_by: authResult.user.email,
        original_trial_end: currentLicense.trial_ends_at,
        new_period_start: updateData.current_period_start,
        new_period_end: updateData.current_period_end
      }
    });

  } catch (error) {
    console.error('Convert Trial API Error:', error);
    
    // Log the error for monitoring
    logApiError('POST', `/api/admin/licenses/${params.id}/convert`, error instanceof Error ? error : new Error('Unknown error'), undefined, authResult?.user?.id);
    
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
