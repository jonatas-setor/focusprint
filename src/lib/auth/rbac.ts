/**
 * Role-Based Access Control (RBAC) Service
 * Implementation of PRD Section 3.2.2 and 5.4.2
 */

import { createClient } from '@/lib/supabase/server';
import { 
  AdminRole, 
  AdminPermission, 
  ROLE_PERMISSIONS, 
  ROLE_HIERARCHY,
  AdminProfile,
  PermissionCheckResult,
  AdminAuthContext
} from '@/types/admin-permissions';

export class RBACService {
  private supabase: any;

  constructor() {
    this.supabase = null;
  }

  async initialize() {
    this.supabase = await createClient();
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(
    userId: string, 
    permission: AdminPermission,
    resourceId?: string
  ): Promise<PermissionCheckResult> {
    try {
      await this.initialize();

      // Get admin profile
      const { data: profile, error } = await this.supabase
        .from('admin_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !profile) {
        return {
          allowed: false,
          reason: 'Admin profile not found'
        };
      }

      // Check if permission is in user's permissions array
      const userPermissions = profile.permissions || [];
      const rolePermissions = ROLE_PERMISSIONS[profile.role as AdminRole] || [];
      
      // User has permission if it's explicitly granted or inherited from role
      const hasPermission = userPermissions.includes(permission) || 
                           rolePermissions.includes(permission);

      if (!hasPermission) {
        return {
          allowed: false,
          reason: `Permission ${permission} not granted`,
          requiredPermission: permission
        };
      }

      return { allowed: true };

    } catch (error) {
      return {
        allowed: false,
        reason: 'Permission check failed'
      };
    }
  }

  /**
   * Check if user has specific role or higher
   */
  async hasRole(userId: string, requiredRole: AdminRole): Promise<PermissionCheckResult> {
    try {
      await this.initialize();

      const { data: profile, error } = await this.supabase
        .from('admin_profiles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error || !profile) {
        return {
          allowed: false,
          reason: 'Admin profile not found'
        };
      }

      const userRoleLevel = ROLE_HIERARCHY[profile.role as AdminRole] || 0;
      const requiredRoleLevel = ROLE_HIERARCHY[requiredRole] || 0;

      if (userRoleLevel < requiredRoleLevel) {
        return {
          allowed: false,
          reason: `Role ${requiredRole} or higher required`,
          requiredRole: requiredRole
        };
      }

      return { allowed: true };

    } catch (error) {
      return {
        allowed: false,
        reason: 'Role check failed'
      };
    }
  }

  /**
   * Get admin context for authenticated user
   */
  async getAdminContext(userId: string): Promise<AdminAuthContext | null> {
    try {
      await this.initialize();

      const { data: user, error: userError } = await this.supabase.auth.getUser();
      if (userError || !user.user) return null;

      const { data: profile, error: profileError } = await this.supabase
        .from('admin_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile) return null;

      const rolePermissions = ROLE_PERMISSIONS[profile.role as AdminRole] || [];
      const userPermissions = profile.permissions || [];
      
      // Combine role permissions with user-specific permissions
      const allPermissions = Array.from(new Set([...rolePermissions, ...userPermissions]));

      return {
        user_id: userId,
        email: user.user.email!,
        role: profile.role as AdminRole,
        permissions: allPermissions,
        department: profile.department || '',
        session_expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Update admin permissions
   */
  async updateAdminPermissions(
    adminId: string, 
    permissions: AdminPermission[],
    updatedBy: string
  ): Promise<boolean> {
    try {
      await this.initialize();

      // Check if updater has permission to manage admins
      const canManage = await this.hasPermission(updatedBy, AdminPermission.MANAGE_ADMINS);
      if (!canManage.allowed) {
        throw new Error('Insufficient permissions to manage admins');
      }

      const { error } = await this.supabase
        .from('admin_profiles')
        .update({
          permissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', adminId);

      if (error) {
        throw error;
      }

      // Log the permission change
      await this.logSecurityEvent(updatedBy, 'PERMISSION_UPDATED', {
        target_admin_id: adminId,
        new_permissions: permissions
      });

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * Create new admin with role and permissions
   */
  async createAdmin(
    userData: {
      user_id: string;
      first_name: string;
      last_name: string;
      role: AdminRole;
      department?: string;
      hire_date?: string;
    },
    createdBy: string
  ): Promise<AdminProfile | null> {
    try {
      await this.initialize();

      // Check if creator has permission to manage admins
      const canManage = await this.hasPermission(createdBy, AdminPermission.MANAGE_ADMINS);
      if (!canManage.allowed) {
        throw new Error('Insufficient permissions to create admins');
      }

      // Get default permissions for role
      const rolePermissions = ROLE_PERMISSIONS[userData.role] || [];

      const { data, error } = await this.supabase
        .from('admin_profiles')
        .insert({
          user_id: userData.user_id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          role: userData.role,
          permissions: rolePermissions,
          department: userData.department || '',
          hire_date: userData.hire_date || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Log the admin creation
      await this.logSecurityEvent(createdBy, 'ADMIN_CREATED', {
        new_admin_id: data.id,
        role: userData.role,
        department: userData.department
      });

      return data;

    } catch (error) {
      return null;
    }
  }

  /**
   * Log security events for audit trail
   */
  private async logSecurityEvent(
    userId: string,
    eventType: string,
    metadata: any
  ): Promise<void> {
    try {
      // This will be implemented when we create the audit logging system
      // Security events will be logged to audit system in production
    } catch (error) {
      // Silent fail for security event logging
    }
  }

  /**
   * Validate admin email domain
   */
  static isValidAdminEmail(email: string): boolean {
    const allowedDomains = ['focusprint.com', 'setor@gmail.com']; // Temporary for development
    return allowedDomains.some(domain => email.endsWith(domain));
  }

  /**
   * Get all permissions for a role
   */
  static getRolePermissions(role: AdminRole): AdminPermission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Check if role can perform action on another role
   */
  static canManageRole(managerRole: AdminRole, targetRole: AdminRole): boolean {
    const managerLevel = ROLE_HIERARCHY[managerRole] || 0;
    const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
    
    // Can only manage roles at same level or lower
    return managerLevel >= targetLevel;
  }
}

// Export singleton instance
export const rbacService = new RBACService();
