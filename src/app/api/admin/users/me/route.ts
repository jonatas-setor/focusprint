import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';

// GET /api/admin/users/me - Get current admin user profile
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

    if (profileError) {
      console.error('Error fetching admin profile:', profileError);
      return NextResponse.json(
        { error: 'Admin profile not found' },
        { status: 404 }
      );
    }

    if (!adminProfile) {
      return NextResponse.json(
        { error: 'Admin profile not found' },
        { status: 404 }
      );
    }

    // Return admin profile with user email
    return NextResponse.json({
      admin: {
        id: adminProfile.id,
        user_id: adminProfile.user_id,
        role: adminProfile.role,
        first_name: adminProfile.first_name,
        last_name: adminProfile.last_name,
        email: authResult.user.email,
        created_at: adminProfile.created_at,
        updated_at: adminProfile.updated_at
      }
    });

  } catch (error) {
    console.error('Error getting current admin user:', error);
    return NextResponse.json(
      { error: 'Failed to get current admin user' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/me - Update current admin user profile
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_PROFILE);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { first_name, last_name } = await request.json();

    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    // Update admin profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('admin_profiles')
      .update({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', authResult.user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating admin profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      admin: {
        id: updatedProfile.id,
        user_id: updatedProfile.user_id,
        role: updatedProfile.role,
        first_name: updatedProfile.first_name,
        last_name: updatedProfile.last_name,
        email: authResult.user.email,
        created_at: updatedProfile.created_at,
        updated_at: updatedProfile.updated_at
      }
    });

  } catch (error) {
    console.error('Error updating current admin user:', error);
    return NextResponse.json(
      { error: 'Failed to update current admin user' },
      { status: 500 }
    );
  }
}
