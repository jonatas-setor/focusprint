import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { SupportTicketsService } from '@/lib/support/tickets-service';
import {
  TicketFilters,
  TicketCategory,
  TicketPriority,
  TicketStatus
} from '@/types/support-tickets';

// Mock client data for validation
const MOCK_CLIENTS = {
  'client_1': { id: 'client_1', name: 'Acme Corporation', plan: 'business' },
  'client_2': { id: 'client_2', name: 'Tech Startup Ltda', plan: 'pro' },
  'client_3': { id: 'client_3', name: 'Design Agency', plan: 'free' }
};

/**
 * GET /api/admin/clients/[clientId]/tickets - Get support tickets for specific client
 * Implements PRD Section 3.3.2 - Tickets de suporte integration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_SUPPORT_TICKETS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { clientId } = params;

    // Verify client exists
    const client = MOCK_CLIENTS[clientId as keyof typeof MOCK_CLIENTS];
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Parse filters (excluding client_id since it's from the URL)
    const filters: Omit<TicketFilters, 'client_id'> = {
      status: searchParams.get('status')?.split(',') as TicketStatus[] | undefined,
      category: searchParams.get('category')?.split(',') as TicketCategory[] | undefined,
      priority: searchParams.get('priority')?.split(',') as TicketPriority[] | undefined,
      assigned_admin_id: searchParams.get('assigned_admin_id') || undefined,
      unassigned: searchParams.get('unassigned') === 'true',
      sla_overdue: searchParams.get('sla_overdue') === 'true',
      search: searchParams.get('search') || undefined,
      created_date_from: searchParams.get('created_date_from') || undefined,
      created_date_to: searchParams.get('created_date_to') || undefined
    };

    // Initialize sample data if needed
    const allTickets = await SupportTicketsService.getTickets({}, 1, 100);
    if (allTickets.tickets.length === 0) {
      SupportTicketsService.initializeSampleData();
    }

    // Get tickets for this specific client
    const clientTicketsResult = await SupportTicketsService.getClientTickets(
      clientId,
      filters,
      page,
      limit
    );

    // Get client-specific ticket statistics
    const clientStats = await SupportTicketsService.getClientTicketStats(clientId);

    // Enhanced response with client context
    const response = {
      client: {
        id: client.id,
        name: client.name,
        plan: client.plan
      },
      tickets: clientTicketsResult.tickets,
      pagination: clientTicketsResult.pagination,
      filters: {
        ...clientTicketsResult.filters,
        client_id: clientId // Ensure client_id is included
      },
      summary: clientTicketsResult.summary,
      client_specific_stats: {
        ...clientStats,
        sla_performance: {
          compliance_rate: clientStats.sla_compliance_rate,
          avg_resolution_time: clientStats.avg_resolution_time_hours,
          performance_rating: clientStats.sla_compliance_rate >= 95 ? 'excellent' :
                             clientStats.sla_compliance_rate >= 85 ? 'good' :
                             clientStats.sla_compliance_rate >= 70 ? 'fair' : 'needs_improvement'
        },
        support_quality: {
          satisfaction_rating: clientStats.satisfaction_rating,
          total_interactions: clientStats.total_tickets,
          resolution_efficiency: clientStats.resolved_tickets > 0 ? 
            Math.round((clientStats.resolved_tickets / clientStats.total_tickets) * 100) : 0
        }
      },
      insights: {
        most_common_category: Object.entries(clientStats.tickets_by_category)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none',
        most_common_priority: Object.entries(clientStats.tickets_by_priority)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none',
        support_trend: clientStats.recent_tickets.length > 0 ? 
          (clientStats.recent_tickets.filter(t => 
            new Date(t.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          ).length > clientStats.recent_tickets.length / 2 ? 'increasing' : 'stable') : 'none',
        recommendations: generateClientRecommendations(clientStats, client.plan)
      }
    };

    // Log the access
    console.log(`🎫 Client tickets accessed: ${client.name} (${clientTicketsResult.tickets.length} tickets) by ${authResult.user.email}`);

    return NextResponse.json({
      ...response,
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Client Tickets API Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function for generating client recommendations
function generateClientRecommendations(stats: any, plan: string): string[] {
  const recommendations = [];

  if (stats.sla_compliance_rate < 85) {
    recommendations.push('Consider upgrading support plan for faster response times');
  }

  if (stats.satisfaction_rating < 4.0 && stats.satisfaction_rating > 0) {
    recommendations.push('Review recent support interactions to improve satisfaction');
  }

  if (stats.tickets_by_category.technical > stats.total_tickets * 0.6) {
    recommendations.push('High technical ticket volume - consider additional training resources');
  }

  if (plan === 'free' && stats.total_tickets > 5) {
    recommendations.push('Consider upgrading to Pro plan for priority support');
  }

  if (stats.open_tickets > stats.total_tickets * 0.3) {
    recommendations.push('High number of open tickets - may need additional support attention');
  }

  return recommendations.length > 0 ? recommendations : ['Support performance is within normal parameters'];
}

/**
 * POST /api/admin/clients/[clientId]/tickets - Create new ticket for specific client
 * Streamlined ticket creation with client context pre-filled
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_SUPPORT_TICKETS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { clientId } = params;

    // Verify client exists
    const client = MOCK_CLIENTS[clientId as keyof typeof MOCK_CLIENTS];
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      title,
      description,
      category,
      priority,
      reporter_name,
      reporter_email,
      reporter_user_id,
      tags,
      metadata
    } = body;

    // Basic validation
    if (!title || !description || !category || !reporter_name || !reporter_email) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, category, reporter_name, reporter_email' },
        { status: 400 }
      );
    }

    // Create ticket data with client context pre-filled
    const ticketData = {
      title,
      description,
      category,
      priority,
      client_id: clientId,
      client_name: client.name,
      client_email: `admin@${client.name.toLowerCase().replace(/\s+/g, '')}.com`, // Mock email
      client_plan: client.plan,
      reporter_name,
      reporter_email,
      reporter_user_id,
      tags: tags || [],
      metadata: {
        ...metadata,
        created_via: 'admin_client_interface',
        client_context: true
      }
    };

    // Create the ticket
    const newTicket = await SupportTicketsService.createTicket(
      ticketData,
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`
    );

    // Log the creation
    console.log(`🎫 Client ticket created: ${newTicket.ticket_number} for ${client.name} by ${authResult.user.email}`);

    return NextResponse.json({
      ticket: newTicket,
      message: 'Support ticket created successfully for client',
      client: {
        id: client.id,
        name: client.name,
        plan: client.plan
      },
      created_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        created_at: new Date().toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Create Client Ticket API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
