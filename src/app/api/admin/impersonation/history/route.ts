import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { ImpersonationService } from '@/lib/impersonation/impersonation-service';
import { ImpersonationFilters } from '@/types/client-impersonation';

// GET /api/admin/impersonation/history - Get impersonation history with filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.AUDIT_ACCESS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 per page

    // Parse filter parameters
    const filters: ImpersonationFilters = {};

    if (searchParams.get('admin_id')) {
      filters.admin_id = searchParams.get('admin_id')!;
    }

    if (searchParams.get('client_id')) {
      filters.client_id = searchParams.get('client_id')!;
    }

    if (searchParams.get('user_id')) {
      filters.user_id = searchParams.get('user_id')!;
    }

    if (searchParams.get('status')) {
      const statuses = searchParams.get('status')!.split(',');
      filters.status = statuses.filter(status => 
        ['active', 'expired', 'terminated'].includes(status)
      ) as ('active' | 'expired' | 'terminated')[];
    }

    if (searchParams.get('date_from')) {
      filters.date_from = searchParams.get('date_from')!;
    }

    if (searchParams.get('date_to')) {
      filters.date_to = searchParams.get('date_to')!;
    }

    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')!;
    }

    // Get impersonation history
    const history = await ImpersonationService.getImpersonationHistory(filters, page, limit);

    // Log the history access
    try {
      const { AuditService } = await import('@/lib/audit/audit-service');
      const { AuditAction, AuditSeverity } = await import('@/types/audit-log');
      
      await AuditService.logSecurity(
        AuditAction.DATA_EXPORTED,
        authResult.user.id,
        authResult.user.email || '',
        `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        `Accessed impersonation history with filters: ${JSON.stringify(filters)}`,
        AuditSeverity.LOW,
        request,
        'success'
      );
    } catch (auditError) {
      console.error('Failed to log history access:', auditError);
    }

    return NextResponse.json({
      history,
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching impersonation history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch impersonation history' },
      { status: 500 }
    );
  }
}

// POST /api/admin/impersonation/history - Export impersonation history
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions (higher permission for export)
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_SYSTEM, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { format, filters, include_sensitive_data } = body;

    // Validate format
    if (!format || !['csv', 'json'].includes(format)) {
      return NextResponse.json(
        { error: 'Format must be either "csv" or "json"' },
        { status: 400 }
      );
    }

    // Get all matching history (no pagination for export)
    const history = await ImpersonationService.getImpersonationHistory(
      filters || {},
      1,
      10000 // Large limit for export
    );

    // Prepare export data
    let exportData;
    let contentType;
    let filename;

    if (format === 'csv') {
      // Convert to CSV format
      const headers = [
        'Session ID',
        'Admin Email',
        'Admin Name',
        'Client Name',
        'Client Email',
        'Impersonated User Email',
        'Impersonated User Name',
        'Reason',
        'Started At',
        'Ended At',
        'Status',
        'Duration (minutes)',
        'Permissions',
        'IP Address'
      ];

      const rows = history.sessions.map(session => [
        session.id,
        session.admin_email,
        session.admin_name,
        session.client_name,
        session.client_email,
        session.impersonated_user_email,
        session.impersonated_user_name,
        session.reason,
        session.started_at,
        session.ended_at || '',
        session.status,
        session.metadata?.duration_minutes || '',
        session.permissions.join(';'),
        include_sensitive_data ? (session.ip_address || '') : '[REDACTED]'
      ]);

      exportData = [headers, ...rows].map(row => row.join(',')).join('\n');
      contentType = 'text/csv';
      filename = `impersonation-history-${new Date().toISOString().split('T')[0]}.csv`;

    } else {
      // JSON format
      exportData = JSON.stringify({
        export_info: {
          generated_at: new Date().toISOString(),
          generated_by: authResult.user.email,
          total_sessions: history.sessions.length,
          filters_applied: filters || {},
          include_sensitive_data: include_sensitive_data || false
        },
        sessions: include_sensitive_data ? 
          history.sessions : 
          history.sessions.map(session => ({
            ...session,
            ip_address: '[REDACTED]',
            user_agent: '[REDACTED]'
          })),
        summary: history.summary
      }, null, 2);
      contentType = 'application/json';
      filename = `impersonation-history-${new Date().toISOString().split('T')[0]}.json`;
    }

    // Log the export
    try {
      const { AuditService } = await import('@/lib/audit/audit-service');
      const { AuditAction, AuditSeverity } = await import('@/types/audit-log');
      
      await AuditService.logSecurity(
        AuditAction.DATA_EXPORTED,
        authResult.user.id,
        authResult.user.email || '',
        `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        `Exported impersonation history (${format.toUpperCase()}, ${history.sessions.length} sessions, sensitive_data: ${include_sensitive_data})`,
        AuditSeverity.HIGH,
        request,
        'success'
      );
    } catch (auditError) {
      console.error('Failed to log export:', auditError);
    }

    return new NextResponse(exportData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Error exporting impersonation history:', error);
    return NextResponse.json(
      { error: 'Failed to export impersonation history' },
      { status: 500 }
    );
  }
}
