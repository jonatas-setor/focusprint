/**
 * Support Tickets Service
 * Implements PRD Section 3.7.1 - Sistema de Tickets
 */

import {
  SupportTicket,
  SupportTicketInsert,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketFilters,
  TicketResponse,
  TicketSummary,
  SLAConfig,
  TicketComment,
  TicketAttachment
} from '@/types/support-tickets';

// Mock storage for development (replace with database in production)
class TicketStorage {
  private static tickets: SupportTicket[] = [];
  private static nextId = 1;

  static getAll(): SupportTicket[] {
    return [...this.tickets];
  }

  static getById(id: string): SupportTicket | null {
    return this.tickets.find(ticket => ticket.id === id) || null;
  }

  static create(ticket: SupportTicket): SupportTicket {
    this.tickets.push(ticket);
    return ticket;
  }

  static update(id: string, updates: Partial<SupportTicket>): SupportTicket | null {
    const index = this.tickets.findIndex(ticket => ticket.id === id);
    if (index === -1) return null;

    this.tickets[index] = { ...this.tickets[index], ...updates, updated_at: new Date().toISOString() };
    return this.tickets[index];
  }

  static delete(id: string): boolean {
    const index = this.tickets.findIndex(ticket => ticket.id === id);
    if (index === -1) return false;

    this.tickets.splice(index, 1);
    return true;
  }

  static getNextTicketNumber(): string {
    const year = new Date().getFullYear();
    const number = this.nextId.toString().padStart(4, '0');
    this.nextId++;
    return `FS-${year}-${number}`;
  }

  static clear(): void {
    this.tickets = [];
    this.nextId = 1;
  }
}

// SLA Configuration by plan (PRD requirement)
const SLA_CONFIGS: Record<string, SLAConfig> = {
  'free': {
    plan_type: 'free',
    first_response_hours: 72, // 3 days
    resolution_hours: {
      [TicketPriority.LOW]: 168, // 7 days
      [TicketPriority.MEDIUM]: 120, // 5 days
      [TicketPriority.HIGH]: 72, // 3 days
      [TicketPriority.URGENT]: 48, // 2 days
      [TicketPriority.CRITICAL]: 24 // 1 day
    },
    business_hours_only: true,
    escalation_hours: 96 // 4 days
  },
  'pro': {
    plan_type: 'pro',
    first_response_hours: 24, // 1 day
    resolution_hours: {
      [TicketPriority.LOW]: 72, // 3 days
      [TicketPriority.MEDIUM]: 48, // 2 days
      [TicketPriority.HIGH]: 24, // 1 day
      [TicketPriority.URGENT]: 12, // 12 hours
      [TicketPriority.CRITICAL]: 4 // 4 hours
    },
    business_hours_only: false,
    escalation_hours: 36 // 1.5 days
  },
  'business': {
    plan_type: 'business',
    first_response_hours: 4, // 4 hours
    resolution_hours: {
      [TicketPriority.LOW]: 24, // 1 day
      [TicketPriority.MEDIUM]: 12, // 12 hours
      [TicketPriority.HIGH]: 8, // 8 hours
      [TicketPriority.URGENT]: 4, // 4 hours
      [TicketPriority.CRITICAL]: 2 // 2 hours
    },
    business_hours_only: false,
    escalation_hours: 8 // 8 hours
  }
};

export class SupportTicketsService {
  /**
   * Create a new support ticket
   */
  static async createTicket(
    ticketData: SupportTicketInsert,
    createdBy: string,
    createdByName: string
  ): Promise<SupportTicket> {
    try {
      const now = new Date().toISOString();
      const ticketNumber = TicketStorage.getNextTicketNumber();
      
      // Auto-assign priority based on plan if not provided
      const priority = ticketData.priority || this.getDefaultPriorityByPlan(ticketData.client_plan);
      
      // Calculate SLA due date
      const slaConfig = SLA_CONFIGS[ticketData.client_plan] || SLA_CONFIGS['free'];
      const slaDueDate = this.calculateSLADueDate(priority, slaConfig);

      const ticket: SupportTicket = {
        id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ticket_number: ticketNumber,
        title: ticketData.title,
        description: ticketData.description,
        category: ticketData.category,
        priority,
        status: TicketStatus.OPEN,
        client_id: ticketData.client_id,
        client_name: ticketData.client_name,
        client_email: ticketData.client_email,
        client_plan: ticketData.client_plan,
        reporter_user_id: ticketData.reporter_user_id,
        reporter_name: ticketData.reporter_name,
        reporter_email: ticketData.reporter_email,
        sla_due_date: slaDueDate,
        tags: ticketData.tags || [],
        attachments: ticketData.attachments || [],
        comments: [],
        created_at: now,
        updated_at: now,
        metadata: {
          ...ticketData.metadata,
          created_by: createdBy,
          created_by_name: createdByName,
          sla_config: slaConfig
        }
      };

      const createdTicket = TicketStorage.create(ticket);
      
      console.log(`🎫 Ticket created: ${ticketNumber} for client ${ticketData.client_name}`);
      
      return createdTicket;

    } catch (error) {
      console.error('Error creating ticket:', error);
      throw new Error(`Failed to create ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get tickets with filtering and pagination
   */
  static async getTickets(
    filters: TicketFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<TicketResponse> {
    try {
      let tickets = TicketStorage.getAll();

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        tickets = tickets.filter(ticket => filters.status!.includes(ticket.status));
      }

      if (filters.category && filters.category.length > 0) {
        tickets = tickets.filter(ticket => filters.category!.includes(ticket.category));
      }

      if (filters.priority && filters.priority.length > 0) {
        tickets = tickets.filter(ticket => filters.priority!.includes(ticket.priority));
      }

      if (filters.client_id) {
        tickets = tickets.filter(ticket => ticket.client_id === filters.client_id);
      }

      if (filters.assigned_admin_id) {
        tickets = tickets.filter(ticket => ticket.assigned_admin_id === filters.assigned_admin_id);
      }

      if (filters.unassigned) {
        tickets = tickets.filter(ticket => !ticket.assigned_admin_id);
      }

      if (filters.sla_overdue) {
        const now = new Date();
        tickets = tickets.filter(ticket => new Date(ticket.sla_due_date) < now);
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        tickets = tickets.filter(ticket =>
          ticket.title.toLowerCase().includes(searchLower) ||
          ticket.description.toLowerCase().includes(searchLower) ||
          ticket.ticket_number.toLowerCase().includes(searchLower) ||
          ticket.client_name.toLowerCase().includes(searchLower)
        );
      }

      // Sort by created date (newest first)
      tickets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Apply pagination
      const total = tickets.length;
      const pages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const paginatedTickets = tickets.slice(offset, offset + limit);

      // Calculate summary
      const summary = this.calculateTicketSummary(TicketStorage.getAll());

      return {
        tickets: paginatedTickets,
        pagination: {
          page,
          limit,
          total,
          pages
        },
        filters,
        summary
      };

    } catch (error) {
      console.error('Error getting tickets:', error);
      throw new Error(`Failed to get tickets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get ticket by ID
   */
  static async getTicketById(ticketId: string): Promise<SupportTicket | null> {
    try {
      return TicketStorage.getById(ticketId);
    } catch (error) {
      console.error('Error getting ticket by ID:', error);
      throw new Error(`Failed to get ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update ticket
   */
  static async updateTicket(
    ticketId: string,
    updates: Partial<SupportTicket>,
    updatedBy: string,
    updatedByName: string
  ): Promise<SupportTicket | null> {
    try {
      const updatedTicket = TicketStorage.update(ticketId, {
        ...updates,
        metadata: {
          ...updates.metadata,
          updated_by: updatedBy,
          updated_by_name: updatedByName
        }
      });

      if (updatedTicket) {
        console.log(`🎫 Ticket updated: ${updatedTicket.ticket_number} by ${updatedByName}`);
      }

      return updatedTicket;
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw new Error(`Failed to update ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assign ticket to admin
   */
  static async assignTicket(
    ticketId: string,
    adminId: string,
    adminName: string,
    adminEmail: string,
    assignedBy: string,
    assignedByName: string
  ): Promise<SupportTicket | null> {
    try {
      const updates = {
        assigned_admin_id: adminId,
        assigned_admin_name: adminName,
        assigned_admin_email: adminEmail,
        status: TicketStatus.IN_PROGRESS,
        metadata: {
          assigned_by: assignedBy,
          assigned_by_name: assignedByName,
          assigned_at: new Date().toISOString()
        }
      };

      const updatedTicket = TicketStorage.update(ticketId, updates);

      if (updatedTicket) {
        console.log(`🎫 Ticket assigned: ${updatedTicket.ticket_number} to ${adminName}`);
      }

      return updatedTicket;
    } catch (error) {
      console.error('Error assigning ticket:', error);
      throw new Error(`Failed to assign ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate default priority based on client plan
   */
  private static getDefaultPriorityByPlan(plan: string): TicketPriority {
    const priorityMap: Record<string, TicketPriority> = {
      'free': TicketPriority.LOW,
      'pro': TicketPriority.MEDIUM,
      'business': TicketPriority.HIGH
    };

    return priorityMap[plan] || TicketPriority.LOW;
  }

  /**
   * Calculate SLA due date based on priority and plan
   */
  private static calculateSLADueDate(priority: TicketPriority, slaConfig: SLAConfig): string {
    const now = new Date();
    const resolutionHours = slaConfig.resolution_hours[priority];
    const dueDate = new Date(now.getTime() + (resolutionHours * 60 * 60 * 1000));
    return dueDate.toISOString();
  }

  /**
   * Calculate ticket summary statistics
   */
  private static calculateTicketSummary(tickets: SupportTicket[]): TicketSummary {
    const now = new Date();
    
    return {
      total_tickets: tickets.length,
      open_tickets: tickets.filter(t => t.status === TicketStatus.OPEN).length,
      in_progress_tickets: tickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length,
      resolved_tickets: tickets.filter(t => t.status === TicketStatus.RESOLVED).length,
      overdue_tickets: tickets.filter(t => new Date(t.sla_due_date) < now).length,
      unassigned_tickets: tickets.filter(t => !t.assigned_admin_id).length,
      avg_resolution_time_hours: this.calculateAverageResolutionTime(tickets),
      avg_first_response_time_hours: this.calculateAverageFirstResponseTime(tickets),
      tickets_by_category: this.groupTicketsByCategory(tickets),
      tickets_by_priority: this.groupTicketsByPriority(tickets),
      tickets_by_status: this.groupTicketsByStatus(tickets),
      satisfaction_rating_avg: this.calculateAverageSatisfactionRating(tickets)
    };
  }

  private static calculateAverageResolutionTime(tickets: SupportTicket[]): number {
    const resolvedTickets = tickets.filter(t => t.resolution_time_minutes);
    if (resolvedTickets.length === 0) return 0;
    
    const totalMinutes = resolvedTickets.reduce((sum, t) => sum + (t.resolution_time_minutes || 0), 0);
    return Math.round((totalMinutes / resolvedTickets.length) / 60 * 100) / 100; // Convert to hours
  }

  private static calculateAverageFirstResponseTime(tickets: SupportTicket[]): number {
    const respondedTickets = tickets.filter(t => t.first_response_time_minutes);
    if (respondedTickets.length === 0) return 0;
    
    const totalMinutes = respondedTickets.reduce((sum, t) => sum + (t.first_response_time_minutes || 0), 0);
    return Math.round((totalMinutes / respondedTickets.length) / 60 * 100) / 100; // Convert to hours
  }

  private static groupTicketsByCategory(tickets: SupportTicket[]): Record<TicketCategory, number> {
    const groups = {} as Record<TicketCategory, number>;
    Object.values(TicketCategory).forEach(category => {
      groups[category] = tickets.filter(t => t.category === category).length;
    });
    return groups;
  }

  private static groupTicketsByPriority(tickets: SupportTicket[]): Record<TicketPriority, number> {
    const groups = {} as Record<TicketPriority, number>;
    Object.values(TicketPriority).forEach(priority => {
      groups[priority] = tickets.filter(t => t.priority === priority).length;
    });
    return groups;
  }

  private static groupTicketsByStatus(tickets: SupportTicket[]): Record<TicketStatus, number> {
    const groups = {} as Record<TicketStatus, number>;
    Object.values(TicketStatus).forEach(status => {
      groups[status] = tickets.filter(t => t.status === status).length;
    });
    return groups;
  }

  private static calculateAverageSatisfactionRating(tickets: SupportTicket[]): number {
    const ratedTickets = tickets.filter(t => t.satisfaction_rating);
    if (ratedTickets.length === 0) return 0;
    
    const totalRating = ratedTickets.reduce((sum, t) => sum + (t.satisfaction_rating || 0), 0);
    return Math.round((totalRating / ratedTickets.length) * 100) / 100;
  }

  /**
   * Get tickets for a specific client (NEW: Client integration)
   */
  static async getClientTickets(
    clientId: string,
    filters: Omit<TicketFilters, 'client_id'> = {},
    page: number = 1,
    limit: number = 20
  ): Promise<TicketResponse> {
    try {
      // Add client_id to filters
      const clientFilters: TicketFilters = {
        ...filters,
        client_id: clientId
      };

      return await this.getTickets(clientFilters, page, limit);
    } catch (error) {
      console.error('Error getting client tickets:', error);
      throw new Error(`Failed to get client tickets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get ticket statistics for a specific client (NEW: Client integration)
   */
  static async getClientTicketStats(clientId: string): Promise<{
    total_tickets: number;
    open_tickets: number;
    resolved_tickets: number;
    avg_resolution_time_hours: number;
    satisfaction_rating: number;
    recent_tickets: SupportTicket[];
    tickets_by_category: Record<TicketCategory, number>;
    tickets_by_priority: Record<TicketPriority, number>;
    sla_compliance_rate: number;
  }> {
    try {
      const allClientTickets = TicketStorage.getAll().filter(ticket => ticket.client_id === clientId);

      const stats = {
        total_tickets: allClientTickets.length,
        open_tickets: allClientTickets.filter(t => t.status === TicketStatus.OPEN || t.status === TicketStatus.IN_PROGRESS).length,
        resolved_tickets: allClientTickets.filter(t => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED).length,
        avg_resolution_time_hours: this.calculateAverageResolutionTime(allClientTickets),
        satisfaction_rating: this.calculateAverageSatisfactionRating(allClientTickets),
        recent_tickets: allClientTickets
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5),
        tickets_by_category: this.groupTicketsByCategory(allClientTickets),
        tickets_by_priority: this.groupTicketsByPriority(allClientTickets),
        sla_compliance_rate: this.calculateSLAComplianceRate(allClientTickets)
      };

      return stats;
    } catch (error) {
      console.error('Error getting client ticket stats:', error);
      throw new Error(`Failed to get client ticket stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate SLA compliance rate for tickets
   */
  private static calculateSLAComplianceRate(tickets: SupportTicket[]): number {
    if (tickets.length === 0) return 100;

    const now = new Date();
    const slaCompliantTickets = tickets.filter(ticket => {
      const slaDueDate = new Date(ticket.sla_due_date);
      const isResolved = ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED;

      if (isResolved && ticket.resolved_at) {
        const resolvedDate = new Date(ticket.resolved_at);
        return resolvedDate <= slaDueDate;
      } else {
        // For open tickets, check if they're still within SLA
        return now <= slaDueDate;
      }
    });

    return Math.round((slaCompliantTickets.length / tickets.length) * 100);
  }

  /**
   * Initialize with sample data for testing
   */
  static initializeSampleData(): void {
    // Clear existing data
    TicketStorage.clear();

    // Create sample tickets with proper client integration
    const sampleTickets = [
      {
        title: 'Cannot access dashboard after login',
        description: 'User reports that after successful login, the dashboard shows a blank page.',
        category: TicketCategory.TECHNICAL,
        client_id: 'client_1',
        client_name: 'Acme Corporation',
        client_email: 'admin@acme.com',
        client_plan: 'business',
        reporter_name: 'John Doe',
        reporter_email: 'john@acme.com',
        tags: ['login', 'dashboard', 'urgent']
      },
      {
        title: 'Billing question about upgrade',
        description: 'Client wants to understand the pricing difference between Pro and Business plans.',
        category: TicketCategory.BILLING,
        client_id: 'client_2',
        client_name: 'Tech Startup Ltda',
        client_email: 'contact@techstartup.com',
        client_plan: 'pro',
        reporter_name: 'Jane Smith',
        reporter_email: 'jane@techstartup.com',
        tags: ['billing', 'upgrade', 'pricing']
      },
      {
        title: 'Feature request: Dark mode',
        description: 'Multiple users have requested a dark mode option for the interface.',
        category: TicketCategory.FEATURE_REQUEST,
        client_id: 'client_3',
        client_name: 'Design Agency',
        client_email: 'hello@designagency.com',
        client_plan: 'free',
        reporter_name: 'Mike Johnson',
        reporter_email: 'mike@designagency.com',
        tags: ['feature', 'ui', 'dark-mode']
      },
      {
        title: 'Integration help with Slack',
        description: 'Need assistance setting up Slack integration for project notifications.',
        category: TicketCategory.INTEGRATION,
        client_id: 'client_1',
        client_name: 'Acme Corporation',
        client_email: 'admin@acme.com',
        client_plan: 'business',
        reporter_name: 'Sarah Wilson',
        reporter_email: 'sarah@acme.com',
        tags: ['integration', 'slack', 'notifications']
      },
      {
        title: 'Performance issues with large projects',
        description: 'The application becomes slow when working with projects that have more than 1000 tasks.',
        category: TicketCategory.PERFORMANCE,
        client_id: 'client_2',
        client_name: 'Tech Startup Ltda',
        client_email: 'contact@techstartup.com',
        client_plan: 'pro',
        reporter_name: 'David Chen',
        reporter_email: 'david@techstartup.com',
        tags: ['performance', 'large-projects', 'optimization']
      }
    ];

    sampleTickets.forEach(ticketData => {
      this.createTicket(ticketData as SupportTicketInsert, 'system', 'System');
    });

    console.log('🎫 Sample ticket data initialized with client integration');
  }
}
