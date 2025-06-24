import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { TwoFactorService, TwoFactorAudit } from '@/lib/auth/2fa-service';

// In-memory storage for 2FA setup sessions (in production, use Redis or database)
const setupSessions = new Map<string, {
  secret: string;
  backupCodes: string[];
  adminId: string;
  expiresAt: number;
}>();

// POST /api/admin/2fa/setup - Initialize 2FA setup
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_PROFILE);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get admin profile
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', authResult.user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json(
        { error: 'Admin profile not found' },
        { status: 404 }
      );
    }

    // Generate 2FA setup
    let setup;
    try {
      setup = await TwoFactorService.generateSetup(
        authResult.user.email || '',
        `${adminProfile.first_name} ${adminProfile.last_name}`
      );
    } catch (setupError) {
      console.error('Error generating 2FA setup:', setupError);
      return NextResponse.json(
        { error: `Setup generation failed: ${setupError.message}` },
        { status: 500 }
      );
    }

    // Store setup session (expires in 10 minutes)
    const sessionId = `setup_${adminProfile.id}_${Date.now()}`;
    setupSessions.set(sessionId, {
      secret: setup.secret,
      backupCodes: setup.backupCodes,
      adminId: adminProfile.id,
      expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
    });

    // Log audit event
    TwoFactorAudit.log({
      userId: authResult.user.id,
      action: '2fa_setup',
      success: true,
      metadata: { adminId: adminProfile.id }
    });

    return NextResponse.json({
      sessionId,
      qrCodeUrl: setup.qrCodeUrl,
      manualEntryKey: setup.manualEntryKey,
      backupCodes: setup.backupCodes,
      expiresIn: 600 // 10 minutes in seconds
    });

  } catch (error) {
    console.error('Error setting up 2FA:', error);
    return NextResponse.json(
      { error: `Failed to setup 2FA: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// GET /api/admin/2fa/setup - Get current 2FA status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_PROFILE);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get admin profile
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', authResult.user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json(
        { error: 'Admin profile not found' },
        { status: 404 }
      );
    }

    // For now, since we don't have database fields, check if there's an active session
    const activeSessions = Array.from(setupSessions.entries())
      .filter(([_, session]) => session.adminId === adminProfile.id && session.expiresAt > Date.now());

    return NextResponse.json({
      adminId: adminProfile.id,
      twoFactorEnabled: false, // Will be true once we have database storage
      hasActiveSetupSession: activeSessions.length > 0,
      canSetup2FA: true,
      setupUrl: '/admin/profile'
    });

  } catch (error) {
    console.error('Error getting 2FA status:', error);
    return NextResponse.json(
      { error: 'Failed to get 2FA status' },
      { status: 500 }
    );
  }
}
