// Support Ticket Types for Platform Admin

export interface SupportTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  client_id: string;
  client_name: string;
  client_email: string;
  client_plan: string;
  reporter_user_id?: string;
  reporter_name: string;
  reporter_email: string;
  assigned_admin_id?: string;
  assigned_admin_name?: string;
  assigned_admin_email?: string;
  sla_due_date: string;
  resolution_time_minutes?: number;
  first_response_time_minutes?: number;
  tags: string[];
  attachments: TicketAttachment[];
  comments: TicketComment[];
  resolution_summary?: string;
  satisfaction_rating?: number;
  satisfaction_feedback?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
  metadata?: Record<string, any>;
}

export interface SupportTicketInsert {
  title: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
  client_id: string;
  client_name: string;
  client_email: string;
  client_plan: string;
  reporter_name: string;
  reporter_email: string;
  reporter_user_id?: string;
  tags?: string[];
  attachments?: TicketAttachment[];
  metadata?: Record<string, any>;
}

// Ticket Categories
export enum TicketCategory {
  TECHNICAL = 'technical',
  BILLING = 'billing',
  ACCOUNT = 'account',
  FEATURE_REQUEST = 'feature_request',
  BUG_REPORT = 'bug_report',
  INTEGRATION = 'integration',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  TRAINING = 'training',
  GENERAL = 'general'
}

// Ticket Priorities
export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

// Ticket Status
export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_CLIENT = 'waiting_client',
  WAITING_INTERNAL = 'waiting_internal',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  CANCELLED = 'cancelled'
}

// Ticket Attachments
export interface TicketAttachment {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_url: string;
  uploaded_by: string;
  uploaded_by_name: string;
  uploaded_at: string;
  is_internal: boolean;
}

// Ticket Comments
export interface TicketComment {
  id: string;
  content: string;
  author_id: string;
  author_name: string;
  author_email: string;
  author_type: 'admin' | 'client';
  is_internal: boolean;
  attachments: TicketAttachment[];
  created_at: string;
  updated_at?: string;
  edited_by?: string;
}

// Ticket Filters
export interface TicketFilters {
  status?: TicketStatus[];
  category?: TicketCategory[];
  priority?: TicketPriority[];
  assigned_admin_id?: string;
  client_id?: string;
  client_plan?: string[];
  created_date_from?: string;
  created_date_to?: string;
  sla_overdue?: boolean;
  unassigned?: boolean;
  search?: string;
  tags?: string[];
}

// Ticket Response
export interface TicketResponse {
  tickets: SupportTicket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: TicketFilters;
  summary: TicketSummary;
}

// Ticket Summary
export interface TicketSummary {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  resolved_tickets: number;
  overdue_tickets: number;
  unassigned_tickets: number;
  avg_resolution_time_hours: number;
  avg_first_response_time_hours: number;
  tickets_by_category: Record<TicketCategory, number>;
  tickets_by_priority: Record<TicketPriority, number>;
  tickets_by_status: Record<TicketStatus, number>;
  satisfaction_rating_avg: number;
}

// SLA Configuration
export interface SLAConfig {
  plan_type: string;
  first_response_hours: number;
  resolution_hours: {
    [TicketPriority.LOW]: number;
    [TicketPriority.MEDIUM]: number;
    [TicketPriority.HIGH]: number;
    [TicketPriority.URGENT]: number;
    [TicketPriority.CRITICAL]: number;
  };
  business_hours_only: boolean;
  escalation_hours: number;
}

// Ticket Assignment
export interface TicketAssignment {
  ticket_id: string;
  admin_id: string;
  admin_name: string;
  admin_email: string;
  assigned_by: string;
  assigned_by_name: string;
  assigned_at: string;
  reason?: string;
}

// Ticket Status Change
export interface TicketStatusChange {
  ticket_id: string;
  old_status: TicketStatus;
  new_status: TicketStatus;
  changed_by: string;
  changed_by_name: string;
  changed_at: string;
  reason?: string;
  resolution_summary?: string;
}

// Ticket Escalation
export interface TicketEscalation {
  ticket_id: string;
  escalated_from: TicketPriority;
  escalated_to: TicketPriority;
  escalated_by: string;
  escalated_by_name: string;
  escalated_at: string;
  reason: string;
  auto_escalation: boolean;
}

// Ticket Metrics
export interface TicketMetrics {
  period: 'day' | 'week' | 'month' | 'quarter';
  date_from: string;
  date_to: string;
  total_tickets: number;
  resolved_tickets: number;
  resolution_rate: number;
  avg_resolution_time_hours: number;
  avg_first_response_time_hours: number;
  sla_compliance_rate: number;
  satisfaction_rating_avg: number;
  tickets_by_category: Record<TicketCategory, number>;
  tickets_by_priority: Record<TicketPriority, number>;
  top_clients_by_tickets: Array<{
    client_id: string;
    client_name: string;
    ticket_count: number;
  }>;
  admin_performance: Array<{
    admin_id: string;
    admin_name: string;
    tickets_assigned: number;
    tickets_resolved: number;
    avg_resolution_time_hours: number;
  }>;
}

// Ticket Notification
export interface TicketNotification {
  id: string;
  ticket_id: string;
  type: NotificationType;
  recipient_type: 'admin' | 'client';
  recipient_id: string;
  recipient_email: string;
  subject: string;
  message: string;
  sent_at: string;
  delivery_status: 'pending' | 'sent' | 'failed';
  error_message?: string;
}

export enum NotificationType {
  TICKET_CREATED = 'ticket_created',
  TICKET_ASSIGNED = 'ticket_assigned',
  TICKET_UPDATED = 'ticket_updated',
  TICKET_COMMENTED = 'ticket_commented',
  TICKET_RESOLVED = 'ticket_resolved',
  TICKET_CLOSED = 'ticket_closed',
  SLA_WARNING = 'sla_warning',
  SLA_BREACH = 'sla_breach',
  ESCALATION = 'escalation'
}

// Bulk Ticket Operations
export interface BulkTicketOperation {
  action: 'assign' | 'update_status' | 'update_priority' | 'add_tags' | 'close';
  ticket_ids: string[];
  parameters: Record<string, any>;
  reason?: string;
}

export interface BulkTicketResult {
  success_count: number;
  failure_count: number;
  results: Array<{
    ticket_id: string;
    ticket_number: string;
    success: boolean;
    error?: string;
  }>;
  operation: BulkTicketOperation;
  performed_by: string;
  performed_at: string;
}
