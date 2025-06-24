import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/admin/setup/create-admin - Create new admin user
 * TEMPORARY ENDPOINT FOR SETUP - REMOVE IN PRODUCTION
 */
export async function POST(request: NextRequest) {
  try {
    // Get Supabase service role key from environment
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    // Create Supabase client with service role key
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

    // Parse request body
    const body = await request.json();
    const { 
      email = 'jonatas@focusprint.com',
      password = 'FocuSprint2024!',
      firstName = 'Jonatas',
      lastName = 'Lopes'
    } = body;

    console.log('🔧 Creating new admin user:', email);

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (existingProfile) {
      return NextResponse.json({
        message: 'Admin user already exists',
        user: {
          email: existingProfile.email,
          name: `${existingProfile.first_name} ${existingProfile.last_name}`,
          role: existingProfile.role,
          status: existingProfile.status
        },
        login_info: {
          email: email,
          password: 'FocuSprint2024! (if not changed)',
          login_url: 'http://localhost:3001/admin/login'
        }
      });
    }

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: 'admin',
        created_by: 'setup_endpoint',
        created_at: new Date().toISOString()
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      return NextResponse.json(
        { error: 'Failed to create auth user', details: authError.message },
        { status: 500 }
      );
    }

    console.log('✅ Auth user created successfully:', authData.user.id);

    // Step 2: Create admin profile
    const { data: profileData, error: profileError } = await supabase
      .from('admin_profiles')
      .insert({
        user_id: authData.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: 'super_admin',
        permissions: [
          'VIEW_DASHBOARD',
          'MANAGE_CLIENTS',
          'VIEW_CLIENTS',
          'DELETE_CLIENTS',
          'MANAGE_LICENSES',
          'VIEW_LICENSES',
          'MANAGE_PLANS',
          'VIEW_PLANS',
          'VIEW_METRICS',
          'MANAGE_USERS',
          'VIEW_USERS',
          'MANAGE_SUPPORT_TICKETS',
          'VIEW_SUPPORT_TICKETS',
          'VIEW_AUDIT_LOGS',
          'MODIFY_SYSTEM_CONFIG',
          'VIEW_SYSTEM_METRICS'
        ],
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error creating admin profile:', profileError);
      
      // Cleanup: Delete the auth user if profile creation failed
      await supabase.auth.admin.deleteUser(authData.user.id);
      console.log('🧹 Cleaned up auth user due to profile creation failure');
      
      return NextResponse.json(
        { error: 'Failed to create admin profile', details: profileError.message },
        { status: 500 }
      );
    }

    console.log('✅ Admin profile created successfully');

    // Step 3: Verify the creation
    const { data: verifyData, error: verifyError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying admin creation:', verifyError);
      return NextResponse.json(
        { error: 'Failed to verify admin creation', details: verifyError.message },
        { status: 500 }
      );
    }

    console.log('🎉 SUCCESS! New admin user created:', email);

    return NextResponse.json({
      message: 'Admin user created successfully',
      user: {
        id: verifyData.user_id,
        email: verifyData.email,
        name: `${verifyData.first_name} ${verifyData.last_name}`,
        role: verifyData.role,
        status: verifyData.status,
        permissions: verifyData.permissions
      },
      login_info: {
        email: email,
        password: password,
        login_url: 'http://localhost:3001/admin/login'
      },
      instructions: [
        'Login with the provided credentials',
        'Change the password after first login',
        'This account has full super_admin permissions',
        'The temporary exception for atendimento.setor@gmail.com is still active'
      ]
    }, { status: 201 });

  } catch (error) {
    console.error('Create Admin API Error:', error);
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
 * GET /api/admin/setup/create-admin - Check if admin user exists
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

    // Check if admin user exists
    const { data: existingProfile } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('email', 'jonatas@focusprint.com')
      .single();

    if (existingProfile) {
      return NextResponse.json({
        exists: true,
        user: {
          email: existingProfile.email,
          name: `${existingProfile.first_name} ${existingProfile.last_name}`,
          role: existingProfile.role,
          status: existingProfile.status,
          created_at: existingProfile.created_at
        },
        login_info: {
          email: 'jonatas@focusprint.com',
          password: 'FocuSprint2024! (if not changed)',
          login_url: 'http://localhost:3001/admin/login'
        }
      });
    }

    return NextResponse.json({
      exists: false,
      message: 'Admin user does not exist',
      instructions: 'Use POST to create the admin user'
    });

  } catch (error) {
    console.error('Check Admin API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
