import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PUT /api/client/project-members/[id] - Update member role
export async function PUT(
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

    const memberId = params.id;
    const body = await request.json();
    const { role } = body;

    // Validate required fields
    if (!role) {
      return NextResponse.json({ 
        error: 'Missing required field: role is required' 
      }, { status: 400 });
    }

    // Validate role value
    const validRoles = ['owner', 'admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be one of: owner, admin, member, viewer' 
      }, { status: 400 });
    }

    // Verify user has access to the member
    const { data: member, error: accessError } = await supabase
      .from('project_members')
      .select(`
        id,
        project_id,
        user_id,
        role,
        projects!inner(
          teams!inner(client_id)
        )
      `)
      .eq('id', memberId)
      .eq('projects.teams.client_id', user.id)
      .single();

    if (accessError || !member) {
      return NextResponse.json({ error: 'Member not found or access denied' }, { status: 403 });
    }

    // Update the member role
    const { data: updatedMember, error: updateError } = await supabase
      .from('project_members')
      .update({ role })
      .eq('id', memberId)
      .select(`
        id,
        project_id,
        user_id,
        role,
        joined_at,
        invited_by
      `)
      .single();

    if (updateError) {
      console.error('Error updating member role:', updateError);
      return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 });
    }

    return NextResponse.json({ member: updatedMember });

  } catch (error) {
    console.error('Member update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/client/project-members/[id] - Remove member from project
export async function DELETE(
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

    const memberId = params.id;

    // Verify user has access to the member
    const { data: member, error: accessError } = await supabase
      .from('project_members')
      .select(`
        id,
        project_id,
        user_id,
        role,
        projects!inner(
          teams!inner(client_id)
        )
      `)
      .eq('id', memberId)
      .eq('projects.teams.client_id', user.id)
      .single();

    if (accessError || !member) {
      return NextResponse.json({ error: 'Member not found or access denied' }, { status: 403 });
    }

    // Check if this is the last owner
    if (member.role === 'owner') {
      const { data: owners, error: ownersError } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', member.project_id)
        .eq('role', 'owner');

      if (ownersError) {
        console.error('Error checking owners:', ownersError);
        return NextResponse.json({ error: 'Failed to verify ownership' }, { status: 500 });
      }

      if (owners && owners.length <= 1) {
        return NextResponse.json({ 
          error: 'Cannot remove the last owner from the project' 
        }, { status: 400 });
      }
    }

    // Remove task assignments for this user in this project
    const { error: assignmentsError } = await supabase
      .from('task_assignments')
      .delete()
      .eq('user_id', member.user_id)
      .in('task_id', 
        supabase
          .from('tasks')
          .select('id')
          .eq('project_id', member.project_id)
      );

    if (assignmentsError) {
      console.error('Error removing task assignments:', assignmentsError);
      // Don't fail the member removal, just log the error
    }

    // Remove the member
    const { error: deleteError } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId);

    if (deleteError) {
      console.error('Error removing member:', deleteError);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Member removed successfully' 
    });

  } catch (error) {
    console.error('Member removal API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
