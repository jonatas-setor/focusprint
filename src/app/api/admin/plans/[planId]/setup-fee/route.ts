import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { logger, logApiError } from '@/lib/logger';
import { SetupFeeService } from '@/lib/plans/setup-fee-service';

// GET /api/admin/plans/[planId]/setup-fee - Get setup fee calculation for a plan
export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  let authResult: any;

  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { planId } = params;

    // Calculate setup fee for the plan
    const setupFeeCalculation = await SetupFeeService.calculateSetupFee(planId);

    if (!setupFeeCalculation) {
      return NextResponse.json(
        { error: 'Plan not found or setup fee calculation failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: setupFeeCalculation,
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`.trim(),
        accessed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logApiError('GET', `/api/admin/plans/${params.planId}/setup-fee`, error instanceof Error ? error : new Error('Unknown error'), undefined, authResult?.user?.id);

    if (error instanceof Error) {
      // Database connection errors
      if (error.message.includes('connection')) {
        return NextResponse.json(
          { error: 'Database connection failed', details: 'Unable to connect to database' },
          { status: 503 }
        );
      }

      // Permission errors
      if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        return NextResponse.json(
          { error: 'Insufficient permissions', details: 'You do not have permission to view setup fee details' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to calculate setup fee',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/plans/[planId]/setup-fee - Record setup fee payment
export async function POST(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  let authResult: any;

  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { planId } = params;
    const body = await request.json();

    const { clientId, setupFeeAmount, currency, stripePaymentIntentId } = body;

    // Validate required fields
    if (!clientId || !setupFeeAmount || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, setupFeeAmount, currency' },
        { status: 400 }
      );
    }

    // Record setup fee payment
    const setupFeeHistoryId = await SetupFeeService.recordSetupFeePayment(
      clientId,
      planId,
      setupFeeAmount,
      currency,
      stripePaymentIntentId
    );

    if (!setupFeeHistoryId) {
      return NextResponse.json(
        { error: 'Failed to record setup fee payment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        setupFeeHistoryId,
        planId,
        clientId,
        setupFeeAmount,
        currency,
        stripePaymentIntentId
      },
      recorded_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`.trim(),
        recorded_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logApiError('POST', `/api/admin/plans/${params.planId}/setup-fee`, error instanceof Error ? error : new Error('Unknown error'), undefined, authResult?.user?.id);

    return NextResponse.json(
      {
        error: 'Failed to record setup fee payment',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// PUT /api/admin/plans/[planId]/setup-fee - Update setup fee payment status
export async function PUT(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  let authResult: any;

  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { setupFeeHistoryId, status, stripePaymentIntentId } = body;

    // Validate required fields
    if (!setupFeeHistoryId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: setupFeeHistoryId, status' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    // Update setup fee payment status
    const success = await SetupFeeService.updateSetupFeeStatus(
      setupFeeHistoryId,
      status,
      stripePaymentIntentId
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update setup fee payment status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        setupFeeHistoryId,
        status,
        stripePaymentIntentId
      },
      updated_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`.trim(),
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logApiError('PUT', `/api/admin/plans/${params.planId}/setup-fee`, error instanceof Error ? error : new Error('Unknown error'), undefined, authResult?.user?.id);

    return NextResponse.json(
      {
        error: 'Failed to update setup fee payment status',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
