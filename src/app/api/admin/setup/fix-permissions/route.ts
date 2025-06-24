import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/admin/setup/fix-permissions - Fix permissions for jonatas@focusprint.com
 */
export async function GET(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Find the user by email
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const jonatasUser = authUsers.users.find(u => u.email === 'jonatas@focusprint.com');
    
    if (!jonatasUser) {
      return NextResponse.json(
        { error: 'User jonatas@focusprint.com not found' },
        { status: 404 }
      );
    }

    // Get current profile
    const { data: currentProfile } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', jonatasUser.id)
      .single();

    if (!currentProfile) {
      return NextResponse.json(
        { error: 'Admin profile not found for jonatas@focusprint.com' },
        { status: 404 }
      );
    }

    // Update with full permissions
    const fullPermissions = [
      'manage_clients',
      'manage_licenses', 
      'view_financials',
      'manage_admins',
      'system_config',
      'client_impersonation',
      'audit_access'
    ];

    const { data: updatedProfile, error: updateError } = await supabase
      .from('admin_profiles')
      .update({
        permissions: fullPermissions,
        department: 'Leadership',
        hire_date: '2025-06-18',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', jonatasUser.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update permissions', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Fixed permissions for jonatas@focusprint.com');

    return NextResponse.json({
      status: 'permissions_fixed',
      message: 'Successfully updated permissions for jonatas@focusprint.com',
      before: {
        permissions: currentProfile.permissions,
        department: currentProfile.department,
        hire_date: currentProfile.hire_date
      },
      after: {
        permissions: updatedProfile.permissions,
        department: updatedProfile.department,
        hire_date: updatedProfile.hire_date
      },
      user: {
        email: 'jonatas@focusprint.com',
        name: `${updatedProfile.first_name} ${updatedProfile.last_name}`,
        role: updatedProfile.role
      },
      login_info: {
        email: 'jonatas@focusprint.com',
        password: 'FocuSprint2024!',
        login_url: 'http://localhost:3001/admin/login'
      },
      next_steps: [
        'Try logging in again with the credentials',
        'The account now has full super_admin permissions',
        'Change password after successful login'
      ]
    });

  } catch (error) {
    console.error('Fix Permissions API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
