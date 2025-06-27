// Promotional plans service for FocuSprint
// Manages promotional pricing and temporary offers

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface PromotionalPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  features: Record<string, any>;
  limits: Record<string, any>;
  is_active: boolean;
  is_promotional: boolean;
  promo_start_date: string | null;
  promo_end_date: string | null;
  promo_discount_percent: number | null;
  promo_discount_amount: number | null;
  promo_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePromotionalPlanData {
  base_plan_id: string;
  promo_code: string;
  promo_start_date: string;
  promo_end_date: string;
  discount_percent?: number;
  discount_amount?: number;
  description_suffix?: string;
}

export class PromotionalPlanService {
  /**
   * Create a promotional version of an existing plan
   */
  static async createPromotionalPlan(
    data: CreatePromotionalPlanData,
    createdBy: string
  ): Promise<PromotionalPlan> {
    const supabase = await createClient();

    try {
      // Get base plan
      const { data: basePlan, error: basePlanError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', data.base_plan_id)
        .single();

      if (basePlanError || !basePlan) {
        throw new Error(`Base plan not found: ${data.base_plan_id}`);
      }

      // Validate dates
      const startDate = new Date(data.promo_start_date);
      const endDate = new Date(data.promo_end_date);
      
      if (startDate >= endDate) {
        throw new Error('Promo start date must be before end date');
      }

      if (endDate <= new Date()) {
        throw new Error('Promo end date must be in the future');
      }

      // Validate discount
      if (!data.discount_percent && !data.discount_amount) {
        throw new Error('Either discount_percent or discount_amount must be provided');
      }

      if (data.discount_percent && (data.discount_percent <= 0 || data.discount_percent > 100)) {
        throw new Error('Discount percent must be between 0 and 100');
      }

      // Check if promo code already exists
      const { data: existingPromo } = await supabase
        .from('plans')
        .select('promo_code')
        .eq('promo_code', data.promo_code)
        .single();

      if (existingPromo) {
        throw new Error(`Promo code already exists: ${data.promo_code}`);
      }

      // Calculate promotional price
      let promoPrice = basePlan.price;
      if (data.discount_percent) {
        promoPrice = basePlan.price * (1 - data.discount_percent / 100);
      } else if (data.discount_amount) {
        promoPrice = Math.max(0, basePlan.price - data.discount_amount);
      }

      // Create promotional plan
      const { data: promoPlan, error } = await supabase
        .from('plans')
        .insert([{
          code: `${basePlan.code}_promo_${data.promo_code}`,
          name: `${basePlan.name} (Promo)`,
          description: `${basePlan.description}${data.description_suffix ? ` - ${data.description_suffix}` : ' - Limited Time Offer'}`,
          price: promoPrice,
          currency: basePlan.currency,
          interval: basePlan.interval,
          features: basePlan.features,
          limits: basePlan.limits,
          is_active: true,
          is_promotional: true,
          promo_start_date: data.promo_start_date,
          promo_end_date: data.promo_end_date,
          promo_discount_percent: data.discount_percent || null,
          promo_discount_amount: data.discount_amount || null,
          promo_code: data.promo_code,
          version: 1
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create promotional plan: ${error.message}`);
      }

      logger.info(`Promotional plan created: ${promoPlan.code}`, 'PROMO_PLAN', {
        basePlanId: data.base_plan_id,
        promoCode: data.promo_code,
        discountPercent: data.discount_percent,
        discountAmount: data.discount_amount,
        createdBy
      });

      return promoPlan;

    } catch (error) {
      logger.error('Failed to create promotional plan', error instanceof Error ? error : new Error('Unknown error'), 'PROMO_PLAN', {
        basePlanId: data.base_plan_id,
        promoCode: data.promo_code,
        createdBy
      });
      throw error;
    }
  }

  /**
   * Get all active promotional plans
   */
  static async getActivePromotionalPlans(): Promise<PromotionalPlan[]> {
    const supabase = await createClient();

    try {
      const { data: promoPlans, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_promotional', true)
        .eq('is_active', true)
        .lte('promo_start_date', new Date().toISOString())
        .gte('promo_end_date', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch active promotional plans: ${error.message}`);
      }

      return promoPlans || [];

    } catch (error) {
      logger.error('Failed to fetch active promotional plans', error instanceof Error ? error : new Error('Unknown error'), 'PROMO_PLAN');
      throw error;
    }
  }

  /**
   * Get promotional plan by promo code
   */
  static async getByPromoCode(promoCode: string): Promise<PromotionalPlan | null> {
    const supabase = await createClient();

    try {
      const { data: promoPlan, error } = await supabase
        .from('plans')
        .select('*')
        .eq('promo_code', promoCode)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch promotional plan: ${error.message}`);
      }

      return promoPlan;

    } catch (error) {
      logger.error('Failed to fetch promotional plan by code', error instanceof Error ? error : new Error('Unknown error'), 'PROMO_PLAN', {
        promoCode
      });
      throw error;
    }
  }

  /**
   * Validate if promotional plan is currently active
   */
  static isPromotionActive(plan: PromotionalPlan): boolean {
    if (!plan.is_promotional || !plan.is_active) {
      return false;
    }

    const now = new Date();
    const startDate = plan.promo_start_date ? new Date(plan.promo_start_date) : null;
    const endDate = plan.promo_end_date ? new Date(plan.promo_end_date) : null;

    if (startDate && now < startDate) {
      return false; // Not started yet
    }

    if (endDate && now > endDate) {
      return false; // Already expired
    }

    return true;
  }

  /**
   * Expire promotional plans that have passed their end date
   */
  static async expireOutdatedPromotions(): Promise<number> {
    const supabase = await createClient();

    try {
      const { data: expiredPlans, error } = await supabase
        .from('plans')
        .update({ is_active: false })
        .eq('is_promotional', true)
        .eq('is_active', true)
        .lt('promo_end_date', new Date().toISOString())
        .select('id, promo_code');

      if (error) {
        throw new Error(`Failed to expire promotional plans: ${error.message}`);
      }

      const expiredCount = expiredPlans?.length || 0;

      if (expiredCount > 0) {
        logger.info(`Expired ${expiredCount} promotional plans`, 'PROMO_PLAN', {
          expiredPlans: expiredPlans?.map(p => ({ id: p.id, promoCode: p.promo_code }))
        });
      }

      return expiredCount;

    } catch (error) {
      logger.error('Failed to expire promotional plans', error instanceof Error ? error : new Error('Unknown error'), 'PROMO_PLAN');
      throw error;
    }
  }

  /**
   * Get promotional plan statistics
   */
  static async getPromotionalStats(): Promise<{
    total_promotional_plans: number;
    active_promotions: number;
    expired_promotions: number;
    upcoming_promotions: number;
  }> {
    const supabase = await createClient();

    try {
      const { data: allPromos, error } = await supabase
        .from('plans')
        .select('is_active, promo_start_date, promo_end_date')
        .eq('is_promotional', true);

      if (error) {
        throw new Error(`Failed to fetch promotional stats: ${error.message}`);
      }

      const now = new Date();
      const stats = {
        total_promotional_plans: allPromos?.length || 0,
        active_promotions: 0,
        expired_promotions: 0,
        upcoming_promotions: 0
      };

      allPromos?.forEach(promo => {
        const startDate = promo.promo_start_date ? new Date(promo.promo_start_date) : null;
        const endDate = promo.promo_end_date ? new Date(promo.promo_end_date) : null;

        if (!promo.is_active) {
          stats.expired_promotions++;
        } else if (startDate && now < startDate) {
          stats.upcoming_promotions++;
        } else if (!endDate || now <= endDate) {
          stats.active_promotions++;
        } else {
          stats.expired_promotions++;
        }
      });

      return stats;

    } catch (error) {
      logger.error('Failed to get promotional stats', error instanceof Error ? error : new Error('Unknown error'), 'PROMO_PLAN');
      throw error;
    }
  }
}
