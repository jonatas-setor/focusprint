import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';

// Mock plan data for testing
const MOCK_PLANS = {
  'plan_free': {
    id: 'plan_free',
    name: 'free',
    display_name: 'Free',
    description: 'Perfect for individuals and small teams getting started',
    version: 1,
    status: 'active',
    pricing: { currency: 'BRL', monthly_price_cents: 0, billing_cycle: 'monthly' },
    features: { kanban_boards: true, real_time_chat: true, video_conferencing: false },
    limits: { max_users: 3, max_projects: 3, storage_gb: 0.1 },
    metadata: { target_audience: 'individual', recommended_team_size: '1-3 users', tags: ['free'] },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'system',
    created_by_name: 'System',
    is_current_version: true
  },
  'plan_pro': {
    id: 'plan_pro',
    name: 'pro',
    display_name: 'Pro',
    description: 'Ideal for growing teams that need advanced features',
    version: 1,
    status: 'active',
    pricing: { currency: 'BRL', monthly_price_cents: 9700, billing_cycle: 'monthly' },
    features: { kanban_boards: true, real_time_chat: true, video_conferencing: true },
    limits: { max_users: 5, max_projects: -1, storage_gb: 1 },
    metadata: { target_audience: 'small_team', recommended_team_size: '3-10 users', tags: ['pro', 'popular'] },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'system',
    created_by_name: 'System',
    is_current_version: true
  },
  'plan_business': {
    id: 'plan_business',
    name: 'business',
    display_name: 'Business',
    description: 'Comprehensive solution for larger teams',
    version: 1,
    status: 'active',
    pricing: { currency: 'BRL', monthly_price_cents: 39900, billing_cycle: 'monthly' },
    features: { kanban_boards: true, real_time_chat: true, video_conferencing: true },
    limits: { max_users: 30, max_projects: -1, storage_gb: 10 },
    metadata: { target_audience: 'enterprise', recommended_team_size: '10-50 users', tags: ['business'] },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'system',
    created_by_name: 'System',
    is_current_version: true
  }
};

// GET /api/admin/plans/[planId] - Get detailed plan information
export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_LICENSES, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { planId } = params;

    // Get plan from mock data
    const plan = MOCK_PLANS[planId as keyof typeof MOCK_PLANS];

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Mock additional data
    const planDetails = {
      plan,
      versions: [
        {
          id: `version_${planId}_1`,
          plan_id: planId,
          version: 1,
          changes_summary: 'Initial plan creation',
          created_at: plan.created_at,
          created_by: plan.created_by,
          created_by_name: plan.created_by_name,
          is_current: true,
          plan_data: plan
        }
      ],
      usage_stats: {
        plan_id: planId,
        plan_name: plan.display_name,
        total_subscribers: Math.floor(Math.random() * 50) + 10,
        active_subscribers: Math.floor(Math.random() * 40) + 8,
        trial_subscribers: Math.floor(Math.random() * 10) + 2,
        churned_subscribers: Math.floor(Math.random() * 5),
        monthly_revenue: (plan.pricing.monthly_price_cents / 100) * Math.floor(Math.random() * 40 + 8),
        average_usage: {
          avg_users_per_client: Math.round((Math.random() * plan.limits.max_users) * 100) / 100,
          avg_projects_per_client: Math.round((Math.random() * 10 + 1) * 100) / 100,
          avg_storage_usage_gb: Math.round((Math.random() * plan.limits.storage_gb) * 100) / 100,
          avg_api_calls_per_month: Math.floor(Math.random() * 5000),
          feature_adoption_rates: {
            kanban_boards: 95.5,
            real_time_chat: 87.2,
            video_conferencing: plan.features.video_conferencing ? 65.8 : 0
          }
        },
        growth_metrics: {
          new_subscribers_30d: Math.floor(Math.random() * 10) + 2,
          churned_subscribers_30d: Math.floor(Math.random() * 3),
          upgrade_rate: plan.name === 'free' ? 15.5 : plan.name === 'pro' ? 8.2 : 0,
          downgrade_rate: plan.name === 'business' ? 2.1 : plan.name === 'pro' ? 1.5 : 0,
          retention_rate: plan.name === 'free' ? 65.0 : plan.name === 'pro' ? 85.5 : 92.3
        }
      },
      clients: Array.from({ length: Math.floor(Math.random() * 10) + 3 }, (_, i) => ({
        id: `client_${planId}_${i + 1}`,
        name: `${plan.display_name} Client ${i + 1}`,
        status: Math.random() > 0.1 ? 'active' : 'trial',
        subscribed_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        usage: {
          users_count: Math.floor(Math.random() * (plan.limits.max_users > 0 ? plan.limits.max_users : 10)) + 1,
          projects_count: Math.floor(Math.random() * 20) + 1,
          storage_used_gb: Math.round(Math.random() * plan.limits.storage_gb * 100) / 100
        }
      })),
      migration_history: []
    };

    // Log the access
    console.log(`Plan details accessed: ${planId} by ${authResult.user.email}`);

    return NextResponse.json({
      ...planDetails,
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Plan Details API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/admin/plans/[planId] - Update specific plan
export async function PUT(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { planId } = params;

    // Parse request body
    const body = await request.json();
    const { updates, reason } = body;

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'updates object is required' },
        { status: 400 }
      );
    }

    // Get plan from mock data
    const plan = MOCK_PLANS[planId as keyof typeof MOCK_PLANS];

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Simulate update
    const updatedPlan = {
      ...plan,
      ...updates,
      updated_at: new Date().toISOString(),
      version: plan.version + 1
    };

    // Log the update
    console.log(`Plan updated: ${planId} by ${authResult.user.email}`);

    return NextResponse.json({
      plan: updatedPlan,
      message: 'Plan updated successfully',
      reason: reason || 'Plan updated via admin interface',
      updated_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Update Plan API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/plans/[planId] - Delete/deactivate plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { planId } = params;

    // Parse request body for reason
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    // Get plan from mock data
    const plan = MOCK_PLANS[planId as keyof typeof MOCK_PLANS];

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Simulate checking for active subscribers
    const hasActiveSubscribers = Math.random() > 0.7; // 30% chance of having active subscribers

    if (hasActiveSubscribers) {
      return NextResponse.json(
        { error: 'Cannot delete plan with active subscribers. Migrate clients first.' },
        { status: 400 }
      );
    }

    // Log the deletion
    console.log(`Plan deleted: ${planId} by ${authResult.user.email}`);

    return NextResponse.json({
      message: 'Plan marked as deprecated successfully',
      reason: reason || 'Plan deleted via admin interface',
      deleted_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        deleted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Delete Plan API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
