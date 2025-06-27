import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { PromotionalPlanService } from '@/lib/plans/promotional-service';
import { logger, logApiError, logPlanOperation } from '@/lib/logger';
import { z } from 'zod';

// Validation schema for creating promotional plans
const createPromotionalPlanSchema = z.object({
  base_plan_id: z.string().uuid('Invalid base plan ID'),
  promo_code: z.string().min(3, 'Promo code must be at least 3 characters').max(50, 'Promo code must be less than 50 characters'),
  promo_start_date: z.string().datetime('Invalid start date format'),
  promo_end_date: z.string().datetime('Invalid end date format'),
  discount_percent: z.number().min(0.01, 'Discount percent must be greater than 0').max(100, 'Discount percent cannot exceed 100').optional(),
  discount_amount: z.number().min(0.01, 'Discount amount must be greater than 0').optional(),
  description_suffix: z.string().max(200, 'Description suffix must be less than 200 characters').optional()
}).refine(
  (data) => data.discount_percent || data.discount_amount,
  { message: 'Either discount_percent or discount_amount must be provided' }
);

// GET /api/admin/plans/promotional - List all promotional plans
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_LICENSES, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'active', 'expired', 'upcoming', 'all'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query
    let query = supabase
      .from('plans')
      .select('*', { count: 'exact' })
      .eq('is_promotional', true);

    // Apply status filter
    const now = new Date().toISOString();
    switch (status) {
      case 'active':
        query = query
          .eq('is_active', true)
          .lte('promo_start_date', now)
          .gte('promo_end_date', now);
        break;
      case 'expired':
        query = query.or(`is_active.eq.false,promo_end_date.lt.${now}`);
        break;
      case 'upcoming':
        query = query
          .eq('is_active', true)
          .gt('promo_start_date', now);
        break;
      case 'all':
      default:
        // No additional filter
        break;
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    // Execute query
    const { data: promotionalPlans, error, count } = await query;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    // Get promotional statistics
    const stats = await PromotionalPlanService.getPromotionalStats();

    return NextResponse.json({
      promotional_plans: promotionalPlans || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      },
      statistics: stats,
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    logApiError('GET', '/api/admin/plans/promotional', error instanceof Error ? error : new Error('Unknown error'));
    
    return NextResponse.json(
      {
        error: 'Failed to fetch promotional plans',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/plans/promotional - Create new promotional plan
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Parse and validate request body
    const body = await request.json();
    
    const validationResult = createPromotionalPlanSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    // Create promotional plan
    const promotionalPlan = await PromotionalPlanService.createPromotionalPlan(
      validationResult.data,
      authResult.user.id
    );

    // Log successful creation
    logPlanOperation('promotional_created', promotionalPlan.id, authResult.user.id, {
      promoCode: promotionalPlan.promo_code,
      basePlanId: validationResult.data.base_plan_id,
      discountPercent: validationResult.data.discount_percent,
      discountAmount: validationResult.data.discount_amount
    });

    return NextResponse.json({
      promotional_plan: promotionalPlan,
      message: 'Promotional plan created successfully',
      created_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        created_at: new Date().toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    logApiError('POST', '/api/admin/plans/promotional', error instanceof Error ? error : new Error('Unknown error'), undefined, authResult?.user?.id);
    
    if (error instanceof Error) {
      // Handle specific errors
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'Promo code already exists', details: error.message },
          { status: 409 }
        );
      }
      
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Base plan not found', details: error.message },
          { status: 404 }
        );
      }
      
      if (error.message.includes('date')) {
        return NextResponse.json(
          { error: 'Invalid date range', details: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      {
        error: 'Failed to create promotional plan',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// PUT /api/admin/plans/promotional/expire - Expire outdated promotional plans
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Expire outdated promotions
    const expiredCount = await PromotionalPlanService.expireOutdatedPromotions();

    return NextResponse.json({
      message: `${expiredCount} promotional plans expired`,
      expired_count: expiredCount,
      expired_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        expired_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logApiError('PUT', '/api/admin/plans/promotional/expire', error instanceof Error ? error : new Error('Unknown error'), undefined, authResult?.user?.id);
    
    return NextResponse.json(
      {
        error: 'Failed to expire promotional plans',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
