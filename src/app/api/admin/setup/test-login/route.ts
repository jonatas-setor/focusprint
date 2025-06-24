import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/admin/setup/test-login - Test login for jonatas@focusprint.com
 */
export async function POST(request: NextRequest) {
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

    const email = 'jonatas@focusprint.com';
    const password = 'FocuSprint2024!';

    console.log('🔐 Testing login for:', email);

    // Test authentication
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json({
        status: 'login_failed',
        error: 'Authentication failed',
        details: authError.message,
        possible_causes: [
          'Incorrect password',
          'Email not confirmed',
          'Account disabled',
          'Password was changed'
        ],
        troubleshooting: [
          'Check if email is confirmed in Supabase dashboard',
          'Try resetting password',
          'Verify account status'
        ]
      }, { status: 401 });
    }

    console.log('✅ Auth successful for:', email);

    // Get admin profile
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json({
        status: 'profile_missing',
        error: 'Admin profile not found',
        auth_success: true,
        user_id: authData.user.id,
        details: profileError?.message
      }, { status: 404 });
    }

    console.log('✅ Admin profile found for:', email);

    // Check domain validation
    const emailDomain = email.split('@')[1];
    const isValidDomain = emailDomain === 'focusprint.com';

    return NextResponse.json({
      status: 'login_success',
      message: 'Login test successful!',
      auth_result: {
        user_id: authData.user.id,
        email: authData.user.email,
        email_confirmed: !!authData.user.email_confirmed_at,
        last_sign_in: authData.user.last_sign_in_at
      },
      admin_profile: {
        id: adminProfile.id,
        name: `${adminProfile.first_name} ${adminProfile.last_name}`,
        role: adminProfile.role,
        permissions: adminProfile.permissions,
        department: adminProfile.department
      },
      domain_validation: {
        email_domain: emailDomain,
        is_valid_domain: isValidDomain,
        allowed_domains: ['focusprint.com']
      },
      login_info: {
        email: email,
        password: password,
        login_url: 'http://localhost:3001/admin/login'
      },
      conclusion: 'All checks passed - login should work normally'
    });

  } catch (error) {
    console.error('Test Login API Error:', error);
    return NextResponse.json(
      { 
        status: 'test_error',
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/setup/test-login - Get login test instructions
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Login Test Endpoint',
    instructions: [
      'Use POST method to test login',
      'This will test authentication for jonatas@focusprint.com',
      'Returns detailed information about login process'
    ],
    credentials: {
      email: 'jonatas@focusprint.com',
      password: 'FocuSprint2024!',
      login_url: 'http://localhost:3001/admin/login'
    }
  });
}
