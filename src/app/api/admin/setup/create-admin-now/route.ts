import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/admin/setup/create-admin-now - Create admin user via GET request
 * TEMPORARY ENDPOINT FOR EASY SETUP - REMOVE IN PRODUCTION
 */
export async function GET(request: NextRequest) {
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

    const email = 'jonatas@focusprint.com';
    const password = 'FocuSprint2024!';
    const firstName = 'Jonatas';
    const lastName = 'Lopes';

    console.log('🔧 Creating new admin user:', email);

    // Check if user already exists by email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === email);

    let existingProfile = null;
    if (existingUser) {
      const { data } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('user_id', existingUser.id)
        .single();
      existingProfile = data;
    }

    if (existingProfile) {
      return NextResponse.json({
        status: 'already_exists',
        message: 'Admin user already exists',
        user: {
          email: email,
          name: `${existingProfile.first_name} ${existingProfile.last_name}`,
          role: existingProfile.role,
          created_at: existingProfile.created_at
        },
        login_info: {
          email: email,
          password: 'FocuSprint2024! (if not changed)',
          login_url: 'http://localhost:3001/admin/login'
        },
        instructions: [
          'User already exists - you can login now',
          'Use the credentials above to access Platform Admin',
          'Change password after first login for security'
        ]
      });
    }

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: 'admin',
        created_by: 'setup_endpoint_get',
        created_at: new Date().toISOString()
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      return NextResponse.json(
        { 
          status: 'error',
          error: 'Failed to create auth user', 
          details: authError.message 
        },
        { status: 500 }
      );
    }

    console.log('✅ Auth user created successfully:', authData.user.id);

    // Step 2: Create admin profile (using correct schema and columns)
    const { data: profileData, error: profileError } = await supabase
      .from('admin_profiles')
      .insert({
        user_id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        role: 'super_admin'
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error creating admin profile:', profileError);
      
      // Cleanup: Delete the auth user if profile creation failed
      await supabase.auth.admin.deleteUser(authData.user.id);
      console.log('🧹 Cleaned up auth user due to profile creation failure');
      
      return NextResponse.json(
        { 
          status: 'error',
          error: 'Failed to create admin profile', 
          details: profileError.message 
        },
        { status: 500 }
      );
    }

    console.log('✅ Admin profile created successfully');

    // Step 3: Verify the creation
    const { data: verifyData, error: verifyError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying admin creation:', verifyError);
      return NextResponse.json(
        { 
          status: 'error',
          error: 'Failed to verify admin creation', 
          details: verifyError.message 
        },
        { status: 500 }
      );
    }

    console.log('🎉 SUCCESS! New admin user created:', email);

    return NextResponse.json({
      status: 'success',
      message: '🎉 Admin user created successfully!',
      user: {
        id: verifyData.user_id,
        email: email,
        name: `${verifyData.first_name} ${verifyData.last_name}`,
        role: verifyData.role,
        created_at: verifyData.created_at
      },
      login_info: {
        email: email,
        password: password,
        login_url: 'http://localhost:3001/admin/login'
      },
      instructions: [
        '✅ Login with the provided credentials',
        '✅ Change the password after first login',
        '✅ This account has full super_admin permissions',
        '✅ Test all Platform Admin features',
        '⚠️ Remove temporary exception when ready'
      ],
      next_steps: [
        '1. Go to http://localhost:3001/admin/login',
        '2. Login with jonatas@focusprint.com / FocuSprint2024!',
        '3. Change password in profile settings',
        '4. Test client management, plans, support tickets',
        '5. Remove atendimento.setor@gmail.com exception'
      ]
    });

  } catch (error) {
    console.error('Create Admin Now API Error:', error);
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
