import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';

// Default plans data
const DEFAULT_PLANS = [
  {
    id: 'plan_free',
    name: 'free',
    display_name: 'Free',
    description: 'Perfect for individuals and small teams getting started with project management',
    version: 1,
    status: 'active',
    pricing: {
      currency: 'BRL',
      monthly_price_cents: 0,
      billing_cycle: 'monthly',
      trial_days: 0
    },
    features: {
      kanban_boards: true,
      real_time_chat: true,
      video_conferencing: false,
      file_attachments: true,
      advanced_reporting: false,
      api_access: false,
      custom_integrations: false,
      priority_support: false,
      white_labeling: false,
      advanced_security: false,
      audit_logs: false,
      custom_fields: false,
      automation_rules: false,
      advanced_permissions: false,
      data_export: false
    },
    limits: {
      max_users: 3,
      max_projects: 3,
      max_tasks_per_project: -1,
      storage_gb: 0.1,
      api_calls_per_month: 1000,
      max_integrations: 1,
      max_custom_fields: 0,
      max_automation_rules: 0,
      support_level: 'community',
      data_retention_months: 3
    },
    metadata: {
      target_audience: 'individual',
      recommended_team_size: '1-3 users',
      popular: false,
      tags: ['free', 'starter']
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'system',
    created_by_name: 'System',
    is_current_version: true
  },
  {
    id: 'plan_pro',
    name: 'pro',
    display_name: 'Pro',
    description: 'Ideal for growing teams that need advanced features and collaboration tools',
    version: 1,
    status: 'active',
    pricing: {
      currency: 'BRL',
      monthly_price_cents: 9700,
      billing_cycle: 'monthly',
      trial_days: 14
    },
    features: {
      kanban_boards: true,
      real_time_chat: true,
      video_conferencing: true,
      file_attachments: true,
      advanced_reporting: true,
      api_access: true,
      custom_integrations: false,
      priority_support: false,
      white_labeling: false,
      advanced_security: false,
      audit_logs: false,
      custom_fields: true,
      automation_rules: false,
      advanced_permissions: false,
      data_export: true
    },
    limits: {
      max_users: 5,
      max_projects: -1,
      max_tasks_per_project: -1,
      storage_gb: 1,
      api_calls_per_month: 10000,
      max_integrations: 5,
      max_custom_fields: 10,
      max_automation_rules: 5,
      support_level: 'email',
      data_retention_months: 12
    },
    metadata: {
      target_audience: 'small_team',
      recommended_team_size: '3-10 users',
      popular: true,
      tags: ['pro', 'popular']
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'system',
    created_by_name: 'System',
    is_current_version: true
  },
  {
    id: 'plan_business',
    name: 'business',
    display_name: 'Business',
    description: 'Comprehensive solution for larger teams with enterprise-grade features',
    version: 1,
    status: 'active',
    pricing: {
      currency: 'BRL',
      monthly_price_cents: 39900,
      billing_cycle: 'monthly',
      trial_days: 14
    },
    features: {
      kanban_boards: true,
      real_time_chat: true,
      video_conferencing: true,
      file_attachments: true,
      advanced_reporting: true,
      api_access: true,
      custom_integrations: true,
      priority_support: true,
      white_labeling: false,
      advanced_security: true,
      audit_logs: true,
      custom_fields: true,
      automation_rules: true,
      advanced_permissions: true,
      data_export: true
    },
    limits: {
      max_users: 30,
      max_projects: -1,
      max_tasks_per_project: -1,
      storage_gb: 10,
      api_calls_per_month: 100000,
      max_integrations: -1,
      max_custom_fields: -1,
      max_automation_rules: -1,
      support_level: 'priority',
      data_retention_months: 12
    },
    metadata: {
      target_audience: 'enterprise',
      recommended_team_size: '10-50 users',
      popular: false,
      tags: ['business', 'enterprise']
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'system',
    created_by_name: 'System',
    is_current_version: true
  }
];

// GET /api/admin/plans - List all subscription plans
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_LICENSES, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Parse query parameters for basic filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    // Filter plans
    let filteredPlans = [...DEFAULT_PLANS];

    if (search) {
      const searchLower = search.toLowerCase();
      filteredPlans = filteredPlans.filter(plan =>
        plan.name.toLowerCase().includes(searchLower) ||
        plan.display_name.toLowerCase().includes(searchLower) ||
        plan.description.toLowerCase().includes(searchLower)
      );
    }

    if (status) {
      filteredPlans = filteredPlans.filter(plan => plan.status === status);
    }

    // Apply pagination
    const total = filteredPlans.length;
    const pages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedPlans = filteredPlans.slice(offset, offset + limit);

    // Calculate summary
    const summary = {
      total_plans: DEFAULT_PLANS.length,
      active_plans: DEFAULT_PLANS.filter(p => p.status === 'active').length,
      deprecated_plans: DEFAULT_PLANS.filter(p => p.status === 'deprecated').length,
      draft_plans: DEFAULT_PLANS.filter(p => p.status === 'draft').length
    };

    // Log the access
    console.log(`Plans accessed by admin: ${authResult.user.email} (${authResult.adminProfile?.role})`);

    return NextResponse.json({
      plans: paginatedPlans,
      pagination: {
        page,
        limit,
        total,
        pages
      },
      summary,
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Plans API Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/plans - Create new subscription plan
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Parse request body
    const body = await request.json();
    const { name, display_name, description, pricing, features, limits, metadata } = body;

    // Basic validation
    if (!name || !display_name || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: name, display_name, description' },
        { status: 400 }
      );
    }

    // Create new plan
    const newPlan = {
      id: `plan_${name}_${Date.now()}`,
      name,
      display_name,
      description,
      version: 1,
      status: 'draft',
      pricing: pricing || { currency: 'BRL', monthly_price_cents: 0, billing_cycle: 'monthly' },
      features: features || {},
      limits: limits || { max_users: 1, max_projects: 1, storage_gb: 0.1 },
      metadata: metadata || { target_audience: 'individual', recommended_team_size: '1 user', tags: [] },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: authResult.user.id,
      created_by_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      is_current_version: true
    };

    // Log the creation
    console.log(`Plan created: ${newPlan.name} by ${authResult.user.email}`);

    return NextResponse.json({
      plan: newPlan,
      message: 'Subscription plan created successfully',
      created_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        created_at: new Date().toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Create Plan API Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/admin/plans - Bulk update multiple plans
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Parse request body
    const body = await request.json();
    const { plan_ids, updates, reason } = body;

    if (!Array.isArray(plan_ids) || plan_ids.length === 0) {
      return NextResponse.json(
        { error: 'plan_ids array is required' },
        { status: 400 }
      );
    }

    // Simulate bulk update
    const results = plan_ids.map(planId => ({
      plan_id: planId,
      success: true,
      message: 'Plan updated successfully (simulated)'
    }));

    // Log the bulk update
    console.log(`Bulk plan update by ${authResult.user.email}: ${plan_ids.length} plans`);

    return NextResponse.json({
      results,
      summary: {
        total: plan_ids.length,
        success: plan_ids.length,
        failures: 0
      },
      updated_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Bulk Update Plans API Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
