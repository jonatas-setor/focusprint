import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { SupportTicketsService } from '@/lib/support/tickets-service';
import {
  SupportTicketInsert,
  TicketFilters,
  TicketCategory,
  TicketPriority,
  TicketStatus
} from '@/types/support-tickets';

/**
 * GET /api/admin/support/tickets - List all support tickets with filtering
 * Implements PRD Section 3.7.1 - Sistema de Tickets
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_SUPPORT_TICKETS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Parse filters
    const filters: TicketFilters = {
      status: searchParams.get('status')?.split(',') as TicketStatus[] | undefined,
      category: searchParams.get('category')?.split(',') as TicketCategory[] | undefined,
      priority: searchParams.get('priority')?.split(',') as TicketPriority[] | undefined,
      client_id: searchParams.get('client_id') || undefined,
      assigned_admin_id: searchParams.get('assigned_admin_id') || undefined,
      unassigned: searchParams.get('unassigned') === 'true',
      sla_overdue: searchParams.get('sla_overdue') === 'true',
      search: searchParams.get('search') || undefined,
      created_date_from: searchParams.get('created_date_from') || undefined,
      created_date_to: searchParams.get('created_date_to') || undefined
    };

    // Get tickets with filters and pagination
    const result = await SupportTicketsService.getTickets(filters, page, limit);

    // Log the access
    console.log(`🎫 Support tickets accessed by admin: ${authResult.user.email}`);

    return NextResponse.json({
      ...result,
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Support Tickets API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/support/tickets - Create new support ticket
 * Implements PRD Section 3.7.1 - Criação automática de tickets
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_SUPPORT_TICKETS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Parse request body
    const body = await request.json();
    const {
      title,
      description,
      category,
      priority,
      client_id,
      client_name,
      client_email,
      client_plan,
      reporter_name,
      reporter_email,
      reporter_user_id,
      tags,
      metadata
    } = body;

    // Basic validation
    if (!title || !description || !category || !client_id || !client_name || !reporter_name || !reporter_email) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, category, client_id, client_name, reporter_name, reporter_email' },
        { status: 400 }
      );
    }

    // Validate category
    if (!Object.values(TicketCategory).includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Validate priority if provided
    if (priority && !Object.values(TicketPriority).includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority' },
        { status: 400 }
      );
    }

    // Create ticket data
    const ticketData: SupportTicketInsert = {
      title,
      description,
      category,
      priority,
      client_id,
      client_name,
      client_email,
      client_plan: client_plan || 'free',
      reporter_name,
      reporter_email,
      reporter_user_id,
      tags: tags || [],
      metadata: metadata || {}
    };

    // Create the ticket
    const newTicket = await SupportTicketsService.createTicket(
      ticketData,
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`
    );

    // Log the creation
    console.log(`🎫 Support ticket created: ${newTicket.ticket_number} by ${authResult.user.email}`);

    return NextResponse.json({
      ticket: newTicket,
      message: 'Support ticket created successfully',
      created_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        created_at: new Date().toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Create Support Ticket API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/support/tickets - Bulk update multiple tickets
 * Implements bulk operations for ticket management
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_SUPPORT_TICKETS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Parse request body
    const body = await request.json();
    const { ticket_ids, updates, reason } = body;

    if (!Array.isArray(ticket_ids) || ticket_ids.length === 0) {
      return NextResponse.json(
        { error: 'ticket_ids array is required' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'updates object is required' },
        { status: 400 }
      );
    }

    // Update each ticket
    const results = [];
    const adminName = `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`;

    for (const ticketId of ticket_ids) {
      try {
        const updatedTicket = await SupportTicketsService.updateTicket(
          ticketId,
          updates,
          authResult.user.id,
          adminName
        );

        if (updatedTicket) {
          results.push({
            ticket_id: ticketId,
            ticket_number: updatedTicket.ticket_number,
            success: true,
            ticket: updatedTicket
          });
        } else {
          results.push({
            ticket_id: ticketId,
            success: false,
            error: 'Ticket not found'
          });
        }
      } catch (error) {
        results.push({
          ticket_id: ticketId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    // Log the bulk update
    console.log(`🎫 Bulk ticket update by ${authResult.user.email}: ${successCount} success, ${failureCount} failures`);

    return NextResponse.json({
      results,
      summary: {
        total: ticket_ids.length,
        success: successCount,
        failures: failureCount
      },
      reason: reason || 'Bulk update via admin interface',
      updated_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: adminName,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Bulk Update Tickets API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
