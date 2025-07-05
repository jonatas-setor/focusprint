import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/client/tasks/[id]/assignments - List task assignments
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

    const taskId = params.id;

    // Verify user has access to the task
    const { data: task, error: accessError } = await supabase
      .from('tasks')
      .select(`
        id,
        projects!inner(
          teams!inner(client_id)
        )
      `)
      .eq('id', taskId)
      .eq('projects.teams.client_id', user.id)
      .single();

    if (accessError || !task) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 403 });
    }

    // Get task assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('task_assignments')
      .select(`
        id,
        task_id,
        user_id,
        assigned_by,
        assigned_at
      `)
      .eq('task_id', taskId)
      .order('assigned_at');

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }

    return NextResponse.json({ assignments: assignments || [] });

  } catch (error) {
    console.error('Task assignments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/client/tasks/[id]/assignments - Assign user to task
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

    const taskId = params.id;
    const body = await request.json();
    const { user_id } = body;

    // Validate required fields
    if (!user_id) {
      return NextResponse.json({ 
        error: 'Missing required field: user_id is required' 
      }, { status: 400 });
    }

    // Verify user has access to the task
    const { data: task, error: accessError } = await supabase
      .from('tasks')
      .select(`
        id,
        project_id,
        projects!inner(
          teams!inner(client_id)
        )
      `)
      .eq('id', taskId)
      .eq('projects.teams.client_id', user.id)
      .single();

    if (accessError || !task) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 403 });
    }

    // Verify the user being assigned exists and has access to the project
    const { data: projectMember, error: memberError } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', task.project_id)
      .eq('user_id', user_id)
      .single();

    if (memberError || !projectMember) {
      return NextResponse.json({ 
        error: 'User is not a member of this project' 
      }, { status: 400 });
    }

    // Check if assignment already exists
    const { data: existingAssignment, error: existingError } = await supabase
      .from('task_assignments')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', user_id)
      .single();

    if (existingAssignment) {
      return NextResponse.json({ 
        error: 'User is already assigned to this task' 
      }, { status: 400 });
    }

    // Create the assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('task_assignments')
      .insert({
        task_id: taskId,
        user_id,
        assigned_by: user.id
      })
      .select(`
        id,
        task_id,
        user_id,
        assigned_by,
        assigned_at
      `)
      .single();

    if (assignmentError) {
      console.error('Error creating assignment:', assignmentError);
      return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
    }

    return NextResponse.json({ assignment }, { status: 201 });

  } catch (error) {
    console.error('Task assignment creation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/client/tasks/[id]/assignments - Remove all assignments or specific user
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

    const taskId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    // Verify user has access to the task
    const { data: task, error: accessError } = await supabase
      .from('tasks')
      .select(`
        id,
        projects!inner(
          teams!inner(client_id)
        )
      `)
      .eq('id', taskId)
      .eq('projects.teams.client_id', user.id)
      .single();

    if (accessError || !task) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 403 });
    }

    let query = supabase
      .from('task_assignments')
      .delete()
      .eq('task_id', taskId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { error: deleteError } = await query;

    if (deleteError) {
      console.error('Error removing assignments:', deleteError);
      return NextResponse.json({ error: 'Failed to remove assignments' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: userId 
        ? 'User assignment removed successfully' 
        : 'All assignments removed successfully' 
    });

  } catch (error) {
    console.error('Task assignment removal API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
