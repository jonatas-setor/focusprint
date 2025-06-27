import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { formatCurrency } from '@/lib/utils/pricing';

export interface SetupFeeCalculation {
  planId: string;
  planName: string;
  recurringAmount: number;
  setupFeeAmount: number;
  totalFirstPayment: number;
  currency: string;
  hasSetupFee: boolean;
  formattedRecurring: string;
  formattedSetupFee: string;
  formattedTotal: string;
}

export interface SetupFeeHistory {
  id: string;
  clientId: string;
  planId: string;
  setupFeeAmount: number;
  currency: string;
  paidAt: string;
  stripePaymentIntentId?: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: string;
}

export class SetupFeeService {
  /**
   * Calculate setup fee for a plan
   */
  static async calculateSetupFee(planId: string): Promise<SetupFeeCalculation | null> {
    const supabase = await createClient();

    try {
      const { data: plan, error } = await supabase
        .from('plans')
        .select('id, name, price, setup_fee_cents, currency')
        .eq('id', planId)
        .single();

      if (error || !plan) {
        throw new Error('Plan not found');
      }

      const recurringAmount = plan.price * 100; // Convert to cents
      const setupFeeAmount = plan.setup_fee_cents || 0;
      const totalFirstPayment = recurringAmount + setupFeeAmount;
      const hasSetupFee = setupFeeAmount > 0;

      return {
        planId: plan.id,
        planName: plan.name,
        recurringAmount,
        setupFeeAmount,
        totalFirstPayment,
        currency: plan.currency,
        hasSetupFee,
        formattedRecurring: formatCurrency(recurringAmount, plan.currency),
        formattedSetupFee: formatCurrency(setupFeeAmount, plan.currency),
        formattedTotal: formatCurrency(totalFirstPayment, plan.currency)
      };

    } catch (error) {
      logger.error('Failed to calculate setup fee', error instanceof Error ? error : new Error('Unknown error'), 'SETUP_FEE');
      return null;
    }
  }

  /**
   * Record setup fee payment
   */
  static async recordSetupFeePayment(
    clientId: string,
    planId: string,
    setupFeeAmount: number,
    currency: string,
    stripePaymentIntentId?: string
  ): Promise<string | null> {
    const supabase = await createClient();

    try {
      const { data, error } = await supabase
        .from('setup_fee_history')
        .insert([{
          client_id: clientId,
          plan_id: planId,
          setup_fee_amount: setupFeeAmount,
          currency,
          stripe_payment_intent_id: stripePaymentIntentId,
          status: 'paid',
          paid_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to record setup fee payment: ${error.message}`);
      }

      logger.info('Setup fee payment recorded', {
        setupFeeHistoryId: data.id,
        clientId,
        planId,
        amount: setupFeeAmount,
        currency
      }, 'SETUP_FEE');

      return data.id;

    } catch (error) {
      logger.error('Failed to record setup fee payment', error instanceof Error ? error : new Error('Unknown error'), 'SETUP_FEE');
      return null;
    }
  }

  /**
   * Check if client has paid setup fee for a plan
   */
  static async hasClientPaidSetupFee(clientId: string, planId: string): Promise<boolean> {
    const supabase = await createClient();

    try {
      const { data, error } = await supabase
        .from('setup_fee_history')
        .select('id')
        .eq('client_id', clientId)
        .eq('plan_id', planId)
        .eq('status', 'paid')
        .limit(1);

      if (error) {
        throw new Error(`Failed to check setup fee payment: ${error.message}`);
      }

      return data && data.length > 0;

    } catch (error) {
      logger.error('Failed to check setup fee payment', error instanceof Error ? error : new Error('Unknown error'), 'SETUP_FEE');
      return false;
    }
  }

  /**
   * Get setup fee history for a client
   */
  static async getClientSetupFeeHistory(clientId: string): Promise<SetupFeeHistory[]> {
    const supabase = await createClient();

    try {
      const { data, error } = await supabase
        .from('setup_fee_history')
        .select(`
          id,
          client_id,
          plan_id,
          setup_fee_amount,
          currency,
          paid_at,
          stripe_payment_intent_id,
          status,
          created_at
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get setup fee history: ${error.message}`);
      }

      return data.map(record => ({
        id: record.id,
        clientId: record.client_id,
        planId: record.plan_id,
        setupFeeAmount: record.setup_fee_amount,
        currency: record.currency,
        paidAt: record.paid_at,
        stripePaymentIntentId: record.stripe_payment_intent_id,
        status: record.status,
        createdAt: record.created_at
      }));

    } catch (error) {
      logger.error('Failed to get setup fee history', error instanceof Error ? error : new Error('Unknown error'), 'SETUP_FEE');
      return [];
    }
  }

  /**
   * Update setup fee payment status
   */
  static async updateSetupFeeStatus(
    setupFeeHistoryId: string,
    status: 'pending' | 'paid' | 'failed' | 'refunded',
    stripePaymentIntentId?: string
  ): Promise<boolean> {
    const supabase = await createClient();

    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'paid') {
        updateData.paid_at = new Date().toISOString();
      }

      if (stripePaymentIntentId) {
        updateData.stripe_payment_intent_id = stripePaymentIntentId;
      }

      const { error } = await supabase
        .from('setup_fee_history')
        .update(updateData)
        .eq('id', setupFeeHistoryId);

      if (error) {
        throw new Error(`Failed to update setup fee status: ${error.message}`);
      }

      logger.info('Setup fee status updated', {
        setupFeeHistoryId,
        status,
        stripePaymentIntentId
      }, 'SETUP_FEE');

      return true;

    } catch (error) {
      logger.error('Failed to update setup fee status', error instanceof Error ? error : new Error('Unknown error'), 'SETUP_FEE');
      return false;
    }
  }

  /**
   * Get setup fee statistics
   */
  static async getSetupFeeStats(): Promise<{
    totalCollected: number;
    totalPending: number;
    totalFailed: number;
    currency: string;
  }> {
    const supabase = await createClient();

    try {
      const { data, error } = await supabase
        .from('setup_fee_history')
        .select('setup_fee_amount, currency, status');

      if (error) {
        throw new Error(`Failed to get setup fee stats: ${error.message}`);
      }

      const stats = data.reduce((acc, record) => {
        if (record.status === 'paid') {
          acc.totalCollected += record.setup_fee_amount;
        } else if (record.status === 'pending') {
          acc.totalPending += record.setup_fee_amount;
        } else if (record.status === 'failed') {
          acc.totalFailed += record.setup_fee_amount;
        }
        return acc;
      }, {
        totalCollected: 0,
        totalPending: 0,
        totalFailed: 0,
        currency: 'BRL'
      });

      return stats;

    } catch (error) {
      logger.error('Failed to get setup fee stats', error instanceof Error ? error : new Error('Unknown error'), 'SETUP_FEE');
      return {
        totalCollected: 0,
        totalPending: 0,
        totalFailed: 0,
        currency: 'BRL'
      };
    }
  }
}
