import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { SupportTicketService } from '@/lib/support/ticket-service';
import { TicketStatus, TicketPriority } from '@/types/support-tickets';

// GET /api/admin/tickets/[ticketId] - Get a specific support ticket
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

    // Get support ticket
    const ticket = await SupportTicketService.getTicketById(ticketId);
    
    if (!ticket) {
      return NextResponse.json(
        { error: 'Support ticket not found' },
        { status: 404 }
      );
    }

    // Calculate additional information
    const now = new Date();
    const slaOverdue = new Date(ticket.sla_due_date) < now && !['resolved', 'closed', 'cancelled'].includes(ticket.status);
    const timeUntilSLA = Math.max(0, new Date(ticket.sla_due_date).getTime() - now.getTime());
    const hoursUntilSLA = Math.round(timeUntilSLA / (1000 * 60 * 60) * 100) / 100;

    return NextResponse.json({
      ticket,
      sla_info: {
        is_overdue: slaOverdue,
        hours_until_due: hoursUntilSLA,
        due_date: ticket.sla_due_date
      },
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching support ticket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support ticket' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/tickets/[ticketId] - Update a support ticket
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
    const body = await request.json();
    const { reason, ...updates } = body;

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.ticket_number;
    delete updates.created_at;
    delete updates.updated_at;

    // Validate status if being updated
    if (updates.status && !Object.values(TicketStatus).includes(updates.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${Object.values(TicketStatus).join(', ')}` },
        { status: 400 }
      );
    }

    // Validate priority if being updated
    if (updates.priority && !Object.values(TicketPriority).includes(updates.priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${Object.values(TicketPriority).join(', ')}` },
        { status: 400 }
      );
    }

    // Extract request information
    const getClientIP = (req: Request): string => {
      const forwarded = req.headers.get('x-forwarded-for');
      const realIP = req.headers.get('x-real-ip');
      
      if (forwarded) return forwarded.split(',')[0].trim();
      if (realIP) return realIP;
      return 'unknown';
    };

    const requestInfo = {
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || undefined
    };

    // Update support ticket
    const updatedTicket = await SupportTicketService.updateTicket(
      ticketId,
      updates,
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      reason,
      requestInfo
    );

    return NextResponse.json({
      message: 'Support ticket updated successfully',
      ticket: updatedTicket,
      updated_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        updated_at: updatedTicket.updated_at
      }
    });

  } catch (error) {
    console.error('Error updating support ticket:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update support ticket' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/tickets/[ticketId] - Delete a support ticket
export async function DELETE(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions (higher permission for deletion)
    const authResult = await checkAdminAuth(supabase, AdminPermission.SYSTEM_CONFIG, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { ticketId } = params;
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || 'Support ticket deleted';

    // Get the ticket before deletion for logging
    const ticket = await SupportTicketService.getTicketById(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { error: 'Support ticket not found' },
        { status: 404 }
      );
    }

    // Log the deletion before actually deleting
    try {
      const { AuditService } = await import('@/lib/audit/audit-service');
      const { AuditAction, ResourceType, AuditSeverity } = await import('@/types/audit-log');
      
      await AuditService.log({
        admin_id: authResult.user.id,
        admin_email: authResult.user.email || '',
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        action: AuditAction.TICKET_DELETED,
        resource_type: ResourceType.TICKET,
        resource_id: ticket.id,
        resource_name: ticket.title,
        details: {
          description: `Support ticket deleted: ${ticket.ticket_number}`,
          context: {
            ticket_number: ticket.ticket_number,
            category: ticket.category,
            priority: ticket.priority,
            status: ticket.status,
            client_name: ticket.client_name,
            reason
          }
        },
        severity: AuditSeverity.HIGH,
        status: 'success'
      });
    } catch (auditError) {
      console.error('Failed to log ticket deletion:', auditError);
    }

    // Delete the ticket (this would be a soft delete in production)
    // For now, we'll just mark it as cancelled
    const cancelledTicket = await SupportTicketService.changeTicketStatus(
      ticketId,
      TicketStatus.CANCELLED,
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      reason
    );

    return NextResponse.json({
      message: 'Support ticket deleted successfully',
      deleted_ticket: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        title: ticket.title,
        status: 'cancelled'
      },
      deleted_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        deleted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error deleting support ticket:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete support ticket' },
      { status: 500 }
    );
  }
}
