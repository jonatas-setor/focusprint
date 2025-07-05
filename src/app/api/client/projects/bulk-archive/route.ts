import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateClientAccess } from '@/lib/auth/server';
import { z } from 'zod';

// Validation schema for bulk archive options
const BulkArchiveSchema = z.object({
  project_ids: z.array(z.string().uuid()).min(1, 'At least one project ID is required').max(50, 'Maximum 50 projects per batch'),
  archive_reason: z.string().min(1, 'Archive reason is required').max(500, 'Archive reason too long'),
  archive_category: z.enum(['completed', 'cancelled', 'on_hold', 'outdated', 'duplicate', 'bulk', 'general']).default('bulk')
});

// POST /api/client/projects/bulk-archive - Archive multiple projects simultaneously
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    console.log('📦 [BULK ARCHIVE] Starting bulk archive request');

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ [BULK ARCHIVE] Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate client access
    const clientAccess = await validateClientAccess(user.id);
    if (!clientAccess.hasAccess) {
      console.error('❌ [BULK ARCHIVE] Client access denied:', clientAccess.error);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    console.log('👤 [BULK ARCHIVE] User authenticated:', { user_id: user.id });

    // Parse and validate request body
    let bulkArchiveOptions;
    try {
      const body = await request.json();
      bulkArchiveOptions = BulkArchiveSchema.parse(body);
      console.log('✅ [BULK ARCHIVE] Bulk archive options validated:', {
        project_count: bulkArchiveOptions.project_ids.length,
        archive_reason: bulkArchiveOptions.archive_reason,
        archive_category: bulkArchiveOptions.archive_category
      });
    } catch (validationError) {
      console.error('❌ [BULK ARCHIVE] Validation failed:', validationError);
      return NextResponse.json({
        error: 'Invalid bulk archive options',
        details: validationError instanceof z.ZodError ? validationError.errors : 'Invalid request body'
      }, { status: 400 });
    }

    // Verify all projects exist and user has access
    const { data: projectsCheck, error: checkError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        status,
        teams!inner(client_id)
      `)
      .in('id', bulkArchiveOptions.project_ids)
      .eq('teams.client_id', clientAccess.clientId)
      .is('archived_at', null)
      .is('deleted_at', null);

    if (checkError) {
      console.error('❌ [BULK ARCHIVE] Error checking projects:', checkError);
      return NextResponse.json({
        error: 'Failed to verify projects',
        details: checkError.message
      }, { status: 500 });
    }

    const foundProjectIds = projectsCheck?.map(p => p.id) || [];
    const missingProjectIds = bulkArchiveOptions.project_ids.filter(id => !foundProjectIds.includes(id));

    if (missingProjectIds.length > 0) {
      console.error('❌ [BULK ARCHIVE] Some projects not found or inaccessible:', missingProjectIds);
      return NextResponse.json({
        error: 'Some projects not found or already archived',
        missing_projects: missingProjectIds,
        found_projects: foundProjectIds
      }, { status: 400 });
    }

    console.log('✅ [BULK ARCHIVE] All projects verified:', { project_count: foundProjectIds.length });

    // Execute bulk archive using RPC function
    const { data: result, error: archiveError } = await supabase.rpc('bulk_archive_projects', {
      p_project_ids: bulkArchiveOptions.project_ids,
      p_user_id: user.id,
      p_archive_reason: bulkArchiveOptions.archive_reason,
      p_archive_category: bulkArchiveOptions.archive_category
    });

    if (archiveError) {
      console.error('❌ [BULK ARCHIVE] Error executing bulk archive:', archiveError);
      return NextResponse.json({
        error: 'Failed to execute bulk archive',
        details: archiveError.message
      }, { status: 500 });
    }

    if (!result || result.length === 0) {
      console.error('❌ [BULK ARCHIVE] No result returned from bulk archive function');
      return NextResponse.json({ error: 'Failed to execute bulk archive' }, { status: 500 });
    }

    const bulkResult = result[0];

    if (!bulkResult.success) {
      console.error('❌ [BULK ARCHIVE] Bulk archive failed:', bulkResult.message);
      return NextResponse.json({
        error: bulkResult.message || 'Failed to execute bulk archive'
      }, { status: 400 });
    }

    console.log('✅ [BULK ARCHIVE] Bulk archive completed successfully:', {
      total_projects: bulkResult.total_projects,
      archived_count: bulkResult.archived_count,
      failed_count: bulkResult.failed_count
    });

    return NextResponse.json({
      message: 'Operação de arquivamento em lote concluída',
      summary: {
        total_projects: bulkResult.total_projects,
        archived_count: bulkResult.archived_count,
        failed_count: bulkResult.failed_count,
        success_rate: bulkResult.total_projects > 0 ? 
          Math.round((bulkResult.archived_count / bulkResult.total_projects) * 100) : 0
      },
      results: bulkResult.results,
      archive_options: {
        reason: bulkArchiveOptions.archive_reason,
        category: bulkArchiveOptions.archive_category
      },
      recovery_info: {
        message: 'Projetos arquivados podem ser restaurados através da área de projetos arquivados',
        retention_period: '365 dias (padrão)'
      }
    });

  } catch (error) {
    console.error('❌ [BULK ARCHIVE] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
