import { supabase } from '@/lib/supabase/client';
import { AdminRole, AdminPermission, ROLE_PERMISSIONS } from '@/types/admin-permissions';
import { AdminProfile } from '@/types/database';

export interface AdminAuthUser {
  id: string;
  email: string;
  profile: AdminProfile;
}

export class AdminAuthService {
  /**
   * Fazer login como administrador
   */
  static async signIn(email: string, password: string): Promise<AdminAuthUser> {
    // Validar domínio autorizado para admin
    if (!email.endsWith('@focusprint.com')) {
      throw new Error('Acesso restrito a usuários do domínio @focusprint.com');
    }

    // Autenticar com Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Falha na autenticação');
    }

    // Buscar perfil admin
    const profile = await this.getAdminProfile(data.user.id);
    
    return {
      id: data.user.id,
      email: data.user.email!,
      profile,
    };
  }

  /**
   * Fazer logout
   */
  static async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Obter usuário atual autenticado usando RBAC
   */
  static async getCurrentUser(): Promise<AdminAuthUser | null> {
    try {
      console.log('🔐 AdminAuthService.getCurrentUser: Starting RBAC validation...');

      const { data: { user }, error } = await supabase.auth.getUser();
      console.log('🔐 Supabase getUser result:', { hasUser: !!user, error: error?.message });

      if (error || !user || !user.email) {
        console.log('❌ No user or error in getUser');
        return null;
      }

      console.log('✅ User found, checking admin profile...');

      try {
        // Get admin profile from database (RBAC-based validation)
        const profile = await this.getAdminProfile(user.id);
        console.log('✅ Admin profile found:', {
          role: profile.role,
          permissions: profile.permissions?.length || 0
        });

        // Validate that user has a valid admin role
        if (!this.isValidAdminRole(profile.role)) {
          console.log('❌ Invalid admin role:', profile.role);
          return null;
        }

        console.log('✅ Valid admin role confirmed');

        return {
          id: user.id,
          email: user.email,
          profile,
        };
      } catch (profileError) {
        console.log('❌ Admin profile not found or invalid:', profileError);
        return null;
      }
    } catch (error) {
      console.error('❌ AdminAuthService.getCurrentUser error:', error);
      return null;
    }
  }

  /**
   * Validate if role is a valid admin role
   */
  private static isValidAdminRole(role: string): boolean {
    return Object.values(AdminRole).includes(role as AdminRole);
  }

  /**
   * Check if user has specific permission
   */
  static async hasPermission(userId: string, permission: AdminPermission): Promise<boolean> {
    try {
      const profile = await this.getAdminProfile(userId);

      // Get role-based permissions
      const rolePermissions = ROLE_PERMISSIONS[profile.role as AdminRole] || [];

      // Get user-specific permissions (if any)
      const userPermissions = profile.permissions || [];

      // Combine both
      const allPermissions = [...rolePermissions, ...userPermissions];

      return allPermissions.includes(permission);
    } catch {
      return false;
    }
  }

  /**
   * Check if user has specific role or higher
   */
  static async hasRole(userId: string, requiredRole: AdminRole): Promise<boolean> {
    try {
      const profile = await this.getAdminProfile(userId);
      const userRole = profile.role as AdminRole;

      // Super admin has access to everything
      if (userRole === AdminRole.SUPER_ADMIN) {
        return true;
      }

      // Check if user has the exact role required
      return userRole === requiredRole;
    } catch {
      return false;
    }
  }

  /**
   * Get user permissions (role + user-specific)
   */
  static async getUserPermissions(userId: string): Promise<AdminPermission[]> {
    try {
      const profile = await this.getAdminProfile(userId);

      // Get role-based permissions
      const rolePermissions = ROLE_PERMISSIONS[profile.role as AdminRole] || [];

      // Get user-specific permissions (if any)
      const userPermissions = profile.permissions || [];

      // Combine and deduplicate
      return Array.from(new Set([...rolePermissions, ...userPermissions]));
    } catch {
      return [];
    }
  }

  /**
   * Buscar perfil admin do usuário
   */
  static async getAdminProfile(userId: string): Promise<AdminProfile> {
    const { data, error } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new Error('Usuário não possui permissões de administrador');
    }

    return data;
  }

  /**
   * Criar perfil admin para usuário
   */
  static async createAdminProfile(
    userId: string,
    firstName: string,
    lastName: string,
    role: string = 'admin'
  ): Promise<AdminProfile> {
    const { data, error } = await supabase
      .from('admin_profiles')
      .insert({
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        role,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error('Erro ao criar perfil administrativo');
    }

    return data;
  }

  /**
   * Verificar se usuário é admin
   */
  static async isAdmin(userId: string): Promise<boolean> {
    try {
      await this.getAdminProfile(userId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Listar todos os admins
   */
  static async listAdmins(): Promise<AdminProfile[]> {
    const { data, error } = await supabase
      .from('admin_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Erro ao buscar administradores');
    }

    return data || [];
  }

  /**
   * Atualizar perfil admin
   */
  static async updateAdminProfile(
    id: string,
    updates: Partial<Pick<AdminProfile, 'first_name' | 'last_name' | 'role'>>
  ): Promise<AdminProfile> {
    const { data, error } = await supabase
      .from('admin_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error('Erro ao atualizar perfil administrativo');
    }

    return data;
  }
}
