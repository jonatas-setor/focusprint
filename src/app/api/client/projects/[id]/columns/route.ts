import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateClientAccess } from '@/lib/auth/server';

// GET /api/client/projects/[id]/columns - List project columns
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

    // Get columns for the project using RPC function
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_project_columns', { p_project_id: projectId });

    if (columnsError) {
      console.error('Error fetching columns:', columnsError);
      return NextResponse.json({ error: 'Failed to fetch columns' }, { status: 500 });
    }

    return NextResponse.json({ columns: columns || [] });

  } catch (error) {
    console.error('Columns API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/client/projects/[id]/columns - Create column
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
    const { name, color } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ 
        error: 'Missing required field: name is required' 
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

    // Create the column using RPC function
    const { data: column, error: columnError } = await supabase
      .rpc('create_column', {
        p_project_id: projectId,
        p_name: name,
        p_color: color || '#3B82F6'
      });

    if (columnError) {
      console.error('Error creating column:', columnError);
      return NextResponse.json({ error: 'Failed to create column' }, { status: 500 });
    }

    return NextResponse.json({ 
      column: {
        ...column,
        task_count: 0
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Column creation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
