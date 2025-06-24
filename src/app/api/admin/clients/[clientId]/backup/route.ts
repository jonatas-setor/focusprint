import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { ClientBackupService } from '@/lib/clients/client-backup-service';

// Mock client data
const MOCK_CLIENTS = {
  'client_1': {
    id: 'client_1',
    name: 'Acme Corporation',
    email: 'admin@acme.com',
    plan: 'business',
    status: 'active'
  },
  'client_2': {
    id: 'client_2',
    name: 'Tech Startup Ltda',
    email: 'contact@techstartup.com',
    plan: 'pro',
    status: 'active'
  }
};

/**
 * GET /api/admin/clients/[clientId]/backup - Get backup history for client
 * Lists all backups created for a specific client
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_CLIENTS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { clientId } = params;

    // Verify client exists
    const client = MOCK_CLIENTS[clientId as keyof typeof MOCK_CLIENTS];
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Get all backups for this client
    const backups = ClientBackupService.getClientBackups(clientId);

    // Format backup information
    const backupHistory = backups.map(backup => ({
      backup_id: backup.backup_id,
      created_at: backup.backup_metadata.created_at,
      created_by: backup.backup_metadata.created_by_name,
      reason: backup.backup_metadata.backup_reason,
      size_bytes: backup.backup_metadata.data_size_bytes,
      size_mb: Math.round(backup.backup_metadata.data_size_bytes / 1024 / 1024 * 100) / 100,
      retention_until: backup.backup_metadata.retention_until,
      encrypted: !!backup.backup_metadata.encryption_key,
      verified: backup.verification.integrity_verified,
      record_counts: backup.verification.record_counts,
      checksum: backup.verification.checksum
    }));

    // Calculate summary statistics
    const summary = {
      total_backups: backups.length,
      total_size_mb: Math.round(backups.reduce((sum, b) => sum + b.backup_metadata.data_size_bytes, 0) / 1024 / 1024 * 100) / 100,
      oldest_backup: backups.length > 0 ? Math.min(...backups.map(b => new Date(b.backup_metadata.created_at).getTime())) : null,
      newest_backup: backups.length > 0 ? Math.max(...backups.map(b => new Date(b.backup_metadata.created_at).getTime())) : null,
      verified_backups: backups.filter(b => b.verification.integrity_verified).length
    };

    // Log the access
    console.log(`🗄️ Backup history accessed for client: ${client.name} by ${authResult.user.email}`);

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        email: client.email
      },
      backup_history: backupHistory,
      summary,
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Client Backup History API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/clients/[clientId]/backup - Create manual backup for client
 * Allows admins to create backups manually (not just during deletion)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_CLIENTS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { clientId } = params;

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { 
      reason = 'Manual backup',
      backup_options = {},
      verify_after_creation = true
    } = body;

    // Verify client exists
    const client = MOCK_CLIENTS[clientId as keyof typeof MOCK_CLIENTS];
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    console.log(`🗄️ Creating manual backup for client: ${client.name} (${clientId})`);

    // Create backup
    const backupResult = await ClientBackupService.createClientBackup(
      client as any,
      {
        backup_reason: reason,
        ...backup_options
      },
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`
    );

    if (!backupResult.success) {
      return NextResponse.json(
        { 
          error: 'Failed to create backup',
          details: backupResult.error
        },
        { status: 500 }
      );
    }

    // Verify backup if requested
    let verificationResult = null;
    if (verify_after_creation && backupResult.backup_id) {
      const isVerified = await ClientBackupService.verifyBackup(backupResult.backup_id);
      verificationResult = {
        verified: isVerified,
        verified_at: new Date().toISOString()
      };
    }

    // Log the backup creation
    console.log(`🗄️ Manual backup created: ${backupResult.backup_id} by ${authResult.user.email}`);

    return NextResponse.json({
      message: 'Backup created successfully',
      backup: {
        backup_id: backupResult.backup_id,
        backup_path: backupResult.backup_path,
        size_bytes: backupResult.data_size_bytes,
        size_mb: Math.round(backupResult.data_size_bytes! / 1024 / 1024 * 100) / 100,
        records_backed_up: backupResult.records_backed_up,
        warnings: backupResult.warnings
      },
      verification: verificationResult,
      client: {
        id: client.id,
        name: client.name,
        email: client.email
      },
      created_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        created_at: new Date().toISOString(),
        reason
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Create Client Backup API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/clients/[clientId]/backup - Clean up old backups
 * Allows admins to manually clean up expired backups
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions (requires higher privileges)
    const authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_SYSTEM_CONFIG, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { clientId } = params;

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { backup_id, force_cleanup = false } = body;

    // Verify client exists
    const client = MOCK_CLIENTS[clientId as keyof typeof MOCK_CLIENTS];
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    if (backup_id) {
      // Delete specific backup
      const backup = ClientBackupService.getBackup(backup_id);
      if (!backup) {
        return NextResponse.json(
          { error: 'Backup not found' },
          { status: 404 }
        );
      }

      if (backup.client_data.id !== clientId) {
        return NextResponse.json(
          { error: 'Backup does not belong to this client' },
          { status: 400 }
        );
      }

      // Check if backup is still within retention period
      const now = new Date();
      const retentionDate = new Date(backup.backup_metadata.retention_until);
      
      if (now < retentionDate && !force_cleanup) {
        return NextResponse.json(
          { 
            error: 'Backup is still within retention period',
            retention_until: backup.backup_metadata.retention_until,
            suggestion: 'Use force_cleanup: true to override retention policy'
          },
          { status: 400 }
        );
      }

      // Delete the backup (mock - in production would delete from storage)
      console.log(`🗄️ Deleting backup: ${backup_id} for client ${client.name}`);

      return NextResponse.json({
        message: 'Backup deleted successfully',
        deleted_backup: {
          backup_id: backup.backup_id,
          client_name: backup.client_data.name,
          created_at: backup.backup_metadata.created_at,
          size_mb: Math.round(backup.backup_metadata.data_size_bytes / 1024 / 1024 * 100) / 100
        },
        deleted_by: {
          admin_id: authResult.user.id,
          admin_email: authResult.user.email,
          admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
          deleted_at: new Date().toISOString()
        }
      });

    } else {
      // Clean up expired backups for this client
      const cleanedCount = ClientBackupService.cleanupExpiredBackups();

      return NextResponse.json({
        message: 'Expired backups cleaned up',
        cleaned_backups: cleanedCount,
        client: {
          id: client.id,
          name: client.name
        },
        cleaned_by: {
          admin_id: authResult.user.id,
          admin_email: authResult.user.email,
          admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
          cleaned_at: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('Delete Client Backup API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
