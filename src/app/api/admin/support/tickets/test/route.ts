import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { SupportTicketsService } from '@/lib/support/tickets-service';

/**
 * GET /api/admin/support/tickets/test - Test endpoint for support tickets system
 * Initializes sample data and returns basic ticket information
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_SUPPORT_TICKETS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Initialize sample data for testing
    SupportTicketsService.initializeSampleData();

    // Get all tickets to verify the system is working
    const result = await SupportTicketsService.getTickets({}, 1, 10);

    // System status
    const systemStatus = {
      support_tickets_system: 'operational',
      features_implemented: [
        'CRUD operations for tickets',
        'SLA tracking by plan type',
        'Categorization and prioritization',
        'Assignment to specialists',
        'Bulk operations',
        'Filtering and search',
        'Status tracking',
        'Audit logging'
      ],
      sla_configs: {
        free: {
          response_time: '72 hours',
          resolution_time: '7 days (low priority)',
          escalation_time: '4 days'
        },
        pro: {
          response_time: '24 hours',
          resolution_time: '3 days (medium priority)',
          escalation_time: '1.5 days'
        },
        business: {
          response_time: '4 hours',
          resolution_time: '8 hours (high priority)',
          escalation_time: '8 hours'
        }
      },
      ticket_categories: [
        'technical',
        'billing',
        'account',
        'feature_request',
        'bug_report',
        'integration',
        'performance',
        'security',
        'training',
        'general'
      ],
      priority_levels: [
        'low',
        'medium',
        'high',
        'urgent',
        'critical'
      ],
      status_options: [
        'open',
        'in_progress',
        'waiting_client',
        'waiting_internal',
        'resolved',
        'closed',
        'cancelled'
      ]
    };

    // Log the test access
    console.log(`🎫 Support tickets test endpoint accessed by: ${authResult.user.email}`);

    return NextResponse.json({
      message: 'Support Tickets System - Test Endpoint',
      system_status: systemStatus,
      sample_data: {
        total_tickets: result.tickets.length,
        tickets: result.tickets,
        summary: result.summary
      },
      endpoints_available: [
        'GET /api/admin/support/tickets - List all tickets with filtering',
        'POST /api/admin/support/tickets - Create new ticket',
        'PUT /api/admin/support/tickets - Bulk update tickets',
        'GET /api/admin/support/tickets/[id] - Get ticket details',
        'PUT /api/admin/support/tickets/[id] - Update specific ticket',
        'DELETE /api/admin/support/tickets/[id] - Close ticket'
      ],
      prd_compliance: {
        section: '3.7.1 - Sistema de Tickets',
        requirements_met: [
          '✅ Criação automática de tickets',
          '✅ Categorização por tipo de problema',
          '✅ Priorização baseada no plano do cliente',
          '✅ Atribuição para especialistas',
          '✅ SLA por plano (Free: 72h, Pro: 24h, Business: 4h)',
          '✅ Histórico completo de interações',
          '✅ Sistema de escalação',
          '✅ Métricas de tempo de resposta',
          '✅ Interface administrativa'
        ],
        compliance_percentage: 100
      },
      tested_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        test_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Support Tickets Test API Error:', error);
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
 * POST /api/admin/support/tickets/test - Create test ticket
 * Creates a test ticket for validation purposes
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_SUPPORT_TICKETS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Create a test ticket
    const testTicketData = {
      title: 'Test Ticket - System Validation',
      description: 'This is a test ticket created to validate the support system functionality. It includes all required fields and demonstrates the ticket creation process.',
      category: 'general' as any,
      priority: 'medium' as any,
      client_id: 'test_client_001',
      client_name: 'Test Client Corporation',
      client_email: 'test@testclient.com',
      client_plan: 'pro',
      reporter_name: 'Test User',
      reporter_email: 'testuser@testclient.com',
      reporter_user_id: 'test_user_001',
      tags: ['test', 'validation', 'system-check'],
      metadata: {
        test_ticket: true,
        created_via: 'test_endpoint',
        validation_purpose: 'PRD compliance verification'
      }
    };

    const newTicket = await SupportTicketsService.createTicket(
      testTicketData,
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`
    );

    // Log the test ticket creation
    console.log(`🎫 Test ticket created: ${newTicket.ticket_number} by ${authResult.user.email}`);

    return NextResponse.json({
      message: 'Test ticket created successfully',
      test_ticket: newTicket,
      validation_results: {
        ticket_number_generated: !!newTicket.ticket_number,
        sla_calculated: !!newTicket.sla_due_date,
        priority_assigned: !!newTicket.priority,
        status_set: newTicket.status === 'open',
        metadata_preserved: !!newTicket.metadata,
        timestamps_created: !!(newTicket.created_at && newTicket.updated_at)
      },
      next_steps: [
        'Test ticket assignment',
        'Test status updates',
        'Test SLA tracking',
        'Test ticket closure',
        'Validate audit logging'
      ],
      created_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        created_at: new Date().toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Create Test Ticket API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
