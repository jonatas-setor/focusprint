// Client profile interface
export interface ClientProfile {
  id: string;
  user_id: string;
  client_id: string;
  role: 'owner' | 'admin' | 'member';
  first_name: string;
  last_name: string;
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

// Check if user has specific role
export function hasRole(profile: ClientProfile, requiredRole: 'owner' | 'admin' | 'member'): boolean {
  const roleHierarchy = {
    owner: 3,
    admin: 2,
    member: 1
  };
  
  return roleHierarchy[profile.role] >= roleHierarchy[requiredRole];
}

// Check if user can perform specific action
export function canPerformAction(
  profile: ClientProfile, 
  action: 'create_team' | 'invite_user' | 'manage_project'
): boolean {
  switch (action) {
    case 'create_team':
      return hasRole(profile, 'admin');
    case 'invite_user':
      return hasRole(profile, 'admin');
    case 'manage_project':
      return hasRole(profile, 'member'); // All roles can manage projects
    default:
      return false;
  }
}
