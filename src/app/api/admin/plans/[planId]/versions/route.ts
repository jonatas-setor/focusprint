import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { PlanVersionService } from '@/lib/plans/version-service';
import { logger, logApiError } from '@/lib/logger';

// GET /api/admin/plans/[planId]/versions - Get all versions of a plan
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

    // Get version history
    const versionHistory = await PlanVersionService.getVersionHistory(planId);

    return NextResponse.json({
      plan_id: planId,
      ...versionHistory,
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    logApiError('GET', `/api/admin/plans/${params.planId}/versions`, error instanceof Error ? error : new Error('Unknown error'));
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch plan versions',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/plans/[planId]/versions/rollback - Rollback to specific version
export async function POST(
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
    const { target_version, reason } = body;

    // Validate input
    if (!target_version || typeof target_version !== 'number') {
      return NextResponse.json(
        { error: 'target_version is required and must be a number' },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json(
        { error: 'reason is required for rollback' },
        { status: 400 }
      );
    }

    // Perform rollback
    await PlanVersionService.rollbackToVersion(
      planId,
      target_version,
      reason,
      authResult.user.id
    );

    // Get updated version history
    const versionHistory = await PlanVersionService.getVersionHistory(planId);

    return NextResponse.json({
      message: 'Plan rolled back successfully',
      plan_id: planId,
      target_version,
      reason,
      current_version: versionHistory.current_version,
      rolled_back_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        rolled_back_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logApiError('POST', `/api/admin/plans/${params.planId}/versions`, error instanceof Error ? error : new Error('Unknown error'));
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Plan or version not found' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to rollback plan version',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
