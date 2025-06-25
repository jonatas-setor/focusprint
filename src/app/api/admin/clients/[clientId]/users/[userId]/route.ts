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
import { z } from 'zod';

// Validation schemas
const updateUserRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
  reason: z.string().optional()
});

const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'inactive']),
  reason: z.string().optional()
});

const updateUserProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50, 'First name too long').optional(),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name too long').optional(),
  job_title: z.string().max(100, 'Job title too long').optional(),
  department: z.string().max(100, 'Department too long').optional()
});

/**
 * GET /api/admin/clients/[clientId]/users/[userId] - Get specific client user details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string; userId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_CLIENTS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { clientId, userId } = params;

    // Get user details with client profile
    const { data: userProfile, error: userError } = await supabase
      .from('client_profiles')
      .select(`
        user_id,
        client_id,
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
          last_sign_in_at,
          email_confirmed_at
        ),
        client:client_id (
          id,
          name,
          status
        )
      `)
      .eq('client_id', clientId)
      .eq('user_id', userId)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'User not found in this client' },
        { status: 404 }
      );
    }

    // Get user activity metrics (mock data for now)
    const activityMetrics = {
      last_login: userProfile.user?.last_sign_in_at,
      total_logins: Math.floor(Math.random() * 100) + 10,
      projects_participated: Math.floor(Math.random() * 20) + 1,
      tasks_created: Math.floor(Math.random() * 50) + 5,
      tasks_completed: Math.floor(Math.random() * 40) + 3,
      messages_sent: Math.floor(Math.random() * 200) + 20,
      files_uploaded: Math.floor(Math.random() * 30) + 2
    };

    return NextResponse.json({
      user: {
        id: userProfile.user_id,
        email: userProfile.user?.email,
        first_name: userProfile.first_name,
        last_name: userProfile.last_name,
        role: userProfile.role,
        avatar_url: userProfile.avatar_url,
        job_title: userProfile.job_title,
        department: userProfile.department,
        last_seen_at: userProfile.last_seen_at,
        created_at: userProfile.created_at,
        updated_at: userProfile.updated_at,
        email_confirmed: !!userProfile.user?.email_confirmed_at,
        status: 'active' // TODO: Add status field to client_profiles table
      },
      client: userProfile.client,
      activity_metrics: activityMetrics
    });

  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/clients/[clientId]/users/[userId] - Update client user
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { clientId: string; userId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_CLIENTS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { clientId, userId } = params;
    const body = await request.json();
    const { action, ...updateData } = body;

    // Verify user exists in client
    const { data: existingProfile, error: fetchError } = await supabase
      .from('client_profiles')
      .select('user_id, role, first_name, last_name, client_id')
      .eq('client_id', clientId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingProfile) {
      return NextResponse.json(
        { error: 'User not found in this client' },
        { status: 404 }
      );
    }

    let updatedProfile;
    let auditAction: AuditAction;
    let auditDetails: any = {
      client_id: clientId,
      user_id: userId,
      updated_by: authResult.user.email
    };

    switch (action) {
      case 'update_role':
        const roleData = updateUserRoleSchema.parse(updateData);
        
        // Prevent removing the last owner
        if (existingProfile.role === 'owner' && roleData.role !== 'owner') {
          const { count: ownerCount } = await supabase
            .from('client_profiles')
            .select('user_id', { count: 'exact' })
            .eq('client_id', clientId)
            .eq('role', 'owner');

          if ((ownerCount || 0) <= 1) {
            return NextResponse.json(
              { error: 'Cannot remove the last owner from client' },
              { status: 400 }
            );
          }
        }

        const { data: roleUpdate, error: roleError } = await supabase
          .from('client_profiles')
          .update({ 
            role: roleData.role,
            updated_at: new Date().toISOString()
          })
          .eq('client_id', clientId)
          .eq('user_id', userId)
          .select()
          .single();

        if (roleError) throw roleError;
        
        updatedProfile = roleUpdate;
        auditAction = AuditAction.USER_ROLE_CHANGED;
        auditDetails = {
          ...auditDetails,
          old_role: existingProfile.role,
          new_role: roleData.role,
          reason: roleData.reason
        };
        break;

      case 'update_profile':
        const profileData = updateUserProfileSchema.parse(updateData);
        
        const { data: profileUpdate, error: profileError } = await supabase
          .from('client_profiles')
          .update({
            ...profileData,
            updated_at: new Date().toISOString()
          })
          .eq('client_id', clientId)
          .eq('user_id', userId)
          .select()
          .single();

        if (profileError) throw profileError;
        
        updatedProfile = profileUpdate;
        auditAction = AuditAction.USER_UPDATED;
        auditDetails = {
          ...auditDetails,
          updated_fields: Object.keys(profileData),
          changes: profileData
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: update_role, update_profile' },
          { status: 400 }
        );
    }

    // Log audit event
    await AuditService.logEvent({
      action: auditAction,
      resource_type: ResourceType.CLIENT_USER,
      resource_id: userId,
      admin_id: authResult.user.id,
      details: auditDetails,
      severity: AuditSeverity.MEDIUM,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown'
    }, request);

    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedProfile
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/clients/[clientId]/users/[userId] - Remove user from client
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clientId: string; userId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_CLIENTS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { clientId, userId } = params;
    const body = await request.json();
    const { reason, transfer_data_to } = body;

    // Get user profile before deletion
    const { data: userProfile, error: fetchError } = await supabase
      .from('client_profiles')
      .select(`
        user_id,
        role,
        first_name,
        last_name,
        user:user_id (email)
      `)
      .eq('client_id', clientId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !userProfile) {
      return NextResponse.json(
        { error: 'User not found in this client' },
        { status: 404 }
      );
    }

    // Prevent removing the last owner
    if (userProfile.role === 'owner') {
      const { count: ownerCount } = await supabase
        .from('client_profiles')
        .select('user_id', { count: 'exact' })
        .eq('client_id', clientId)
        .eq('role', 'owner');

      if ((ownerCount || 0) <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last owner from client' },
          { status: 400 }
        );
      }
    }

    // Remove user from client
    const { error: deleteError } = await supabase
      .from('client_profiles')
      .delete()
      .eq('client_id', clientId)
      .eq('user_id', userId);

    if (deleteError) {
      throw deleteError;
    }

    // Log audit event
    await AuditService.logEvent({
      action: AuditAction.USER_REMOVED,
      resource_type: ResourceType.CLIENT_USER,
      resource_id: userId,
      admin_id: authResult.user.id,
      details: {
        client_id: clientId,
        user_email: userProfile.user?.email,
        user_role: userProfile.role,
        reason: reason || 'No reason provided',
        removed_by: authResult.user.email,
        transfer_data_to: transfer_data_to
      },
      severity: AuditSeverity.HIGH,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown'
    }, request);

    return NextResponse.json({
      message: 'User removed from client successfully',
      removed_user: {
        id: userId,
        email: userProfile.user?.email,
        name: `${userProfile.first_name} ${userProfile.last_name}`,
        role: userProfile.role
      }
    });

  } catch (error) {
    return handleApiError(error);
  }
}
