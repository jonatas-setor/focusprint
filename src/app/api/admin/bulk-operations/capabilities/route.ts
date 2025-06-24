import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { BulkOperationsService } from '@/lib/bulk/bulk-operations-service';

// GET /api/admin/bulk-operations/capabilities - Get bulk operation capabilities and options
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.SYSTEM_CONFIG, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get supported operations
    const supportedOperations = BulkOperationsService.getSupportedOperations();

    // Get current statistics
    const statistics = BulkOperationsService.getStatistics();

    // System limits and configuration
    const systemLimits = {
      max_concurrent_operations: 3,
      max_targets_per_operation: 1000,
      default_batch_size: 50,
      max_batch_size: 100,
      operation_timeout_hours: 24,
      max_operation_history: 1000
    };

    // Operation categories for UI organization
    const operationCategories = {
      user_management: {
        name: 'User Management',
        description: 'Operations for managing user accounts',
        operations: [
          'enable_users',
          'disable_users',
          'update_user_roles',
          'reset_passwords',
          'delete_users'
        ]
      },
      license_management: {
        name: 'License Management',
        description: 'Operations for managing licenses',
        operations: [
          'activate_licenses',
          'deactivate_licenses',
          'update_license_plans',
          'extend_license_expiration',
          'transfer_licenses'
        ]
      },
      client_management: {
        name: 'Client Management',
        description: 'Operations for managing client accounts',
        operations: [
          'update_client_plans',
          'suspend_clients',
          'reactivate_clients',
          'billing_adjustments',
          'delete_clients'
        ]
      },
      cross_system: {
        name: 'Cross-System Operations',
        description: 'Complex operations spanning multiple systems',
        operations: [
          'client_migration',
          'audit_export',
          'compliance_report',
          'feature_flag_sync',
          'bulk_notifications',
          'system_maintenance'
        ]
      }
    };

    // Parameter templates for common operations
    const parameterTemplates = {
      enable_users: {
        enabled: true
      },
      disable_users: {
        enabled: false
      },
      update_user_roles: {
        new_role: 'member', // admin, member, viewer
        effective_date: new Date().toISOString()
      },
      reset_passwords: {
        send_email: true,
        temporary_password: true
      },
      activate_licenses: {
        active: true
      },
      deactivate_licenses: {
        active: false
      },
      update_license_plans: {
        new_plan: 'PRO', // FREE, PRO, BUSINESS
        effective_date: new Date().toISOString()
      },
      extend_license_expiration: {
        extension_days: 30
      },
      update_client_plans: {
        new_plan: 'PRO', // FREE, PRO, BUSINESS
        effective_date: new Date().toISOString(),
        prorate_billing: true
      },
      suspend_clients: {
        suspended: true,
        suspension_reason: 'Administrative action'
      },
      reactivate_clients: {
        suspended: false
      },
      billing_adjustments: {
        adjustment_type: 'credit', // credit, debit, refund
        adjustment_amount: 0,
        adjustment_reason: 'Billing correction'
      },
      client_migration: {
        target_plan: 'BUSINESS',
        migration_date: new Date().toISOString(),
        migrate_data: true
      },
      audit_export: {
        date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        date_to: new Date().toISOString(),
        export_format: 'csv', // csv, json, pdf
        include_sensitive_data: false
      },
      feature_flag_sync: {
        source_environment: 'staging',
        target_environment: 'production',
        flag_categories: ['ui_features', 'api_features']
      }
    };

    // Risk levels for operations
    const riskLevels = {
      low: ['enable_users', 'activate_licenses', 'reactivate_clients'],
      medium: ['disable_users', 'update_user_roles', 'update_license_plans', 'suspend_clients'],
      high: ['reset_passwords', 'billing_adjustments', 'client_migration'],
      critical: ['delete_users', 'delete_clients', 'system_maintenance']
    };

    return NextResponse.json({
      supported_operations: supportedOperations,
      operation_categories: operationCategories,
      parameter_templates: parameterTemplates,
      risk_levels: riskLevels,
      system_limits: systemLimits,
      current_statistics: statistics,
      admin_info: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        permissions: {
          can_create_operations: true,
          can_cancel_operations: true,
          can_view_all_operations: true,
          can_export_results: true
        }
      },
      usage_guidelines: {
        best_practices: [
          'Always use dry_run=true first to validate operations',
          'Start with small batches for testing',
          'Monitor operation progress regularly',
          'Provide clear reasons for all operations',
          'Review validation results before proceeding'
        ],
        warnings: [
          'High-risk operations require additional approval',
          'Critical operations may affect system performance',
          'Large operations may take significant time to complete',
          'Failed operations may require manual cleanup'
        ],
        recommendations: {
          batch_sizes: {
            low_risk: 100,
            medium_risk: 50,
            high_risk: 25,
            critical_risk: 10
          },
          monitoring_intervals: {
            short_operations: '30 seconds',
            medium_operations: '2 minutes',
            long_operations: '5 minutes'
          }
        }
      }
    });

  } catch (error) {
    console.error('Error getting bulk operation capabilities:', error);
    return NextResponse.json(
      { error: 'Failed to get bulk operation capabilities' },
      { status: 500 }
    );
  }
}
