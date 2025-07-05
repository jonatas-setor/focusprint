import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/client/tasks/[id] - Get task details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: taskId } = await params;

    // Get the task using RPC function
    const { data: tasks, error: taskError } = await supabase.rpc('get_user_tasks', {
      p_user_id: user.id,
      p_project_id: null,
      p_column_id: null
    });

    if (taskError) {
      console.error('Error fetching task:', taskError);
      return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
    }

    // Find the specific task
    const task = tasks?.find((t: any) => t.id === taskId);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Get task checklists
    const { data: checklists, error: checklistsError } = await supabase.rpc('get_task_checklists', {
      p_task_id: taskId,
      p_user_id: user.id
    });

    if (checklistsError) {
      console.error('Error fetching checklists:', checklistsError);
    }

    // Get task attachments (placeholder for now)
    const attachments: any[] = [];

    return NextResponse.json({
      task: {
        ...task,
        checklists: checklists || [],
        attachments: attachments || []
      }
    });

  } catch (error) {
    console.error('Task details API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/client/tasks/[id] - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: taskId } = await params;
    const body = await request.json();
    const {
      column_id,
      title,
      description,
      priority,
      due_date,
      estimated_hours,
      actual_hours,
      assigned_to,
      position
    } = body;

    console.log('🔍 Task update request:', {
      taskId,
      title,
      priority,
      userId: user.id
    });

    // Update the task using RPC function
    const { data: updatedTask, error: updateError } = await supabase.rpc('update_task_v2', {
      p_task_id: taskId,
      p_user_id: user.id,
      p_title: title,
      p_description: description,
      p_priority: priority,
      p_due_date: due_date,
      p_estimated_hours: estimated_hours,
      p_actual_hours: actual_hours,
      p_assigned_to: assigned_to,
      p_column_id: column_id,
      p_position: position
    });

    if (updateError) {
      console.error('Error updating task:', updateError);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    if (!updatedTask || updatedTask.length === 0) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 403 });
    }

    return NextResponse.json({ task: updatedTask[0] });

  } catch (error) {
    console.error('Task update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/client/tasks/[id] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: taskId } = await params;

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

    // Delete the task (cascade will handle related data)
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (deleteError) {
      console.error('Error deleting task:', deleteError);
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Task deleted successfully' });

  } catch (error) {
    console.error('Task delete API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
