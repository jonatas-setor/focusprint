import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { updatePlanSchema } from '@/lib/validation/schemas';
import { logger, logApiError, logPlanOperation } from '@/lib/logger';
import { PlanVersionService } from '@/lib/plans/version-service';

// GET /api/admin/plans/[planId] - Get detailed plan information
export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_LICENSES, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { planId } = params;

    // Get plan from database
    const { data: plan, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error || !plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      plan,
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    logApiError('GET', `/api/admin/plans/${planId}`, error instanceof Error ? error : new Error('Unknown error'), undefined, authResult?.user?.id);

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
          { error: 'Insufficient permissions', details: 'You do not have permission to view this plan' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch plan details',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// PUT /api/admin/plans/[planId] - Update specific plan
export async function PUT(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { planId } = params;

    // Parse and validate request body
    const body = await request.json();

    // Validate with Zod schema
    const validationResult = updatePlanSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    // Get current plan data for versioning
    const { data: currentPlan, error: fetchError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (fetchError || !currentPlan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Update plan in database
    const { data: updatedPlan, error } = await supabase
      .from('plans')
      .update({
        ...validationResult.data,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update plan: ${error.message}`);
    }

    // Create version history entry
    try {
      const changesSummary = `Updated fields: ${Object.keys(validationResult.data).join(', ')}`;
      await PlanVersionService.createVersion(
        planId,
        updatedPlan,
        changesSummary,
        authResult.user.id
      );
    } catch (versionError) {
      // Log version error but don't fail the update
      logger.error('Failed to create plan version', versionError instanceof Error ? versionError : new Error('Unknown error'), 'PLAN_VERSION');
    }

    // Log successful plan update
    logPlanOperation('updated', planId, authResult.user.id, {
      planName: updatedPlan.name,
      updatedFields: Object.keys(validationResult.data)
    });

    return NextResponse.json({
      plan: updatedPlan,
      message: 'Plan updated successfully',
      updated_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to update plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/plans/[planId] - Deactivate plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { planId } = params;

    // Parse request body for reason
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    // Check if plan exists and get current status
    const { data: existingPlan, error: fetchError } = await supabase
      .from('plans')
      .select('id, name, is_active')
      .eq('id', planId)
      .single();

    if (fetchError || !existingPlan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    if (!existingPlan.is_active) {
      return NextResponse.json(
        { error: 'Plan is already inactive' },
        { status: 400 }
      );
    }

    // TODO: Check for active subscribers in licenses table
    // For now, we'll just deactivate the plan

    // Deactivate plan (soft delete)
    const { data: deactivatedPlan, error } = await supabase
      .from('plans')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to deactivate plan: ${error.message}`);
    }

    // Log successful plan deactivation
    logPlanOperation('deactivated', planId, authResult.user.id, {
      planName: deactivatedPlan.name,
      reason: reason || 'Plan deactivated via admin interface'
    });

    return NextResponse.json({
      message: 'Plan deactivated successfully',
      reason: reason || 'Plan deactivated via admin interface',
      plan: deactivatedPlan,
      deactivated_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        deactivated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to deactivate plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
