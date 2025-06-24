/**
 * Client Backup Service
 * Implements PRD Section 3.3.1 - Backup before client deletion
 */

import { Client } from '@/types/clients';
import { SupportTicket } from '@/types/support-tickets';

export interface ClientBackupData {
  backup_id: string;
  client_data: Client;
  related_data: {
    users: any[];
    projects: any[];
    tasks: any[];
    licenses: any[];
    support_tickets: SupportTicket[];
    payment_history: any[];
    usage_metrics: any[];
    audit_logs: any[];
  };
  backup_metadata: {
    created_at: string;
    created_by: string;
    created_by_name: string;
    backup_reason: string;
    data_size_bytes: number;
    retention_until: string;
    encryption_key?: string;
  };
  verification: {
    checksum: string;
    record_counts: Record<string, number>;
    integrity_verified: boolean;
  };
}

export interface BackupOptions {
  include_users?: boolean;
  include_projects?: boolean;
  include_support_tickets?: boolean;
  include_payment_history?: boolean;
  include_usage_metrics?: boolean;
  include_audit_logs?: boolean;
  retention_days?: number;
  encrypt_backup?: boolean;
  backup_reason?: string;
}

export interface BackupResult {
  success: boolean;
  backup_id?: string;
  backup_path?: string;
  data_size_bytes?: number;
  records_backed_up?: Record<string, number>;
  error?: string;
  warnings?: string[];
}

// Mock storage for development (replace with cloud storage in production)
class BackupStorage {
  private static backups = new Map<string, ClientBackupData>();

  static save(backup: ClientBackupData): void {
    this.backups.set(backup.backup_id, backup);
  }

  static get(backupId: string): ClientBackupData | null {
    return this.backups.get(backupId) || null;
  }

  static getByClientId(clientId: string): ClientBackupData[] {
    return Array.from(this.backups.values()).filter(
      backup => backup.client_data.id === clientId
    );
  }

  static getAll(): ClientBackupData[] {
    return Array.from(this.backups.values());
  }

  static delete(backupId: string): boolean {
    return this.backups.delete(backupId);
  }

  static clear(): void {
    this.backups.clear();
  }
}

export class ClientBackupService {
  /**
   * Create comprehensive backup of client data before deletion
   */
  static async createClientBackup(
    client: Client,
    options: BackupOptions = {},
    createdBy: string,
    createdByName: string
  ): Promise<BackupResult> {
    try {
      const backupId = `backup_${client.id}_${Date.now()}`;
      const now = new Date().toISOString();
      
      // Default options
      const opts = {
        include_users: true,
        include_projects: true,
        include_support_tickets: true,
        include_payment_history: true,
        include_usage_metrics: true,
        include_audit_logs: true,
        retention_days: 2555, // 7 years for compliance
        encrypt_backup: true,
        backup_reason: 'Client deletion backup',
        ...options
      };

      console.log(`🗄️ Creating backup for client: ${client.name} (${client.id})`);

      // Collect related data (mock data for development)
      const relatedData = {
        users: opts.include_users ? await this.getClientUsers(client.id) : [],
        projects: opts.include_projects ? await this.getClientProjects(client.id) : [],
        tasks: opts.include_projects ? await this.getClientTasks(client.id) : [],
        licenses: await this.getClientLicenses(client.id),
        support_tickets: opts.include_support_tickets ? await this.getClientSupportTickets(client.id) : [],
        payment_history: opts.include_payment_history ? await this.getClientPaymentHistory(client.id) : [],
        usage_metrics: opts.include_usage_metrics ? await this.getClientUsageMetrics(client.id) : [],
        audit_logs: opts.include_audit_logs ? await this.getClientAuditLogs(client.id) : []
      };

      // Calculate data size and record counts
      const recordCounts = {
        client: 1,
        users: relatedData.users.length,
        projects: relatedData.projects.length,
        tasks: relatedData.tasks.length,
        licenses: relatedData.licenses.length,
        support_tickets: relatedData.support_tickets.length,
        payment_history: relatedData.payment_history.length,
        usage_metrics: relatedData.usage_metrics.length,
        audit_logs: relatedData.audit_logs.length
      };

      const dataString = JSON.stringify({ client, relatedData });
      const dataSizeBytes = new Blob([dataString]).size;

      // Generate checksum for integrity verification
      const checksum = await this.generateChecksum(dataString);

      // Calculate retention date
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() + opts.retention_days);

      // Create backup data structure
      const backupData: ClientBackupData = {
        backup_id: backupId,
        client_data: client,
        related_data: relatedData,
        backup_metadata: {
          created_at: now,
          created_by: createdBy,
          created_by_name: createdByName,
          backup_reason: opts.backup_reason,
          data_size_bytes: dataSizeBytes,
          retention_until: retentionDate.toISOString(),
          encryption_key: opts.encrypt_backup ? this.generateEncryptionKey() : undefined
        },
        verification: {
          checksum,
          record_counts: recordCounts,
          integrity_verified: true
        }
      };

      // Save backup
      BackupStorage.save(backupData);

      const warnings = [];
      if (recordCounts.support_tickets === 0) {
        warnings.push('No support tickets found for this client');
      }
      if (recordCounts.payment_history === 0) {
        warnings.push('No payment history found for this client');
      }

      console.log(`🗄️ Backup created successfully: ${backupId}`);
      console.log(`🗄️ Data size: ${(dataSizeBytes / 1024).toFixed(2)} KB`);
      console.log(`🗄️ Records backed up:`, recordCounts);

      return {
        success: true,
        backup_id: backupId,
        backup_path: `backups/clients/${backupId}.json`,
        data_size_bytes: dataSizeBytes,
        records_backed_up: recordCounts,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      console.error('Error creating client backup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown backup error'
      };
    }
  }

  /**
   * Verify backup integrity
   */
  static async verifyBackup(backupId: string): Promise<boolean> {
    try {
      const backup = BackupStorage.get(backupId);
      if (!backup) {
        return false;
      }

      // Verify checksum
      const dataString = JSON.stringify({
        client: backup.client_data,
        relatedData: backup.related_data
      });
      const currentChecksum = await this.generateChecksum(dataString);

      return currentChecksum === backup.verification.checksum;
    } catch (error) {
      console.error('Error verifying backup:', error);
      return false;
    }
  }

  /**
   * Get backup information
   */
  static getBackup(backupId: string): ClientBackupData | null {
    return BackupStorage.get(backupId);
  }

  /**
   * Get all backups for a client
   */
  static getClientBackups(clientId: string): ClientBackupData[] {
    return BackupStorage.getByClientId(clientId);
  }

  /**
   * Get all backups (admin only)
   */
  static getAllBackups(): ClientBackupData[] {
    return BackupStorage.getAll();
  }

  /**
   * Delete expired backups
   */
  static cleanupExpiredBackups(): number {
    const now = new Date();
    const allBackups = BackupStorage.getAll();
    let deletedCount = 0;

    allBackups.forEach(backup => {
      const retentionDate = new Date(backup.backup_metadata.retention_until);
      if (now > retentionDate) {
        BackupStorage.delete(backup.backup_id);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      console.log(`🗄️ Cleaned up ${deletedCount} expired backups`);
    }

    return deletedCount;
  }

  /**
   * Restore client from backup (emergency procedure)
   */
  static async restoreClientFromBackup(
    backupId: string,
    restoredBy: string,
    restoredByName: string
  ): Promise<{ success: boolean; client?: Client; error?: string }> {
    try {
      const backup = BackupStorage.get(backupId);
      if (!backup) {
        return { success: false, error: 'Backup not found' };
      }

      // Verify backup integrity
      const isValid = await this.verifyBackup(backupId);
      if (!isValid) {
        return { success: false, error: 'Backup integrity verification failed' };
      }

      // In production, this would restore data to the database
      console.log(`🗄️ Restoring client from backup: ${backupId}`);
      console.log(`🗄️ Client: ${backup.client_data.name} (${backup.client_data.id})`);
      console.log(`🗄️ Restored by: ${restoredByName}`);

      return {
        success: true,
        client: backup.client_data
      };

    } catch (error) {
      console.error('Error restoring client from backup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown restore error'
      };
    }
  }

  // Private helper methods for collecting related data
  private static async getClientUsers(clientId: string): Promise<any[]> {
    // Mock data - in production, query database
    return [
      {
        id: `user_${clientId}_1`,
        name: 'John Doe',
        email: 'john@client.com',
        role: 'admin',
        created_at: new Date().toISOString()
      },
      {
        id: `user_${clientId}_2`,
        name: 'Jane Smith',
        email: 'jane@client.com',
        role: 'user',
        created_at: new Date().toISOString()
      }
    ];
  }

  private static async getClientProjects(clientId: string): Promise<any[]> {
    return [
      {
        id: `project_${clientId}_1`,
        name: 'Main Project',
        description: 'Primary project for client',
        created_at: new Date().toISOString()
      }
    ];
  }

  private static async getClientTasks(clientId: string): Promise<any[]> {
    return [
      {
        id: `task_${clientId}_1`,
        title: 'Sample Task',
        description: 'Task description',
        status: 'completed',
        created_at: new Date().toISOString()
      }
    ];
  }

  private static async getClientLicenses(clientId: string): Promise<any[]> {
    return [
      {
        id: `license_${clientId}_1`,
        plan: 'pro',
        status: 'active',
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      }
    ];
  }

  private static async getClientSupportTickets(clientId: string): Promise<SupportTicket[]> {
    // This will integrate with the support ticket system
    return [];
  }

  private static async getClientPaymentHistory(clientId: string): Promise<any[]> {
    return [
      {
        id: `payment_${clientId}_1`,
        amount: 9700,
        currency: 'BRL',
        status: 'paid',
        created_at: new Date().toISOString()
      }
    ];
  }

  private static async getClientUsageMetrics(clientId: string): Promise<any[]> {
    return [
      {
        date: new Date().toISOString().split('T')[0],
        active_users: 5,
        projects_created: 1,
        tasks_completed: 10,
        storage_used_gb: 0.5
      }
    ];
  }

  private static async getClientAuditLogs(clientId: string): Promise<any[]> {
    return [
      {
        id: `audit_${clientId}_1`,
        action: 'client_created',
        actor: 'system',
        timestamp: new Date().toISOString(),
        details: { client_id: clientId }
      }
    ];
  }

  private static async generateChecksum(data: string): Promise<string> {
    // Simple checksum for development - use proper hashing in production
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private static generateEncryptionKey(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}
