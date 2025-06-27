import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { PlanVersionService } from '@/lib/plans/version-service';
import { logger, logApiError } from '@/lib/logger';

// GET /api/admin/plans/[planId]/versions/[versionId]/compare?with=<version_number>
export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string; versionId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_LICENSES, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { planId, versionId } = params;
    const { searchParams } = new URL(request.url);
    const compareWithVersion = searchParams.get('with');

    // Validate input
    const baseVersion = parseInt(versionId);
    if (isNaN(baseVersion)) {
      return NextResponse.json(
        { error: 'Invalid version ID' },
        { status: 400 }
      );
    }

    if (!compareWithVersion) {
      return NextResponse.json(
        { error: 'with parameter is required for comparison' },
        { status: 400 }
      );
    }

    const compareVersion = parseInt(compareWithVersion);
    if (isNaN(compareVersion)) {
      return NextResponse.json(
        { error: 'Invalid comparison version' },
        { status: 400 }
      );
    }

    // Get both versions
    const [baseVersionData, compareVersionData] = await Promise.all([
      PlanVersionService.getVersion(planId, baseVersion),
      PlanVersionService.getVersion(planId, compareVersion)
    ]);

    if (!baseVersionData) {
      return NextResponse.json(
        { error: `Version ${baseVersion} not found` },
        { status: 404 }
      );
    }

    if (!compareVersionData) {
      return NextResponse.json(
        { error: `Version ${compareVersion} not found` },
        { status: 404 }
      );
    }

    // Compare versions
    const differences = PlanVersionService.compareVersions(compareVersionData, baseVersionData);

    return NextResponse.json({
      plan_id: planId,
      comparison: {
        base_version: {
          version: baseVersion,
          created_at: baseVersionData.created_at,
          changes_summary: baseVersionData.changes_summary
        },
        compare_version: {
          version: compareVersion,
          created_at: compareVersionData.created_at,
          changes_summary: compareVersionData.changes_summary
        },
        differences,
        total_changes: differences.length
      },
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    logApiError('GET', `/api/admin/plans/${params.planId}/versions/${params.versionId}/compare`, error instanceof Error ? error : new Error('Unknown error'));
    
    return NextResponse.json(
      { 
        error: 'Failed to compare plan versions',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
