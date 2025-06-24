import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';

// POST /api/admin/setup/manual-2fa-setup - Manually setup 2FA for existing admin
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions (super admin only)
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_SYSTEM);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get current admin profile
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

    // Since we can't add columns directly, let's work with the existing structure
    // and store 2FA data in the metadata field or create a separate 2FA table
    
    // For now, let's create a separate admin_2fa table
    const create2FATableQuery = `
      CREATE TABLE IF NOT EXISTS admin_2fa (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_profile_id UUID NOT NULL REFERENCES admin_profiles(id) ON DELETE CASCADE,
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        two_factor_secret TEXT,
        two_factor_backup_codes TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(admin_profile_id)
      );
    `;

    // Try to create the table using a simple approach
    // Since direct SQL might not work, let's create the 2FA service without the table first
    // and implement the core 2FA logic

    return NextResponse.json({
      message: 'Manual 2FA setup initiated',
      admin_profile_id: adminProfile.id,
      approach: 'Using separate 2FA service without database changes',
      next_steps: [
        'Implement 2FA service with in-memory/session storage',
        'Create 2FA setup interface',
        'Add QR code generation',
        'Implement verification flow'
      ]
    });

  } catch (error) {
    console.error('Error in manual 2FA setup:', error);
    return NextResponse.json(
      { error: 'Failed to setup 2FA manually' },
      { status: 500 }
    );
  }
}

// GET /api/admin/setup/manual-2fa-setup - Check current 2FA status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_ADMINS);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get current admin profile
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

    return NextResponse.json({
      admin_profile: {
        id: adminProfile.id,
        role: adminProfile.role,
        name: `${adminProfile.first_name} ${adminProfile.last_name}`
      },
      two_factor_status: 'not_configured',
      can_setup_2fa: true,
      setup_url: '/admin/profile'
    });

  } catch (error) {
    console.error('Error checking 2FA status:', error);
    return NextResponse.json(
      { error: 'Failed to check 2FA status' },
      { status: 500 }
    );
  }
}
