import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/admin/setup/check-profiles - Check admin profiles vs auth users
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

    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      return NextResponse.json(
        { error: 'Failed to get auth users', details: authError.message },
        { status: 500 }
      );
    }

    // Get all admin profiles
    const { data: adminProfiles, error: profilesError } = await supabase
      .from('admin_profiles')
      .select('*');
    
    if (profilesError) {
      return NextResponse.json(
        { error: 'Failed to get admin profiles', details: profilesError.message },
        { status: 500 }
      );
    }

    // Analyze the data
    const analysis = {
      auth_users: authUsers.users.map(user => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        email_confirmed_at: user.email_confirmed_at,
        last_sign_in_at: user.last_sign_in_at
      })),
      admin_profiles: adminProfiles || [],
      missing_profiles: [],
      orphaned_profiles: []
    };

    // Find missing profiles (auth users without admin profiles)
    authUsers.users.forEach(user => {
      const hasProfile = adminProfiles?.find(profile => profile.user_id === user.id);
      if (!hasProfile) {
        analysis.missing_profiles.push({
          user_id: user.id,
          email: user.email,
          created_at: user.created_at
        });
      }
    });

    // Find orphaned profiles (admin profiles without auth users)
    adminProfiles?.forEach(profile => {
      const hasAuthUser = authUsers.users.find(user => user.id === profile.user_id);
      if (!hasAuthUser) {
        analysis.orphaned_profiles.push(profile);
      }
    });

    const summary = {
      total_auth_users: authUsers.users.length,
      total_admin_profiles: adminProfiles?.length || 0,
      missing_profiles_count: analysis.missing_profiles.length,
      orphaned_profiles_count: analysis.orphaned_profiles.length,
      status: analysis.missing_profiles.length === 0 ? 'all_synced' : 'needs_sync'
    };

    return NextResponse.json({
      status: 'analysis_complete',
      summary,
      analysis,
      recommendations: analysis.missing_profiles.length > 0 ? [
        'Some auth users are missing admin profiles',
        'Use the fix endpoint to create missing profiles',
        'Check if profile creation failed during user creation'
      ] : [
        'All auth users have corresponding admin profiles',
        'System is properly synchronized'
      ]
    });

  } catch (error) {
    console.error('Check Profiles API Error:', error);
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
 * POST /api/admin/setup/check-profiles - Fix missing admin profiles
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

    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      return NextResponse.json(
        { error: 'Failed to get auth users', details: authError.message },
        { status: 500 }
      );
    }

    // Get all admin profiles
    const { data: adminProfiles, error: profilesError } = await supabase
      .from('admin_profiles')
      .select('*');
    
    if (profilesError) {
      return NextResponse.json(
        { error: 'Failed to get admin profiles', details: profilesError.message },
        { status: 500 }
      );
    }

    // Find missing profiles
    const missingProfiles = [];
    const createdProfiles = [];

    for (const user of authUsers.users) {
      const hasProfile = adminProfiles?.find(profile => profile.user_id === user.id);
      if (!hasProfile) {
        missingProfiles.push(user);
        
        // Create missing profile
        const profileData = {
          user_id: user.id,
          first_name: user.email === 'jonatas@focusprint.com' ? 'Jonatas' : 'Admin',
          last_name: user.email === 'jonatas@focusprint.com' ? 'Lopes' : 'User',
          role: 'super_admin'
        };

        const { data: newProfile, error: createError } = await supabase
          .from('admin_profiles')
          .insert(profileData)
          .select()
          .single();

        if (createError) {
          console.error('Failed to create profile for', user.email, createError);
        } else {
          createdProfiles.push(newProfile);
          console.log('Created admin profile for', user.email);
        }
      }
    }

    return NextResponse.json({
      status: 'fix_complete',
      missing_profiles_found: missingProfiles.length,
      profiles_created: createdProfiles.length,
      created_profiles: createdProfiles,
      message: createdProfiles.length > 0 
        ? `Successfully created ${createdProfiles.length} missing admin profiles`
        : 'No missing profiles found - all users have admin profiles'
    });

  } catch (error) {
    console.error('Fix Profiles API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
