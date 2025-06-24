import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { ImpersonationService } from '@/lib/impersonation/impersonation-service';
import { ImpersonationRequest, ImpersonationPermission, ImpersonationReason } from '@/types/client-impersonation';

// POST /api/admin/impersonation/start - Start client impersonation session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.CLIENT_IMPERSONATION, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { client_id, user_id, reason, duration_minutes, permissions, require_approval } = body;

    // Validate required fields
    if (!client_id || !user_id || !reason) {
      return NextResponse.json(
        { error: 'client_id, user_id, and reason are required' },
        { status: 400 }
      );
    }

    // Validate permissions array
    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json(
        { error: 'At least one permission is required' },
        { status: 400 }
      );
    }

    // Validate permission values
    const validPermissions = Object.values(ImpersonationPermission);
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
    if (invalidPermissions.length > 0) {
      return NextResponse.json(
        { error: `Invalid permissions: ${invalidPermissions.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate duration
    if (duration_minutes && (duration_minutes < 1 || duration_minutes > 480)) {
      return NextResponse.json(
        { error: 'Duration must be between 1 and 480 minutes (8 hours)' },
        { status: 400 }
      );
    }

    // Create impersonation request
    const impersonationRequest: ImpersonationRequest = {
      client_id,
      user_id,
      reason,
      duration_minutes: duration_minutes || 60,
      permissions,
      require_approval: require_approval || false
    };

    // Extract request information
    const getClientIP = (req: Request): string => {
      const forwarded = req.headers.get('x-forwarded-for');
      const realIP = req.headers.get('x-real-ip');
      
      if (forwarded) return forwarded.split(',')[0].trim();
      if (realIP) return realIP;
      return 'unknown';
    };

    const requestInfo = {
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || undefined
    };

    // Start impersonation session
    const impersonationResponse = await ImpersonationService.startImpersonation(
      authResult.user.id,
      authResult.user.email || '',
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      impersonationRequest,
      requestInfo
    );

    return NextResponse.json({
      message: 'Impersonation session started successfully',
      impersonation: impersonationResponse,
      instructions: [
        'Use the provided access_token to authenticate as the impersonated user',
        'Navigate to the dashboard_url to access the client dashboard',
        'Session will automatically expire at the specified time',
        'Use the end impersonation endpoint to terminate the session early'
      ]
    });

  } catch (error) {
    console.error('Error starting impersonation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start impersonation' },
      { status: 500 }
    );
  }
}

// GET /api/admin/impersonation/start - Get impersonation requirements and validation
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.CLIENT_IMPERSONATION, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const userId = searchParams.get('user_id');

    // Get available permissions
    const availablePermissions = Object.values(ImpersonationPermission).map(permission => ({
      value: permission,
      label: permission.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '),
      description: getPermissionDescription(permission)
    }));

    // Get predefined reasons
    const availableReasons = Object.values(ImpersonationReason).map(reason => ({
      value: reason,
      label: reason.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    }));

    // Get current active sessions for this admin
    const activeSessions = await ImpersonationService.getImpersonationHistory(
      { admin_id: authResult.user.id, status: ['active'] },
      1,
      10
    );

    const response: any = {
      requirements: {
        max_duration_minutes: 480,
        default_duration_minutes: 60,
        max_concurrent_sessions: 3,
        required_fields: ['client_id', 'user_id', 'reason', 'permissions']
      },
      available_permissions: availablePermissions,
      available_reasons: availableReasons,
      current_sessions: {
        active_count: activeSessions.summary.active_sessions,
        sessions: activeSessions.sessions
      },
      admin_info: {
        id: authResult.user.id,
        email: authResult.user.email,
        name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        role: authResult.adminProfile?.role
      }
    };

    // If specific client/user requested, validate them
    if (clientId && userId) {
      // Mock validation - in real implementation, would check actual client/user data
      response.validation = {
        client_id: clientId,
        user_id: userId,
        client_status: 'active',
        user_status: 'active',
        can_impersonate: true,
        warnings: []
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting impersonation requirements:', error);
    return NextResponse.json(
      { error: 'Failed to get impersonation requirements' },
      { status: 500 }
    );
  }
}

function getPermissionDescription(permission: ImpersonationPermission): string {
  const descriptions = {
    [ImpersonationPermission.VIEW_PROJECTS]: 'View client projects and project details',
    [ImpersonationPermission.VIEW_TEAMS]: 'View client teams and team members',
    [ImpersonationPermission.VIEW_TASKS]: 'View tasks and task details',
    [ImpersonationPermission.VIEW_CHAT]: 'View chat messages and conversations',
    [ImpersonationPermission.VIEW_FILES]: 'View uploaded files and attachments',
    [ImpersonationPermission.VIEW_SETTINGS]: 'View client settings and configuration',
    [ImpersonationPermission.MODIFY_PROJECTS]: 'Create, edit, and delete projects',
    [ImpersonationPermission.MODIFY_TEAMS]: 'Manage team members and team settings',
    [ImpersonationPermission.MODIFY_TASKS]: 'Create, edit, and delete tasks',
    [ImpersonationPermission.MODIFY_SETTINGS]: 'Modify client settings and configuration',
    [ImpersonationPermission.FULL_ACCESS]: 'Complete access to all client features (use with extreme caution)'
  };

  return descriptions[permission] || 'Permission description not available';
}
