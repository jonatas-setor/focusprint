import { createClient } from '@/lib/supabase/server';

export interface BackupResult {
  success: boolean;
  backup_id?: string;
  backup_path?: string;
  data_size_bytes?: number;
  records_backed_up?: number;
  error?: string;
  warnings?: string[];
}

export interface BackupOptions {
  backup_reason?: string;
  include_metadata?: boolean;
  compression?: boolean;
}

export class ClientBackupService {
  /**
   * Create a comprehensive backup of client data before deletion
   */
  static async createClientBackup(
    client: any,
    options: BackupOptions = {},
    adminId: string,
    adminName: string
  ): Promise<BackupResult> {
    try {
      const supabase = await createClient();
      
      // Create backup record in database
      const backupData = {
        client_id: client.id,
        client_name: client.name,
        client_email: client.email,
        backup_data: JSON.stringify(client),
        backup_reason: options.backup_reason || 'Client deletion backup',
        created_by_admin_id: adminId,
        created_by_admin_name: adminName,
        data_size_bytes: JSON.stringify(client).length,
        records_backed_up: 1,
        retention_until: new Date(Date.now() + 2555 * 24 * 60 * 60 * 1000).toISOString() // 7 years
      };

      // Create client_backups table if it doesn't exist
      await supabase.rpc('create_client_backups_table_if_not_exists');

      const { data: backup, error } = await supabase
        .from('client_backups')
        .insert(backupData)
        .select()
        .single();

      if (error) {
        console.error('Backup creation error:', error);
        return {
          success: false,
          error: `Failed to create backup: ${error.message}`
        };
      }

      return {
        success: true,
        backup_id: backup.id,
        backup_path: `client_backups/${backup.id}`,
        data_size_bytes: backupData.data_size_bytes,
        records_backed_up: 1
      };

    } catch (error) {
      console.error('Backup service error:', error);
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
      const supabase = await createClient();
      
      const { data: backup, error } = await supabase
        .from('client_backups')
        .select('*')
        .eq('id', backupId)
        .single();

      if (error || !backup) {
        console.error('Backup verification failed:', error);
        return false;
      }

      // Verify backup data is valid JSON
      try {
        JSON.parse(backup.backup_data);
        return true;
      } catch (parseError) {
        console.error('Backup data is corrupted:', parseError);
        return false;
      }

    } catch (error) {
      console.error('Backup verification error:', error);
      return false;
    }
  }

  /**
   * List all backups for a client
   */
  static async listClientBackups(clientId: string): Promise<any[]> {
    try {
      const supabase = await createClient();
      
      const { data: backups, error } = await supabase
        .from('client_backups')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error listing backups:', error);
        return [];
      }

      return backups || [];

    } catch (error) {
      console.error('Backup listing error:', error);
      return [];
    }
  }

  /**
   * Restore client from backup
   */
  static async restoreClientFromBackup(backupId: string): Promise<BackupResult> {
    try {
      const supabase = await createClient();
      
      const { data: backup, error } = await supabase
        .from('client_backups')
        .select('*')
        .eq('id', backupId)
        .single();

      if (error || !backup) {
        return {
          success: false,
          error: 'Backup not found'
        };
      }

      // Parse backup data
      const clientData = JSON.parse(backup.backup_data);
      
      // Restore client to database
      const { data: restoredClient, error: restoreError } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();

      if (restoreError) {
        return {
          success: false,
          error: `Failed to restore client: ${restoreError.message}`
        };
      }

      return {
        success: true,
        backup_id: backupId,
        records_backed_up: 1
      };

    } catch (error) {
      console.error('Restore error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown restore error'
      };
    }
  }
}
