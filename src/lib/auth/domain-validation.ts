// Domain validation utilities for Platform Admin access control

/**
 * Allowed domains for Platform Admin access
 */
const ALLOWED_ADMIN_DOMAINS = ['focusprint.com'];

/**
 * No temporary exception emails - all validation is domain-based
 */
const TEMPORARY_ADMIN_EMAILS: string[] = [];

/**
 * Check if an email domain is authorized for Platform Admin access
 */
export function isAuthorizedAdminDomain(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailLower = email.toLowerCase().trim();

  // No temporary exceptions - all validation is domain-based

  // Extract domain from email
  const domainMatch = emailLower.match(/@([^@]+)$/);
  if (!domainMatch) {
    return false;
  }

  const domain = domainMatch[1];
  return ALLOWED_ADMIN_DOMAINS.includes(domain);
}

/**
 * Validate email format and domain for admin access
 */
export function validateAdminEmail(email: string): {
  isValid: boolean;
  isDomainAuthorized: boolean;
  error?: string;
} {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      isDomainAuthorized: false,
      error: 'Email is required'
    };
  }

  const emailLower = email.toLowerCase().trim();

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailLower)) {
    return {
      isValid: false,
      isDomainAuthorized: false,
      error: 'Invalid email format'
    };
  }

  // Check domain authorization
  const isDomainAuthorized = isAuthorizedAdminDomain(emailLower);
  
  if (!isDomainAuthorized) {
    return {
      isValid: true,
      isDomainAuthorized: false,
      error: `Only @${ALLOWED_ADMIN_DOMAINS.join(', @')} emails are authorized for Platform Admin access`
    };
  }

  return {
    isValid: true,
    isDomainAuthorized: true
  };
}

/**
 * Get the list of allowed admin domains
 */
export function getAllowedAdminDomains(): string[] {
  return [...ALLOWED_ADMIN_DOMAINS];
}

/**
 * Check if a user should have admin access based on email domain
 */
export function shouldHaveAdminAccess(email: string): boolean {
  const validation = validateAdminEmail(email);
  return validation.isValid && validation.isDomainAuthorized;
}

/**
 * Generate error message for unauthorized domain access
 */
export function getUnauthorizedDomainMessage(email: string): string {
  const allowedDomains = ALLOWED_ADMIN_DOMAINS.map(domain => `@${domain}`).join(', ');
  return `Access denied. Only emails from authorized domains (${allowedDomains}) can access the Platform Admin. Your email: ${email}`;
}
