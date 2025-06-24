import {
  ClientImpersonationSession,
  ClientImpersonationSessionInsert,
  ImpersonationRequest,
  ImpersonationResponse,
  ImpersonationStatus,
  ImpersonationHistory,
  ImpersonationFilters,
  ImpersonationPermission,
  ImpersonationReason,
  ImpersonationValidation,
  ImpersonationEvent
} from '@/types/client-impersonation';

// In-memory storage for impersonation sessions (in production, this would be a database)
class ImpersonationStorage {
  private static sessions: ClientImpersonationSession[] = [];
  private static maxSessions = 1000; // Keep last 1000 sessions

  static add(session: ClientImpersonationSession): void {
    this.sessions.unshift(session); // Add to beginning for chronological order
    
    // Keep only the most recent sessions
    if (this.sessions.length > this.maxSessions) {
      this.sessions = this.sessions.slice(0, this.maxSessions);
    }
  }

  static getAll(): ClientImpersonationSession[] {
    return [...this.sessions];
  }

  static getById(sessionId: string): ClientImpersonationSession | null {
    return this.sessions.find(session => session.id === sessionId) || null;
  }

  static getByToken(token: string): ClientImpersonationSession | null {
    return this.sessions.find(session => session.session_token === token) || null;
  }

  static getActiveByAdmin(adminId: string): ClientImpersonationSession[] {
    return this.sessions.filter(session => 
      session.admin_id === adminId && 
      session.status === 'active' &&
      new Date(session.expires_at) > new Date()
    );
  }

  static update(sessionId: string, updates: Partial<ClientImpersonationSession>): boolean {
    const index = this.sessions.findIndex(session => session.id === sessionId);
    if (index === -1) return false;

    this.sessions[index] = {
      ...this.sessions[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return true;
  }

  static filter(filters: ImpersonationFilters): ClientImpersonationSession[] {
    let filteredSessions = [...this.sessions];

    if (filters.admin_id) {
      filteredSessions = filteredSessions.filter(session => session.admin_id === filters.admin_id);
    }

    if (filters.client_id) {
      filteredSessions = filteredSessions.filter(session => session.client_id === filters.client_id);
    }

    if (filters.user_id) {
      filteredSessions = filteredSessions.filter(session => session.impersonated_user_id === filters.user_id);
    }

    if (filters.status && filters.status.length > 0) {
      filteredSessions = filteredSessions.filter(session => filters.status!.includes(session.status));
    }

    if (filters.date_from) {
      filteredSessions = filteredSessions.filter(session => session.started_at >= filters.date_from!);
    }

    if (filters.date_to) {
      filteredSessions = filteredSessions.filter(session => session.started_at <= filters.date_to!);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredSessions = filteredSessions.filter(session => 
        session.admin_email.toLowerCase().includes(searchLower) ||
        session.client_name.toLowerCase().includes(searchLower) ||
        session.impersonated_user_email.toLowerCase().includes(searchLower) ||
        session.reason.toLowerCase().includes(searchLower)
      );
    }

    return filteredSessions;
  }

  static clear(): void {
    this.sessions = [];
  }
}

// Main Impersonation Service
export class ImpersonationService {
  private static readonly DEFAULT_DURATION_MINUTES = 60; // 1 hour
  private static readonly MAX_DURATION_MINUTES = 480; // 8 hours
  private static readonly MAX_CONCURRENT_SESSIONS = 3;

  /**
   * Start a client impersonation session
   */
  static async startImpersonation(
    adminId: string,
    adminEmail: string,
    adminName: string,
    request: ImpersonationRequest,
    requestInfo?: { ip_address?: string; user_agent?: string }
  ): Promise<ImpersonationResponse> {
    try {
      // Validate the impersonation request
      const validation = await this.validateImpersonation(adminId, request);
      if (!validation.is_valid) {
        throw new Error(`Impersonation validation failed: ${validation.errors.join(', ')}`);
      }

      // Check concurrent session limit
      const activeSessions = ImpersonationStorage.getActiveByAdmin(adminId);
      if (activeSessions.length >= this.MAX_CONCURRENT_SESSIONS) {
        throw new Error(`Maximum concurrent impersonation sessions reached (${this.MAX_CONCURRENT_SESSIONS})`);
      }

      // Generate session details
      const sessionId = `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const sessionToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
      const startedAt = new Date().toISOString();
      const durationMinutes = Math.min(request.duration_minutes || this.DEFAULT_DURATION_MINUTES, this.MAX_DURATION_MINUTES);
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

      // Get client and user information (mock data for now)
      const clientInfo = await this.getClientInfo(request.client_id);
      const userInfo = await this.getUserInfo(request.user_id);

      // Create impersonation session
      const session: ClientImpersonationSession = {
        id: sessionId,
        admin_id: adminId,
        admin_email: adminEmail,
        admin_name: adminName,
        client_id: request.client_id,
        client_name: clientInfo.name,
        client_email: clientInfo.email,
        impersonated_user_id: request.user_id,
        impersonated_user_email: userInfo.email,
        impersonated_user_name: userInfo.name,
        session_token: sessionToken,
        reason: request.reason,
        ip_address: requestInfo?.ip_address,
        user_agent: requestInfo?.user_agent,
        started_at: startedAt,
        expires_at: expiresAt,
        status: 'active',
        permissions: request.permissions,
        metadata: {
          duration_minutes: durationMinutes,
          require_approval: request.require_approval || false
        },
        created_at: startedAt,
        updated_at: startedAt
      };

      // Store the session
      ImpersonationStorage.add(session);

      // Log the impersonation start
      await this.logImpersonationEvent('session_started', session);

      // Generate dashboard URL for the impersonated user
      const dashboardUrl = `/dashboard?impersonation_token=${sessionToken}`;

      return {
        session,
        access_token: sessionToken,
        dashboard_url: dashboardUrl,
        expires_at: expiresAt,
        permissions: request.permissions,
        warnings: validation.warnings
      };

    } catch (error) {
      throw new Error(`Failed to start impersonation: ${error.message}`);
    }
  }

  /**
   * End an impersonation session
   */
  static async endImpersonation(
    sessionId: string,
    adminId: string,
    reason: string = 'Manual termination'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const session = ImpersonationStorage.getById(sessionId);
      if (!session) {
        return { success: false, message: 'Impersonation session not found' };
      }

      if (session.admin_id !== adminId) {
        return { success: false, message: 'Unauthorized to end this session' };
      }

      if (session.status !== 'active') {
        return { success: false, message: 'Session is not active' };
      }

      // Update session status
      const updated = ImpersonationStorage.update(sessionId, {
        status: 'terminated',
        ended_at: new Date().toISOString(),
        metadata: {
          ...session.metadata,
          termination_reason: reason
        }
      });

      if (!updated) {
        return { success: false, message: 'Failed to update session' };
      }

      // Log the impersonation end
      const updatedSession = ImpersonationStorage.getById(sessionId)!;
      await this.logImpersonationEvent('session_ended', updatedSession);

      return { success: true, message: 'Impersonation session ended successfully' };

    } catch (error) {
      return { success: false, message: `Failed to end impersonation: ${error.message}` };
    }
  }

  /**
   * Get current impersonation status
   */
  static async getImpersonationStatus(token: string): Promise<ImpersonationStatus | null> {
    try {
      const session = ImpersonationStorage.getByToken(token);
      if (!session) {
        return null;
      }

      // Check if session is expired
      if (new Date(session.expires_at) <= new Date()) {
        // Auto-expire the session
        ImpersonationStorage.update(session.id, { status: 'expired' });
        await this.logImpersonationEvent('session_expired', session);
        return null;
      }

      if (session.status !== 'active') {
        return null;
      }

      const timeRemaining = Math.max(0, new Date(session.expires_at).getTime() - Date.now());

      return {
        is_impersonating: true,
        session,
        original_admin: {
          id: session.admin_id,
          email: session.admin_email,
          name: session.admin_name
        },
        impersonated_user: {
          id: session.impersonated_user_id,
          email: session.impersonated_user_email,
          name: session.impersonated_user_name,
          client_name: session.client_name
        },
        permissions: session.permissions,
        time_remaining: Math.floor(timeRemaining / 1000 / 60) // minutes
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Get impersonation history with filtering
   */
  static async getImpersonationHistory(
    filters: ImpersonationFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<ImpersonationHistory> {
    const filteredSessions = ImpersonationStorage.filter(filters);
    const total = filteredSessions.length;
    const pages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const sessions = filteredSessions.slice(offset, offset + limit);

    // Calculate summary
    const summary = {
      total_sessions: total,
      active_sessions: filteredSessions.filter(s => s.status === 'active').length,
      expired_sessions: filteredSessions.filter(s => s.status === 'expired').length,
      terminated_sessions: filteredSessions.filter(s => s.status === 'terminated').length,
      unique_admins: new Set(filteredSessions.map(s => s.admin_id)).size,
      unique_clients: new Set(filteredSessions.map(s => s.client_id)).size,
      average_duration_minutes: this.calculateAverageDuration(filteredSessions),
      date_range: {
        from: filteredSessions.length > 0 ? filteredSessions[filteredSessions.length - 1].started_at : '',
        to: filteredSessions.length > 0 ? filteredSessions[0].started_at : ''
      }
    };

    return {
      sessions,
      pagination: { page, limit, total, pages },
      filters,
      summary
    };
  }

  /**
   * Validate impersonation request
   */
  private static async validateImpersonation(
    adminId: string,
    request: ImpersonationRequest
  ): Promise<ImpersonationValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!request.client_id) errors.push('Client ID is required');
    if (!request.user_id) errors.push('User ID is required');
    if (!request.reason) errors.push('Reason is required');
    if (!request.permissions || request.permissions.length === 0) {
      errors.push('At least one permission is required');
    }

    // Validate duration
    if (request.duration_minutes && request.duration_minutes > this.MAX_DURATION_MINUTES) {
      errors.push(`Duration cannot exceed ${this.MAX_DURATION_MINUTES} minutes`);
    }

    // Mock validation for client and user status
    const clientStatus = 'active'; // Would check actual client status
    const userStatus = 'active'; // Would check actual user status

    if (clientStatus !== 'active') {
      errors.push('Client account is not active');
    }

    if (userStatus !== 'active') {
      errors.push('User account is not active');
    }

    // Check for sensitive permissions
    if (request.permissions.includes(ImpersonationPermission.FULL_ACCESS)) {
      warnings.push('Full access permission granted - use with caution');
    }

    return {
      is_valid: errors.length === 0,
      can_impersonate: errors.length === 0,
      errors,
      warnings,
      client_status: clientStatus as any,
      user_status: userStatus as any,
      admin_permissions: [] // Would check actual admin permissions
    };
  }

  /**
   * Get client information
   */
  private static async getClientInfo(clientId: string): Promise<{ name: string; email: string }> {
    // Mock implementation - would query actual client data
    return {
      name: `Client ${clientId.slice(0, 8)}`,
      email: `client-${clientId.slice(0, 8)}@example.com`
    };
  }

  /**
   * Get user information
   */
  private static async getUserInfo(userId: string): Promise<{ name: string; email: string }> {
    // Mock implementation - would query actual user data
    return {
      name: `User ${userId.slice(0, 8)}`,
      email: `user-${userId.slice(0, 8)}@example.com`
    };
  }

  /**
   * Log impersonation events for audit
   */
  private static async logImpersonationEvent(
    eventType: 'session_started' | 'session_ended' | 'session_expired',
    session: ClientImpersonationSession
  ): Promise<void> {
    try {
      const { AuditService } = await import('../audit/audit-service');
      const { AuditAction, ResourceType, AuditSeverity } = await import('../../types/audit-log');

      const actionMap = {
        session_started: AuditAction.CLIENT_IMPERSONATED,
        session_ended: AuditAction.CLIENT_IMPERSONATION_ENDED,
        session_expired: AuditAction.CLIENT_IMPERSONATION_ENDED
      };

      const action = actionMap[eventType];
      const description = `${eventType.replace('_', ' ')} for client ${session.client_name} (${session.client_email}) by admin ${session.admin_name}`;

      await AuditService.log({
        admin_id: session.admin_id,
        admin_email: session.admin_email,
        admin_name: session.admin_name,
        action,
        resource_type: ResourceType.CLIENT,
        resource_id: session.client_id,
        resource_name: session.client_name,
        details: {
          description,
          context: {
            impersonation_session_id: session.id,
            impersonated_user: session.impersonated_user_email,
            reason: session.reason,
            permissions: session.permissions,
            duration_minutes: session.metadata?.duration_minutes
          }
        },
        severity: AuditSeverity.HIGH,
        status: 'success',
        ip_address: session.ip_address,
        user_agent: session.user_agent
      });

    } catch (error) {
      // Silent fail for logging
    }
  }

  /**
   * Calculate average session duration
   */
  private static calculateAverageDuration(sessions: ClientImpersonationSession[]): number {
    if (sessions.length === 0) return 0;

    const completedSessions = sessions.filter(s => s.ended_at);
    if (completedSessions.length === 0) return 0;

    const totalDuration = completedSessions.reduce((sum, session) => {
      const start = new Date(session.started_at).getTime();
      const end = new Date(session.ended_at!).getTime();
      return sum + (end - start);
    }, 0);

    return Math.round(totalDuration / completedSessions.length / 1000 / 60); // minutes
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    const allSessions = ImpersonationStorage.getAll();
    const now = new Date();
    let cleanedCount = 0;

    for (const session of allSessions) {
      if (session.status === 'active' && new Date(session.expires_at) <= now) {
        ImpersonationStorage.update(session.id, { status: 'expired' });
        await this.logImpersonationEvent('session_expired', session);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get active sessions count
   */
  static getActiveSessionsCount(): number {
    return ImpersonationStorage.getAll().filter(s => 
      s.status === 'active' && new Date(s.expires_at) > new Date()
    ).length;
  }
}
