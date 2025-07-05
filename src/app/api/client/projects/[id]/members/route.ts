import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/client/projects/[id]/members - List project members
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;

    // Verify user has access to the project
    const { data: project, error: accessError } = await supabase
      .from('projects')
      .select(`
        id,
        teams!inner(client_id)
      `)
      .eq('id', projectId)
      .eq('teams.client_id', user.id)
      .single();

    if (accessError || !project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Get project members
    const { data: members, error: membersError } = await supabase
      .from('project_members')
      .select(`
        id,
        project_id,
        user_id,
        role,
        joined_at,
        invited_by
      `)
      .eq('project_id', projectId)
      .order('joined_at');

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    return NextResponse.json({ members: members || [] });

  } catch (error) {
    console.error('Project members API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/client/projects/[id]/members - Add member to project
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const body = await request.json();
    const { user_id, role } = body;

    // Validate required fields
    if (!user_id) {
      return NextResponse.json({ 
        error: 'Missing required field: user_id is required' 
      }, { status: 400 });
    }

    // Verify user has access to the project
    const { data: project, error: accessError } = await supabase
      .from('projects')
      .select(`
        id,
        teams!inner(client_id)
      `)
      .eq('id', projectId)
      .eq('teams.client_id', user.id)
      .single();

    if (accessError || !project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Check if user is already a member
    const { data: existingMember, error: existingError } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user_id)
      .single();

    if (existingMember) {
      return NextResponse.json({ 
        error: 'User is already a member of this project' 
      }, { status: 400 });
    }

    // Verify the user exists in auth.users
    const { data: targetUser, error: userError } = await supabase.auth.admin.getUserById(user_id);
    if (userError || !targetUser.user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 400 });
    }

    // Create the membership
    const { data: member, error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id,
        role: role || 'member',
        invited_by: user.id
      })
      .select(`
        id,
        project_id,
        user_id,
        role,
        joined_at,
        invited_by
      `)
      .single();

    if (memberError) {
      console.error('Error creating membership:', memberError);
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
    }

    return NextResponse.json({ member }, { status: 201 });

  } catch (error) {
    console.error('Project member creation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
