import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PUT /api/client/tasks/[id]/checklists/[checklistId] - Update checklist item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; checklistId: string }> }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: taskId, checklistId } = await params;
    const body = await request.json();
    const { title, completed, position } = body;

    console.log('🔍 Checklist update request:', { 
      taskId, 
      checklistId, 
      title, 
      completed, 
      userId: user.id 
    });

    // Update the checklist item using RPC function
    const { data: updatedChecklist, error: updateError } = await supabase.rpc('update_task_checklist', {
      p_checklist_id: checklistId,
      p_task_id: taskId,
      p_user_id: user.id,
      p_title: title,
      p_completed: completed,
      p_position: position
    });

    if (updateError || !updatedChecklist || updatedChecklist.length === 0) {
      console.error('Error updating checklist:', updateError);
      return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Checklist item updated successfully',
      checklist: updatedChecklist[0] 
    });

  } catch (error) {
    console.error('Error in PUT /api/client/tasks/[id]/checklists/[checklistId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/client/tasks/[id]/checklists/[checklistId] - Delete checklist item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; checklistId: string }> }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: taskId, checklistId } = await params;

    console.log('🔍 Checklist delete request:', { taskId, checklistId, userId: user.id });

    // Delete the checklist item using RPC function
    const { data: result, error: deleteError } = await supabase.rpc('delete_task_checklist', {
      p_checklist_id: checklistId,
      p_task_id: taskId,
      p_user_id: user.id
    });

    if (deleteError || !result) {
      console.error('Error deleting checklist:', deleteError);
      return NextResponse.json({ error: 'Failed to delete checklist item' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Checklist item deleted successfully' 
    });

  } catch (error) {
    console.error('Error in DELETE /api/client/tasks/[id]/checklists/[checklistId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
