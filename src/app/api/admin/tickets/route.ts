import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { SupportTicketService } from '@/lib/support/ticket-service';
import { 
  TicketFilters, 
  TicketCategory, 
  TicketPriority, 
  TicketStatus 
} from '@/types/support-tickets';

// Initialize the service
SupportTicketService.initializeService();

// GET /api/admin/tickets - Get support tickets with filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_SUPPORT_TICKETS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 per page

    // Parse filter parameters
    const filters: TicketFilters = {};

    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')!.split(',') as TicketStatus[];
    }

    if (searchParams.get('category')) {
      filters.category = searchParams.get('category')!.split(',') as TicketCategory[];
    }

    if (searchParams.get('priority')) {
      filters.priority = searchParams.get('priority')!.split(',') as TicketPriority[];
    }

    if (searchParams.get('assigned_admin_id')) {
      filters.assigned_admin_id = searchParams.get('assigned_admin_id')!;
    }

    if (searchParams.get('client_id')) {
      filters.client_id = searchParams.get('client_id')!;
    }

    if (searchParams.get('client_plan')) {
      filters.client_plan = searchParams.get('client_plan')!.split(',');
    }

    if (searchParams.get('unassigned') === 'true') {
      filters.unassigned = true;
    }

    if (searchParams.get('sla_overdue') === 'true') {
      filters.sla_overdue = true;
    }

    if (searchParams.get('created_date_from')) {
      filters.created_date_from = searchParams.get('created_date_from')!;
    }

    if (searchParams.get('created_date_to')) {
      filters.created_date_to = searchParams.get('created_date_to')!;
    }

    if (searchParams.get('tags')) {
      filters.tags = searchParams.get('tags')!.split(',');
    }

    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')!;
    }

    // Get support tickets
    const response = await SupportTicketService.getTickets(filters, page, limit);

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
    console.error('Error fetching support tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    );
  }
}

// POST /api/admin/tickets - Create a new support ticket
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_SUPPORT_TICKETS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

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

    // Validate required fields
    if (!title || !description || !category || !client_id || !client_name || !client_email || !client_plan || !reporter_name || !reporter_email) {
      return NextResponse.json(
        { error: 'title, description, category, client_id, client_name, client_email, client_plan, reporter_name, and reporter_email are required' },
        { status: 400 }
      );
    }

    // Validate category
    if (!Object.values(TicketCategory).includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${Object.values(TicketCategory).join(', ')}` },
        { status: 400 }
      );
    }

    // Validate priority if provided
    if (priority && !Object.values(TicketPriority).includes(priority)) {
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

    // Create support ticket
    const ticket = await SupportTicketService.createTicket(
      {
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
        tags: tags || [],
        metadata
      },
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      requestInfo
    );

    return NextResponse.json({
      message: 'Support ticket created successfully',
      ticket,
      created_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        created_at: ticket.created_at
      }
    });

  } catch (error) {
    console.error('Error creating support ticket:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create support ticket' },
      { status: 500 }
    );
  }
}
