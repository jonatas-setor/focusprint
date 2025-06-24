import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { SessionTimeoutService } from '@/lib/auth/session-timeout';

/**
 * GET /api/admin/session/status - Get current session status
 * Returns session information including time until expiry and warning status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication (no specific permission needed for session status)
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get session information
    const session = SessionTimeoutService.getSession(user.id);
    const isValid = SessionTimeoutService.isSessionValid(user.id);
    const timeUntilExpiry = SessionTimeoutService.getTimeUntilExpiry(user.id);
    const shouldShowWarning = SessionTimeoutService.shouldShowWarning(user.id);

    if (!session || !isValid) {
      return NextResponse.json(
        { 
          error: 'Session expired or not found',
          expired: true
        },
        { status: 401 }
      );
    }

    // Calculate time remaining in human-readable format
    const minutesRemaining = Math.floor(timeUntilExpiry / (1000 * 60));
    const secondsRemaining = Math.floor((timeUntilExpiry % (1000 * 60)) / 1000);

    return NextResponse.json({
      session: {
        userId: session.userId,
        email: session.email,
        lastActivity: new Date(session.lastActivity).toISOString(),
        expiresAt: new Date(session.expiresAt).toISOString(),
        isActive: session.isActive
      },
      timeRemaining: {
        milliseconds: timeUntilExpiry,
        minutes: minutesRemaining,
        seconds: secondsRemaining,
        formatted: `${minutesRemaining}:${secondsRemaining.toString().padStart(2, '0')}`
      },
      warnings: {
        shouldShowWarning,
        isExpiringSoon: timeUntilExpiry <= 5 * 60 * 1000, // 5 minutes
        isCritical: timeUntilExpiry <= 2 * 60 * 1000 // 2 minutes
      },
      config: SessionTimeoutService.getConfig()
    });

  } catch (error) {
    console.error('Session Status API Error:', error);
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
 * POST /api/admin/session/status - Extend session (reset timeout)
 * Updates last activity and resets the 30-minute timeout
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Update session activity
    const updatedSession = SessionTimeoutService.updateActivity(user.id);
    
    if (!updatedSession) {
      // Session doesn't exist - create new one
      const newSession = SessionTimeoutService.createSession(user.id, user.email || '');
      
      return NextResponse.json({
        message: 'New session created',
        session: {
          userId: newSession.userId,
          email: newSession.email,
          lastActivity: new Date(newSession.lastActivity).toISOString(),
          expiresAt: new Date(newSession.expiresAt).toISOString(),
          isActive: newSession.isActive
        },
        extended: true
      });
    }

    const timeUntilExpiry = SessionTimeoutService.getTimeUntilExpiry(user.id);
    const minutesRemaining = Math.floor(timeUntilExpiry / (1000 * 60));

    return NextResponse.json({
      message: 'Session extended successfully',
      session: {
        userId: updatedSession.userId,
        email: updatedSession.email,
        lastActivity: new Date(updatedSession.lastActivity).toISOString(),
        expiresAt: new Date(updatedSession.expiresAt).toISOString(),
        isActive: updatedSession.isActive
      },
      timeRemaining: {
        milliseconds: timeUntilExpiry,
        minutes: minutesRemaining,
        formatted: `${minutesRemaining} minutes`
      },
      extended: true
    });

  } catch (error) {
    console.error('Session Extend API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
