import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { BulkOperationsService } from '@/lib/bulk/bulk-operations-service';

// GET /api/admin/bulk-operations/[operationId] - Get a specific bulk operation
export async function GET(
  request: NextRequest,
  { params }: { params: { operationId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.SYSTEM_CONFIG, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { operationId } = params;

    // Get bulk operation
    const operation = await BulkOperationsService.getBulkOperation(operationId);
    
    if (!operation) {
      return NextResponse.json(
        { error: 'Bulk operation not found' },
        { status: 404 }
      );
    }

    // Calculate additional information
    const now = new Date();
    const isRunning = operation.status === 'running';
    const estimatedTimeRemaining = isRunning && operation.progress.estimated_time_remaining_seconds ? 
      operation.progress.estimated_time_remaining_seconds : null;

    // Calculate actual duration if completed
    let actualDurationSeconds = null;
    if (operation.started_at && operation.completed_at) {
      const start = new Date(operation.started_at).getTime();
      const end = new Date(operation.completed_at).getTime();
      actualDurationSeconds = Math.round((end - start) / 1000);
    }

    return NextResponse.json({
      operation,
      runtime_info: {
        is_running: isRunning,
        estimated_time_remaining_seconds: estimatedTimeRemaining,
        actual_duration_seconds: actualDurationSeconds,
        can_be_cancelled: ['pending', 'running'].includes(operation.status)
      },
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching bulk operation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bulk operation' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/bulk-operations/[operationId] - Cancel a bulk operation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { operationId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.SYSTEM_CONFIG, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { operationId } = params;
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || 'Bulk operation cancelled by admin';

    // Cancel bulk operation
    const result = await BulkOperationsService.cancelBulkOperation(
      operationId,
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      reason
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: result.message,
      operation_id: operationId,
      cancelled_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        cancelled_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error cancelling bulk operation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel bulk operation' },
      { status: 500 }
    );
  }
}
