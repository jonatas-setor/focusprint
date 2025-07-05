import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/client/tasks - Get tasks for user's projects
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const columnId = searchParams.get('column_id');

    console.log('🔍 Tasks request:', { projectId, columnId, userId: user.id });

    // Get tasks using RPC function
    const { data: tasks, error: tasksError } = await supabase.rpc('get_user_tasks', {
      p_user_id: user.id,
      p_project_id: projectId,
      p_column_id: columnId
    });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    return NextResponse.json({ tasks: tasks || [] });
  } catch (error) {
    console.error('Error in GET /api/client/tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/client/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      project_id, 
      column_id, 
      title, 
      description, 
      priority, 
      due_date, 
      estimated_hours,
      assigned_to,
      position 
    } = body;

    console.log('🔍 Task creation request:', { 
      project_id, 
      column_id, 
      title, 
      priority,
      userId: user.id 
    });

    // Validate required fields
    if (!project_id || !column_id || !title) {
      return NextResponse.json({
        error: 'Missing required fields: project_id, column_id, and title are required'
      }, { status: 400 });
    }

    // Calculate the next position if not provided
    let taskPosition = position;
    if (!taskPosition) {
      const { data: lastTask, error: positionError } = await supabase
        .from('tasks')
        .select('position')
        .eq('column_id', column_id)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      if (positionError && positionError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error getting last task position:', positionError);
        return NextResponse.json({ error: 'Failed to calculate task position' }, { status: 500 });
      }

      taskPosition = lastTask ? lastTask.position + 1 : 1;
    }

    // Create the task using RPC function
    const { data: task, error: taskError } = await supabase.rpc('create_task', {
      p_project_id: project_id,
      p_column_id: column_id,
      p_title: title,
      p_description: description || '',
      p_priority: priority || 'medium',
      p_due_date: due_date || null,
      p_estimated_hours: estimated_hours || null,
      p_assigned_to: assigned_to || null,
      p_position: taskPosition,
      p_created_by: user.id
    });

    if (taskError || !task || task.length === 0) {
      console.error('Error creating task:', taskError);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    const createdTask = task[0]; // RPC returns array

    return NextResponse.json({ 
      message: 'Task created successfully',
      task: createdTask 
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/client/tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
