import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { AuditService } from '@/lib/audit/audit-service';
import { AuditAction, AuditSeverity } from '@/types/audit-log';

// GET /api/admin/audit/statistics - Get audit log statistics and metrics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.AUDIT_ACCESS);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get audit statistics
    const statistics = await AuditService.getStatistics();

    // Log the statistics access
    await AuditService.logSecurity(
      AuditAction.DATA_EXPORTED,
      authResult.user.id,
      authResult.user.email || '',
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      'Accessed audit log statistics',
      AuditSeverity.LOW,
      request,
      'success'
    );

    return NextResponse.json({
      statistics,
      generated_at: new Date().toISOString(),
      generated_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`
      }
    });

  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit statistics' },
      { status: 500 }
    );
  }
}

// POST /api/admin/audit/statistics/clear - Clear audit logs (for testing/maintenance)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions (super admin only)
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_SYSTEM);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { confirm } = body;

    if (confirm !== 'CLEAR_ALL_AUDIT_LOGS') {
      return NextResponse.json(
        { error: 'Invalid confirmation. Use "CLEAR_ALL_AUDIT_LOGS" to confirm.' },
        { status: 400 }
      );
    }

    // Log the clear action before clearing
    await AuditService.logSecurity(
      AuditAction.SYSTEM_CONFIG_CHANGED,
      authResult.user.id,
      authResult.user.email || '',
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      'All audit logs were cleared by system administrator',
      AuditSeverity.CRITICAL,
      request,
      'success'
    );

    // Clear audit logs
    AuditService.clearLogs();

    return NextResponse.json({
      message: 'All audit logs have been cleared',
      cleared_at: new Date().toISOString(),
      cleared_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`
      }
    });

  } catch (error) {
    console.error('Error clearing audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to clear audit logs' },
      { status: 500 }
    );
  }
}
