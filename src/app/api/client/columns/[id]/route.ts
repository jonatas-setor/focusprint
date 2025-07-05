import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PUT /api/client/columns/[id] - Update column
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

    const columnId = params.id;
    const body = await request.json();
    const { name, color } = body;

    // Verify user has access to the column
    const { data: column, error: accessError } = await supabase
      .from('columns')
      .select(`
        id,
        project_id,
        projects!inner(
          teams!inner(client_id)
        )
      `)
      .eq('id', columnId)
      .eq('projects.teams.client_id', user.id)
      .single();

    if (accessError || !column) {
      return NextResponse.json({ error: 'Column not found or access denied' }, { status: 403 });
    }

    // Update the column
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;

    const { data: updatedColumn, error: updateError } = await supabase
      .from('columns')
      .update(updateData)
      .eq('id', columnId)
      .select(`
        id,
        project_id,
        name,
        position,
        color,
        is_archived,
        created_at,
        updated_at
      `)
      .single();

    if (updateError) {
      console.error('Error updating column:', updateError);
      return NextResponse.json({ error: 'Failed to update column' }, { status: 500 });
    }

    return NextResponse.json({ column: updatedColumn });

  } catch (error) {
    console.error('Column update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/client/columns/[id] - Delete column
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

    const columnId = params.id;

    // Verify user has access to the column and get project info
    const { data: column, error: accessError } = await supabase
      .from('columns')
      .select(`
        id,
        project_id,
        position,
        projects!inner(
          teams!inner(client_id)
        )
      `)
      .eq('id', columnId)
      .eq('projects.teams.client_id', user.id)
      .single();

    if (accessError || !column) {
      return NextResponse.json({ error: 'Column not found or access denied' }, { status: 403 });
    }

    // Check if there are tasks in this column
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id')
      .eq('column_id', columnId);

    if (tasksError) {
      console.error('Error checking tasks:', tasksError);
      return NextResponse.json({ error: 'Failed to check column tasks' }, { status: 500 });
    }

    // If there are tasks, we need to move them to the first column
    if (tasks && tasks.length > 0) {
      // Get the first column in the project (lowest position)
      const { data: firstColumn, error: firstColumnError } = await supabase
        .from('columns')
        .select('id')
        .eq('project_id', column.project_id)
        .eq('is_archived', false)
        .neq('id', columnId) // Exclude the column being deleted
        .order('position')
        .limit(1)
        .single();

      if (firstColumnError || !firstColumn) {
        return NextResponse.json({ 
          error: 'Cannot delete column: no other columns available to move tasks' 
        }, { status: 400 });
      }

      // Get the highest position in the target column
      const { data: lastTask, error: lastTaskError } = await supabase
        .from('tasks')
        .select('position')
        .eq('column_id', firstColumn.id)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      let nextPosition = lastTask ? lastTask.position + 1 : 1;

      // Move all tasks to the first column
      for (const task of tasks) {
        const { error: moveError } = await supabase
          .from('tasks')
          .update({ 
            column_id: firstColumn.id,
            position: nextPosition,
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id);

        if (moveError) {
          console.error('Error moving task:', moveError);
        }
        nextPosition++;
      }
    }

    // Shift positions of columns after the deleted one
    const { data: laterColumns, error: laterColumnsError } = await supabase
      .from('columns')
      .select('id, position')
      .eq('project_id', column.project_id)
      .gt('position', column.position)
      .order('position');

    if (laterColumnsError) {
      console.error('Error fetching later columns:', laterColumnsError);
    } else {
      // Shift each column's position down by 1
      for (const col of laterColumns) {
        const { error: shiftError } = await supabase
          .from('columns')
          .update({ 
            position: col.position - 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', col.id);

        if (shiftError) {
          console.error('Error shifting column position:', shiftError);
        }
      }
    }

    // Delete the column
    const { error: deleteError } = await supabase
      .from('columns')
      .delete()
      .eq('id', columnId);

    if (deleteError) {
      console.error('Error deleting column:', deleteError);
      return NextResponse.json({ error: 'Failed to delete column' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Column deleted successfully',
      moved_tasks: tasks?.length || 0
    });

  } catch (error) {
    console.error('Column delete API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
