import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { FeatureFlagService } from '@/lib/feature-flags/feature-flags-service';
import { BulkFeatureFlagOperation } from '@/types/feature-flags';

// POST /api/admin/feature-flags/bulk - Perform bulk operations on feature flags
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.FEATURE_FLAGS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { action, flag_ids, reason, environment } = body;

    // Validate required fields
    if (!action || !flag_ids || !Array.isArray(flag_ids) || flag_ids.length === 0) {
      return NextResponse.json(
        { error: 'action and flag_ids array are required' },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ['enable', 'disable', 'archive', 'delete'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate flag_ids
    if (flag_ids.length > 50) {
      return NextResponse.json(
        { error: 'Cannot perform bulk operation on more than 50 flags at once' },
        { status: 400 }
      );
    }

    // For delete operations, require higher permissions
    if (action === 'delete') {
      const deleteAuthResult = await checkAdminAuth(supabase, AdminPermission.SYSTEM_CONFIG, request);
      if (deleteAuthResult.error) {
        return NextResponse.json(
          { error: 'SYSTEM_CONFIG permission required for bulk delete operations' },
          { status: 403 }
        );
      }
    }

    // Extract request information
    const getClientIP = (req: Request): string => {
      const forwarded = req.headers.get('x-forwarded-for');
      const realIP = req.headers.get('x-real-ip');
      
      if (forwarded) return forwarded.split(',')[0].trim();
      if (realIP) return realIP;
      return 'unknown';
    };

    const requestInfo = {
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || undefined
    };

    // Create bulk operation
    const operation: BulkFeatureFlagOperation = {
      action,
      flag_ids,
      reason: reason || `Bulk ${action} operation`,
      environment
    };

    // Perform bulk operation
    const result = await FeatureFlagService.bulkOperation(
      operation,
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      requestInfo
    );

    // Log the bulk operation for audit
    try {
      const { AuditService } = await import('@/lib/audit/audit-service');
      const { AuditAction, ResourceType, AuditSeverity } = await import('@/types/audit-log');
      
      await AuditService.log({
        admin_id: authResult.user.id,
        admin_email: authResult.user.email || '',
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        action: AuditAction.BULK_OPERATION,
        resource_type: ResourceType.FEATURE_FLAG,
        resource_id: 'bulk_operation',
        resource_name: `Bulk ${action} operation`,
        details: {
          description: `Bulk ${action} operation on ${flag_ids.length} feature flags`,
          context: {
            operation_type: action,
            flag_count: flag_ids.length,
            success_count: result.success_count,
            failure_count: result.failure_count,
            reason: operation.reason,
            environment: operation.environment
          }
        },
        severity: action === 'delete' ? AuditSeverity.HIGH : AuditSeverity.MEDIUM,
        status: result.failure_count === 0 ? 'success' : 'warning',
        ip_address: requestInfo.ip_address,
        user_agent: requestInfo.user_agent
      });
    } catch (auditError) {
      console.error('Failed to log bulk operation:', auditError);
    }

    return NextResponse.json({
      message: `Bulk ${action} operation completed`,
      result,
      summary: {
        total_flags: flag_ids.length,
        successful: result.success_count,
        failed: result.failure_count,
        success_rate: Math.round((result.success_count / flag_ids.length) * 100)
      },
      performed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        performed_at: result.performed_at
      }
    });

  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}

// GET /api/admin/feature-flags/bulk - Get bulk operation options and validation
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.FEATURE_FLAGS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const flagIds = searchParams.get('flag_ids')?.split(',') || [];

    // Get current statistics
    const stats = FeatureFlagService.getStatistics();

    // Validate flag IDs if provided
    let validationResults = [];
    if (flagIds.length > 0) {
      for (const flagId of flagIds) {
        const flag = await FeatureFlagService.getFlagById(flagId);
        validationResults.push({
          flag_id: flagId,
          exists: !!flag,
          flag_name: flag?.name || 'Unknown',
          flag_key: flag?.key || 'Unknown',
          current_status: flag?.status || 'Unknown',
          is_enabled: flag?.is_enabled || false,
          can_enable: flag ? !flag.is_enabled && flag.status === 'active' : false,
          can_disable: flag ? flag.is_enabled : false,
          can_archive: flag ? flag.status === 'active' : false,
          can_delete: !!flag,
          warnings: flag ? getBulkOperationWarnings(flag) : ['Flag not found']
        });
      }
    }

    return NextResponse.json({
      bulk_options: {
        max_flags_per_operation: 50,
        available_actions: [
          {
            action: 'enable',
            description: 'Enable selected feature flags',
            required_permission: 'FEATURE_FLAGS',
            destructive: false
          },
          {
            action: 'disable',
            description: 'Disable selected feature flags',
            required_permission: 'FEATURE_FLAGS',
            destructive: false
          },
          {
            action: 'archive',
            description: 'Archive selected feature flags',
            required_permission: 'FEATURE_FLAGS',
            destructive: true
          },
          {
            action: 'delete',
            description: 'Permanently delete selected feature flags',
            required_permission: 'SYSTEM_CONFIG',
            destructive: true
          }
        ]
      },
      current_statistics: stats,
      validation_results: validationResults,
      admin_info: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        permissions: {
          can_bulk_enable_disable: true,
          can_bulk_archive: true,
          can_bulk_delete: authResult.adminProfile?.role === 'super_admin' // Simplified check
        }
      }
    });

  } catch (error) {
    console.error('Error getting bulk operation options:', error);
    return NextResponse.json(
      { error: 'Failed to get bulk operation options' },
      { status: 500 }
    );
  }
}

// Helper function to get bulk operation warnings
function getBulkOperationWarnings(flag: any): string[] {
  const warnings: string[] = [];

  if (flag.environment === 'production') {
    warnings.push('Production environment flag');
  }

  if (flag.target_audience === 'all_users') {
    warnings.push('Affects all users');
  }

  if (flag.client_overrides && flag.client_overrides.length > 0) {
    warnings.push(`Has ${flag.client_overrides.length} client overrides`);
  }

  if (flag.category === 'security' || flag.category === 'billing') {
    warnings.push('Critical system flag');
  }

  if (flag.rollout_percentage === 100 && flag.is_enabled) {
    warnings.push('Fully rolled out to users');
  }

  return warnings;
}
