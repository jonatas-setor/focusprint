import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { AuditService } from '@/lib/audit/audit-service';
import { AuditLogFilters, AuditAction, ResourceType, AuditSeverity } from '@/types/audit-log';

// GET /api/admin/audit/logs - Get audit logs with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.AUDIT_ACCESS);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 per page

    // Parse filter parameters
    const filters: AuditLogFilters = {};

    if (searchParams.get('admin_id')) {
      filters.admin_id = searchParams.get('admin_id')!;
    }

    if (searchParams.get('action')) {
      const actions = searchParams.get('action')!.split(',');
      filters.action = actions.filter(action => 
        Object.values(AuditAction).includes(action as AuditAction)
      ) as AuditAction[];
    }

    if (searchParams.get('resource_type')) {
      const resourceTypes = searchParams.get('resource_type')!.split(',');
      filters.resource_type = resourceTypes.filter(type => 
        Object.values(ResourceType).includes(type as ResourceType)
      ) as ResourceType[];
    }

    if (searchParams.get('severity')) {
      const severities = searchParams.get('severity')!.split(',');
      filters.severity = severities.filter(severity => 
        Object.values(AuditSeverity).includes(severity as AuditSeverity)
      ) as AuditSeverity[];
    }

    if (searchParams.get('status')) {
      const statuses = searchParams.get('status')!.split(',');
      filters.status = statuses.filter(status => 
        ['success', 'failure', 'warning'].includes(status)
      ) as ('success' | 'failure' | 'warning')[];
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

    if (searchParams.get('ip_address')) {
      filters.ip_address = searchParams.get('ip_address')!;
    }

    // Get audit logs
    const result = await AuditService.getLogs(filters, page, limit);

    // Log the audit access
    await AuditService.logSecurity(
      AuditAction.DATA_EXPORTED,
      authResult.user.id,
      authResult.user.email || '',
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      `Accessed audit logs with filters: ${JSON.stringify(filters)}`,
      AuditSeverity.LOW,
      request,
      'success'
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

// POST /api/admin/audit/logs - Create a manual audit log entry
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.AUDIT_ACCESS);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { action, resource_type, resource_id, resource_name, description, severity, metadata } = body;

    // Validate required fields
    if (!action || !resource_type || !description) {
      return NextResponse.json(
        { error: 'Action, resource_type, and description are required' },
        { status: 400 }
      );
    }

    // Validate enum values
    if (!Object.values(AuditAction).includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action value' },
        { status: 400 }
      );
    }

    if (!Object.values(ResourceType).includes(resource_type)) {
      return NextResponse.json(
        { error: 'Invalid resource_type value' },
        { status: 400 }
      );
    }

    if (severity && !Object.values(AuditSeverity).includes(severity)) {
      return NextResponse.json(
        { error: 'Invalid severity value' },
        { status: 400 }
      );
    }

    // Create audit log entry
    const auditLog = await AuditService.log({
      admin_id: authResult.user.id,
      admin_email: authResult.user.email || '',
      admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      action,
      resource_type,
      resource_id,
      resource_name,
      details: {
        description,
        context: {
          manual_entry: true,
          created_by: authResult.user.email
        }
      },
      severity: severity || AuditSeverity.MEDIUM,
      metadata
    }, request);

    return NextResponse.json({
      message: 'Audit log entry created successfully',
      audit_log: auditLog
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create audit log' },
      { status: 500 }
    );
  }
}
