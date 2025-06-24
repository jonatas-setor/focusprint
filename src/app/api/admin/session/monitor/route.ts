import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { SessionTimeoutService } from '@/lib/auth/session-timeout';

/**
 * GET /api/admin/session/monitor - Monitor all active admin sessions
 * Returns information about all active admin sessions for monitoring
 * Requires SUPER_ADMIN or TECHNICAL_ADMIN permissions
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_SYSTEM_METRICS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get all active sessions
    const activeSessions = SessionTimeoutService.getActiveSessions();
    
    // Calculate session statistics
    const now = Date.now();
    const sessionStats = {
      totalActiveSessions: activeSessions.length,
      expiringSoon: activeSessions.filter(s => 
        (s.expiresAt - now) <= 5 * 60 * 1000 // 5 minutes
      ).length,
      averageTimeRemaining: activeSessions.length > 0 
        ? Math.round(activeSessions.reduce((sum, s) => sum + (s.expiresAt - now), 0) / activeSessions.length / 1000 / 60)
        : 0,
      oldestSession: activeSessions.length > 0
        ? Math.min(...activeSessions.map(s => s.lastActivity))
        : null,
      newestSession: activeSessions.length > 0
        ? Math.max(...activeSessions.map(s => s.lastActivity))
        : null
    };

    // Format session details
    const sessionDetails = activeSessions.map(session => {
      const timeRemaining = session.expiresAt - now;
      const minutesRemaining = Math.floor(timeRemaining / (1000 * 60));
      const isExpiringSoon = timeRemaining <= 5 * 60 * 1000;
      const isCritical = timeRemaining <= 2 * 60 * 1000;

      return {
        userId: session.userId,
        email: session.email,
        lastActivity: new Date(session.lastActivity).toISOString(),
        expiresAt: new Date(session.expiresAt).toISOString(),
        timeRemaining: {
          milliseconds: timeRemaining,
          minutes: minutesRemaining,
          formatted: `${minutesRemaining}:${Math.floor((timeRemaining % (1000 * 60)) / 1000).toString().padStart(2, '0')}`
        },
        status: {
          isActive: session.isActive,
          isExpiringSoon,
          isCritical
        },
        sessionAge: {
          milliseconds: now - session.lastActivity,
          minutes: Math.floor((now - session.lastActivity) / (1000 * 60))
        }
      };
    }).sort((a, b) => a.timeRemaining.milliseconds - b.timeRemaining.milliseconds);

    // Clean up expired sessions
    const cleanedCount = SessionTimeoutService.cleanupExpiredSessions();

    return NextResponse.json({
      statistics: sessionStats,
      sessions: sessionDetails,
      config: SessionTimeoutService.getConfig(),
      maintenance: {
        cleanedExpiredSessions: cleanedCount,
        lastCleanup: new Date().toISOString()
      },
      monitoredBy: {
        adminId: authResult.user.id,
        adminEmail: authResult.user.email,
        adminName: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        accessTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Session Monitor API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/session/monitor - Force logout specific session
 * Allows super admins to force logout specific sessions
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions (requires higher privileges)
    const authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_SYSTEM_CONFIG, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Parse request body
    const body = await request.json();
    const { userId, reason } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get session info before invalidating
    const session = SessionTimeoutService.getSession(userId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Invalidate the session
    SessionTimeoutService.invalidateSession(userId);

    // Log the forced logout
    console.log(`🕐 Forced session logout by ${authResult.user.email}: ${session.email} (${userId})`);
    console.log(`🕐 Reason: ${reason || 'No reason provided'}`);

    return NextResponse.json({
      message: 'Session invalidated successfully',
      invalidatedSession: {
        userId: session.userId,
        email: session.email,
        wasActive: session.isActive,
        invalidatedAt: new Date().toISOString(),
        invalidatedBy: authResult.user.email,
        reason: reason || 'Forced logout by admin'
      }
    });

  } catch (error) {
    console.error('Session Force Logout API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
