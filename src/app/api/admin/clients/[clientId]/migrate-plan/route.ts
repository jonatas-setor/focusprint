import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { PlanMigrationService } from '@/lib/plans/migration-service';
import { logger, logApiError } from '@/lib/logger';
import { z } from 'zod';

// Validation schema for plan migration
const migrationRequestSchema = z.object({
  to_plan_id: z.string().uuid('Invalid plan ID'),
  migration_reason: z.string().max(500, 'Migration reason must be less than 500 characters').optional(),
  effective_date: z.string().datetime('Invalid effective date format').optional(),
  force_migration: z.boolean().default(false)
});

// POST /api/admin/clients/[clientId]/migrate-plan - Validate migration
export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { clientId } = params;
    const body = await request.json();

    // Validate request body
    const validationResult = migrationRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const migrationRequest = {
      client_id: clientId,
      ...validationResult.data
    };

    // Validate migration
    const validation = await PlanMigrationService.validateMigration(migrationRequest);

    return NextResponse.json({
      client_id: clientId,
      validation,
      can_proceed: validation.is_valid || validationResult.data.force_migration,
      validated_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        validated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logApiError('POST', `/api/admin/clients/${params.clientId}/migrate-plan`, error instanceof Error ? error : new Error('Unknown error'));
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Client or plan not found', details: error.message },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      {
        error: 'Failed to validate migration',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// PUT /api/admin/clients/[clientId]/migrate-plan - Execute migration
export async function PUT(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { clientId } = params;
    const body = await request.json();

    // Validate request body
    const validationResult = migrationRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const migrationRequest = {
      client_id: clientId,
      ...validationResult.data
    };

    // Execute migration
    const migration = await PlanMigrationService.executeMigration(
      migrationRequest,
      authResult.user.id
    );

    return NextResponse.json({
      migration,
      message: 'Plan migration completed successfully',
      executed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        executed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logApiError('PUT', `/api/admin/clients/${params.clientId}/migrate-plan`, error instanceof Error ? error : new Error('Unknown error'));
    
    if (error instanceof Error) {
      if (error.message.includes('validation failed')) {
        return NextResponse.json(
          { error: 'Migration validation failed', details: error.message },
          { status: 400 }
        );
      }
      
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Client or plan not found', details: error.message },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      {
        error: 'Failed to execute migration',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GET /api/admin/clients/[clientId]/migrate-plan - Get migration history
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_LICENSES, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { clientId } = params;

    // Get migration history
    const migrationHistory = await PlanMigrationService.getClientMigrationHistory(clientId);

    return NextResponse.json({
      client_id: clientId,
      migration_history: migrationHistory,
      total_migrations: migrationHistory.length,
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    logApiError('GET', `/api/admin/clients/${params.clientId}/migrate-plan`, error instanceof Error ? error : new Error('Unknown error'));
    
    return NextResponse.json(
      {
        error: 'Failed to fetch migration history',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
