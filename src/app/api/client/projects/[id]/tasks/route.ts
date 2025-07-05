import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateClientAccess } from '@/lib/auth/server';

// GET /api/client/projects/[id]/tasks - List project tasks
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

    const { id: projectId } = await params;

    // Validate client access (handles both regular users and super admins)
    const accessResult = await validateClientAccess();
    if ('error' in accessResult) {
      return NextResponse.json({ error: accessResult.error }, { status: accessResult.status });
    }

    const { profile: userProfile, isSuperAdmin } = accessResult;

    // Verify user has access to the project using RPC function
    const { data: projectData, error: accessError } = await supabase
      .rpc('get_project_by_id', {
        p_project_id: projectId,
        p_user_id: user.id
      });

    const project = projectData?.[0] || null;

    if (accessError || !project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Get tasks for the project using RPC function
    const { data: tasks, error: tasksError } = await supabase
      .rpc('get_user_tasks', {
        p_user_id: user.id,
        p_project_id: projectId,
        p_column_id: null
      });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    return NextResponse.json({ tasks: tasks || [] });

  } catch (error) {
    console.error('Tasks API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/client/projects/[id]/tasks - Create task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🚀 [API TASK CREATE] Starting task creation API call');

    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('👤 [API TASK CREATE] Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message
    });

    if (authError || !user) {
      console.error('❌ [API TASK CREATE] Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();
    console.log('📥 [API TASK CREATE] Request data:', {
      projectId,
      body,
      timestamp: new Date().toISOString()
    });

    const {
      column_id,
      title,
      description,
      priority,
      due_date,
      estimated_hours,
      assigned_to
    } = body;

    console.log('🔍 [API TASK CREATE] Extracted fields:', {
      column_id,
      title,
      description,
      priority,
      due_date,
      estimated_hours,
      assigned_to
    });

    // Validate required fields
    if (!column_id || !title) {
      console.error('❌ [API TASK CREATE] Missing required fields:', { column_id, title });
      return NextResponse.json({
        error: 'Missing required fields: column_id and title are required'
      }, { status: 400 });
    }

    // Validate client access (handles both regular users and super admins)
    const accessResult = await validateClientAccess();
    if ('error' in accessResult) {
      return NextResponse.json({ error: accessResult.error }, { status: accessResult.status });
    }

    const { profile: userProfile, isSuperAdmin } = accessResult;

    // Verify user has access to the project using RPC function
    const { data: projectData, error: accessError } = await supabase
      .rpc('get_project_by_id', {
        p_project_id: projectId,
        p_user_id: user.id
      });

    const project = projectData?.[0] || null;

    if (accessError || !project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Create the task using RPC function with all required parameters
    const rpcParams = {
      p_project_id: projectId,
      p_column_id: column_id,
      p_title: title,
      p_created_by: user.id,
      p_description: description || '',
      p_priority: priority || 'medium',
      p_due_date: due_date || null,
      p_estimated_hours: estimated_hours || null,
      p_assigned_to: assigned_to || null,
      p_position: null // Let the function calculate the next position automatically
    };

    console.log('🔧 [API TASK CREATE] Calling RPC create_task with params:', rpcParams);

    const { data: task, error: taskError } = await supabase
      .rpc('create_task', rpcParams);

    console.log('📊 [API TASK CREATE] RPC response:', {
      task,
      taskError,
      hasTask: !!task,
      taskLength: Array.isArray(task) ? task.length : 'not array'
    });

    if (taskError) {
      console.error('❌ [API TASK CREATE] RPC Error creating task:', taskError);
      console.error('❌ [API TASK CREATE] RPC Error details:', {
        message: taskError.message,
        details: taskError.details,
        hint: taskError.hint,
        code: taskError.code
      });
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    // Create task assignment if assigned_to is provided
    if (assigned_to) {
      console.log('👥 [API TASK CREATE] Creating task assignment for:', assigned_to);
      const { error: assignmentError } = await supabase
        .schema('client_data')
        .from('task_assignments')
        .insert({
          task_id: task.id,
          user_id: assigned_to,
          assigned_by: user.id
        });

      if (assignmentError) {
        console.error('⚠️ [API TASK CREATE] Error creating task assignment:', assignmentError);
        // Don't fail the task creation, just log the error
      } else {
        console.log('✅ [API TASK CREATE] Task assignment created successfully');
      }
    }

    console.log('✅ [API TASK CREATE] Task creation completed successfully:', task);
    return NextResponse.json({ task }, { status: 201 });

  } catch (error) {
    console.error('💥 [API TASK CREATE] Task creation API error:', error);
    console.error('💥 [API TASK CREATE] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
