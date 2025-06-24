import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { SupportTicketService } from '@/lib/support/ticket-service';

// POST /api/admin/tickets/[ticketId]/assign - Assign ticket to admin
export async function POST(
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
    const { admin_id, admin_name, admin_email, reason } = body;

    // Validate required fields
    if (!admin_id || !admin_name || !admin_email) {
      return NextResponse.json(
        { error: 'admin_id, admin_name, and admin_email are required' },
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

    // Assign ticket
    const updatedTicket = await SupportTicketService.assignTicket(
      ticketId,
      admin_id,
      admin_name,
      admin_email,
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      reason || `Ticket assigned to ${admin_name}`,
      requestInfo
    );

    return NextResponse.json({
      message: 'Ticket assigned successfully',
      ticket: updatedTicket,
      assignment: {
        assigned_to: {
          admin_id,
          admin_name,
          admin_email
        },
        assigned_by: {
          admin_id: authResult.user.id,
          admin_email: authResult.user.email,
          admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`
        },
        assigned_at: updatedTicket.updated_at
      }
    });

  } catch (error) {
    console.error('Error assigning ticket:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign ticket' },
      { status: 500 }
    );
  }
}

// GET /api/admin/tickets/[ticketId]/assign - Get assignment options
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

    // Get the ticket
    const ticket = await SupportTicketService.getTicketById(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { error: 'Support ticket not found' },
        { status: 404 }
      );
    }

    // Mock available admins (in real implementation, would query admin_profiles)
    const availableAdmins = [
      {
        admin_id: 'admin_001',
        admin_name: 'Technical Support Lead',
        admin_email: 'tech-lead@focusprint.com',
        role: 'technical_admin',
        specialties: ['technical', 'integration', 'performance'],
        current_tickets: 5,
        avg_resolution_time_hours: 8.5
      },
      {
        admin_id: 'admin_002',
        admin_name: 'Billing Specialist',
        admin_email: 'billing@focusprint.com',
        role: 'billing_admin',
        specialties: ['billing', 'account'],
        current_tickets: 3,
        avg_resolution_time_hours: 4.2
      },
      {
        admin_id: 'admin_003',
        admin_name: 'Product Manager',
        admin_email: 'product@focusprint.com',
        role: 'product_admin',
        specialties: ['feature_request', 'general'],
        current_tickets: 8,
        avg_resolution_time_hours: 24.0
      },
      {
        admin_id: 'admin_004',
        admin_name: 'Security Specialist',
        admin_email: 'security@focusprint.com',
        role: 'security_admin',
        specialties: ['security', 'technical'],
        current_tickets: 2,
        avg_resolution_time_hours: 6.0
      }
    ];

    // Suggest best admin based on ticket category and current workload
    const suggestedAdmin = availableAdmins
      .filter(admin => admin.specialties.includes(ticket.category))
      .sort((a, b) => a.current_tickets - b.current_tickets)[0] || availableAdmins[0];

    return NextResponse.json({
      ticket_info: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        title: ticket.title,
        category: ticket.category,
        priority: ticket.priority,
        current_assignment: ticket.assigned_admin_id ? {
          admin_id: ticket.assigned_admin_id,
          admin_name: ticket.assigned_admin_name,
          admin_email: ticket.assigned_admin_email
        } : null
      },
      available_admins: availableAdmins,
      suggested_admin: suggestedAdmin,
      assignment_rules: {
        auto_assign_enabled: true,
        category_specialists: {
          technical: ['admin_001', 'admin_004'],
          billing: ['admin_002'],
          security: ['admin_004'],
          feature_request: ['admin_003'],
          general: ['admin_001', 'admin_003']
        },
        workload_balancing: true,
        priority_escalation: {
          critical: 'admin_001',
          urgent: 'admin_001',
          high: 'auto',
          medium: 'auto',
          low: 'auto'
        }
      },
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting assignment options:', error);
    return NextResponse.json(
      { error: 'Failed to get assignment options' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/tickets/[ticketId]/assign - Unassign ticket
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
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || 'Ticket unassigned';

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

    // Unassign ticket by removing assignment fields
    const updatedTicket = await SupportTicketService.updateTicket(
      ticketId,
      {
        assigned_admin_id: undefined,
        assigned_admin_name: undefined,
        assigned_admin_email: undefined
      },
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      reason,
      requestInfo
    );

    return NextResponse.json({
      message: 'Ticket unassigned successfully',
      ticket: updatedTicket,
      unassigned_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        unassigned_at: updatedTicket.updated_at
      }
    });

  } catch (error) {
    console.error('Error unassigning ticket:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to unassign ticket' },
      { status: 500 }
    );
  }
}
