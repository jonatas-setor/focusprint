import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { SupportTicketsService } from '@/lib/support/tickets-service';
import { AuditService } from '@/lib/audit/audit-service';
import { AuditAction, ResourceType } from '@/types/audit-log';
import { ClientBackupService } from '@/lib/backup/client-backup-service';

/**
 * GET /api/admin/clients/[clientId] - Get detailed client information
 * Implements PRD Section 3.3.2 - Informações Detalhadas do Cliente
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

    // Get client from database
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (fetchError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Get support tickets for this client (NEW: Integration with ticket system)
    const ticketsResult = await SupportTicketsService.getTickets(
      { client_id: clientId },
      1,
      50
    );

    // Mock additional client data
    const clientDetails = {
      client,
      users: [
        {
          id: `user_${clientId}_1`,
          name: 'John Doe',
          email: 'john@' + client.email.split('@')[1],
          role: 'admin',
          status: 'active',
          last_login: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: client.created_at
        },
        {
          id: `user_${clientId}_2`,
          name: 'Jane Smith',
          email: 'jane@' + client.email.split('@')[1],
          role: 'user',
          status: 'active',
          last_login: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      licenses: [
        {
          id: `license_${clientId}_1`,
          plan: client.plan,
          status: client.status,
          users_limit: client.plan === 'free' ? 3 : client.plan === 'pro' ? 5 : 30,
          users_current: 2,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: client.created_at
        }
      ],
      // NEW: Support tickets integration
      support_tickets: {
        tickets: ticketsResult.tickets,
        summary: {
          total: ticketsResult.summary.total_tickets,
          open: ticketsResult.summary.open_tickets,
          in_progress: ticketsResult.summary.in_progress_tickets,
          resolved: ticketsResult.summary.resolved_tickets,
          avg_resolution_time: ticketsResult.summary.avg_resolution_time_hours
        }
      },
      usage_metrics: {
        current_month: {
          active_users: 2,
          projects_created: Math.floor(Math.random() * 10) + 1,
          tasks_completed: Math.floor(Math.random() * 100) + 20,
          storage_used_gb: Math.round(Math.random() * 5 * 100) / 100,
          api_calls: Math.floor(Math.random() * 1000) + 100
        },
        last_30_days: {
          login_frequency: Math.round(Math.random() * 30),
          feature_usage: {
            kanban: 95,
            chat: 80,
            video_calls: client.plan !== 'free' ? 60 : 0,
            reports: client.plan === 'business' ? 40 : 0
          }
        }
      },
      payment_history: [
        {
          id: `payment_${clientId}_1`,
          amount: client.plan === 'free' ? 0 : client.plan === 'pro' ? 9700 : 39900,
          currency: 'BRL',
          status: 'paid',
          description: `${client.plan.charAt(0).toUpperCase() + client.plan.slice(1)} Plan - Monthly`,
          paid_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      // NEW: Backup history
      backup_history: ClientBackupService.getClientBackups(clientId).map(backup => ({
        backup_id: backup.backup_id,
        created_at: backup.backup_metadata.created_at,
        created_by: backup.backup_metadata.created_by_name,
        reason: backup.backup_metadata.backup_reason,
        size_mb: Math.round(backup.backup_metadata.data_size_bytes / 1024 / 1024 * 100) / 100,
        retention_until: backup.backup_metadata.retention_until,
        verified: backup.verification.integrity_verified
      }))
    };

    // Log the access
    console.log(`👥 Client details accessed: ${client.name} by ${authResult.user.email}`);

    return NextResponse.json({
      ...clientDetails,
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Client Details API Error:', error);
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
 * PUT /api/admin/clients/[clientId] - Update client information
 * Implements client updates with audit logging and database persistence
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_CLIENTS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { clientId } = params;

    // Parse request body
    const body = await request.json();
    const { name, email, cnpj, phone, address, status, plan_type } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Get current client from database
    const { data: currentClient, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (fetchError || !currentClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      updated_at: new Date().toISOString()
    };

    // Add optional fields if provided
    if (cnpj !== undefined) updateData.cnpj = cnpj;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (status !== undefined) updateData.status = status;
    if (plan_type !== undefined) {
      updateData.plan_type = plan_type;
      // Set plan limits based on plan type
      switch (plan_type) {
        case 'free':
          updateData.max_users = 5;
          updateData.max_projects = 3;
          break;
        case 'pro':
          updateData.max_users = 15;
          updateData.max_projects = 10;
          break;
        case 'business':
          updateData.max_users = 50;
          updateData.max_projects = 50;
          break;
      }
    }

    // Track changes for audit logging
    const changes = Object.keys(updateData)
      .filter(field => field !== 'updated_at')
      .map(field => ({
        field,
        old_value: currentClient[field],
        new_value: updateData[field]
      }))
      .filter(change => change.old_value !== change.new_value);

    // Update client in database
    const { data: updatedClient, error: updateError } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json(
        {
          error: 'Failed to update client',
          details: updateError.message
        },
        { status: 500 }
      );
    }

    // Log successful client update (only if there were actual changes)
    if (changes.length > 0) {
      await AuditService.logCRUD(
        AuditAction.CLIENT_UPDATED,
        authResult.user.id,
        authResult.user.email!,
        `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        ResourceType.CLIENT,
        clientId,
        updatedClient.name,
        changes,
        request
      ).catch(auditError => console.error('Audit logging failed:', auditError));
    }

    // Log the update
    console.log(`👥 Client updated: ${updatedClient.name} by ${authResult.user.email}`);

    return NextResponse.json({
      client: updatedClient,
      message: 'Client updated successfully',
      changes_made: changes.length,
      updated_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Update Client API Error:', error);
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
 * DELETE /api/admin/clients/[clientId] - Delete client with backup
 * Implements PRD Section 3.3.1 - Complete backup before deletion
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.DELETE_CLIENTS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { clientId } = params;

    // Parse request body for deletion confirmation and reason
    const body = await request.json().catch(() => ({}));
    const { 
      confirm_deletion, 
      reason, 
      backup_options = {},
      force_delete = false 
    } = body;

    if (!confirm_deletion) {
      return NextResponse.json(
        { error: 'Deletion must be confirmed with confirm_deletion: true' },
        { status: 400 }
      );
    }

    // Get current client from database
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (fetchError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Check if client has active licenses (safety check)
    if (client.status === 'active' && !force_delete) {
      return NextResponse.json(
        { 
          error: 'Cannot delete client with active license. Set force_delete: true to override.',
          client_status: client.status,
          suggestion: 'Consider suspending the client first or use force_delete option'
        },
        { status: 400 }
      );
    }

    console.log(`👥 Starting deletion process for client: ${client.name} (${clientId})`);

    // STEP 1: Create comprehensive backup (PRD requirement)
    const backupResult = await ClientBackupService.createClientBackup(
      client,
      {
        backup_reason: reason || 'Client deletion backup',
        ...backup_options
      },
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`
    );

    if (!backupResult.success) {
      return NextResponse.json(
        { 
          error: 'Failed to create backup before deletion',
          backup_error: backupResult.error,
          message: 'Client deletion aborted to prevent data loss'
        },
        { status: 500 }
      );
    }

    // STEP 2: Verify backup integrity
    const backupVerified = await ClientBackupService.verifyBackup(backupResult.backup_id!);
    if (!backupVerified) {
      return NextResponse.json(
        { 
          error: 'Backup verification failed',
          backup_id: backupResult.backup_id,
          message: 'Client deletion aborted due to backup integrity issues'
        },
        { status: 500 }
      );
    }

    // STEP 3: Delete client from database
    console.log(`👥 Client backup verified. Proceeding with deletion...`);
    console.log(`👥 Backup ID: ${backupResult.backup_id}`);
    console.log(`👥 Backup size: ${(backupResult.data_size_bytes! / 1024).toFixed(2)} KB`);

    // Actually delete the client from the database
    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (deleteError) {
      console.error('Database deletion error:', deleteError);
      return NextResponse.json(
        {
          error: 'Failed to delete client from database',
          details: deleteError.message,
          backup_id: backupResult.backup_id,
          message: 'Client backup was created successfully, but deletion failed. Client can be restored from backup.'
        },
        { status: 500 }
      );
    }

    // Log successful client deletion
    await AuditService.logCRUD(
      AuditAction.CLIENT_DELETED,
      authResult.user.id,
      authResult.user.email!,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      ResourceType.CLIENT,
      clientId,
      client.name,
      [
        { field: 'status', old_value: client.status, new_value: 'deleted' },
        { field: 'deletion_reason', old_value: null, new_value: reason || 'Client deletion via admin interface' },
        { field: 'backup_id', old_value: null, new_value: backupResult.backup_id }
      ],
      request
    ).catch(auditError => console.error('Audit logging failed:', auditError));

    // Log the deletion
    console.log(`👥 Client deleted: ${client.name} by ${authResult.user.email}`);
    console.log(`👥 Deletion reason: ${reason || 'No reason provided'}`);

    return NextResponse.json({
      message: 'Client deleted successfully with complete backup',
      deleted_client: {
        id: client.id,
        name: client.name,
        email: client.email,
        plan: client.plan,
        status: client.status
      },
      backup_info: {
        backup_id: backupResult.backup_id,
        backup_path: backupResult.backup_path,
        data_size_kb: Math.round(backupResult.data_size_bytes! / 1024),
        records_backed_up: backupResult.records_backed_up,
        retention_until: new Date(Date.now() + 2555 * 24 * 60 * 60 * 1000).toISOString(), // 7 years
        verified: backupVerified
      },
      deletion_details: {
        reason: reason || 'Client deletion via admin interface',
        force_delete: force_delete,
        deleted_by: {
          admin_id: authResult.user.id,
          admin_email: authResult.user.email,
          admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
          deleted_at: new Date().toISOString()
        }
      },
      warnings: backupResult.warnings || [],
      recovery_info: {
        message: 'Client data can be recovered from backup if needed',
        backup_retention: '7 years (2555 days)',
        recovery_procedure: 'Contact system administrator with backup ID'
      }
    });

  } catch (error) {
    console.error('Delete Client API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
