require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Test script to verify drag-and-drop position updates work correctly
async function testDragDrop() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🧪 Testing drag-and-drop position updates...');

  try {
    // Get a test task to move
    const { data: testTask, error: taskError } = await supabase
      .from('client_data.tasks')
      .select('id, title, column_id, position')
      .eq('column_id', '165a1fa4-8ffa-4b70-aa7d-c13a71b98ee4')
      .eq('position', 2)
      .single();

    if (taskError || !testTask) {
      console.error('❌ Failed to get test task:', taskError);
      return;
    }

    console.log('📋 Test task:', testTask);

    // Get target column tasks before move
    const { data: targetColumnTasks, error: targetError } = await supabase
      .from('tasks')
      .select('id, title, position')
      .eq('column_id', '7e858c9c-fcb9-4e60-b146-2481c3585c2a')
      .order('position');

    if (targetError) {
      console.error('❌ Failed to get target column tasks:', targetError);
      return;
    }

    console.log('🎯 Target column tasks before move:', targetColumnTasks);

    // Test the position update API logic
    const taskId = testTask.id;
    const currentColumnId = testTask.column_id;
    const newColumnId = '7e858c9c-fcb9-4e60-b146-2481c3585c2a';
    const newPosition = 2;

    console.log(`🔄 Moving task ${taskId} from column ${currentColumnId} to column ${newColumnId} at position ${newPosition}`);

    // Simulate the moveTaskBetweenColumns logic
    // Step 1: Shift tasks in destination column to make space
    if (newPosition <= targetColumnTasks.length) {
      for (const task of targetColumnTasks) {
        if (task.position >= newPosition) {
          const { error: shiftError } = await supabase
            .from('tasks')
            .update({ 
              position: task.position + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', task.id);

          if (shiftError) {
            console.error(`❌ Failed to shift task ${task.id}:`, shiftError);
            return;
          }
          console.log(`✅ Shifted task "${task.title}" from position ${task.position} to ${task.position + 1}`);
        }
      }
    }

    // Step 2: Move the task to the new column and position
    const { error: moveError } = await supabase
      .from('tasks')
      .update({ 
        column_id: newColumnId,
        position: newPosition,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (moveError) {
      console.error('❌ Failed to move task:', moveError);
      return;
    }

    console.log(`✅ Moved task "${testTask.title}" to new column at position ${newPosition}`);

    // Step 3: Compact positions in the source column
    const { data: sourceTasks, error: sourceError } = await supabase
      .from('tasks')
      .select('id, title, position')
      .eq('column_id', currentColumnId)
      .order('position');

    if (sourceError) {
      console.error('❌ Failed to get source column tasks:', sourceError);
      return;
    }

    // Reorder source column tasks to fill the gap
    let newPos = 1;
    for (const task of sourceTasks) {
      if (task.position !== newPos) {
        const { error: compactError } = await supabase
          .from('tasks')
          .update({ 
            position: newPos,
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id);

        if (compactError) {
          console.error(`❌ Failed to compact task ${task.id}:`, compactError);
          return;
        }
        console.log(`✅ Compacted task "${task.title}" from position ${task.position} to ${newPos}`);
      }
      newPos++;
    }

    // Verify final state
    const { data: finalSourceTasks } = await supabase
      .from('tasks')
      .select('id, title, position')
      .eq('column_id', currentColumnId)
      .order('position');

    const { data: finalTargetTasks } = await supabase
      .from('tasks')
      .select('id, title, position')
      .eq('column_id', newColumnId)
      .order('position');

    console.log('📊 Final source column tasks:', finalSourceTasks);
    console.log('📊 Final target column tasks:', finalTargetTasks);

    console.log('✅ Drag-and-drop test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDragDrop();
