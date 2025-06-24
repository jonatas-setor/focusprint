import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { rbacService } from '@/lib/auth/rbac';
import { AdminRole, AdminPermission } from '@/types/admin-permissions';
import { z } from 'zod';

const updateAdminSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  role: z.enum(['super_admin', 'operations_admin', 'financial_admin', 'technical_admin', 'support_admin']).optional(),
  department: z.string().optional(),
  permissions: z.array(z.string()).optional()
});

// GET /api/admin/users/[id] - Get specific admin user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_ADMINS);
    
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { data: admin, error } = await supabase
      .from('admin_profiles')
      .select(`
        *,
        auth.users!inner(email, created_at, last_sign_in_at, email_confirmed_at)
      `)
      .eq('id', params.id)
      .single();

    if (error || !admin) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ admin });

  } catch (error) {
    console.error('Error fetching admin user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin user' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[id] - Update admin user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_ADMINS);
    
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const validatedData = updateAdminSchema.parse(body);

    // Get current admin data
    const { data: currentAdmin, error: fetchError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !currentAdmin) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    // Check if current user can manage the target admin's role
    const currentUserRole = authResult.profile.role as AdminRole;
    const targetRole = (validatedData.role || currentAdmin.role) as AdminRole;
    
    if (!rbacService.canManageRole(currentUserRole, targetRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to manage this admin role' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (validatedData.first_name) updateData.first_name = validatedData.first_name;
    if (validatedData.last_name) updateData.last_name = validatedData.last_name;
    if (validatedData.department) updateData.department = validatedData.department;
    
    // Handle role change
    if (validatedData.role && validatedData.role !== currentAdmin.role) {
      updateData.role = validatedData.role;
      // Reset permissions to role defaults when role changes
      updateData.permissions = rbacService.getRolePermissions(validatedData.role as AdminRole);
    }

    // Handle permission updates
    if (validatedData.permissions) {
      // Validate that all permissions are valid
      const validPermissions = Object.values(AdminPermission);
      const invalidPermissions = validatedData.permissions.filter(
        p => !validPermissions.includes(p as AdminPermission)
      );
      
      if (invalidPermissions.length > 0) {
        return NextResponse.json(
          { error: `Invalid permissions: ${invalidPermissions.join(', ')}` },
          { status: 400 }
        );
      }

      updateData.permissions = validatedData.permissions;
    }

    // Update admin profile
    const { data: updatedAdmin, error: updateError } = await supabase
      .from('admin_profiles')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log the update
    console.log('Admin updated:', {
      admin_id: params.id,
      updated_by: authResult.user.id,
      changes: updateData
    });

    return NextResponse.json({
      message: 'Admin user updated successfully',
      admin: updatedAdmin
    });

  } catch (error) {
    console.error('Error updating admin user:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update admin user' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete admin user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_ADMINS);
    
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get admin to delete
    const { data: adminToDelete, error: fetchError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !adminToDelete) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    // Prevent self-deletion
    if (adminToDelete.user_id === authResult.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own admin account' },
        { status: 400 }
      );
    }

    // Check if current user can manage the target admin's role
    const currentUserRole = authResult.profile.role as AdminRole;
    const targetRole = adminToDelete.role as AdminRole;
    
    if (!rbacService.canManageRole(currentUserRole, targetRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete this admin' },
        { status: 403 }
      );
    }

    // Delete admin profile
    const { error: deleteProfileError } = await supabase
      .from('admin_profiles')
      .delete()
      .eq('id', params.id);

    if (deleteProfileError) {
      throw deleteProfileError;
    }

    // Delete user from Supabase Auth
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(
      adminToDelete.user_id
    );

    if (deleteUserError) {
      console.error('Error deleting user from auth:', deleteUserError);
      // Continue anyway as profile is already deleted
    }

    // Log the deletion
    console.log('Admin deleted:', {
      admin_id: params.id,
      deleted_by: authResult.user.id,
      deleted_admin: adminToDelete
    });

    return NextResponse.json({
      message: 'Admin user deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting admin user:', error);
    return NextResponse.json(
      { error: 'Failed to delete admin user' },
      { status: 500 }
    );
  }
}
