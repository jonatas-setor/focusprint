import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/client/projects/[id]/restore - Restore a soft-deleted project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    console.log('🔄 [PROJECT RESTORE] Starting project restore request');

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ [PROJECT RESTORE] Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    console.log('🎯 [PROJECT RESTORE] Target project:', { project_id: projectId, user_id: user.id });

    // Restore the project using RPC function
    const { data: result, error: restoreError } = await supabase.rpc('restore_project', {
      p_project_id: projectId,
      p_user_id: user.id
    });

    if (restoreError) {
      console.error('❌ [PROJECT RESTORE] Error restoring project:', restoreError);
      return NextResponse.json({ 
        error: 'Failed to restore project',
        details: restoreError.message 
      }, { status: 500 });
    }

    if (!result || result.length === 0) {
      console.error('❌ [PROJECT RESTORE] No result returned from restore function');
      return NextResponse.json({ error: 'Failed to restore project' }, { status: 500 });
    }

    const restoreResult = result[0];
    
    if (!restoreResult.success) {
      console.error('❌ [PROJECT RESTORE] Restore failed:', restoreResult.message);
      return NextResponse.json({ 
        error: restoreResult.message || 'Failed to restore project' 
      }, { status: 400 });
    }

    console.log('✅ [PROJECT RESTORE] Project restored successfully:', {
      project_id: restoreResult.project_id,
      project_name: restoreResult.project_name,
      restored_at: restoreResult.restored_at
    });

    return NextResponse.json({
      message: 'Projeto restaurado com sucesso',
      restored_project: {
        id: restoreResult.project_id,
        name: restoreResult.project_name,
        restored_at: restoreResult.restored_at,
        restored_by: restoreResult.restored_by
      }
    });

  } catch (error) {
    console.error('❌ [PROJECT RESTORE] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
