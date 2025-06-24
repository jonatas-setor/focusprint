import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/admin/auth/status - Check admin authentication status
 */
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client for server-side auth check
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Also create client-side Supabase client to check session
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get session from cookies/headers
    const authHeader = request.headers.get('authorization');
    const sessionCookie = request.cookies.get('sb-access-token');

    const diagnosis = {
      timestamp: new Date().toISOString(),
      auth_header: !!authHeader,
      session_cookie: !!sessionCookie,
      tests: {}
    };

    // Test 1: Check all auth users
    try {
      const { data: allUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      
      diagnosis.tests.all_users = {
        success: !usersError,
        error: usersError?.message,
        count: allUsers?.users?.length || 0,
        users: allUsers?.users?.map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          email_confirmed_at: u.email_confirmed_at
        })) || []
      };
    } catch (error) {
      diagnosis.tests.all_users = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: Check admin profiles
    try {
      const { data: adminProfiles, error: profilesError } = await supabaseAdmin
        .from('admin_profiles')
        .select('*');
      
      diagnosis.tests.admin_profiles = {
        success: !profilesError,
        error: profilesError?.message,
        count: adminProfiles?.length || 0,
        profiles: adminProfiles || []
      };
    } catch (error) {
      diagnosis.tests.admin_profiles = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 3: Check specific user jonatas@focusprint.com
    try {
      const jonatasUser = diagnosis.tests.all_users.users?.find(u => u.email === 'jonatas@focusprint.com');
      
      if (jonatasUser) {
        const { data: jonatasProfile, error: jonatasProfileError } = await supabaseAdmin
          .from('admin_profiles')
          .select('*')
          .eq('user_id', jonatasUser.id)
          .single();

        diagnosis.tests.jonatas_user = {
          success: !jonatasProfileError,
          error: jonatasProfileError?.message,
          user: jonatasUser,
          profile: jonatasProfile,
          has_profile: !!jonatasProfile,
          profile_permissions: jonatasProfile?.permissions || []
        };
      } else {
        diagnosis.tests.jonatas_user = {
          success: false,
          error: 'User jonatas@focusprint.com not found in auth users'
        };
      }
    } catch (error) {
      diagnosis.tests.jonatas_user = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 4: Validate admin domain policy
    diagnosis.tests.admin_domain_validation = {
      allowed_domain: '@focusprint.com',
      validation_logic: 'Email must be from @focusprint.com domain AND have admin profile with valid role'
    };

    return NextResponse.json({
      status: 'diagnosis_complete',
      diagnosis,
      summary: {
        total_auth_users: diagnosis.tests.all_users.count,
        total_admin_profiles: diagnosis.tests.admin_profiles.count,
        jonatas_has_auth: !!diagnosis.tests.jonatas_user.user,
        jonatas_has_profile: !!diagnosis.tests.jonatas_user.profile,
        jonatas_can_login: !!(diagnosis.tests.jonatas_user.user && diagnosis.tests.jonatas_user.profile)
      },
      recommendations: [
        'Check if jonatas@focusprint.com has both auth user AND admin profile',
        'Verify session persistence in browser',
        'Check if AdminRouteGuard is properly validating authentication',
        'Test direct API authentication vs frontend authentication'
      ]
    });

  } catch (error) {
    console.error('Auth Status API Error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
