import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SessionTimeoutService } from '@/lib/auth/session-timeout';

/**
 * POST /api/admin/auth/logout - Admin logout with session cleanup
 * Properly cleans up both Supabase session and SessionTimeoutService
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user before signing out
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (user) {
      // Clean up session in SessionTimeoutService
      SessionTimeoutService.invalidateSession(user.id);
    }
    
    // Sign out from Supabase
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.error('Supabase signout error:', signOutError);
      return NextResponse.json(
        { error: 'Failed to sign out' },
        { status: 500 }
      );
    }

    console.log('🔐 Admin logout successful:', user?.email || 'unknown');

    return NextResponse.json({
      message: 'Logged out successfully',
      redirectTo: '/admin/login'
    });

  } catch (error) {
    console.error('Admin Logout API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
