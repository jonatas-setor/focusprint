/**
 * Script to create a new admin user in Supabase
 * Usage: node scripts/create-admin-user.js
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://tuyeqoudkeufkxtkupuh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  try {
    console.log('🔧 Creating new admin user: jonatas@focusprint.com');

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'jonatas@focusprint.com',
      password: 'FocuSprint2024!', // Temporary password - user should change it
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: 'admin',
        created_by: 'system_script',
        created_at: new Date().toISOString()
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      return;
    }

    console.log('✅ Auth user created successfully:', authData.user.id);

    // Step 2: Create admin profile
    const { data: profileData, error: profileError } = await supabase
      .from('admin_profiles')
      .insert({
        user_id: authData.user.id,
        email: 'jonatas@focusprint.com',
        first_name: 'Jonatas',
        last_name: 'Lopes',
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
      return;
    }

    console.log('✅ Admin profile created successfully');

    // Step 3: Verify the creation
    const { data: verifyData, error: verifyError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('email', 'jonatas@focusprint.com')
      .single();

    if (verifyError) {
      console.error('❌ Error verifying admin creation:', verifyError);
      return;
    }

    console.log('\n🎉 SUCCESS! New admin user created:');
    console.log('📧 Email:', verifyData.email);
    console.log('👤 Name:', `${verifyData.first_name} ${verifyData.last_name}`);
    console.log('🔐 Role:', verifyData.role);
    console.log('✅ Status:', verifyData.status);
    console.log('🔑 Permissions:', verifyData.permissions.length, 'permissions granted');
    
    console.log('\n🔐 Login Credentials:');
    console.log('📧 Email: jonatas@focusprint.com');
    console.log('🔑 Password: FocuSprint2024!');
    console.log('🌐 Login URL: http://localhost:3001/admin/login');
    
    console.log('\n⚠️  IMPORTANT:');
    console.log('1. Change the password after first login');
    console.log('2. This account has full super_admin permissions');
    console.log('3. Only @focusprint.com domain emails are authorized for admin access');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function checkExistingUser() {
  try {
    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('email', 'jonatas@focusprint.com')
      .single();

    if (existingProfile) {
      console.log('⚠️  User already exists:');
      console.log('📧 Email:', existingProfile.email);
      console.log('👤 Name:', `${existingProfile.first_name} ${existingProfile.last_name}`);
      console.log('🔐 Role:', existingProfile.role);
      console.log('✅ Status:', existingProfile.status);
      
      console.log('\n🔐 Login Credentials:');
      console.log('📧 Email: jonatas@focusprint.com');
      console.log('🔑 Password: FocuSprint2024! (if not changed)');
      console.log('🌐 Login URL: http://localhost:3001/admin/login');
      
      return true;
    }
    
    return false;
  } catch (error) {
    // User doesn't exist, which is fine
    return false;
  }
}

async function main() {
  console.log('🚀 Platform Admin User Creation Script');
  console.log('=====================================\n');

  // Check if user already exists
  const userExists = await checkExistingUser();
  
  if (userExists) {
    console.log('\n✅ User already exists. No action needed.');
    return;
  }

  // Create new user
  await createAdminUser();
}

// Run the script
main().catch(console.error);
