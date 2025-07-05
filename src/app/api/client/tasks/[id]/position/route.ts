import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PUT /api/client/tasks/[id]/position - Update task position in column
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
    const { column_id, position } = body;

    // Validate required fields
    if (!column_id) {
      return NextResponse.json({
        error: 'Missing required field: column_id is required'
      }, { status: 400 });
    }

    console.log('🔍 Debug - Updating task position:', {
      taskId: taskId,
      columnId: column_id,
      position: position,
      userId: user.id
    });

    // Use the update_task_position_safe RPC function which handles position conflicts
    // The function ignores the position parameter and calculates a safe position automatically
    const { data: updatedTask, error: updateError } = await supabase
      .rpc('update_task_position_safe', {
        p_task_id: taskId,
        p_user_id: user.id,
        p_column_id: column_id,
        p_position: position || 1 // Fallback value, function will calculate actual position
      });

    if (updateError || !updatedTask || updatedTask.length === 0) {
      console.error('❌ Task update error:', updateError, 'taskId:', taskId);
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
    }

    const task = updatedTask[0];
    console.log('✅ Task updated successfully:', {
      taskId: task.id,
      newColumnId: task.column_id,
      newPosition: task.task_position
    });

    return NextResponse.json({
      message: 'Task position updated successfully',
      task: {
        id: task.id,
        project_id: task.project_id,
        column_id: task.column_id,
        title: task.title,
        description: task.description,
        position: task.task_position,
        priority: task.priority,
        due_date: task.due_date,
        estimated_hours: task.estimated_hours,
        actual_hours: task.actual_hours,
        assigned_to: task.assigned_to,
        created_by: task.created_by,
        created_at: task.created_at,
        updated_at: task.updated_at
      }
    });

  } catch (error) {
    console.error('Task position API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
