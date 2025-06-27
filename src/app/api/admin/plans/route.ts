import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { createPlanSchema, updatePlanSchema } from '@/lib/validation/schemas';
import { logApiError, logPlanOperation } from '@/lib/logger';



// GET /api/admin/plans - List all subscription plans
export async function GET(request: NextRequest) {
  let authResult: any = null;
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_LICENSES, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    // Build query
    let query = supabase
      .from('plans')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: plans, error, count } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    // Calculate summary
    const { data: allPlans } = await supabase
      .from('plans')
      .select('is_active');

    const summary = {
      total_plans: count || 0,
      active_plans: allPlans?.filter(p => p.is_active).length || 0,
      inactive_plans: allPlans?.filter(p => !p.is_active).length || 0
    };

    return NextResponse.json({
      plans: plans || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
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
    console.error('GET /api/admin/plans error:', error);

    logApiError('GET', '/api/admin/plans', error instanceof Error ? error : new Error('Unknown error'), authResult?.user?.id);

    if (error instanceof Error) {
      // Database connection errors
      if (error.message.includes('connection')) {
        return NextResponse.json(
          { error: 'Database connection failed', details: 'Unable to connect to database' },
          { status: 503 }
        );
      }

      // Permission errors
      if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        return NextResponse.json(
          { error: 'Insufficient permissions', details: 'You do not have permission to view plans' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch plans',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/plans - Create new subscription plan
export async function POST(request: NextRequest) {
  let authResult: any = null;
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Parse and validate request body
    const body = await request.json();

    // Validate with Zod schema
    const validationResult = createPlanSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const {
      name,
      code,
      description,
      price,
      currency,
      interval,
      annual_price_cents,
      annual_discount_percent,
      has_annual_discount,
      setup_fee_cents,
      trial_days,
      features,
      limits,
      is_active,
      version
    } = validationResult.data;

    // Check if plan code already exists
    const { data: existingPlan } = await supabase
      .from('plans')
      .select('code')
      .eq('code', code)
      .single();

    if (existingPlan) {
      return NextResponse.json(
        { error: 'Plan code already exists' },
        { status: 409 }
      );
    }

    // Extract additional pricing fields
    const price_per_additional_user_cents = body.pricing?.price_per_additional_user_cents || 0;

    // Create new plan in database
    const { data: newPlan, error } = await supabase
      .from('plans')
      .insert([{
        code,
        name,
        description,
        price,
        currency,
        interval,
        annual_price_cents,
        annual_discount_percent,
        has_annual_discount,
        setup_fee_cents,
        trial_days,
        price_per_additional_user_cents,
        features,
        limits: limits || {
          max_users: price === 0 ? 5 : price < 100 ? 15 : 50,
          max_projects: price === 0 ? 3 : -1,
          storage_gb: price === 0 ? 0.1 : price < 100 ? 1 : 10
        },
        is_active,
        version
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create plan: ${error.message}`);
    }

    // Log successful plan creation
    logPlanOperation('created', newPlan.id, authResult.user.id, {
      planName: newPlan.name,
      planCode: newPlan.code,
      price: newPlan.price
    });

    return NextResponse.json({
      plan: newPlan,
      message: 'Plan created successfully',
      created_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        created_at: new Date().toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    logApiError('POST', '/api/admin/plans', error instanceof Error ? error : new Error('Unknown error'), undefined, authResult?.user?.id);

    if (error instanceof Error) {
      // Duplicate key errors
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return NextResponse.json(
          { error: 'Plan already exists', details: 'A plan with this code already exists' },
          { status: 409 }
        );
      }

      // Validation errors from database
      if (error.message.includes('check constraint') || error.message.includes('invalid')) {
        return NextResponse.json(
          { error: 'Invalid data', details: 'The provided data does not meet database constraints' },
          { status: 400 }
        );
      }

      // Database connection errors
      if (error.message.includes('connection')) {
        return NextResponse.json(
          { error: 'Database connection failed', details: 'Unable to save plan to database' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to create plan',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// PUT /api/admin/plans - Bulk update multiple plans
export async function PUT(request: NextRequest) {
  let authResult: any = null;
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_PLANS, request);
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

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'updates object is required' },
        { status: 400 }
      );
    }

    // Validate updates with Zod schema
    const validationResult = updatePlanSchema.safeParse(updates);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    // Perform bulk update
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const planId of plan_ids) {
      try {
        const { data, error } = await supabase
          .from('plans')
          .update({
            ...validationResult.data,
            updated_at: new Date().toISOString()
          })
          .eq('id', planId)
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        results.push({
          plan_id: planId,
          success: true,
          message: 'Plan updated successfully',
          updated_plan: data
        });
        successCount++;

      } catch (error) {
        let errorMessage = 'Unknown error';

        if (error instanceof Error) {
          if (error.message.includes('not found') || error.message.includes('PGRST116')) {
            errorMessage = 'Plan not found';
          } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
            errorMessage = 'Insufficient permissions to update this plan';
          } else if (error.message.includes('constraint') || error.message.includes('invalid')) {
            errorMessage = 'Invalid data provided for update';
          } else {
            errorMessage = error.message;
          }
        }

        results.push({
          plan_id: planId,
          success: false,
          message: errorMessage
        });
        failureCount++;
      }
    }

    return NextResponse.json({
      results,
      summary: {
        total: plan_ids.length,
        success: successCount,
        failures: failureCount
      },
      reason: reason || 'Bulk update via admin interface',
      updated_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logApiError('PUT', '/api/admin/plans', error instanceof Error ? error : new Error('Unknown error'), undefined, authResult?.user?.id);

    return NextResponse.json(
      {
        error: 'Failed to update plans',
        details: error instanceof Error ? error.message : 'An unexpected error occurred during bulk update',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
