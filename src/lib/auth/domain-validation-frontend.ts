/**
 * Frontend Domain Validation for Admin Access
 *
 * This module handles DOMAIN validation only.
 * Authorization is handled separately by RBAC system.
 *
 * Domain validation ensures only users from authorized domains
 * can attempt admin login, but actual authorization is determined
 * by their role and permissions in the database.
 */

// No temporary admin emails - all validation is domain-based
const TEMPORARY_ADMIN_EMAILS: string[] = [];

// Valid admin domains - users from these domains can attempt admin login
const VALID_ADMIN_DOMAINS = [
  'focusprint.com'
];

/**
 * Check if an email domain is allowed for admin login attempts
 * This is DOMAIN validation only - actual authorization is handled by RBAC
 */
export function isValidAdminDomain(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check temporary exceptions first
  if (TEMPORARY_ADMIN_EMAILS.includes(normalizedEmail)) {
    return true;
  }

  // Check domain validation
  const emailDomain = normalizedEmail.split('@')[1];
  if (!emailDomain) {
    return false;
  }

  return VALID_ADMIN_DOMAINS.includes(emailDomain);
}

/**
 * @deprecated Use isValidAdminDomain instead
 * This function is kept for backward compatibility
 */
export function isValidAdminEmail(email: string): boolean {
  return isValidAdminDomain(email);
}

/**
 * Get validation error message for invalid admin domain
 */
export function getAdminDomainValidationError(email: string): string {
  if (!email) {
    return 'Email é obrigatório';
  }

  if (!isValidAdminDomain(email)) {
    return 'Apenas usuários de domínios autorizados podem acessar a área administrativa';
  }

  return '';
}

/**
 * Get list of allowed admin emails/domains for display
 */
export function getAllowedAdminEmailsInfo(): {
  domains: string[];
  temporaryEmails: string[];
  examples: string[];
} {
  return {
    domains: VALID_ADMIN_DOMAINS,
    temporaryEmails: TEMPORARY_ADMIN_EMAILS,
    examples: [
      'admin@focusprint.com',
      'jonatas@focusprint.com',
      'user@focusprint.com'
    ]
  };
}

/**
 * Validate admin credentials before authentication
 */
export function validateAdminCredentials(email: string, password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate email
  if (!email) {
    errors.push('Email é obrigatório');
  } else if (!isValidAdminEmail(email)) {
    errors.push('Acesso restrito a administradores da plataforma');
  }

  // Validate password
  if (!password) {
    errors.push('Senha é obrigatória');
  } else if (password.length < 6) {
    errors.push('Senha deve ter pelo menos 6 caracteres');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Log admin access attempt for debugging
 */
export function logAdminAccessAttempt(email: string, success: boolean, error?: string): void {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    email: email?.toLowerCase(),
    success,
    error,
    isValidDomain: isValidAdminEmail(email),
    allowedInfo: getAllowedAdminEmailsInfo()
  };

  console.log('🔐 Admin Access Attempt:', logData);
}
