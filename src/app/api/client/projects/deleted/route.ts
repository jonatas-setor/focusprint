import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateClientAccess } from '@/lib/auth/server';

// GET /api/client/projects/deleted - List user's deleted and archived projects with search and filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    console.log('🗑️ [ARCHIVED PROJECTS] Starting archived/deleted projects list request');

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ [ARCHIVED PROJECTS] Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate client access
    const clientAccess = await validateClientAccess(user.id);
    if (!clientAccess.hasAccess) {
      console.error('❌ [ARCHIVED PROJECTS] Client access denied:', clientAccess.error);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    console.log('👤 [ARCHIVED PROJECTS] User authenticated:', { user_id: user.id });

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'all'; // all, deleted, archived
    const archive_category = searchParams.get('archive_category') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const sort_by = searchParams.get('sort_by') || 'deleted_at'; // deleted_at, archived_at, name
    const sort_order = searchParams.get('sort_order') || 'desc';

    console.log('🔍 [ARCHIVED PROJECTS] Query parameters:', {
      search, category, archive_category, page, limit, sort_by, sort_order
    });

    // Create the enhanced query for archived/deleted projects
    let query = supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        status,
        priority,
        start_date,
        end_date,
        color,
        created_by,
        created_at,
        updated_at,
        deleted_at,
        deleted_by,
        archived_at,
        archived_by,
        archive_reason,
        archive_metadata,
        teams!inner(
          id,
          name,
          client_id
        )
      `)
      .eq('teams.client_id', clientAccess.clientId);

    // Filter by category (deleted, archived, or both)
    if (category === 'deleted') {
      query = query.not('deleted_at', 'is', null);
    } else if (category === 'archived') {
      query = query.not('archived_at', 'is', null);
    } else {
      // Both deleted and archived
      query = query.or('deleted_at.not.is.null,archived_at.not.is.null');
    }

    // Add search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,archive_reason.ilike.%${search}%`);
    }

    // Add archive category filter if provided
    if (archive_category && archive_category !== 'all') {
      query = query.eq('archive_metadata->>archive_category', archive_category);
    }

    // Add sorting
    const sortColumn = sort_by === 'archived_at' ? 'archived_at' :
                      sort_by === 'name' ? 'name' : 'deleted_at';
    query = query.order(sortColumn, { ascending: sort_order === 'asc', nullsFirst: false });

    // Add pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: projects, error: projectsError, count } = await query;

    if (projectsError) {
      console.error('❌ [ARCHIVED PROJECTS] Error fetching projects:', projectsError);
      return NextResponse.json({ error: 'Failed to fetch archived projects' }, { status: 500 });
    }

    // Get total count for pagination
    let totalQuery = supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('teams.client_id', clientAccess.clientId);

    if (category === 'deleted') {
      totalQuery = totalQuery.not('deleted_at', 'is', null);
    } else if (category === 'archived') {
      totalQuery = totalQuery.not('archived_at', 'is', null);
    } else {
      totalQuery = totalQuery.or('deleted_at.not.is.null,archived_at.not.is.null');
    }

    if (search) {
      totalQuery = totalQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%,archive_reason.ilike.%${search}%`);
    }

    if (archive_category && archive_category !== 'all') {
      totalQuery = totalQuery.eq('archive_metadata->>archive_category', archive_category);
    }

    const { count: totalCount } = await totalQuery;

    console.log('✅ [ARCHIVED PROJECTS] Projects fetched successfully:', {
      project_count: projects?.length || 0,
      total_count: totalCount || 0,
      page,
      limit
    });

    return NextResponse.json({
      projects: projects || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        total_pages: Math.ceil((totalCount || 0) / limit),
        has_next: page * limit < (totalCount || 0),
        has_prev: page > 1
      },
      filters: {
        search,
        category,
        archive_category,
        sort_by,
        sort_order
      },
      recovery_info: {
        message: 'Projetos excluídos podem ser recuperados em até 30 dias, projetos arquivados conforme período de retenção',
        auto_cleanup_days: 30
      }
    });

  } catch (error) {
    console.error('❌ [ARCHIVED PROJECTS] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
