import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { ImpersonationService } from '@/lib/impersonation/impersonation-service';

// GET /api/admin/impersonation/status - Get impersonation status by token or session ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const sessionId = searchParams.get('session_id');
    const adminCheck = searchParams.get('admin_check') === 'true';

    // If admin_check is true, verify admin authentication
    if (adminCheck) {
      const supabase = await createClient();
      const authResult = await checkAdminAuth(supabase, AdminPermission.CLIENT_IMPERSONATION, request);
      if (authResult.error) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
      }
    }

    if (!token && !sessionId) {
      return NextResponse.json(
        { error: 'Either token or session_id is required' },
        { status: 400 }
      );
    }

    let status = null;

    if (token) {
      // Get status by token
      status = await ImpersonationService.getImpersonationStatus(token);
    } else if (sessionId) {
      // Get status by session ID (would need to implement this method)
      // For now, return a simple response
      return NextResponse.json(
        { error: 'Status by session_id not yet implemented' },
        { status: 501 }
      );
    }

    if (!status) {
      return NextResponse.json({
        is_impersonating: false,
        message: 'No active impersonation session found'
      });
    }

    return NextResponse.json({
      is_impersonating: status.is_impersonating,
      status,
      server_time: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting impersonation status:', error);
    return NextResponse.json(
      { error: 'Failed to get impersonation status' },
      { status: 500 }
    );
  }
}

// POST /api/admin/impersonation/status - Validate impersonation token and extend session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, action } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const status = await ImpersonationService.getImpersonationStatus(token);
    
    if (!status) {
      return NextResponse.json(
        { error: 'Invalid or expired impersonation token' },
        { status: 401 }
      );
    }

    // Handle different actions
    switch (action) {
      case 'validate':
        return NextResponse.json({
          valid: true,
          status,
          message: 'Token is valid and session is active'
        });

      case 'extend':
        // For now, return not implemented
        return NextResponse.json(
          { error: 'Session extension not yet implemented' },
          { status: 501 }
        );

      case 'heartbeat':
        // Update last activity (would implement in real system)
        return NextResponse.json({
          valid: true,
          status,
          heartbeat_recorded: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: validate, extend, heartbeat' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error processing impersonation status request:', error);
    return NextResponse.json(
      { error: 'Failed to process status request' },
      { status: 500 }
    );
  }
}
