/**
 * Session Timeout Service for Platform Admin
 * Implements PRD Section 3.2.1 requirement: "Timeout automático após 30 minutos de inatividade"
 */

export interface SessionInfo {
  userId: string;
  email: string;
  lastActivity: number;
  expiresAt: number;
  isActive: boolean;
}

export interface SessionTimeoutConfig {
  timeoutMinutes: number;
  warningMinutes: number;
  checkIntervalSeconds: number;
}

// Default configuration for Platform Admin (PRD requirement: 30 minutes)
// TEMPORARILY EXTENDED FOR TESTING - WILL REVERT TO 30 MINUTES AFTER TESTING
export const ADMIN_SESSION_CONFIG: SessionTimeoutConfig = {
  timeoutMinutes: 480,       // 8 hours for testing (was 30 minutes as per PRD)
  warningMinutes: 5,         // Show warning 5 minutes before timeout
  checkIntervalSeconds: 60   // Check every minute
};

// In-memory session storage (in production, use Redis or database)
class SessionStorage {
  private static sessions = new Map<string, SessionInfo>();

  static set(userId: string, session: SessionInfo): void {
    this.sessions.set(userId, session);
  }

  static get(userId: string): SessionInfo | null {
    return this.sessions.get(userId) || null;
  }

  static delete(userId: string): void {
    this.sessions.delete(userId);
  }

  static getAll(): SessionInfo[] {
    return Array.from(this.sessions.values());
  }

  static clear(): void {
    this.sessions.clear();
  }
}

export class SessionTimeoutService {
  private static config = ADMIN_SESSION_CONFIG;

  /**
   * Create or update a session
   */
  static createSession(userId: string, email: string): SessionInfo {
    const now = Date.now();
    const session: SessionInfo = {
      userId,
      email,
      lastActivity: now,
      expiresAt: now + (this.config.timeoutMinutes * 60 * 1000),
      isActive: true
    };

    SessionStorage.set(userId, session);
    console.log(`🕐 Session created for ${email}, expires at ${new Date(session.expiresAt).toLocaleTimeString()}`);
    
    return session;
  }

  /**
   * Update session activity (reset timeout)
   */
  static updateActivity(userId: string): SessionInfo | null {
    const session = SessionStorage.get(userId);
    if (!session) {
      return null;
    }

    const now = Date.now();
    session.lastActivity = now;
    session.expiresAt = now + (this.config.timeoutMinutes * 60 * 1000);
    session.isActive = true;

    SessionStorage.set(userId, session);
    return session;
  }

  /**
   * Check if session is valid (not expired)
   */
  static isSessionValid(userId: string): boolean {
    const session = SessionStorage.get(userId);
    if (!session) {
      return false;
    }

    const now = Date.now();
    const isValid = session.isActive && now < session.expiresAt;

    if (!isValid) {
      // Session expired - mark as inactive
      session.isActive = false;
      SessionStorage.set(userId, session);
      console.log(`🕐 Session expired for ${session.email}`);
    }

    return isValid;
  }

  /**
   * Get time until session expires (in milliseconds)
   */
  static getTimeUntilExpiry(userId: string): number {
    const session = SessionStorage.get(userId);
    if (!session || !session.isActive) {
      return 0;
    }

    const now = Date.now();
    return Math.max(0, session.expiresAt - now);
  }

  /**
   * Check if session should show warning (5 minutes before expiry)
   */
  static shouldShowWarning(userId: string): boolean {
    const timeUntilExpiry = this.getTimeUntilExpiry(userId);
    const warningThreshold = this.config.warningMinutes * 60 * 1000;
    
    return timeUntilExpiry > 0 && timeUntilExpiry <= warningThreshold;
  }

  /**
   * Invalidate session (logout)
   */
  static invalidateSession(userId: string): void {
    const session = SessionStorage.get(userId);
    if (session) {
      session.isActive = false;
      SessionStorage.set(userId, session);
      console.log(`🕐 Session invalidated for ${session.email}`);
    }
  }

  /**
   * Get session info
   */
  static getSession(userId: string): SessionInfo | null {
    return SessionStorage.get(userId);
  }

  /**
   * Clean up expired sessions (maintenance task)
   */
  static cleanupExpiredSessions(): number {
    const sessions = SessionStorage.getAll();
    const now = Date.now();
    let cleanedCount = 0;

    sessions.forEach(session => {
      if (!session.isActive || now >= session.expiresAt) {
        SessionStorage.delete(session.userId);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`🕐 Cleaned up ${cleanedCount} expired sessions`);
    }

    return cleanedCount;
  }

  /**
   * Get all active sessions (for admin monitoring)
   */
  static getActiveSessions(): SessionInfo[] {
    return SessionStorage.getAll().filter(session => 
      session.isActive && Date.now() < session.expiresAt
    );
  }

  /**
   * Update configuration
   */
  static updateConfig(newConfig: Partial<SessionTimeoutConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🕐 Session timeout configuration updated:', this.config);
  }

  /**
   * Get current configuration
   */
  static getConfig(): SessionTimeoutConfig {
    return { ...this.config };
  }
}

// Auto-cleanup expired sessions every 5 minutes
if (typeof window === 'undefined') { // Server-side only
  setInterval(() => {
    SessionTimeoutService.cleanupExpiredSessions();
  }, 5 * 60 * 1000);
}
