import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PUT /api/client/columns/[id]/position - Reorder columns
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
    const { position } = body;

    // Validate required fields
    if (position === undefined) {
      return NextResponse.json({ 
        error: 'Missing required field: position is required' 
      }, { status: 400 });
    }

    // Verify user has access to the column
    const { data: column, error: accessError } = await supabase
      .from('columns')
      .select(`
        id,
        project_id,
        position as current_position,
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

    const currentPosition = column.current_position;
    const newPosition = position;

    if (currentPosition === newPosition) {
      // No change needed
      return NextResponse.json({ message: 'Position unchanged' });
    }

    // Get all columns in the project
    const { data: projectColumns, error: columnsError } = await supabase
      .from('columns')
      .select('id, position')
      .eq('project_id', column.project_id)
      .eq('is_archived', false)
      .order('position');

    if (columnsError) {
      console.error('Error fetching project columns:', columnsError);
      return NextResponse.json({ error: 'Failed to fetch project columns' }, { status: 500 });
    }

    // Validate new position is within bounds
    const maxPosition = projectColumns.length;
    if (newPosition < 1 || newPosition > maxPosition) {
      return NextResponse.json({ 
        error: `Position must be between 1 and ${maxPosition}` 
      }, { status: 400 });
    }

    // Calculate new positions for all affected columns
    const updates = [];
    
    if (newPosition > currentPosition) {
      // Moving right - shift columns left
      for (const col of projectColumns) {
        if (col.id === columnId) {
          updates.push({ id: col.id, position: newPosition });
        } else if (col.position > currentPosition && col.position <= newPosition) {
          updates.push({ id: col.id, position: col.position - 1 });
        }
      }
    } else {
      // Moving left - shift columns right
      for (const col of projectColumns) {
        if (col.id === columnId) {
          updates.push({ id: col.id, position: newPosition });
        } else if (col.position >= newPosition && col.position < currentPosition) {
          updates.push({ id: col.id, position: col.position + 1 });
        }
      }
    }

    // Apply all position updates
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('columns')
        .update({ 
          position: update.position,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.id);

      if (updateError) {
        console.error('Error updating column position:', updateError);
        return NextResponse.json({ error: 'Failed to update positions' }, { status: 500 });
      }
    }

    // Get the updated column
    const { data: updatedColumn, error: fetchError } = await supabase
      .from('columns')
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
      .eq('id', columnId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated column:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch updated column' }, { status: 500 });
    }

    return NextResponse.json({ column: updatedColumn });

  } catch (error) {
    console.error('Column position API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
