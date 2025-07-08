import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserContext, getAccessibleTemplateTypes, getAccessibleCategories } from '@/lib/templates/access-control';

// GET /api/client/templates/permissions - Get user's template permissions and options
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user context
    const userContext = await getUserContext(user.id);
    if (!userContext) {
      return NextResponse.json(
        { error: 'User context not found' },
        { status: 404 }
      );
    }

    // Get accessible template types and categories
    const templateTypes = getAccessibleTemplateTypes(userContext);
    const categories = getAccessibleCategories(userContext);

    // Get user's teams for team template creation
    const { data: userTeams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, description')
      .eq('client_id', userContext.clientId);

    if (teamsError) {
      console.error('Error fetching user teams:', teamsError);
    }

    return NextResponse.json({
      user: {
        id: user.id,
        clientId: userContext.clientId,
        role: userContext.role
      },
      permissions: {
        templateTypes,
        categories,
        teams: userTeams || []
      },
      capabilities: {
        canCreatePersonalTemplates: true,
        canCreateTeamTemplates: userContext.teamIds.length > 0,
        canCreateGlobalTemplates: userContext.role === 'platform_admin',
        canViewAllTemplates: false, // Users see only accessible templates
        canManageOwnTemplates: true
      }
    });

  } catch (error) {
    console.error('Unexpected error in templates/permissions GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
