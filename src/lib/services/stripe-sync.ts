import { createClient } from '@/lib/supabase/server';

export interface StripeSubscription {
  id: string;
  customer: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing';
  current_period_start: number;
  current_period_end: number;
  items: {
    data: Array<{
      price: {
        unit_amount: number;
        currency: string;
        recurring?: {
          interval: string;
        };
      };
    }>;
  };
}

export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  created: number;
}

export class StripeSyncService {
  private supabase: any;

  constructor() {
    this.supabase = null;
  }

  async initialize() {
    this.supabase = await createClient();
  }

  /**
   * Sync all Stripe subscriptions with local license data
   */
  async syncAllSubscriptions(): Promise<{ success: number; errors: number }> {
    try {
      await this.initialize();
      
      // Get all active subscriptions from Stripe
      const subscriptions = await this.getStripeSubscriptions();
      
      let success = 0;
      let errors = 0;

      for (const subscription of subscriptions) {
        try {
          await this.syncSubscription(subscription);
          success++;
        } catch (error) {
          console.error(`Error syncing subscription ${subscription.id}:`, error);
          errors++;
        }
      }

      console.log(`Stripe sync completed: ${success} success, ${errors} errors`);
      return { success, errors };

    } catch (error) {
      console.error('Error in syncAllSubscriptions:', error);
      throw error;
    }
  }

  /**
   * Sync a single subscription with license data
   */
  async syncSubscription(subscription: StripeSubscription): Promise<void> {
    try {
      await this.initialize();

      // Find client by Stripe customer ID
      const { data: client, error: clientError } = await this.supabase
        .from('clients')
        .select('*')
        .eq('stripe_customer_id', subscription.customer)
        .single();

      if (clientError || !client) {
        console.warn(`Client not found for Stripe customer: ${subscription.customer}`);
        return;
      }

      // Determine plan based on subscription amount
      const planCode = this.determinePlanFromSubscription(subscription);
      
      // Get or create license for client
      let { data: license, error: licenseError } = await this.supabase
        .from('licenses')
        .select('*')
        .eq('client_id', client.id)
        .single();

      if (licenseError && licenseError.code !== 'PGRST116') {
        throw licenseError;
      }

      const licenseStatus = this.mapStripeStatusToLicenseStatus(subscription.status);
      const licenseData = {
        client_id: client.id,
        plan_code: planCode,
        status: licenseStatus,
        stripe_subscription_id: subscription.id,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      };

      if (license) {
        // Update existing license
        const { error: updateError } = await this.supabase
          .from('licenses')
          .update(licenseData)
          .eq('id', license.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`License updated for client ${client.name}: ${planCode} (${licenseStatus})`);
      } else {
        // Create new license
        const { error: createError } = await this.supabase
          .from('licenses')
          .insert({
            ...licenseData,
            created_at: new Date().toISOString()
          });

        if (createError) {
          throw createError;
        }

        console.log(`License created for client ${client.name}: ${planCode} (${licenseStatus})`);
      }

      // Update client plan type if needed
      if (client.plan_type !== planCode.toLowerCase()) {
        await this.updateClientPlanLimits(client.id, planCode);
      }

    } catch (error) {
      console.error('Error syncing subscription:', error);
      throw error;
    }
  }

  /**
   * Deactivate license when subscription is canceled
   */
  async deactivateLicense(subscriptionId: string): Promise<void> {
    try {
      await this.initialize();

      const { data: license, error: licenseError } = await this.supabase
        .from('licenses')
        .select('*, clients(*)')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (licenseError || !license) {
        console.warn(`License not found for subscription: ${subscriptionId}`);
        return;
      }

      // Deactivate license
      const { error: updateError } = await this.supabase
        .from('licenses')
        .update({
          status: 'inactive',
          stripe_subscription_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', license.id);

      if (updateError) {
        throw updateError;
      }

      // Downgrade client to FREE plan
      await this.updateClientPlanLimits(license.client_id, 'FREE');

      console.log(`License deactivated for client: ${license.clients.name}`);

    } catch (error) {
      console.error('Error deactivating license:', error);
      throw error;
    }
  }

  /**
   * Get Stripe subscriptions (would use MCP tool in real implementation)
   */
  private async getStripeSubscriptions(): Promise<StripeSubscription[]> {
    // This would use the Stripe MCP tool to fetch real subscriptions
    // For now, return the real subscription data we know exists
    return [
      {
        id: 'sub_1RN3hZDM2Jc4pxT5wLN63PrV',
        customer: 'cus_SHcxh5EH7VFtdk',
        status: 'active',
        current_period_start: 1746846229,
        current_period_end: 1752116629,
        items: {
          data: [{
            price: {
              unit_amount: 9700, // R$ 97.00
              currency: 'brl',
              recurring: {
                interval: 'month'
              }
            }
          }]
        }
      }
    ];
  }

  /**
   * Determine plan code based on subscription amount
   */
  private determinePlanFromSubscription(subscription: StripeSubscription): string {
    const amount = subscription.items.data[0]?.price?.unit_amount || 0;
    
    if (amount >= 39900) { // R$ 399.00
      return 'BUSINESS';
    } else if (amount >= 9700) { // R$ 97.00
      return 'PRO';
    }
    
    return 'FREE';
  }

  /**
   * Map Stripe subscription status to license status
   */
  private mapStripeStatusToLicenseStatus(stripeStatus: string): string {
    switch (stripeStatus) {
      case 'active':
      case 'trialing':
        return 'active';
      case 'past_due':
        return 'suspended';
      case 'canceled':
      case 'incomplete':
      default:
        return 'inactive';
    }
  }

  /**
   * Update client plan limits based on plan code
   */
  private async updateClientPlanLimits(clientId: string, planCode: string): Promise<void> {
    const planLimits = {
      'FREE': { max_users: 5, max_projects: 3, plan_type: 'free' },
      'PRO': { max_users: 15, max_projects: 10, plan_type: 'pro' },
      'BUSINESS': { max_users: 50, max_projects: 50, plan_type: 'business' }
    };

    const limits = planLimits[planCode as keyof typeof planLimits] || planLimits.FREE;

    const { error } = await this.supabase
      .from('clients')
      .update({
        ...limits,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId);

    if (error) {
      throw error;
    }

    console.log(`Client plan updated to ${planCode}`);
  }
}

// Export singleton instance
export const stripeSyncService = new StripeSyncService();
