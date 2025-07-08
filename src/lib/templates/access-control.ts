import { createClient } from '@/lib/supabase/server';

export interface TemplateAccessInfo {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canClone: boolean;
  accessReason: string;
}

export interface UserContext {
  userId: string;
  clientId: string;
  role: string;
  teamIds: string[];
}

/**
 * Get user context for template access control
 */
export async function getUserContext(userId: string): Promise<UserContext | null> {
  const supabase = await createClient();

  try {
    // Get user's client profile
    const { data: clientProfile, error: profileError } = await supabase
      .from('client_profiles')
      .select('client_id, role')
      .eq('user_id', userId)
      .single();

    if (profileError || !clientProfile) {
      console.error('Error fetching client profile:', profileError);
      return null;
    }

    // Get user's team memberships
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id')
      .eq('client_id', clientProfile.client_id);

    if (teamsError) {
      console.error('Error fetching user teams:', teamsError);
      return null;
    }

    return {
      userId,
      clientId: clientProfile.client_id,
      role: clientProfile.role,
      teamIds: teams?.map(team => team.id) || []
    };
  } catch (error) {
    console.error('Error getting user context:', error);
    return null;
  }
}

/**
 * Check template access permissions for a user
 */
export function checkTemplateAccess(
  template: {
    id: string;
    template_type: 'global' | 'personal' | 'team';
    created_by?: string;
    client_id?: string;
    team_id?: string;
    is_active: boolean;
  },
  userContext: UserContext
): TemplateAccessInfo {
  const { userId, clientId, role, teamIds } = userContext;

  // Default access
  let access: TemplateAccessInfo = {
    canView: false,
    canEdit: false,
    canDelete: false,
    canClone: false,
    accessReason: 'No access'
  };

  // Check if template is active
  if (!template.is_active) {
    return {
      ...access,
      accessReason: 'Template is inactive'
    };
  }

  // Global templates - visible to all authenticated users
  if (template.template_type === 'global') {
    return {
      canView: true,
      canEdit: false, // Only admins can edit global templates
      canDelete: false, // Only admins can delete global templates
      canClone: true, // Anyone can clone global templates
      accessReason: 'Global template - public access'
    };
  }

  // Personal templates
  if (template.template_type === 'personal') {
    // Creator has full access
    if (template.created_by === userId) {
      return {
        canView: true,
        canEdit: true,
        canDelete: true,
        canClone: true,
        accessReason: 'Template creator - full access'
      };
    }

    // Same client users can view and clone
    if (template.client_id === clientId) {
      return {
        canView: true,
        canEdit: false,
        canDelete: false,
        canClone: true,
        accessReason: 'Same client - view and clone access'
      };
    }

    return {
      ...access,
      accessReason: 'Personal template - no access'
    };
  }

  // Team templates
  if (template.template_type === 'team') {
    // Must be from same client
    if (template.client_id !== clientId) {
      return {
        ...access,
        accessReason: 'Different client - no access'
      };
    }

    // Must be team member
    if (!template.team_id || !teamIds.includes(template.team_id)) {
      return {
        ...access,
        accessReason: 'Not a team member - no access'
      };
    }

    // Creator has full access
    if (template.created_by === userId) {
      return {
        canView: true,
        canEdit: true,
        canDelete: true,
        canClone: true,
        accessReason: 'Team template creator - full access'
      };
    }

    // Team members have view and clone access
    // Team leaders/admins have edit access
    const canEdit = role === 'admin' || role === 'team_leader';

    return {
      canView: true,
      canEdit: canEdit,
      canDelete: canEdit,
      canClone: true,
      accessReason: `Team member - ${canEdit ? 'full' : 'view and clone'} access`
    };
  }

  return access;
}

/**
 * Filter templates based on user access
 */
export function filterAccessibleTemplates<T extends {
  id: string;
  template_type: 'global' | 'personal' | 'team';
  created_by?: string;
  client_id?: string;
  team_id?: string;
  is_active: boolean;
}>(
  templates: T[],
  userContext: UserContext
): (T & { access: TemplateAccessInfo })[] {
  return templates
    .map(template => ({
      ...template,
      access: checkTemplateAccess(template, userContext)
    }))
    .filter(template => template.access.canView);
}

/**
 * Check if user can create a specific type of template
 */
export function canCreateTemplate(
  templateType: 'global' | 'personal' | 'team',
  userContext: UserContext,
  teamId?: string
): { canCreate: boolean; reason: string } {
  const { role, teamIds } = userContext;

  switch (templateType) {
    case 'global':
      // Only platform admins can create global templates
      return {
        canCreate: role === 'platform_admin',
        reason: role === 'platform_admin' 
          ? 'Platform admin - can create global templates'
          : 'Only platform admins can create global templates'
      };

    case 'personal':
      // Any authenticated user can create personal templates
      return {
        canCreate: true,
        reason: 'Authenticated user - can create personal templates'
      };

    case 'team':
      // Must specify a team and be a member
      if (!teamId) {
        return {
          canCreate: false,
          reason: 'Team ID required for team templates'
        };
      }

      if (!teamIds.includes(teamId)) {
        return {
          canCreate: false,
          reason: 'Not a member of the specified team'
        };
      }

      // For now, any team member can create team templates
      // Later you might want to restrict to team leaders only
      return {
        canCreate: true,
        reason: 'Team member - can create team templates'
      };

    default:
      return {
        canCreate: false,
        reason: 'Invalid template type'
      };
  }
}

/**
 * Get template categories accessible to user
 */
export function getAccessibleCategories(userContext: UserContext): string[] {
  // All users can see all categories
  // You might want to customize this based on client or role
  return [
    'desenvolvimento',
    'marketing',
    'vendas',
    'atendimento',
    'eventos',
    'planejamento',
    'outros'
  ];
}

/**
 * Get template types accessible to user
 */
export function getAccessibleTemplateTypes(userContext: UserContext): Array<{
  type: 'global' | 'personal' | 'team';
  label: string;
  description: string;
  canCreate: boolean;
}> {
  return [
    {
      type: 'global',
      label: 'Templates Globais',
      description: 'Templates criados pela equipe FocuSprint',
      canCreate: canCreateTemplate('global', userContext).canCreate
    },
    {
      type: 'personal',
      label: 'Meus Templates',
      description: 'Templates que você criou',
      canCreate: canCreateTemplate('personal', userContext).canCreate
    },
    {
      type: 'team',
      label: 'Templates da Equipe',
      description: 'Templates compartilhados com sua equipe',
      canCreate: userContext.teamIds.length > 0
    }
  ];
}
