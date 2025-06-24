import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { rbacService } from '@/lib/auth/rbac';
import { AdminRole, AdminPermission } from '@/types/admin-permissions';
import { AuditService } from '@/lib/audit/audit-service';
import { AuditAction, ResourceType, AuditSeverity } from '@/types/audit-log';
import { z } from 'zod';

// Validation schemas
const createAdminSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: z.enum(['super_admin', 'operations_admin', 'financial_admin', 'technical_admin', 'support_admin']),
  department: z.string().optional(),
  hire_date: z.string().optional()
});

const updateAdminSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  role: z.enum(['super_admin', 'operations_admin', 'financial_admin', 'technical_admin', 'support_admin']).optional(),
  department: z.string().optional(),
  permissions: z.array(z.string()).optional()
});

// GET /api/admin/users - List all admin users
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_ADMINS);
    
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const role = searchParams.get('role');
    const department = searchParams.get('department');
    const search = searchParams.get('search');

    // Get admin profiles first
    let query = supabase
      .from('admin_profiles')
      .select('*', { count: 'exact' });

    // Apply filters
    if (role) {
      query = query.eq('role', role);
    }
    
    if (department) {
      query = query.eq('department', department);
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%, last_name.ilike.%${search}%`);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: adminProfiles, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get current user for email context
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // For now, we'll use a simplified approach since auth.admin.getUserById requires service role
    // In a production environment, you'd store email in admin_profiles or use a different approach
    const adminsWithEmails = (adminProfiles || []).map((profile) => {
      // For the current user, we can get the email from the auth context
      let email = 'admin@focusprint.com'; // Default for now
      if (profile.user_id === currentUser?.id) {
        email = currentUser.email || 'admin@focusprint.com';
      }

      return {
        ...profile,
        auth: {
          email,
          created_at: profile.created_at,
          last_sign_in_at: null // Will be implemented with proper auth integration
        }
      };
    });

    // Log audit event for viewing admin users
    await AuditService.logSecurity(
      AuditAction.DATA_EXPORTED,
      authResult.user.id,
      authResult.user.email || '',
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      `Viewed admin users list (${adminsWithEmails.length} users)`,
      AuditSeverity.LOW,
      request,
      'success'
    );

    return NextResponse.json({
      admins: adminsWithEmails,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch admin users',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create new admin user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_ADMINS);
    
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const validatedData = createAdminSchema.parse(body);

    // Check if email is already registered
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(validatedData.email);
    
    if (existingUser.user) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create user in Supabase Auth
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: validatedData.email,
      password: generateTemporaryPassword(),
      email_confirm: true,
      user_metadata: {
        first_name: validatedData.first_name,
        last_name: validatedData.last_name
      }
    });

    if (createUserError || !newUser.user) {
      throw createUserError || new Error('Failed to create user');
    }

    // Create admin profile using RBAC service
    const adminProfile = await rbacService.createAdmin({
      user_id: newUser.user.id,
      first_name: validatedData.first_name,
      last_name: validatedData.last_name,
      role: validatedData.role as AdminRole,
      department: validatedData.department,
      hire_date: validatedData.hire_date
    }, authResult.user.id);

    if (!adminProfile) {
      // Cleanup: delete the created user if profile creation failed
      await supabase.auth.admin.deleteUser(newUser.user.id);
      throw new Error('Failed to create admin profile');
    }

    // Log audit event for admin creation
    await AuditService.logCRUD(
      AuditAction.ADMIN_CREATED,
      authResult.user.id,
      authResult.user.email || '',
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      ResourceType.ADMIN,
      adminProfile.id,
      `${validatedData.first_name} ${validatedData.last_name}`,
      [
        { field: 'email', old_value: null, new_value: validatedData.email },
        { field: 'role', old_value: null, new_value: validatedData.role },
        { field: 'department', old_value: null, new_value: validatedData.department }
      ],
      request
    );

    // Send invitation email (implement later)
    // await sendAdminInvitationEmail(validatedData.email, temporaryPassword);

    return NextResponse.json({
      message: 'Admin user created successfully',
      admin: {
        id: adminProfile.id,
        email: validatedData.email,
        first_name: validatedData.first_name,
        last_name: validatedData.last_name,
        role: validatedData.role,
        department: validatedData.department
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating admin user:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create admin user' },
      { status: 500 }
    );
  }
}

// Helper function to generate temporary password
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Helper function to send invitation email (placeholder)
async function sendAdminInvitationEmail(email: string, password: string): Promise<void> {
  // TODO: Implement email service integration
  console.log(`Admin invitation email would be sent to ${email} with password: ${password}`);
}
