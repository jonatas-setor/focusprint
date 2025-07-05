import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateClientAccess } from '@/lib/auth/server';

// GET /api/client/projects/[id] - Get project details
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

    // Get project with team information
    // Use RPC function for both super admin and regular users
    const { data: projectData, error: projectError } = await supabase
      .rpc('get_project_by_id', {
        p_project_id: projectId,
        p_user_id: user.id
      });

    const project = projectData?.[0] || null;

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get project columns using RPC function
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_project_columns', { p_project_id: projectId });

    if (columnsError) {
      console.error('Error fetching columns:', columnsError);
    }

    // Get project members using RPC function
    const { data: members, error: membersError } = await supabase
      .rpc('get_project_members', { p_project_id: projectId });

    if (membersError) {
      console.error('Error fetching members:', membersError);
    }

    return NextResponse.json({
      project: {
        ...project,
        columns: columns || [],
        members: members || []
      }
    });

  } catch (error) {
    console.error('Project details API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/client/projects/[id] - Update project
export async function PUT(
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
    const { name, description, status, priority, start_date, end_date } = body;

    // Update the project using RPC function
    const { data: updatedProject, error: updateError } = await supabase.rpc('update_project', {
      p_project_id: projectId,
      p_user_id: user.id,
      p_name: name || '',
      p_description: description || '',
      p_status: status || 'active',
      p_priority: priority || 'medium',
      p_start_date: start_date || null,
      p_end_date: end_date || null
    });

    if (updateError || !updatedProject || updatedProject.length === 0) {
      console.error('Error updating project:', updateError);
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Projeto atualizado com sucesso',
      project: updatedProject[0]
    });

  } catch (error) {
    console.error('Project update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/client/projects/[id] - Soft delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    console.log('🗑️ [PROJECT DELETE] Starting soft delete request');

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ [PROJECT DELETE] Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    console.log('🎯 [PROJECT DELETE] Target project:', { project_id: projectId, user_id: user.id });

    // Soft delete the project using RPC function
    const { data: result, error: deleteError } = await supabase.rpc('soft_delete_project', {
      p_project_id: projectId,
      p_user_id: user.id
    });

    if (deleteError) {
      console.error('❌ [PROJECT DELETE] Error soft deleting project:', deleteError);
      return NextResponse.json({
        error: 'Failed to delete project',
        details: deleteError.message
      }, { status: 500 });
    }

    if (!result || result.length === 0) {
      console.error('❌ [PROJECT DELETE] No result returned from soft delete function');
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }

    const deleteResult = result[0];

    if (!deleteResult.success) {
      console.error('❌ [PROJECT DELETE] Soft delete failed:', deleteResult.message);
      return NextResponse.json({
        error: deleteResult.message || 'Failed to delete project'
      }, { status: 400 });
    }

    console.log('✅ [PROJECT DELETE] Project soft deleted successfully:', {
      project_id: deleteResult.project_id,
      project_name: deleteResult.project_name,
      deleted_at: deleteResult.deleted_at
    });

    return NextResponse.json({
      message: 'Projeto excluído com sucesso',
      deleted_project: {
        id: deleteResult.project_id,
        name: deleteResult.project_name,
        deleted_at: deleteResult.deleted_at,
        deleted_by: deleteResult.deleted_by
      },
      recovery_info: {
        message: 'O projeto pode ser recuperado através da área de administração',
        recovery_period: '30 dias'
      }
    });

  } catch (error) {
    console.error('❌ [PROJECT DELETE] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
