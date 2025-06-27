import { NextRequest, NextResponse } from 'next/server';
import { PromotionalPlanService } from '@/lib/plans/promotional-service';
import { logger, logApiError } from '@/lib/logger';

// GET /api/plans/promo/[promoCode] - Validate and get promotional plan by code (public endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: { promoCode: string } }
) {
  try {
    const { promoCode } = params;

    // Validate promo code format
    if (!promoCode || promoCode.length < 3) {
      return NextResponse.json(
        { error: 'Invalid promo code format' },
        { status: 400 }
      );
    }

    // Get promotional plan by code
    const promotionalPlan = await PromotionalPlanService.getByPromoCode(promoCode);

    if (!promotionalPlan) {
      return NextResponse.json(
        { error: 'Promo code not found' },
        { status: 404 }
      );
    }

    // Check if promotion is currently active
    const isActive = PromotionalPlanService.isPromotionActive(promotionalPlan);

    if (!isActive) {
      // Determine why it's not active
      const now = new Date();
      const startDate = promotionalPlan.promo_start_date ? new Date(promotionalPlan.promo_start_date) : null;
      const endDate = promotionalPlan.promo_end_date ? new Date(promotionalPlan.promo_end_date) : null;

      let reason = 'Promotion is not active';
      if (!promotionalPlan.is_active) {
        reason = 'Promotion has been deactivated';
      } else if (startDate && now < startDate) {
        reason = 'Promotion has not started yet';
      } else if (endDate && now > endDate) {
        reason = 'Promotion has expired';
      }

      return NextResponse.json(
        { 
          error: 'Promo code not valid',
          reason,
          promo_start_date: promotionalPlan.promo_start_date,
          promo_end_date: promotionalPlan.promo_end_date
        },
        { status: 410 } // Gone
      );
    }

    // Calculate savings information
    const originalPrice = promotionalPlan.price / (1 - (promotionalPlan.promo_discount_percent || 0) / 100);
    const savings = originalPrice - promotionalPlan.price;
    const savingsPercent = promotionalPlan.promo_discount_percent || 
      (promotionalPlan.promo_discount_amount ? (promotionalPlan.promo_discount_amount / originalPrice) * 100 : 0);

    // Return promotional plan details (public-safe information)
    return NextResponse.json({
      valid: true,
      promotional_plan: {
        id: promotionalPlan.id,
        code: promotionalPlan.code,
        name: promotionalPlan.name,
        description: promotionalPlan.description,
        price: promotionalPlan.price,
        currency: promotionalPlan.currency,
        interval: promotionalPlan.interval,
        features: promotionalPlan.features,
        limits: promotionalPlan.limits,
        promo_code: promotionalPlan.promo_code,
        promo_start_date: promotionalPlan.promo_start_date,
        promo_end_date: promotionalPlan.promo_end_date
      },
      savings: {
        original_price: originalPrice,
        discounted_price: promotionalPlan.price,
        savings_amount: savings,
        savings_percent: Math.round(savingsPercent * 100) / 100
      },
      validity: {
        is_active: true,
        starts_at: promotionalPlan.promo_start_date,
        expires_at: promotionalPlan.promo_end_date,
        time_remaining: endDate ? Math.max(0, endDate.getTime() - now.getTime()) : null
      },
      accessed_at: new Date().toISOString()
    });

  } catch (error) {
    logApiError('GET', `/api/plans/promo/${params.promoCode}`, error instanceof Error ? error : new Error('Unknown error'));
    
    return NextResponse.json(
      {
        error: 'Failed to validate promo code',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
