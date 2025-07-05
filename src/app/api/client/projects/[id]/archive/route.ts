import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateClientAccess } from '@/lib/auth/server';
import { z } from 'zod';

// Validation schema for archive options
const ArchiveProjectSchema = z.object({
  archive_reason: z.string().min(1, 'Archive reason is required').max(500, 'Archive reason too long'),
  archive_category: z.enum(['completed', 'cancelled', 'on_hold', 'outdated', 'duplicate', 'general']).default('general'),
  retention_period: z.number().int().min(30).max(2555).default(365) // 30 days to 7 years
});

// POST /api/client/projects/[id]/archive - Archive project with enhanced metadata
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    console.log('📦 [PROJECT ARCHIVE] Starting enhanced archive request');

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ [PROJECT ARCHIVE] Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate client access
    const clientAccess = await validateClientAccess(user.id);
    if (!clientAccess.hasAccess) {
      console.error('❌ [PROJECT ARCHIVE] Client access denied:', clientAccess.error);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id: projectId } = await params;
    console.log('🎯 [PROJECT ARCHIVE] Target project:', { project_id: projectId, user_id: user.id });

    // Parse and validate request body
    let archiveOptions;
    try {
      const body = await request.json();
      archiveOptions = ArchiveProjectSchema.parse(body);
      console.log('✅ [PROJECT ARCHIVE] Archive options validated:', archiveOptions);
    } catch (validationError) {
      console.error('❌ [PROJECT ARCHIVE] Validation failed:', validationError);
      return NextResponse.json({
        error: 'Invalid archive options',
        details: validationError instanceof z.ZodError ? validationError.errors : 'Invalid request body'
      }, { status: 400 });
    }

    // Archive the project using enhanced RPC function
    const { data: result, error: archiveError } = await supabase.rpc('archive_project_enhanced', {
      p_project_id: projectId,
      p_user_id: user.id,
      p_archive_reason: archiveOptions.archive_reason,
      p_archive_category: archiveOptions.archive_category,
      p_retention_period: archiveOptions.retention_period
    });

    if (archiveError) {
      console.error('❌ [PROJECT ARCHIVE] Error archiving project:', archiveError);
      return NextResponse.json({
        error: 'Failed to archive project',
        details: archiveError.message
      }, { status: 500 });
    }

    if (!result || result.length === 0) {
      console.error('❌ [PROJECT ARCHIVE] No result returned from archive function');
      return NextResponse.json({ error: 'Failed to archive project' }, { status: 500 });
    }

    const archiveResult = result[0];

    if (!archiveResult.success) {
      console.error('❌ [PROJECT ARCHIVE] Archive failed:', archiveResult.message);
      return NextResponse.json({
        error: archiveResult.message || 'Failed to archive project'
      }, { status: 400 });
    }

    console.log('✅ [PROJECT ARCHIVE] Project archived successfully:', {
      project_id: archiveResult.project_id,
      project_name: archiveResult.project_name,
      archived_at: archiveResult.archived_at,
      archive_reason: archiveResult.archive_reason
    });

    return NextResponse.json({
      message: 'Projeto arquivado com sucesso',
      archived_project: {
        id: archiveResult.project_id,
        name: archiveResult.project_name,
        archived_at: archiveResult.archived_at,
        archived_by: archiveResult.archived_by,
        archive_reason: archiveResult.archive_reason,
        archive_metadata: archiveResult.archive_metadata
      },
      recovery_info: {
        message: 'O projeto pode ser restaurado através da área de projetos arquivados',
        retention_period: `${archiveOptions.retention_period} dias`
      }
    });

  } catch (error) {
    console.error('❌ [PROJECT ARCHIVE] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
