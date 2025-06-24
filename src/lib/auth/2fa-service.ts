const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const CryptoJS = require('crypto-js');

// 2FA Configuration
const APP_NAME = 'FocuSprint Admin';
const ISSUER = 'FocuSprint';
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_2FA_ENCRYPTION_KEY || 'focusprint-2fa-default-key-2024-secure';

// 2FA Interfaces
export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
  backupCodesRemaining: number;
  lastUsed?: string;
}

export interface TwoFactorVerification {
  isValid: boolean;
  usedBackupCode?: boolean;
  remainingBackupCodes?: number;
}

// Encryption utilities
class EncryptionUtil {
  static encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  }

  static decrypt(encryptedText: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  static encryptArray(array: string[]): string[] {
    return array.map(item => this.encrypt(item));
  }

  static decryptArray(encryptedArray: string[]): string[] {
    return encryptedArray.map(item => this.decrypt(item));
  }
}

// 2FA Service Class
export class TwoFactorService {
  /**
   * Generate a new 2FA setup for a user
   */
  static async generateSetup(userEmail: string, userName: string): Promise<TwoFactorSetup> {
    try {
      // Generate secret
      let secret;
      try {
        secret = speakeasy.generateSecret({
          name: `${APP_NAME} (${userEmail})`,
          issuer: ISSUER,
          length: 32
        });
      } catch (secretError) {
        console.error('Error generating secret:', secretError);
        throw new Error(`Secret generation failed: ${secretError.message}`);
      }

      if (!secret || !secret.base32 || !secret.otpauth_url) {
        throw new Error('Invalid secret generated');
      }

      // Generate QR code
      let qrCodeUrl;
      try {
        qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
      } catch (qrError) {
        console.error('Error generating QR code:', qrError);
        throw new Error(`QR code generation failed: ${qrError.message}`);
      }

      // Generate backup codes
      let backupCodes;
      try {
        backupCodes = this.generateBackupCodes();
      } catch (backupError) {
        console.error('Error generating backup codes:', backupError);
        throw new Error(`Backup codes generation failed: ${backupError.message}`);
      }

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
        manualEntryKey: secret.base32
      };
    } catch (error) {
      console.error('Error generating 2FA setup:', error);
      throw new Error(`Failed to generate 2FA setup: ${error.message}`);
    }
  }

  /**
   * Verify a TOTP token
   */
  static verifyToken(token: string, secret: string, window: number = 1): boolean {
    try {
      return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: window
      });
    } catch (error) {
      console.error('Error verifying TOTP token:', error);
      return false;
    }
  }

  /**
   * Verify a backup code
   */
  static verifyBackupCode(code: string, backupCodes: string[]): { isValid: boolean; remainingCodes: string[] } {
    try {
      const decryptedCodes = EncryptionUtil.decryptArray(backupCodes);
      const codeIndex = decryptedCodes.indexOf(code);
      
      if (codeIndex === -1) {
        return { isValid: false, remainingCodes: backupCodes };
      }

      // Remove used backup code
      const remainingDecryptedCodes = decryptedCodes.filter((_, index) => index !== codeIndex);
      const remainingEncryptedCodes = EncryptionUtil.encryptArray(remainingDecryptedCodes);

      return { isValid: true, remainingCodes: remainingEncryptedCodes };
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return { isValid: false, remainingCodes: backupCodes };
    }
  }

  /**
   * Verify either TOTP token or backup code
   */
  static verify2FA(
    code: string, 
    secret: string, 
    backupCodes: string[]
  ): TwoFactorVerification {
    // First try TOTP verification
    if (this.verifyToken(code, secret)) {
      return {
        isValid: true,
        usedBackupCode: false
      };
    }

    // If TOTP fails, try backup code
    const backupResult = this.verifyBackupCode(code, backupCodes);
    if (backupResult.isValid) {
      return {
        isValid: true,
        usedBackupCode: true,
        remainingBackupCodes: backupResult.remainingCodes.length
      };
    }

    return { isValid: false };
  }

  /**
   * Generate backup codes
   */
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Encrypt secret for storage
   */
  static encryptSecret(secret: string): string {
    return EncryptionUtil.encrypt(secret);
  }

  /**
   * Decrypt secret from storage
   */
  static decryptSecret(encryptedSecret: string): string {
    return EncryptionUtil.decrypt(encryptedSecret);
  }

  /**
   * Encrypt backup codes for storage
   */
  static encryptBackupCodes(codes: string[]): string[] {
    return EncryptionUtil.encryptArray(codes);
  }

  /**
   * Decrypt backup codes from storage
   */
  static decryptBackupCodes(encryptedCodes: string[]): string[] {
    return EncryptionUtil.decryptArray(encryptedCodes);
  }

  /**
   * Generate new backup codes (for regeneration)
   */
  static regenerateBackupCodes(): string[] {
    return this.generateBackupCodes();
  }

  /**
   * Validate 2FA setup by verifying a token
   */
  static validateSetup(token: string, secret: string): boolean {
    return this.verifyToken(token, secret, 2); // Wider window for setup
  }
}

// Rate limiting for 2FA attempts
export class TwoFactorRateLimit {
  private static attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  static checkRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number; resetTime?: number } {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier);

    if (!userAttempts) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS - 1 };
    }

    // Reset if window has passed
    if (now - userAttempts.lastAttempt > this.WINDOW_MS) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS - 1 };
    }

    // Check if limit exceeded
    if (userAttempts.count >= this.MAX_ATTEMPTS) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: userAttempts.lastAttempt + this.WINDOW_MS
      };
    }

    // Increment attempts
    userAttempts.count++;
    userAttempts.lastAttempt = now;
    this.attempts.set(identifier, userAttempts);

    return {
      allowed: true,
      remainingAttempts: this.MAX_ATTEMPTS - userAttempts.count
    };
  }

  static resetRateLimit(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// Audit logging for 2FA events
export interface TwoFactorAuditLog {
  userId: string;
  action: '2fa_setup' | '2fa_enabled' | '2fa_disabled' | '2fa_verified' | '2fa_failed' | 'backup_code_used' | 'backup_codes_regenerated';
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class TwoFactorAudit {
  private static logs: TwoFactorAuditLog[] = [];

  static log(entry: Omit<TwoFactorAuditLog, 'timestamp'>): void {
    const logEntry: TwoFactorAuditLog = {
      ...entry,
      timestamp: new Date().toISOString()
    };
    
    this.logs.push(logEntry);
    console.log('2FA Audit Log:', logEntry);
    
    // In production, this would be sent to a proper logging service
    // For now, we'll keep the last 1000 entries in memory
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  static getLogs(userId?: string): TwoFactorAuditLog[] {
    if (userId) {
      return this.logs.filter(log => log.userId === userId);
    }
    return [...this.logs];
  }
}
