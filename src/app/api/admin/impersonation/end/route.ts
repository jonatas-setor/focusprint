import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { ImpersonationService } from '@/lib/impersonation/impersonation-service';

// POST /api/admin/impersonation/end - End client impersonation session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.CLIENT_IMPERSONATION, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { session_id, reason } = body;

    // Validate required fields
    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      );
    }

    // End impersonation session
    const result = await ImpersonationService.endImpersonation(
      session_id,
      authResult.user.id,
      reason || 'Manual termination by admin'
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: result.message,
      session_id,
      ended_at: new Date().toISOString(),
      ended_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`
      }
    });

  } catch (error) {
    console.error('Error ending impersonation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to end impersonation' },
      { status: 500 }
    );
  }
}

// GET /api/admin/impersonation/end - Get active sessions that can be ended
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.CLIENT_IMPERSONATION, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get active sessions for this admin
    const activeSessions = await ImpersonationService.getImpersonationHistory(
      { admin_id: authResult.user.id, status: ['active'] },
      1,
      50
    );

    // Clean up expired sessions
    const cleanedCount = await ImpersonationService.cleanupExpiredSessions();

    return NextResponse.json({
      active_sessions: activeSessions.sessions,
      summary: {
        total_active: activeSessions.summary.active_sessions,
        expired_cleaned: cleanedCount,
        admin_id: authResult.user.id,
        admin_email: authResult.user.email
      },
      instructions: [
        'Use POST /api/admin/impersonation/end with session_id to terminate a session',
        'Sessions will automatically expire at their scheduled time',
        'Provide a reason for termination for audit purposes'
      ]
    });

  } catch (error) {
    console.error('Error getting active sessions:', error);
    return NextResponse.json(
      { error: 'Failed to get active sessions' },
      { status: 500 }
    );
  }
}
