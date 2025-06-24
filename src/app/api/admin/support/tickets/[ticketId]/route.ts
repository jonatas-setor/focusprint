import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { SupportTicketsService } from '@/lib/support/tickets-service';
import { TicketStatus, TicketPriority } from '@/types/support-tickets';

/**
 * GET /api/admin/support/tickets/[ticketId] - Get detailed ticket information
 * Implements PRD Section 3.7.1 - Histórico completo de tickets
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_SUPPORT_TICKETS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { ticketId } = params;

    // Get ticket details
    const ticket = await SupportTicketsService.getTicketById(ticketId);

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Calculate SLA status
    const now = new Date();
    const slaDueDate = new Date(ticket.sla_due_date);
    const isOverdue = now > slaDueDate;
    const timeToSLA = slaDueDate.getTime() - now.getTime();

    // Mock additional data for comprehensive ticket details
    const ticketDetails = {
      ticket,
      sla_status: {
        is_overdue: isOverdue,
        time_to_sla_breach: Math.max(0, timeToSLA),
        hours_to_sla_breach: Math.max(0, Math.floor(timeToSLA / (1000 * 60 * 60))),
        sla_compliance: !isOverdue
      },
      activity_timeline: [
        {
          id: 'activity_1',
          type: 'ticket_created',
          description: `Ticket ${ticket.ticket_number} created`,
          actor_name: ticket.reporter_name,
          actor_type: 'client',
          timestamp: ticket.created_at,
          details: {
            category: ticket.category,
            priority: ticket.priority,
            client_plan: ticket.client_plan
          }
        },
        ...(ticket.assigned_admin_id ? [{
          id: 'activity_2',
          type: 'ticket_assigned',
          description: `Ticket assigned to ${ticket.assigned_admin_name}`,
          actor_name: ticket.metadata?.assigned_by_name || 'System',
          actor_type: 'admin',
          timestamp: ticket.metadata?.assigned_at || ticket.updated_at,
          details: {
            assigned_to: ticket.assigned_admin_name,
            previous_status: 'open',
            new_status: 'in_progress'
          }
        }] : [])
      ],
      related_tickets: [], // Would be populated with tickets from same client
      escalation_history: [],
      client_info: {
        client_id: ticket.client_id,
        client_name: ticket.client_name,
        client_plan: ticket.client_plan,
        total_tickets: 1, // Mock data
        open_tickets: 1,
        avg_satisfaction: 4.2
      }
    };

    // Log the access
    console.log(`🎫 Ticket details accessed: ${ticket.ticket_number} by ${authResult.user.email}`);

    return NextResponse.json({
      ...ticketDetails,
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Ticket Details API Error:', error);
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
 * PUT /api/admin/support/tickets/[ticketId] - Update specific ticket
 * Implements ticket status changes, assignments, and updates
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_SUPPORT_TICKETS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { ticketId } = params;

    // Parse request body
    const body = await request.json();
    const { updates, reason, action } = body;

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'updates object is required' },
        { status: 400 }
      );
    }

    // Get current ticket
    const currentTicket = await SupportTicketsService.getTicketById(ticketId);
    if (!currentTicket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Handle special actions
    if (action === 'assign' && updates.assigned_admin_id) {
      // Special assignment action
      const updatedTicket = await SupportTicketsService.assignTicket(
        ticketId,
        updates.assigned_admin_id,
        updates.assigned_admin_name || 'Unknown Admin',
        updates.assigned_admin_email || '',
        authResult.user.id,
        `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`
      );

      if (!updatedTicket) {
        return NextResponse.json(
          { error: 'Failed to assign ticket' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ticket: updatedTicket,
        message: 'Ticket assigned successfully',
        action: 'assigned',
        reason: reason || 'Ticket assigned via admin interface',
        updated_by: {
          admin_id: authResult.user.id,
          admin_email: authResult.user.email,
          admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
          updated_at: new Date().toISOString()
        }
      });
    }

    // Regular update
    const updatedTicket = await SupportTicketsService.updateTicket(
      ticketId,
      updates,
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`
    );

    if (!updatedTicket) {
      return NextResponse.json(
        { error: 'Failed to update ticket' },
        { status: 500 }
      );
    }

    // Determine what changed
    const changes = [];
    if (updates.status && updates.status !== currentTicket.status) {
      changes.push(`Status: ${currentTicket.status} → ${updates.status}`);
    }
    if (updates.priority && updates.priority !== currentTicket.priority) {
      changes.push(`Priority: ${currentTicket.priority} → ${updates.priority}`);
    }
    if (updates.assigned_admin_id && updates.assigned_admin_id !== currentTicket.assigned_admin_id) {
      changes.push(`Assigned to: ${updates.assigned_admin_name || 'Unknown'}`);
    }

    // Log the update
    console.log(`🎫 Ticket updated: ${updatedTicket.ticket_number} by ${authResult.user.email} - ${changes.join(', ')}`);

    return NextResponse.json({
      ticket: updatedTicket,
      message: 'Ticket updated successfully',
      changes,
      reason: reason || 'Ticket updated via admin interface',
      updated_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Update Ticket API Error:', error);
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
 * DELETE /api/admin/support/tickets/[ticketId] - Close/cancel ticket
 * Implements ticket closure with proper status tracking
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_SUPPORT_TICKETS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { ticketId } = params;

    // Parse request body for closure reason
    const body = await request.json().catch(() => ({}));
    const { reason, resolution_summary, satisfaction_rating } = body;

    // Get current ticket
    const currentTicket = await SupportTicketsService.getTicketById(ticketId);
    if (!currentTicket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Update ticket to closed status
    const updates = {
      status: TicketStatus.CLOSED,
      resolution_summary: resolution_summary || 'Ticket closed by admin',
      satisfaction_rating: satisfaction_rating || undefined,
      closed_at: new Date().toISOString(),
      resolved_at: currentTicket.resolved_at || new Date().toISOString()
    };

    const updatedTicket = await SupportTicketsService.updateTicket(
      ticketId,
      updates,
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`
    );

    if (!updatedTicket) {
      return NextResponse.json(
        { error: 'Failed to close ticket' },
        { status: 500 }
      );
    }

    // Log the closure
    console.log(`🎫 Ticket closed: ${updatedTicket.ticket_number} by ${authResult.user.email}`);

    return NextResponse.json({
      ticket: updatedTicket,
      message: 'Ticket closed successfully',
      reason: reason || 'Ticket closed via admin interface',
      closed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        closed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Close Ticket API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
