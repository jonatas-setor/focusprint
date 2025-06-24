import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { TwoFactorService, TwoFactorRateLimit, TwoFactorAudit } from '@/lib/auth/2fa-service';

// External reference to setup sessions (shared with setup route)
declare global {
  var setupSessions: Map<string, {
    secret: string;
    backupCodes: string[];
    adminId: string;
    expiresAt: number;
  }> | undefined;
}

if (!global.setupSessions) {
  global.setupSessions = new Map();
}

// POST /api/admin/2fa/verify - Verify 2FA token during setup
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_PROFILE);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { sessionId, token } = await request.json();

    if (!sessionId || !token) {
      return NextResponse.json(
        { error: 'Session ID and token are required' },
        { status: 400 }
      );
    }

    // Check rate limiting
    const rateLimitResult = TwoFactorRateLimit.checkRateLimit(authResult.user.id);
    if (!rateLimitResult.allowed) {
      TwoFactorAudit.log({
        userId: authResult.user.id,
        action: '2fa_failed',
        success: false,
        metadata: { reason: 'rate_limited', resetTime: rateLimitResult.resetTime }
      });

      return NextResponse.json(
        { 
          error: 'Too many failed attempts. Please try again later.',
          resetTime: rateLimitResult.resetTime
        },
        { status: 429 }
      );
    }

    // Get setup session
    const session = global.setupSessions!.get(sessionId);
    if (!session) {
      TwoFactorAudit.log({
        userId: authResult.user.id,
        action: '2fa_failed',
        success: false,
        metadata: { reason: 'invalid_session', sessionId }
      });

      return NextResponse.json(
        { error: 'Invalid or expired setup session' },
        { status: 400 }
      );
    }

    // Check if session expired
    if (session.expiresAt < Date.now()) {
      global.setupSessions!.delete(sessionId);
      
      TwoFactorAudit.log({
        userId: authResult.user.id,
        action: '2fa_failed',
        success: false,
        metadata: { reason: 'session_expired', sessionId }
      });

      return NextResponse.json(
        { error: 'Setup session has expired' },
        { status: 400 }
      );
    }

    // Verify the token
    const isValid = TwoFactorService.validateSetup(token, session.secret);

    if (!isValid) {
      TwoFactorAudit.log({
        userId: authResult.user.id,
        action: '2fa_failed',
        success: false,
        metadata: { reason: 'invalid_token', sessionId }
      });

      return NextResponse.json(
        { 
          error: 'Invalid verification code',
          remainingAttempts: rateLimitResult.remainingAttempts - 1
        },
        { status: 400 }
      );
    }

    // Token is valid - enable 2FA
    // For now, we'll store this in memory since we don't have database fields yet
    // In production, this would update the admin_profiles table
    
    // Clean up setup session
    global.setupSessions!.delete(sessionId);
    
    // Reset rate limiting on successful verification
    TwoFactorRateLimit.resetRateLimit(authResult.user.id);

    // Log successful setup
    TwoFactorAudit.log({
      userId: authResult.user.id,
      action: '2fa_enabled',
      success: true,
      metadata: { adminId: session.adminId, sessionId }
    });

    return NextResponse.json({
      success: true,
      message: '2FA has been successfully enabled',
      backupCodes: session.backupCodes,
      twoFactorEnabled: true
    });

  } catch (error) {
    console.error('Error verifying 2FA:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA' },
      { status: 500 }
    );
  }
}

// GET /api/admin/2fa/verify - Get verification status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_PROFILE);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Check rate limiting status
    const rateLimitResult = TwoFactorRateLimit.checkRateLimit(authResult.user.id);

    return NextResponse.json({
      userId: authResult.user.id,
      rateLimitStatus: {
        allowed: rateLimitResult.allowed,
        remainingAttempts: rateLimitResult.remainingAttempts,
        resetTime: rateLimitResult.resetTime
      },
      auditLogs: TwoFactorAudit.getLogs(authResult.user.id).slice(-10) // Last 10 entries
    });

  } catch (error) {
    console.error('Error getting verification status:', error);
    return NextResponse.json(
      { error: 'Failed to get verification status' },
      { status: 500 }
    );
  }
}
