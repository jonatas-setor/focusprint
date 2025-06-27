import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { PlanMigrationService } from '@/lib/plans/migration-service';
import { logger, logApiError } from '@/lib/logger';

// GET /api/admin/plan-migrations - List all plan migrations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_LICENSES, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending', 'completed', 'failed', 'cancelled', 'all'
    const clientId = searchParams.get('client_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query
    let query = supabase
      .from('plan_migrations')
      .select(`
        *,
        clients!plan_migrations_client_id_fkey(id, name, email),
        plans!plan_migrations_to_plan_id_fkey(id, code, name, price)
      `, { count: 'exact' });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    // Execute query
    const { data: migrations, error, count } = await query;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    // Get migration statistics
    const { data: stats } = await supabase
      .from('plan_migrations')
      .select('status')
      .then(({ data }) => {
        const statistics = {
          total: data?.length || 0,
          pending: data?.filter(m => m.status === 'pending').length || 0,
          completed: data?.filter(m => m.status === 'completed').length || 0,
          failed: data?.filter(m => m.status === 'failed').length || 0,
          cancelled: data?.filter(m => m.status === 'cancelled').length || 0
        };
        return { data: statistics };
      });

    return NextResponse.json({
      migrations: migrations || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      },
      statistics: stats,
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    logApiError('GET', '/api/admin/plan-migrations', error instanceof Error ? error : new Error('Unknown error'));
    
    return NextResponse.json(
      {
        error: 'Failed to fetch plan migrations',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
