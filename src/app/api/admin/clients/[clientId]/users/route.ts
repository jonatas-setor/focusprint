import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { AuditService } from '@/lib/audit/audit-service';
import { AuditAction, ResourceType, AuditSeverity } from '@/types/audit-log';
import {
  handleApiError,
  createAuthenticationError,
  createAuthorizationError,
  createValidationError,
  withErrorHandling
} from '@/lib/error-handler';
import {
  createUserSchema,
  paginationSchema,
  validateData
} from '@/lib/validation/schemas';
import { z } from 'zod';

// Validation schemas for client user management
const inviteUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  first_name: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
  send_invitation: z.boolean().default(true)
});

const updateUserRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
  reason: z.string().optional()
});

const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'inactive']),
  reason: z.string().optional()
});

/**
 * GET /api/admin/clients/[clientId]/users - List all users for a specific client
 * Implements PRD Section 3.3.3 - Gestão de Usuários por Cliente
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_CLIENTS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { clientId } = params;
    const url = new URL(request.url);
    
    // Parse pagination parameters
    const paginationData = validateData(paginationSchema, {
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: parseInt(url.searchParams.get('limit') || '20')
    });

    // Verify client exists
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, status')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Get client users with pagination
    const offset = (paginationData.page - 1) * paginationData.limit;
    
    const { data: users, error: usersError, count } = await supabase
      .from('client_profiles')
      .select(`
        user_id,
        role,
        first_name,
        last_name,
        avatar_url,
        job_title,
        department,
        last_seen_at,
        created_at,
        updated_at,
        user:user_id (
          email,
          created_at,
          last_sign_in_at
        )
      `, { count: 'exact' })
      .eq('client_id', clientId)
      .range(offset, offset + paginationData.limit - 1)
      .order('created_at', { ascending: false });

    if (usersError) {
      throw usersError;
    }

    // Format user data
    const formattedUsers = users?.map(user => ({
      id: user.user_id,
      email: user.user?.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      avatar_url: user.avatar_url,
      job_title: user.job_title,
      department: user.department,
      last_seen_at: user.last_seen_at,
      last_sign_in_at: user.user?.last_sign_in_at,
      created_at: user.created_at,
      updated_at: user.updated_at,
      status: 'active' // TODO: Add status field to client_profiles table
    })) || [];

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / paginationData.limit);

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page: paginationData.page,
        limit: paginationData.limit,
        total: count || 0,
        totalPages,
        hasNext: paginationData.page < totalPages,
        hasPrev: paginationData.page > 1
      },
      client: {
        id: client.id,
        name: client.name,
        status: client.status
      }
    });

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/clients/[clientId]/users - Invite a new user to the client
 * Implements PRD Section 3.3.3 - Gestão de Usuários por Cliente
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_CLIENTS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { clientId } = params;
    
    // Parse and validate request body
    const body = await request.json();
    const userData = validateData(inviteUserSchema, body);

    // Verify client exists and get client limits
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, status, max_users, plan_type')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    if (client.status !== 'active') {
      return NextResponse.json(
        { error: 'Cannot add users to inactive client' },
        { status: 400 }
      );
    }

    // Check current user count against limits
    const { count: currentUserCount } = await supabase
      .from('client_profiles')
      .select('user_id', { count: 'exact' })
      .eq('client_id', clientId);

    if ((currentUserCount || 0) >= client.max_users) {
      return NextResponse.json(
        { 
          error: `Client has reached maximum user limit (${client.max_users} users for ${client.plan_type} plan)`,
          current_users: currentUserCount,
          max_users: client.max_users,
          plan_type: client.plan_type
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(userData.email);
    
    let userId: string;
    let isNewUser = false;

    if (existingUser.user) {
      // User exists, check if already part of this client
      const { data: existingProfile } = await supabase
        .from('client_profiles')
        .select('user_id')
        .eq('user_id', existingUser.user.id)
        .eq('client_id', clientId)
        .single();

      if (existingProfile) {
        return NextResponse.json(
          { error: 'User is already part of this client' },
          { status: 409 }
        );
      }

      userId = existingUser.user.id;
    } else {
      // Create new user
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: userData.email,
        email_confirm: !userData.send_invitation, // Auto-confirm if not sending invitation
        user_metadata: {
          first_name: userData.first_name,
          last_name: userData.last_name,
          invited_by_admin: true,
          client_id: clientId
        }
      });

      if (createUserError || !newUser.user) {
        throw createUserError || new Error('Failed to create user');
      }

      userId = newUser.user.id;
      isNewUser = true;
    }

    // Create user profile entry
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        user_type: 'client_user',
        status: 'active'
      })
      .select()
      .single();

    if (profileError) {
      throw profileError;
    }

    // Create client profile
    const { data: clientProfile, error: clientProfileError } = await supabase
      .from('client_profiles')
      .insert({
        user_id: userId,
        client_id: clientId,
        role: userData.role,
        first_name: userData.first_name,
        last_name: userData.last_name
      })
      .select()
      .single();

    if (clientProfileError) {
      throw clientProfileError;
    }

    // Log audit event
    await AuditService.logEvent({
      action: AuditAction.USER_INVITED,
      resource_type: ResourceType.CLIENT_USER,
      resource_id: userId,
      admin_id: authResult.user.id,
      details: {
        client_id: clientId,
        client_name: client.name,
        user_email: userData.email,
        user_role: userData.role,
        is_new_user: isNewUser,
        invited_by: authResult.user.email
      },
      severity: AuditSeverity.MEDIUM,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown'
    }, request);

    return NextResponse.json({
      message: isNewUser ? 'User created and added to client successfully' : 'User added to client successfully',
      user: {
        id: userId,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
        is_new_user: isNewUser,
        client_id: clientId
      },
      client: {
        id: client.id,
        name: client.name,
        current_users: (currentUserCount || 0) + 1,
        max_users: client.max_users
      }
    }, { status: 201 });

  } catch (error) {
    return handleApiError(error);
  }
}
