import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { ClientMetricsService } from '@/lib/metrics/client-metrics-service';
import { AuditService } from '@/lib/audit/audit-service';
import { AuditAction, ResourceType, AuditSeverity } from '@/types/audit-log';
import {
  handleApiError,
  createAuthenticationError,
  createAuthorizationError,
  createValidationError,
  withErrorHandling
} from '@/lib/error-handler';
import {
  createClientSchema,
  paginationSchema,
  clientFiltersSchema,
  validateData
} from '@/lib/validation/schemas';

// Remove old validation function - now using Zod schemas

// GET /api/admin/clients - Get all clients with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_CLIENTS);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const paginationData = validateData(paginationSchema, {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
    });
    const filtersData = validateData(clientFiltersSchema, {
      status: searchParams.get('status') || undefined,
      plan_type: searchParams.get('plan_type') || undefined,
      search: searchParams.get('search') || undefined,
    });
    
    // Build query
    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (filtersData.status) {
      query = query.eq('status', filtersData.status);
    }

    if (filtersData.plan_type) {
      query = query.eq('plan_type', filtersData.plan_type);
    }

    if (filtersData.search) {
      query = query.or(`name.ilike.%${filtersData.search}%,email.ilike.%${filtersData.search}%`);
    }

    // Apply pagination
    const from = (paginationData.page - 1) * paginationData.limit;
    const to = from + paginationData.limit - 1;
    query = query.range(from, to);
    
    // Order by created_at desc
    query = query.order('created_at', { ascending: false });
    
    // Execute the real database query
    const { data: clients, error, count } = await query;
    
    if (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      );
    }

    // Get real metrics for each client
    const clientsWithMetrics = await Promise.all(
      (clients || []).map(async (client) => {
        const metrics = await ClientMetricsService.getClientMetrics(client.id);
        return {
          ...client,
          metrics: metrics ? {
            total_users: metrics.total_users,
            active_users: metrics.active_users_30d,
            total_projects: metrics.total_projects,
            storage_used_mb: metrics.storage_used_mb,
            last_activity: metrics.last_activity
          } : {
            total_users: 0,
            active_users: 0,
            total_projects: 0,
            storage_used_mb: 0,
            last_activity: client.created_at
          }
        };
      })
    );

    return NextResponse.json({
      clients: clientsWithMetrics,
      pagination: {
        page: paginationData.page,
        limit: paginationData.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / paginationData.limit)
      }
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/clients - Create new client
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_CLIENTS);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const clientData = validateData(createClientSchema, body);
    
    // Set limits based on plan type
    const planLimits = {
      free: { max_users: 5, max_projects: 3 },
      pro: { max_users: 15, max_projects: 10 },
      business: { max_users: 50, max_projects: 50 }
    };
    
    const limits = planLimits[clientData.plan_type as keyof typeof planLimits];
    
    // Insert client into database
    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        ...clientData,
        ...limits,
        stripe_customer_id: null
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating client:', error);

      // Log failed client creation
      await AuditService.logCRUD(
        AuditAction.CLIENT_CREATED,
        authResult.user.id,
        authResult.user.email!,
        `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        ResourceType.CLIENT,
        'unknown',
        clientData.name,
        [],
        request
      ).catch(auditError => console.error('Audit logging failed:', auditError));

      // Handle unique constraint violation
      if (error.code === '23505' && error.message.includes('email')) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create client' },
        { status: 500 }
      );
    }

    // Log successful client creation
    await AuditService.logCRUD(
      AuditAction.CLIENT_CREATED,
      authResult.user.id,
      authResult.user.email!,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      ResourceType.CLIENT,
      client.id,
      client.name,
      [
        { field: 'name', old_value: null, new_value: client.name },
        { field: 'email', old_value: null, new_value: client.email },
        { field: 'plan_type', old_value: null, new_value: client.plan_type },
        { field: 'status', old_value: null, new_value: client.status }
      ],
      request
    ).catch(auditError => console.error('Audit logging failed:', auditError));

    return NextResponse.json({ client }, { status: 201 });
    
  } catch (error) {
    return handleApiError(error);
  }
}
