import {
  SupportTicket,
  SupportTicketInsert,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketComment,
  TicketAttachment,
  TicketFilters,
  TicketResponse,
  TicketSummary,
  TicketAssignment,
  TicketStatusChange,
  SLAConfig,
  TicketMetrics,
  BulkTicketOperation,
  BulkTicketResult
} from '@/types/support-tickets';

// In-memory storage for support tickets (in production, this would be a database)
class TicketStorage {
  private static tickets: SupportTicket[] = [];
  private static ticketCounter = 1;
  private static maxTickets = 10000; // Keep last 10,000 tickets

  static add(ticket: SupportTicket): void {
    this.tickets.unshift(ticket); // Add to beginning for chronological order
    
    // Keep only the most recent tickets
    if (this.tickets.length > this.maxTickets) {
      this.tickets = this.tickets.slice(0, this.maxTickets);
    }
  }

  static getAll(): SupportTicket[] {
    return [...this.tickets];
  }

  static getById(ticketId: string): SupportTicket | null {
    return this.tickets.find(ticket => ticket.id === ticketId) || null;
  }

  static getByNumber(ticketNumber: string): SupportTicket | null {
    return this.tickets.find(ticket => ticket.ticket_number === ticketNumber) || null;
  }

  static update(ticketId: string, updates: Partial<SupportTicket>): boolean {
    const index = this.tickets.findIndex(ticket => ticket.id === ticketId);
    if (index === -1) return false;

    this.tickets[index] = {
      ...this.tickets[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return true;
  }

  static delete(ticketId: string): boolean {
    const index = this.tickets.findIndex(ticket => ticket.id === ticketId);
    if (index === -1) return false;

    this.tickets.splice(index, 1);
    return true;
  }

  static filter(filters: TicketFilters): SupportTicket[] {
    let filteredTickets = [...this.tickets];

    if (filters.status && filters.status.length > 0) {
      filteredTickets = filteredTickets.filter(ticket => filters.status!.includes(ticket.status));
    }

    if (filters.category && filters.category.length > 0) {
      filteredTickets = filteredTickets.filter(ticket => filters.category!.includes(ticket.category));
    }

    if (filters.priority && filters.priority.length > 0) {
      filteredTickets = filteredTickets.filter(ticket => filters.priority!.includes(ticket.priority));
    }

    if (filters.assigned_admin_id) {
      filteredTickets = filteredTickets.filter(ticket => ticket.assigned_admin_id === filters.assigned_admin_id);
    }

    if (filters.client_id) {
      filteredTickets = filteredTickets.filter(ticket => ticket.client_id === filters.client_id);
    }

    if (filters.client_plan && filters.client_plan.length > 0) {
      filteredTickets = filteredTickets.filter(ticket => filters.client_plan!.includes(ticket.client_plan));
    }

    if (filters.unassigned) {
      filteredTickets = filteredTickets.filter(ticket => !ticket.assigned_admin_id);
    }

    if (filters.sla_overdue) {
      const now = new Date();
      filteredTickets = filteredTickets.filter(ticket => 
        new Date(ticket.sla_due_date) < now && 
        !['resolved', 'closed', 'cancelled'].includes(ticket.status)
      );
    }

    if (filters.created_date_from) {
      filteredTickets = filteredTickets.filter(ticket => ticket.created_at >= filters.created_date_from!);
    }

    if (filters.created_date_to) {
      filteredTickets = filteredTickets.filter(ticket => ticket.created_at <= filters.created_date_to!);
    }

    if (filters.tags && filters.tags.length > 0) {
      filteredTickets = filteredTickets.filter(ticket => 
        filters.tags!.some(tag => ticket.tags.includes(tag))
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredTickets = filteredTickets.filter(ticket => 
        ticket.title.toLowerCase().includes(searchLower) ||
        ticket.description.toLowerCase().includes(searchLower) ||
        ticket.ticket_number.toLowerCase().includes(searchLower) ||
        ticket.client_name.toLowerCase().includes(searchLower) ||
        ticket.reporter_name.toLowerCase().includes(searchLower) ||
        ticket.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    return filteredTickets;
  }

  static generateTicketNumber(): string {
    const number = this.ticketCounter++;
    return `TKT-${String(number).padStart(6, '0')}`;
  }

  static clear(): void {
    this.tickets = [];
    this.ticketCounter = 1;
  }

  static initializeDefaultTickets(): void {
    // Initialize with some default tickets for testing
    const defaultTickets: SupportTicket[] = [
      {
        id: 'ticket_001',
        ticket_number: 'TKT-000001',
        title: 'Unable to access dashboard',
        description: 'User reports that they cannot log into the dashboard. Getting error message "Invalid credentials" even with correct password.',
        category: TicketCategory.TECHNICAL,
        priority: TicketPriority.HIGH,
        status: TicketStatus.OPEN,
        client_id: 'client_001',
        client_name: 'Acme Corporation',
        client_email: 'admin@acme.com',
        client_plan: 'PRO',
        reporter_name: 'John Smith',
        reporter_email: 'john@acme.com',
        sla_due_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
        tags: ['login', 'authentication', 'dashboard'],
        attachments: [],
        comments: [],
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'ticket_002',
        ticket_number: 'TKT-000002',
        title: 'Billing inquiry - incorrect charges',
        description: 'We were charged for 10 users but only have 8 active users in our account. Please review and adjust the billing.',
        category: TicketCategory.BILLING,
        priority: TicketPriority.MEDIUM,
        status: TicketStatus.IN_PROGRESS,
        client_id: 'client_002',
        client_name: 'Tech Solutions Ltd',
        client_email: 'billing@techsolutions.com',
        client_plan: 'BUSINESS',
        reporter_name: 'Sarah Johnson',
        reporter_email: 'sarah@techsolutions.com',
        assigned_admin_id: 'admin_001',
        assigned_admin_name: 'Admin User',
        assigned_admin_email: 'admin@focusprint.com',
        sla_due_date: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(), // 22 hours from now
        tags: ['billing', 'user-count', 'charges'],
        attachments: [],
        comments: [
          {
            id: 'comment_001',
            content: 'Thank you for reporting this. I am reviewing your account and will get back to you within 2 hours.',
            author_id: 'admin_001',
            author_name: 'Admin User',
            author_email: 'admin@focusprint.com',
            author_type: 'admin',
            is_internal: false,
            attachments: [],
            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
          }
        ],
        first_response_time_minutes: 90,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
      },
      {
        id: 'ticket_003',
        ticket_number: 'TKT-000003',
        title: 'Feature request: Dark mode',
        description: 'It would be great to have a dark mode option for the dashboard. Many of our team members work in low-light environments.',
        category: TicketCategory.FEATURE_REQUEST,
        priority: TicketPriority.LOW,
        status: TicketStatus.RESOLVED,
        client_id: 'client_003',
        client_name: 'Creative Agency',
        client_email: 'contact@creativeagency.com',
        client_plan: 'PRO',
        reporter_name: 'Mike Wilson',
        reporter_email: 'mike@creativeagency.com',
        assigned_admin_id: 'admin_002',
        assigned_admin_name: 'Product Manager',
        assigned_admin_email: 'product@focusprint.com',
        sla_due_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago (overdue but resolved)
        resolution_time_minutes: 2880, // 48 hours
        first_response_time_minutes: 120, // 2 hours
        resolution_summary: 'Dark mode has been added to our product roadmap for Q2 2024. We will notify you when it becomes available.',
        satisfaction_rating: 4,
        tags: ['feature-request', 'ui', 'dark-mode'],
        attachments: [],
        comments: [
          {
            id: 'comment_002',
            content: 'Thank you for the suggestion! This is a popular request and we are considering it for our next major release.',
            author_id: 'admin_002',
            author_name: 'Product Manager',
            author_email: 'product@focusprint.com',
            author_type: 'admin',
            is_internal: false,
            attachments: [],
            created_at: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString() // 46 hours ago
          }
        ],
        created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours ago
        updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        resolved_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
      }
    ];

    this.tickets = defaultTickets;
    this.ticketCounter = 4; // Next ticket will be TKT-000004
  }
}

// SLA Configuration by plan
const SLA_CONFIGS: Record<string, SLAConfig> = {
  'FREE': {
    plan_type: 'FREE',
    first_response_hours: 48,
    resolution_hours: {
      [TicketPriority.LOW]: 120,
      [TicketPriority.MEDIUM]: 72,
      [TicketPriority.HIGH]: 48,
      [TicketPriority.URGENT]: 24,
      [TicketPriority.CRITICAL]: 12
    },
    business_hours_only: true,
    escalation_hours: 72
  },
  'PRO': {
    plan_type: 'PRO',
    first_response_hours: 8,
    resolution_hours: {
      [TicketPriority.LOW]: 48,
      [TicketPriority.MEDIUM]: 24,
      [TicketPriority.HIGH]: 8,
      [TicketPriority.URGENT]: 4,
      [TicketPriority.CRITICAL]: 2
    },
    business_hours_only: false,
    escalation_hours: 24
  },
  'BUSINESS': {
    plan_type: 'BUSINESS',
    first_response_hours: 2,
    resolution_hours: {
      [TicketPriority.LOW]: 24,
      [TicketPriority.MEDIUM]: 8,
      [TicketPriority.HIGH]: 4,
      [TicketPriority.URGENT]: 2,
      [TicketPriority.CRITICAL]: 1
    },
    business_hours_only: false,
    escalation_hours: 8
  }
};

// Main Support Ticket Service
export class SupportTicketService {
  /**
   * Initialize the service with default tickets
   */
  static initialize(): void {
    TicketStorage.initializeDefaultTickets();
  }

  /**
   * Create a new support ticket
   */
  static async createTicket(
    ticketData: SupportTicketInsert,
    createdBy?: string,
    createdByName?: string,
    requestInfo?: { ip_address?: string; user_agent?: string }
  ): Promise<SupportTicket> {
    try {
      // Generate ticket ID and number
      const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const ticketNumber = TicketStorage.generateTicketNumber();
      const now = new Date().toISOString();

      // Determine priority if not specified
      const priority = ticketData.priority || this.determinePriority(ticketData.category, ticketData.description);

      // Calculate SLA due date
      const slaConfig = SLA_CONFIGS[ticketData.client_plan] || SLA_CONFIGS['FREE'];
      const slaDueDate = this.calculateSLADueDate(priority, slaConfig);

      // Create support ticket
      const ticket: SupportTicket = {
        id: ticketId,
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
        metadata: ticketData.metadata
      };

      // Store the ticket
      TicketStorage.add(ticket);

      // Log the ticket creation
      await this.logTicketActivity(
        ticket,
        'created',
        createdBy || 'system',
        createdByName || 'System',
        'Support ticket created',
        requestInfo
      );

      return ticket;

    } catch (error) {
      console.error('Error creating support ticket:', error);
      throw new Error(`Failed to create support ticket: ${error.message}`);
    }
  }

  /**
   * Get support tickets with filtering and pagination
   */
  static async getTickets(
    filters: TicketFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<TicketResponse> {
    const filteredTickets = TicketStorage.filter(filters);
    const total = filteredTickets.length;
    const pages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const tickets = filteredTickets.slice(offset, offset + limit);

    // Calculate summary
    const allTickets = TicketStorage.getAll();
    const summary = this.calculateTicketSummary(allTickets);

    return {
      tickets,
      pagination: { page, limit, total, pages },
      filters,
      summary
    };
  }

  /**
   * Get a single support ticket by ID
   */
  static async getTicketById(ticketId: string): Promise<SupportTicket | null> {
    return TicketStorage.getById(ticketId);
  }

  /**
   * Get a support ticket by number
   */
  static async getTicketByNumber(ticketNumber: string): Promise<SupportTicket | null> {
    return TicketStorage.getByNumber(ticketNumber);
  }

  /**
   * Update a support ticket
   */
  static async updateTicket(
    ticketId: string,
    updates: Partial<SupportTicket>,
    updatedBy: string,
    updatedByName: string,
    reason?: string,
    requestInfo?: { ip_address?: string; user_agent?: string }
  ): Promise<SupportTicket> {
    try {
      const existingTicket = TicketStorage.getById(ticketId);
      if (!existingTicket) {
        throw new Error('Support ticket not found');
      }

      // Track what changed
      const changes: Array<{ field: string; old_value: any; new_value: any }> = [];

      Object.keys(updates).forEach(key => {
        if (key !== 'updated_at') {
          const oldValue = existingTicket[key as keyof SupportTicket];
          const newValue = updates[key as keyof SupportTicket];
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes.push({ field: key, old_value: oldValue, new_value: newValue });
          }
        }
      });

      // Update the ticket
      const updated = TicketStorage.update(ticketId, updates);

      if (!updated) {
        throw new Error('Failed to update support ticket');
      }

      const updatedTicket = TicketStorage.getById(ticketId)!;

      // Log the update
      await this.logTicketActivity(
        updatedTicket,
        'updated',
        updatedBy,
        updatedByName,
        reason || 'Support ticket updated',
        requestInfo,
        { changes }
      );

      return updatedTicket;

    } catch (error) {
      console.error('Error updating support ticket:', error);
      throw new Error(`Failed to update support ticket: ${error.message}`);
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
    assignedByName: string,
    reason?: string,
    requestInfo?: { ip_address?: string; user_agent?: string }
  ): Promise<SupportTicket> {
    try {
      const ticket = TicketStorage.getById(ticketId);
      if (!ticket) {
        throw new Error('Support ticket not found');
      }

      const updates = {
        assigned_admin_id: adminId,
        assigned_admin_name: adminName,
        assigned_admin_email: adminEmail,
        status: ticket.status === TicketStatus.OPEN ? TicketStatus.IN_PROGRESS : ticket.status
      };

      const updatedTicket = await this.updateTicket(
        ticketId,
        updates,
        assignedBy,
        assignedByName,
        reason || `Ticket assigned to ${adminName}`,
        requestInfo
      );

      return updatedTicket;

    } catch (error) {
      console.error('Error assigning support ticket:', error);
      throw new Error(`Failed to assign support ticket: ${error.message}`);
    }
  }

  /**
   * Change ticket status
   */
  static async changeTicketStatus(
    ticketId: string,
    newStatus: TicketStatus,
    changedBy: string,
    changedByName: string,
    reason?: string,
    resolutionSummary?: string,
    requestInfo?: { ip_address?: string; user_agent?: string }
  ): Promise<SupportTicket> {
    try {
      const ticket = TicketStorage.getById(ticketId);
      if (!ticket) {
        throw new Error('Support ticket not found');
      }

      const updates: Partial<SupportTicket> = {
        status: newStatus
      };

      // Set resolution/close timestamps
      if (newStatus === TicketStatus.RESOLVED) {
        updates.resolved_at = new Date().toISOString();
        updates.resolution_summary = resolutionSummary;

        // Calculate resolution time
        const createdTime = new Date(ticket.created_at).getTime();
        const resolvedTime = new Date().getTime();
        updates.resolution_time_minutes = Math.round((resolvedTime - createdTime) / (1000 * 60));
      } else if (newStatus === TicketStatus.CLOSED) {
        updates.closed_at = new Date().toISOString();
        if (!ticket.resolved_at) {
          updates.resolved_at = new Date().toISOString();
        }
      }

      const updatedTicket = await this.updateTicket(
        ticketId,
        updates,
        changedBy,
        changedByName,
        reason || `Ticket status changed to ${newStatus}`,
        requestInfo
      );

      return updatedTicket;

    } catch (error) {
      console.error('Error changing ticket status:', error);
      throw new Error(`Failed to change ticket status: ${error.message}`);
    }
  }

  /**
   * Add comment to ticket
   */
  static async addComment(
    ticketId: string,
    content: string,
    authorId: string,
    authorName: string,
    authorEmail: string,
    authorType: 'admin' | 'client',
    isInternal: boolean = false,
    attachments: TicketAttachment[] = [],
    requestInfo?: { ip_address?: string; user_agent?: string }
  ): Promise<SupportTicket> {
    try {
      const ticket = TicketStorage.getById(ticketId);
      if (!ticket) {
        throw new Error('Support ticket not found');
      }

      const comment: TicketComment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content,
        author_id: authorId,
        author_name: authorName,
        author_email: authorEmail,
        author_type: authorType,
        is_internal: isInternal,
        attachments,
        created_at: new Date().toISOString()
      };

      // Calculate first response time if this is the first admin response
      let updates: Partial<SupportTicket> = {
        comments: [...ticket.comments, comment]
      };

      if (authorType === 'admin' && !ticket.first_response_time_minutes) {
        const createdTime = new Date(ticket.created_at).getTime();
        const responseTime = new Date().getTime();
        updates.first_response_time_minutes = Math.round((responseTime - createdTime) / (1000 * 60));
      }

      const updatedTicket = await this.updateTicket(
        ticketId,
        updates,
        authorId,
        authorName,
        `Comment added by ${authorName}`,
        requestInfo
      );

      return updatedTicket;

    } catch (error) {
      console.error('Error adding comment to ticket:', error);
      throw new Error(`Failed to add comment to ticket: ${error.message}`);
    }
  }

  /**
   * Calculate ticket summary statistics
   */
  private static calculateTicketSummary(tickets: SupportTicket[]): TicketSummary {
    const now = new Date();

    const summary: TicketSummary = {
      total_tickets: tickets.length,
      open_tickets: tickets.filter(t => t.status === TicketStatus.OPEN).length,
      in_progress_tickets: tickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length,
      resolved_tickets: tickets.filter(t => t.status === TicketStatus.RESOLVED).length,
      overdue_tickets: tickets.filter(t =>
        new Date(t.sla_due_date) < now &&
        !['resolved', 'closed', 'cancelled'].includes(t.status)
      ).length,
      unassigned_tickets: tickets.filter(t => !t.assigned_admin_id).length,
      avg_resolution_time_hours: 0,
      avg_first_response_time_hours: 0,
      tickets_by_category: {} as Record<TicketCategory, number>,
      tickets_by_priority: {} as Record<TicketPriority, number>,
      tickets_by_status: {} as Record<TicketStatus, number>,
      satisfaction_rating_avg: 0
    };

    // Calculate averages
    const resolvedTickets = tickets.filter(t => t.resolution_time_minutes);
    if (resolvedTickets.length > 0) {
      const totalResolutionTime = resolvedTickets.reduce((sum, t) => sum + (t.resolution_time_minutes || 0), 0);
      summary.avg_resolution_time_hours = Math.round((totalResolutionTime / resolvedTickets.length) / 60 * 100) / 100;
    }

    const respondedTickets = tickets.filter(t => t.first_response_time_minutes);
    if (respondedTickets.length > 0) {
      const totalResponseTime = respondedTickets.reduce((sum, t) => sum + (t.first_response_time_minutes || 0), 0);
      summary.avg_first_response_time_hours = Math.round((totalResponseTime / respondedTickets.length) / 60 * 100) / 100;
    }

    const ratedTickets = tickets.filter(t => t.satisfaction_rating);
    if (ratedTickets.length > 0) {
      const totalRating = ratedTickets.reduce((sum, t) => sum + (t.satisfaction_rating || 0), 0);
      summary.satisfaction_rating_avg = Math.round((totalRating / ratedTickets.length) * 100) / 100;
    }

    // Count by category
    Object.values(TicketCategory).forEach(category => {
      summary.tickets_by_category[category] = tickets.filter(t => t.category === category).length;
    });

    // Count by priority
    Object.values(TicketPriority).forEach(priority => {
      summary.tickets_by_priority[priority] = tickets.filter(t => t.priority === priority).length;
    });

    // Count by status
    Object.values(TicketStatus).forEach(status => {
      summary.tickets_by_status[status] = tickets.filter(t => t.status === status).length;
    });

    return summary;
  }

  /**
   * Determine priority based on category and description
   */
  private static determinePriority(category: TicketCategory, description: string): TicketPriority {
    const descriptionLower = description.toLowerCase();

    // Critical keywords
    if (descriptionLower.includes('critical') || descriptionLower.includes('urgent') ||
        descriptionLower.includes('down') || descriptionLower.includes('outage')) {
      return TicketPriority.CRITICAL;
    }

    // High priority keywords
    if (descriptionLower.includes('cannot') || descriptionLower.includes('unable') ||
        descriptionLower.includes('error') || descriptionLower.includes('broken')) {
      return TicketPriority.HIGH;
    }

    // Category-based priority
    switch (category) {
      case TicketCategory.SECURITY:
        return TicketPriority.HIGH;
      case TicketCategory.BILLING:
        return TicketPriority.MEDIUM;
      case TicketCategory.TECHNICAL:
        return TicketPriority.MEDIUM;
      case TicketCategory.FEATURE_REQUEST:
        return TicketPriority.LOW;
      default:
        return TicketPriority.MEDIUM;
    }
  }

  /**
   * Calculate SLA due date based on priority and plan
   */
  private static calculateSLADueDate(priority: TicketPriority, slaConfig: SLAConfig): string {
    const now = new Date();
    const resolutionHours = slaConfig.resolution_hours[priority];

    if (slaConfig.business_hours_only) {
      // Add business hours logic here (simplified for demo)
      return new Date(now.getTime() + resolutionHours * 60 * 60 * 1000).toISOString();
    } else {
      return new Date(now.getTime() + resolutionHours * 60 * 60 * 1000).toISOString();
    }
  }

  /**
   * Log ticket activity for audit
   */
  private static async logTicketActivity(
    ticket: SupportTicket,
    action: string,
    performedBy: string,
    performedByName: string,
    description: string,
    requestInfo?: { ip_address?: string; user_agent?: string },
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const { AuditService } = await import('../audit/audit-service');
      const { AuditAction, ResourceType, AuditSeverity } = await import('../../types/audit-log');

      const auditActionMap: Record<string, any> = {
        'created': AuditAction.TICKET_CREATED,
        'updated': AuditAction.TICKET_UPDATED,
        'assigned': AuditAction.TICKET_ASSIGNED,
        'status_changed': AuditAction.TICKET_STATUS_CHANGED,
        'commented': AuditAction.TICKET_COMMENTED,
        'resolved': AuditAction.TICKET_RESOLVED,
        'closed': AuditAction.TICKET_CLOSED
      };

      const auditAction = auditActionMap[action] || AuditAction.TICKET_UPDATED;

      await AuditService.log({
        admin_id: performedBy,
        admin_email: performedBy, // Would get actual email in real implementation
        admin_name: performedByName,
        action: auditAction,
        resource_type: ResourceType.TICKET,
        resource_id: ticket.id,
        resource_name: ticket.title,
        details: {
          description,
          context: {
            ticket_number: ticket.ticket_number,
            category: ticket.category,
            priority: ticket.priority,
            status: ticket.status,
            client_name: ticket.client_name,
            assigned_admin: ticket.assigned_admin_name,
            ...metadata
          }
        },
        severity: action === 'created' ? AuditSeverity.MEDIUM : AuditSeverity.LOW,
        status: 'success',
        ip_address: requestInfo?.ip_address,
        user_agent: requestInfo?.user_agent
      });

    } catch (error) {
      console.error('Failed to log ticket activity:', error);
    }
  }

  /**
   * Get ticket statistics
   */
  static getStatistics(): {
    total_tickets: number;
    open_tickets: number;
    overdue_tickets: number;
    avg_resolution_time_hours: number;
    tickets_by_category: Record<TicketCategory, number>;
    tickets_by_priority: Record<TicketPriority, number>;
  } {
    const tickets = TicketStorage.getAll();
    const summary = this.calculateTicketSummary(tickets);

    return {
      total_tickets: summary.total_tickets,
      open_tickets: summary.open_tickets,
      overdue_tickets: summary.overdue_tickets,
      avg_resolution_time_hours: summary.avg_resolution_time_hours,
      tickets_by_category: summary.tickets_by_category,
      tickets_by_priority: summary.tickets_by_priority
    };
  }

  /**
   * Initialize service with default tickets
   */
  static initializeService(): void {
    TicketStorage.initializeDefaultTickets();
  }
}
