import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SessionTimeoutService } from '@/lib/auth/session-timeout';

/**
 * POST /api/admin/session/logout - Logout and invalidate session
 * Invalidates the current session and logs out the user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get session info before invalidating
    const session = SessionTimeoutService.getSession(user.id);
    
    // Invalidate session in our timeout service
    SessionTimeoutService.invalidateSession(user.id);
    
    // Sign out from Supabase
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.error('Supabase signout error:', signOutError);
      // Continue anyway - session is invalidated
    }

    console.log(`🕐 Session logout: ${user.email} (${user.id})`);

    return NextResponse.json({
      message: 'Logged out successfully',
      session: session ? {
        userId: session.userId,
        email: session.email,
        wasActive: session.isActive,
        loggedOutAt: new Date().toISOString()
      } : null,
      redirectTo: '/admin/login'
    });

  } catch (error) {
    console.error('Session Logout API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
