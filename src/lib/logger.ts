// Structured logging system for FocuSprint
// Replaces console.log with proper logging

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  userId?: string;
  adminId?: string;
  metadata?: Record<string, any>;
  error?: Error;
}

class Logger {
  private minLevel: LogLevel;

  constructor() {
    // Set log level based on environment
    this.minLevel = process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatLog(entry: LogEntry): string {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const levelName = levelNames[entry.level];
    
    let logMessage = `[${entry.timestamp}] ${levelName}`;
    
    if (entry.context) {
      logMessage += ` [${entry.context}]`;
    }
    
    if (entry.userId) {
      logMessage += ` [User:${entry.userId}]`;
    }
    
    if (entry.adminId) {
      logMessage += ` [Admin:${entry.adminId}]`;
    }
    
    logMessage += `: ${entry.message}`;
    
    if (entry.metadata) {
      logMessage += ` | Metadata: ${JSON.stringify(entry.metadata)}`;
    }
    
    if (entry.error) {
      logMessage += ` | Error: ${entry.error.message}`;
      if (entry.error.stack && entry.level >= LogLevel.ERROR) {
        logMessage += `\nStack: ${entry.error.stack}`;
      }
    }
    
    return logMessage;
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formattedMessage = this.formatLog(entry);

    // In production, you might want to send logs to a service like DataDog, LogRocket, etc.
    // For now, we'll use console but with structured format
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }

    // In production, also send to external logging service
    if (process.env.NODE_ENV === 'production' && entry.level >= LogLevel.ERROR) {
      this.sendToExternalService(entry);
    }
  }

  private sendToExternalService(entry: LogEntry): void {
    // TODO: Implement external logging service integration
    // Examples: DataDog, LogRocket, Sentry, etc.
    // For now, this is a placeholder
  }

  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      message,
      context,
      metadata
    });
  }

  info(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message,
      context,
      metadata
    });
  }

  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message,
      context,
      metadata
    });
  }

  error(message: string, error?: Error, context?: string, metadata?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      context,
      metadata,
      error
    });
  }

  // Specific methods for common use cases
  apiRequest(method: string, path: string, userId?: string, adminId?: string, metadata?: Record<string, any>): void {
    this.info(`${method} ${path}`, 'API', {
      userId,
      adminId,
      ...metadata
    });
  }

  apiError(method: string, path: string, error: Error, userId?: string, adminId?: string): void {
    this.error(`${method} ${path} failed`, error, 'API', {
      userId,
      adminId
    });
  }

  planOperation(operation: string, planId: string, adminId: string, metadata?: Record<string, any>): void {
    this.info(`Plan ${operation}: ${planId}`, 'PLANS', {
      adminId,
      planId,
      operation,
      ...metadata
    });
  }

  authEvent(event: string, userId?: string, metadata?: Record<string, any>): void {
    this.info(`Auth event: ${event}`, 'AUTH', {
      userId,
      event,
      ...metadata
    });
  }

  securityEvent(event: string, severity: 'low' | 'medium' | 'high', metadata?: Record<string, any>): void {
    const level = severity === 'high' ? LogLevel.ERROR : severity === 'medium' ? LogLevel.WARN : LogLevel.INFO;
    
    this.log({
      timestamp: new Date().toISOString(),
      level,
      message: `Security event: ${event}`,
      context: 'SECURITY',
      metadata: {
        severity,
        ...metadata
      }
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports
export const logApiRequest = logger.apiRequest.bind(logger);
export const logApiError = logger.apiError.bind(logger);
export const logPlanOperation = logger.planOperation.bind(logger);
export const logAuthEvent = logger.authEvent.bind(logger);
export const logSecurityEvent = logger.securityEvent.bind(logger);
