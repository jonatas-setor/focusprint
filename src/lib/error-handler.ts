import { NextResponse } from 'next/server';
import { toast } from 'sonner';

// Error types
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

// Error codes
export enum ErrorCode {
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Authorization errors
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_UUID = 'INVALID_UUID',
  
  // Resource errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  
  // Business logic errors
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  
  // System errors
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

// Custom error class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    type: ErrorType,
    code: ErrorCode,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error creators
export const createValidationError = (message: string, context?: Record<string, unknown>) =>
  new AppError(message, ErrorType.VALIDATION, ErrorCode.INVALID_INPUT, 400, true, context);

export const createAuthenticationError = (message: string = 'Authentication required') =>
  new AppError(message, ErrorType.AUTHENTICATION, ErrorCode.UNAUTHORIZED, 401);

export const createAuthorizationError = (message: string = 'Insufficient permissions') =>
  new AppError(message, ErrorType.AUTHORIZATION, ErrorCode.FORBIDDEN, 403);

export const createNotFoundError = (resource: string) =>
  new AppError(`${resource} not found`, ErrorType.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND, 404);

export const createConflictError = (message: string, context?: Record<string, unknown>) =>
  new AppError(message, ErrorType.CONFLICT, ErrorCode.RESOURCE_ALREADY_EXISTS, 409, true, context);

export const createDatabaseError = (message: string, context?: Record<string, unknown>) =>
  new AppError(message, ErrorType.DATABASE_ERROR, ErrorCode.DATABASE_CONNECTION_ERROR, 500, false, context);

// API error handler for Next.js routes
export function handleApiError(error: unknown): NextResponse {
  // Log errors only in development
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', error);
  }

  // Handle our custom AppError
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        type: error.type,
        code: error.code,
        ...(process.env.NODE_ENV === 'development' && { context: error.context }),
      },
      { status: error.statusCode }
    );
  }

  // Handle Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const supabaseError = error as { code: string; message: string; details?: string };
    
    switch (supabaseError.code) {
      case 'PGRST116':
        return NextResponse.json(
          { error: 'Resource not found', type: ErrorType.NOT_FOUND, code: ErrorCode.RESOURCE_NOT_FOUND },
          { status: 404 }
        );
      case '23505':
        return NextResponse.json(
          { error: 'Resource already exists', type: ErrorType.CONFLICT, code: ErrorCode.RESOURCE_ALREADY_EXISTS },
          { status: 409 }
        );
      case '23503':
        return NextResponse.json(
          { error: 'Referenced resource not found', type: ErrorType.VALIDATION, code: ErrorCode.INVALID_INPUT },
          { status: 400 }
        );
      default:
        return NextResponse.json(
          { 
            error: 'Database error', 
            type: ErrorType.DATABASE_ERROR, 
            code: ErrorCode.DATABASE_CONNECTION_ERROR,
            ...(process.env.NODE_ENV === 'development' && { details: supabaseError.message }),
          },
          { status: 500 }
        );
    }
  }

  // Handle standard JavaScript errors
  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        type: ErrorType.SERVER_ERROR,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
      { status: 500 }
    );
  }

  // Handle unknown errors
  return NextResponse.json(
    {
      error: 'Unknown error occurred',
      type: ErrorType.SERVER_ERROR,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    },
    { status: 500 }
  );
}

// Client-side error handler
export function handleClientError(error: unknown): string {
  // Log errors only in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Client Error:', error);
  }

  if (error instanceof AppError) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

// Toast error handler
export function showErrorToast(error: unknown): void {
  const message = handleClientError(error);
  toast.error(message);
}

// Validation helpers
export function validateRequired(value: unknown, fieldName: string): void {
  if (value === null || value === undefined || value === '') {
    throw createValidationError(`${fieldName} is required`);
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createValidationError('Invalid email format');
  }
}

export function validateUUID(uuid: string, fieldName: string = 'ID'): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    throw createValidationError(`Invalid ${fieldName} format`);
  }
}

export function validateStringLength(
  value: string, 
  fieldName: string, 
  minLength: number = 1, 
  maxLength: number = 255
): void {
  if (value.length < minLength) {
    throw createValidationError(`${fieldName} must be at least ${minLength} characters long`);
  }
  if (value.length > maxLength) {
    throw createValidationError(`${fieldName} must be no more than ${maxLength} characters long`);
  }
}

// Async error wrapper
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Log errors only in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error in ${context || 'operation'}:`, error);
    }
    throw error;
  }
}

// Rate limiting error
export function createRateLimitError(retryAfter?: number) {
  return new AppError(
    'Too many requests. Please try again later.',
    ErrorType.RATE_LIMIT,
    ErrorCode.OPERATION_NOT_ALLOWED,
    429,
    true,
    { retryAfter }
  );
}

// Network error detection
export function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    (error.message.includes('fetch') || error.message.includes('network'))
  );
}

// Error logging utility
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    context,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  };

  // In production, send to monitoring service (e.g., Sentry, LogRocket)
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(error, { extra: errorInfo });
  } else {
    // Only log to console in development
    console.error('Error logged:', errorInfo);
  }
}
