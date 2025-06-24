import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { FeatureFlagService } from '@/lib/feature-flags/feature-flags-service';
import { EvaluationContext, Environment } from '@/types/feature-flags';

// POST /api/admin/feature-flags/evaluate - Evaluate feature flags for specific context
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.FEATURE_FLAGS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { flag_keys, context } = body;

    // Validate required fields
    if (!flag_keys || !Array.isArray(flag_keys) || flag_keys.length === 0) {
      return NextResponse.json(
        { error: 'flag_keys array is required' },
        { status: 400 }
      );
    }

    if (!context || !context.environment) {
      return NextResponse.json(
        { error: 'context with environment is required' },
        { status: 400 }
      );
    }

    // Validate environment
    if (!Object.values(Environment).includes(context.environment)) {
      return NextResponse.json(
        { error: `Invalid environment. Must be one of: ${Object.values(Environment).join(', ')}` },
        { status: 400 }
      );
    }

    // Limit number of flags to evaluate
    if (flag_keys.length > 100) {
      return NextResponse.json(
        { error: 'Cannot evaluate more than 100 flags at once' },
        { status: 400 }
      );
    }

    // Create evaluation context
    const evaluationContext: EvaluationContext = {
      client_id: context.client_id,
      client_plan: context.client_plan,
      user_id: context.user_id,
      user_email: context.user_email,
      user_role: context.user_role,
      environment: context.environment,
      custom_attributes: context.custom_attributes || {}
    };

    // Evaluate each flag
    const evaluations = [];
    for (const flagKey of flag_keys) {
      try {
        const evaluation = await FeatureFlagService.evaluateFlag(flagKey, evaluationContext);
        evaluations.push(evaluation);
      } catch (error) {
        evaluations.push({
          flag_key: flagKey,
          value: null,
          is_enabled: false,
          reason: 'evaluation_error',
          evaluation_context: evaluationContext,
          evaluated_at: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Calculate summary
    const summary = {
      total_flags: flag_keys.length,
      enabled_flags: evaluations.filter(e => e.is_enabled).length,
      disabled_flags: evaluations.filter(e => !e.is_enabled).length,
      error_flags: evaluations.filter(e => e.reason === 'evaluation_error').length,
      not_found_flags: evaluations.filter(e => e.reason === 'flag_not_found').length,
      client_overrides: evaluations.filter(e => e.reason === 'client_override').length,
      condition_matches: evaluations.filter(e => e.reason === 'condition_match').length
    };

    // Log the evaluation for audit (if evaluating for a specific client)
    if (context.client_id) {
      try {
        const { AuditService } = await import('@/lib/audit/audit-service');
        const { AuditAction, ResourceType, AuditSeverity } = await import('@/types/audit-log');
        
        await AuditService.log({
          admin_id: authResult.user.id,
          admin_email: authResult.user.email || '',
          admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
          action: AuditAction.DATA_EXPORTED,
          resource_type: ResourceType.FEATURE_FLAG,
          resource_id: 'evaluation',
          resource_name: 'Feature Flag Evaluation',
          details: {
            description: `Evaluated ${flag_keys.length} feature flags for client ${context.client_id}`,
            context: {
              flag_keys,
              evaluation_context: evaluationContext,
              summary
            }
          },
          severity: AuditSeverity.LOW,
          status: 'success'
        });
      } catch (auditError) {
        console.error('Failed to log evaluation:', auditError);
      }
    }

    return NextResponse.json({
      evaluations,
      summary,
      evaluation_context: evaluationContext,
      evaluated_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        evaluated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error evaluating feature flags:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to evaluate feature flags' },
      { status: 500 }
    );
  }
}

// GET /api/admin/feature-flags/evaluate - Get evaluation options and test contexts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.FEATURE_FLAGS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get all available flags for evaluation
    const flagsResponse = await FeatureFlagService.getFlags({}, 1, 1000);
    const availableFlags = flagsResponse.flags.map(flag => ({
      key: flag.key,
      name: flag.name,
      type: flag.type,
      environment: flag.environment,
      is_enabled: flag.is_enabled,
      status: flag.status,
      target_audience: flag.target_audience,
      rollout_percentage: flag.rollout_percentage
    }));

    // Predefined test contexts
    const testContexts = [
      {
        name: 'Free Plan User',
        context: {
          client_id: 'test-client-free',
          client_plan: 'FREE',
          user_id: 'test-user-free',
          user_email: 'user@example.com',
          user_role: 'member',
          environment: Environment.DEVELOPMENT,
          custom_attributes: {
            registration_date: '2024-01-01',
            usage_level: 'low'
          }
        }
      },
      {
        name: 'Pro Plan User',
        context: {
          client_id: 'test-client-pro',
          client_plan: 'PRO',
          user_id: 'test-user-pro',
          user_email: 'pro@example.com',
          user_role: 'admin',
          environment: Environment.PRODUCTION,
          custom_attributes: {
            registration_date: '2023-06-01',
            usage_level: 'high'
          }
        }
      },
      {
        name: 'Business Plan User',
        context: {
          client_id: 'test-client-business',
          client_plan: 'BUSINESS',
          user_id: 'test-user-business',
          user_email: 'business@example.com',
          user_role: 'owner',
          environment: Environment.PRODUCTION,
          custom_attributes: {
            registration_date: '2022-01-01',
            usage_level: 'enterprise'
          }
        }
      },
      {
        name: 'Beta User',
        context: {
          client_id: 'test-client-beta',
          client_plan: 'PRO',
          user_id: 'test-user-beta',
          user_email: 'beta@example.com',
          user_role: 'member',
          environment: Environment.STAGING,
          custom_attributes: {
            beta_user: true,
            registration_date: '2024-01-15',
            usage_level: 'medium'
          }
        }
      }
    ];

    return NextResponse.json({
      available_flags: availableFlags,
      test_contexts: testContexts,
      evaluation_options: {
        max_flags_per_evaluation: 100,
        supported_environments: Object.values(Environment),
        supported_attributes: [
          'client_id',
          'client_plan',
          'user_id',
          'user_email',
          'user_role',
          'custom_attributes'
        ]
      },
      statistics: {
        total_flags: availableFlags.length,
        enabled_flags: availableFlags.filter(f => f.is_enabled).length,
        production_flags: availableFlags.filter(f => f.environment === Environment.PRODUCTION).length,
        staging_flags: availableFlags.filter(f => f.environment === Environment.STAGING).length,
        development_flags: availableFlags.filter(f => f.environment === Environment.DEVELOPMENT).length
      },
      admin_info: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting evaluation options:', error);
    return NextResponse.json(
      { error: 'Failed to get evaluation options' },
      { status: 500 }
    );
  }
}
