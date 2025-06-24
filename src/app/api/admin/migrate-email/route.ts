import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateAdminEmail } from '@/lib/auth/domain-validation';

// POST /api/admin/migrate-email - Migrate admin email to @focusprint.com domain
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { currentEmail, newEmail, confirmMigration } = body;

    // Validate inputs
    if (!currentEmail || !newEmail || confirmMigration !== 'MIGRATE_ADMIN_EMAIL') {
      return NextResponse.json(
        { error: 'Invalid migration request. Provide currentEmail, newEmail, and confirmMigration.' },
        { status: 400 }
      );
    }

    // Validate new email domain
    const emailValidation = validateAdminEmail(newEmail);
    if (!emailValidation.isValid || !emailValidation.isDomainAuthorized) {
      return NextResponse.json(
        { error: emailValidation.error || 'Invalid email domain' },
        { status: 400 }
      );
    }

    // Check if current user exists with the old email
    const { data: currentUser, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      return NextResponse.json(
        { error: 'Failed to check current users' },
        { status: 500 }
      );
    }

    const userToMigrate = currentUser.users.find(user => user.email === currentEmail);
    if (!userToMigrate) {
      return NextResponse.json(
        { error: `User with email ${currentEmail} not found` },
        { status: 404 }
      );
    }

    // Check if new email already exists
    const existingUser = currentUser.users.find(user => user.email === newEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: `User with email ${newEmail} already exists` },
        { status: 409 }
      );
    }

    // Update user email in Supabase Auth
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      userToMigrate.id,
      { 
        email: newEmail,
        email_confirm: true // Skip email confirmation for admin migration
      }
    );

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update user email: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Update admin profile if it exists
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', userToMigrate.id)
      .single();

    if (!profileError && adminProfile) {
      // Update admin profile with new email reference
      const { error: updateProfileError } = await supabase
        .from('admin_profiles')
        .update({ 
          updated_at: new Date().toISOString(),
          // Add any other fields that might reference the email
        })
        .eq('user_id', userToMigrate.id);

      if (updateProfileError) {
        console.error('Failed to update admin profile:', updateProfileError);
        // Don't fail the migration for this, just log it
      }
    }

    // Log the migration for audit purposes
    try {
      const { AuditService } = await import('@/lib/audit/audit-service');
      const { AuditAction, ResourceType, AuditSeverity } = await import('@/types/audit-log');
      
      await AuditService.log({
        admin_id: userToMigrate.id,
        admin_email: newEmail,
        admin_name: adminProfile?.first_name ? `${adminProfile.first_name} ${adminProfile.last_name}` : 'Admin User',
        action: AuditAction.ADMIN_UPDATED,
        resource_type: ResourceType.ADMIN,
        resource_id: userToMigrate.id,
        resource_name: `Admin Email Migration`,
        details: {
          description: `Admin email migrated from ${currentEmail} to ${newEmail} for domain compliance`,
          changes: [
            {
              field: 'email',
              old_value: currentEmail,
              new_value: newEmail
            }
          ],
          context: {
            migration_type: 'domain_compliance',
            reason: 'Enforce @focusprint.com domain restriction'
          }
        },
        severity: AuditSeverity.HIGH,
        status: 'success'
      }, request);
    } catch (auditError) {
      console.error('Failed to log email migration:', auditError);
    }

    return NextResponse.json({
      message: 'Admin email migration completed successfully',
      migration: {
        user_id: userToMigrate.id,
        old_email: currentEmail,
        new_email: newEmail,
        migrated_at: new Date().toISOString()
      },
      next_steps: [
        'The admin user should log out and log back in with the new email',
        'Update any external systems that reference the old email',
        'Verify all admin functions work with the new email'
      ]
    });

  } catch (error) {
    console.error('Error during email migration:', error);
    return NextResponse.json(
      { error: 'Failed to migrate admin email' },
      { status: 500 }
    );
  }
}

// GET /api/admin/migrate-email - Check migration status and requirements
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get all admin users
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      return NextResponse.json(
        { error: 'Failed to check users' },
        { status: 500 }
      );
    }

    // Check which admin users need migration
    const { validateAdminEmail, getAllowedAdminDomains } = await import('@/lib/auth/domain-validation');
    
    const adminUsers = users.users.filter(user => user.email);
    const migrationStatus = adminUsers.map(user => {
      const validation = validateAdminEmail(user.email!);
      return {
        user_id: user.id,
        email: user.email,
        needs_migration: !validation.isDomainAuthorized,
        validation_error: validation.error,
        created_at: user.created_at
      };
    });

    const needsMigration = migrationStatus.filter(user => user.needs_migration);
    const compliantUsers = migrationStatus.filter(user => !user.needs_migration);

    return NextResponse.json({
      domain_policy: {
        allowed_domains: getAllowedAdminDomains(),
        enforcement_active: true
      },
      migration_status: {
        total_admin_users: adminUsers.length,
        compliant_users: compliantUsers.length,
        users_needing_migration: needsMigration.length,
        migration_required: needsMigration.length > 0
      },
      users: {
        compliant: compliantUsers,
        needs_migration: needsMigration
      },
      migration_instructions: needsMigration.length > 0 ? [
        'Use POST /api/admin/migrate-email to migrate non-compliant admin emails',
        'Provide: { currentEmail, newEmail, confirmMigration: "MIGRATE_ADMIN_EMAIL" }',
        'New email must be from an authorized domain (@focusprint.com)',
        'Migration will update Supabase Auth and log the change for audit'
      ] : []
    });

  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status' },
      { status: 500 }
    );
  }
}
