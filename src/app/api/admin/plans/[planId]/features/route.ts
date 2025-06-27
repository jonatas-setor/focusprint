import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { logger, logApiError, logPlanOperation } from '@/lib/logger';
import { z } from 'zod';

// Schema for feature configuration
const featureConfigSchema = z.object({
  features: z.record(z.boolean()),
  limits: z.object({
    max_users: z.number().int().min(1).optional(),
    max_projects: z.number().int().min(-1).optional(),
    storage_gb: z.number().min(0.1).optional(),
    api_calls_per_month: z.number().int().min(0).optional(),
    max_integrations: z.number().int().min(-1).optional()
  }).optional()
});

// PUT /api/admin/plans/[planId]/features - Update plan features and limits
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
    const body = await request.json();

    // Validate request body
    const validationResult = featureConfigSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { features, limits } = validationResult.data;

    // Get current plan
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

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (features) {
      updateData.features = { ...currentPlan.features, ...features };
    }

    if (limits) {
      updateData.limits = { ...currentPlan.limits, ...limits };
    }

    // Update plan
    const { data: updatedPlan, error } = await supabase
      .from('plans')
      .update(updateData)
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update plan features: ${error.message}`);
    }

    // Log the update
    logPlanOperation('features_updated', planId, authResult.user.id, {
      planName: updatedPlan.name,
      updatedFeatures: features ? Object.keys(features) : [],
      updatedLimits: limits ? Object.keys(limits) : []
    });

    return NextResponse.json({
      plan: updatedPlan,
      message: 'Plan features and limits updated successfully',
      updated_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logApiError('PUT', `/api/admin/plans/${params.planId}/features`, error instanceof Error ? error : new Error('Unknown error'));
    
    return NextResponse.json(
      {
        error: 'Failed to update plan features',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
