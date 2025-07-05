import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateClientAccess } from '@/lib/auth/server';

// GET /api/client/projects/[id]/tasks/search - Search tasks for auto-complete functionality
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
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '5');

    console.log('🔍 Task search request:', { projectId, query, limit, userId: user.id });

    // Validate input
    if (query.length < 1) {
      return NextResponse.json({ 
        message: 'Search query too short',
        tasks: []
      });
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
      
      // Validate that the project exists
      const { data: projectData, error: projectError } = await supabase
        .schema('client_data')
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .single();

      if (projectError || !projectData) {
        console.log('❌ Project not found:', projectError);
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Search tasks in the project
      const { data: tasks, error: tasksError } = await supabase
        .schema('client_data')
        .from('tasks')
        .select('id, title')
        .eq('project_id', projectId)
        .ilike('title', `%${query}%`)
        .limit(limit);

      if (tasksError) {
        console.error('Error searching tasks:', tasksError);
        return NextResponse.json({ error: 'Failed to search tasks' }, { status: 500 });
      }

      console.log('✅ Tasks found:', tasks);

      return NextResponse.json({ 
        message: 'Tasks found successfully',
        tasks: tasks || []
      });
    }

    // For regular users, use RPC function for security
    const { data: tasks, error: tasksError } = await supabase.rpc('search_project_tasks', {
      p_project_id: projectId,
      p_query: query,
      p_user_id: user.id,
      p_limit: limit
    });

    if (tasksError) {
      console.error('Error searching tasks:', tasksError);
      return NextResponse.json({ error: 'Failed to search tasks' }, { status: 500 });
    }

    console.log('✅ Tasks found:', tasks);

    return NextResponse.json({ 
      message: 'Tasks found successfully',
      tasks: tasks || []
    });

  } catch (error) {
    console.error('Error in task search:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
