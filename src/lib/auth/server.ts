import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Create Supabase server client
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

// Client profile interface
export interface ClientProfile {
  id: string;
  user_id: string;
  client_id: string;
  role: 'owner' | 'admin' | 'member';
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_active: boolean;
  client: {
    id: string;
    name: string;
    plan_type: string;
    status: string;
    max_users: number;
    max_projects: number;
  };
}

// Get current user's client profile (server-side only)
export async function getCurrentClientProfile(): Promise<ClientProfile | null> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return null;
    }

    // Get client profile with client data
    const { data: profile, error: profileError } = await supabase
      .from('client_profiles')
      .select(`
        *,
        client:client_id (
          id,
          name,
          plan_type,
          status,
          max_users,
          max_projects
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (profileError || !profile) {
      return null;
    }

    return profile as ClientProfile;
  } catch (error) {
    console.error('Error getting client profile:', error);
    return null;
  }
}

// Check if user has specific role
export function hasRole(profile: ClientProfile, requiredRole: 'owner' | 'admin' | 'member'): boolean {
  const roleHierarchy = {
    owner: 3,
    admin: 2,
    member: 1
  };

  return roleHierarchy[profile.role] >= roleHierarchy[requiredRole];
}

// Check if user can perform action based on role
export function canPerformAction(
  profile: ClientProfile, 
  action: 'create_team' | 'delete_team' | 'invite_user' | 'remove_user' | 'manage_project'
): boolean {
  switch (action) {
    case 'create_team':
    case 'manage_project':
      return hasRole(profile, 'member'); // All users can create teams and manage projects
    
    case 'invite_user':
    case 'remove_user':
      return hasRole(profile, 'admin'); // Only admins and owners can manage users
    
    case 'delete_team':
      return hasRole(profile, 'admin'); // Only admins and owners can delete teams
    
    default:
      return false;
  }
}

// Validate client access for API routes
export async function validateClientAccess(requiredRole?: 'owner' | 'admin' | 'member') {
  const profile = await getCurrentClientProfile();
  
  if (!profile) {
    return { error: 'Unauthorized', status: 401 };
  }

  if (!profile.is_active) {
    return { error: 'Account inactive', status: 403 };
  }

  if (profile.client.status !== 'active') {
    return { error: 'Client account suspended', status: 403 };
  }

  if (requiredRole && !hasRole(profile, requiredRole)) {
    return { error: 'Insufficient permissions', status: 403 };
  }

  return { profile };
}

// Admin authentication for server-side API routes with RBAC
export async function checkAdminAuth(supabase: any, requiredPermission?: string, request?: Request) {
  try {
    // Get current user from Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: 'Unauthorized', status: 401 };
    }

    // Validate email domain for admin access
    const { validateAdminEmail, getUnauthorizedDomainMessage } = await import('./domain-validation');
    const emailValidation = validateAdminEmail(user.email || '');

    if (!emailValidation.isValid || !emailValidation.isDomainAuthorized) {
      // Log domain restriction violation
      try {
        const { AuditService } = await import('../audit/audit-service');
        const { AuditAction, AuditSeverity } = await import('../../types/audit-log');

        await AuditService.logSecurity(
          AuditAction.PERMISSION_DENIED,
          user.id,
          user.email || 'unknown',
          user.email?.split('@')[0] || 'unknown', // Use email prefix as name
          `Domain restriction violation: ${user.email} attempted to access Platform Admin. ${emailValidation.error}`,
          AuditSeverity.HIGH,
          request,
          'failure'
        );
      } catch (auditError) {
        // Silent fail for audit logging
      }

      return {
        error: emailValidation.error || getUnauthorizedDomainMessage(user.email || ''),
        status: 403
      };
    }

    // Get admin profile with RBAC data
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return { error: 'Admin profile not found', status: 403 };
    }

    // Check specific permission if required
    if (requiredPermission) {
      const { rbacService } = await import('./rbac');
      const permissionCheck = await rbacService.hasPermission(user.id, requiredPermission as any);

      if (!permissionCheck.allowed) {
        return {
          error: `Insufficient permissions: ${permissionCheck.reason}`,
          status: 403
        };
      }
    }

    return {
      user,
      adminProfile,
      success: true
    };

  } catch (error) {
    console.error('Admin auth check error:', error);
    return { error: 'Internal server error', status: 500 };
  }
}
