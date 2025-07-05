import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateClientAccess } from '@/lib/auth/server';

// POST /api/client/projects/[id]/tasks/validate - Validate task IDs exist
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

    const { id: projectId } = await params;
    const body = await request.json();
    const { taskIds } = body;

    console.log('🔍 Task validation request:', { projectId, taskIds, userId: user.id });

    // Validate input
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid input: taskIds must be a non-empty array' 
      }, { status: 400 });
    }

    // Validate client access (handles both regular users and super admins)
    const accessResult = await validateClientAccess();
    if ('error' in accessResult) {
      return NextResponse.json({ error: accessResult.error }, { status: accessResult.status });
    }

    const { profile: userProfile, isSuperAdmin } = accessResult;

    console.log('🔍 Access result:', accessResult);

    // For super admins, query directly from client_data schema
    if (isSuperAdmin) {
      console.log('✅ Access granted. Super admin:', isSuperAdmin);
      
      // Validate that the project exists and user has access
      // Try client_data schema first, fallback to public schema
      let projectData, projectError;

      try {
        const result = await supabase
          .schema('client_data')
          .from('projects')
          .select('id')
          .eq('id', projectId)
          .single();
        projectData = result.data;
        projectError = result.error;
      } catch (schemaError) {
        console.log('⚠️ client_data schema not accessible for project validation, trying public schema');
        const result = await supabase
          .from('projects')
          .select('id')
          .eq('id', projectId)
          .single();
        projectData = result.data;
        projectError = result.error;
      }

      if (projectError || !projectData) {
        console.log('❌ Project not found:', projectError);
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Get valid tasks from the project
      // Try client_data schema first, fallback to public schema
      let tasks, tasksError;

      try {
        const result = await supabase
          .schema('client_data')
          .from('tasks')
          .select('id, title')
          .eq('project_id', projectId)
          .in('id', taskIds);
        tasks = result.data;
        tasksError = result.error;
      } catch (schemaError) {
        console.log('⚠️ client_data schema not accessible, trying public schema');
        const result = await supabase
          .from('tasks')
          .select('id, title')
          .eq('project_id', projectId)
          .in('id', taskIds);
        tasks = result.data;
        tasksError = result.error;
      }

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        return NextResponse.json({ error: 'Failed to validate tasks' }, { status: 500 });
      }

      console.log('✅ Tasks validated:', tasks);

      return NextResponse.json({ 
        message: 'Tasks validated successfully',
        tasks: tasks || []
      });
    }

    // For regular users, use RPC function for security
    const { data: tasks, error: tasksError } = await supabase.rpc('validate_task_references', {
      p_project_id: projectId,
      p_task_ids: taskIds,
      p_user_id: user.id
    });

    if (tasksError) {
      console.error('Error validating tasks:', tasksError);
      return NextResponse.json({ error: 'Failed to validate tasks' }, { status: 500 });
    }

    console.log('✅ Tasks validated:', tasks);

    return NextResponse.json({ 
      message: 'Tasks validated successfully',
      tasks: tasks || []
    });

  } catch (error) {
    console.error('Error in task validation:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
