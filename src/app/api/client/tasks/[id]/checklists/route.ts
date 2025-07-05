import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/client/tasks/[id]/checklists - Get task checklists
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

    // Get task checklists using RPC function
    const { data: checklists, error: checklistsError } = await supabase.rpc('get_task_checklists', {
      p_task_id: taskId,
      p_user_id: user.id
    });

    if (checklistsError) {
      console.error('Error fetching checklists:', checklistsError);
      return NextResponse.json({ error: 'Failed to fetch checklists' }, { status: 500 });
    }

    return NextResponse.json({ checklists: checklists || [] });
  } catch (error) {
    console.error('Error in GET /api/client/tasks/[id]/checklists:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/client/tasks/[id]/checklists - Create a new checklist item
export async function POST(
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
    const { title, position } = body;

    console.log('🔍 Checklist creation request:', { taskId, title, position, userId: user.id });

    // Validate required fields
    if (!title) {
      return NextResponse.json({ 
        error: 'Missing required field: title is required' 
      }, { status: 400 });
    }

    // Create the checklist item using RPC function
    const { data: checklist, error: checklistError } = await supabase.rpc('create_task_checklist', {
      p_task_id: taskId,
      p_user_id: user.id,
      p_title: title,
      p_position: position || 1
    });

    if (checklistError || !checklist || checklist.length === 0) {
      console.error('Error creating checklist:', checklistError);
      return NextResponse.json({ error: 'Failed to create checklist item' }, { status: 500 });
    }

    const createdChecklist = checklist[0]; // RPC returns array

    return NextResponse.json({ 
      message: 'Checklist item created successfully',
      checklist: createdChecklist 
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/client/tasks/[id]/checklists:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
