import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST /api/admin/tasks/compact-positions - Compact task positions to remove gaps
export async function POST(request: NextRequest) {
  try {
    // Use service key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('Starting position compacting utility...');

    // Get all columns with their tasks
    const { data: columns, error: columnsError } = await supabase
      .from('columns')
      .select('id, name, project_id')
      .eq('is_archived', false);

    if (columnsError) {
      console.error('Error fetching columns:', columnsError);
      return NextResponse.json({ error: 'Failed to fetch columns' }, { status: 500 });
    }

    let totalUpdated = 0;
    const results = [];

    // Process each column
    for (const column of columns) {
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, position')
        .eq('column_id', column.id)
        .order('position');

      if (tasksError) {
        console.error(`Error fetching tasks for column ${column.id}:`, tasksError);
        continue;
      }

      // Check if positions need compacting
      let needsCompacting = false;
      for (let i = 0; i < tasks.length; i++) {
        if (tasks[i].position !== i + 1) {
          needsCompacting = true;
          break;
        }
      }

      if (needsCompacting) {
        console.log(`Compacting positions for column ${column.name} (${column.id})`);
        
        // Update positions to be sequential
        for (let i = 0; i < tasks.length; i++) {
          const newPosition = i + 1;
          if (tasks[i].position !== newPosition) {
            const { error: updateError } = await supabase
              .from('tasks')
              .update({ 
                position: newPosition,
                updated_at: new Date().toISOString()
              })
              .eq('id', tasks[i].id);

            if (updateError) {
              console.error(`Error updating task ${tasks[i].id}:`, updateError);
            } else {
              totalUpdated++;
            }
          }
        }

        results.push({
          column_id: column.id,
          column_name: column.name,
          tasks_updated: tasks.length,
          old_positions: tasks.map(t => t.position),
          new_positions: tasks.map((_, i) => i + 1)
        });
      }
    }

    return NextResponse.json({
      message: 'Position compacting completed',
      total_tasks_updated: totalUpdated,
      columns_processed: results.length,
      results: results
    });

  } catch (error) {
    console.error('Error compacting positions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
