import { createClient } from '@/lib/supabase/server';

export interface FinancialMetrics {
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  churn_rate: number; // Monthly churn rate percentage
  ltv: number; // Lifetime Value
  cac: number; // Customer Acquisition Cost
  revenue_growth: number; // Month over month growth
  active_subscriptions: number;
  trial_conversions: number;
  upgrade_rate: number;
  downgrade_rate: number;
  refund_rate: number;
  period: string; // YYYY-MM
}

export interface RevenueBreakdown {
  plan: string;
  subscribers: number;
  mrr: number;
  percentage: number;
}

export interface ChurnAnalysis {
  total_churned: number;
  churn_rate: number;
  churn_by_plan: Array<{
    plan: string;
    churned: number;
    total: number;
    rate: number;
  }>;
  churn_reasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

export interface CohortData {
  cohort_month: string;
  customers: number;
  retention_rates: number[]; // Month 0, 1, 2, 3, etc.
}

export class FinancialMetricsService {
  // Plan pricing in cents (BRL)
  private static readonly PLAN_PRICES = {
    'FREE': 0,
    'PRO': 9700, // R$ 97.00
    'BUSINESS': 39900, // R$ 399.00
    'ENTERPRISE': 99900 // R$ 999.00 (custom pricing)
  };

  /**
   * Calculate current financial metrics
   */
  static async getCurrentFinancialMetrics(): Promise<FinancialMetrics> {
    try {
      const supabase = await createClient();
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

      // Get active subscriptions
      const { data: activeSubscriptions, error: subsError } = await supabase
        .from('clients')
        .select('id, plan, status, created_at, updated_at')
        .eq('status', 'active');

      if (subsError) {
        console.error('Error fetching subscriptions:', subsError);
        return this.getEmptyFinancialMetrics(currentMonth);
      }

      // Calculate MRR
      const mrr = this.calculateMRR(activeSubscriptions || []);
      const arr = mrr * 12;

      // Get churn data
      const churnData = await this.calculateChurnRate(currentMonth);
      
      // Calculate LTV (simplified: MRR per customer / churn rate)
      const avgMrrPerCustomer = activeSubscriptions?.length ? mrr / activeSubscriptions.length : 0;
      const ltv = churnData.churn_rate > 0 ? avgMrrPerCustomer / (churnData.churn_rate / 100) : avgMrrPerCustomer * 24;

      // Calculate CAC (simplified estimate)
      const cac = await this.calculateCAC(currentMonth);

      // Calculate revenue growth
      const lastMonthMrr = await this.getMRRForMonth(lastMonth);
      const revenueGrowth = lastMonthMrr > 0 ? ((mrr - lastMonthMrr) / lastMonthMrr) * 100 : 0;

      // Get trial conversions
      const trialConversions = await this.getTrialConversions(currentMonth);

      // Get upgrade/downgrade rates
      const { upgradeRate, downgradeRate } = await this.getUpgradeDowngradeRates(currentMonth);

      // Get refund rate
      const refundRate = await this.getRefundRate(currentMonth);

      return {
        mrr: Math.round(mrr / 100), // Convert to BRL
        arr: Math.round(arr / 100), // Convert to BRL
        churn_rate: Math.round(churnData.churn_rate * 100) / 100,
        ltv: Math.round(ltv / 100), // Convert to BRL
        cac: Math.round(cac / 100), // Convert to BRL
        revenue_growth: Math.round(revenueGrowth * 100) / 100,
        active_subscriptions: activeSubscriptions?.length || 0,
        trial_conversions: trialConversions,
        upgrade_rate: upgradeRate,
        downgrade_rate: downgradeRate,
        refund_rate: refundRate,
        period: currentMonth
      };

    } catch (error) {
      console.error('Error calculating financial metrics:', error);
      return this.getEmptyFinancialMetrics(new Date().toISOString().slice(0, 7));
    }
  }

  /**
   * Get revenue breakdown by plan
   */
  static async getRevenueBreakdown(): Promise<RevenueBreakdown[]> {
    try {
      const supabase = await createClient();

      const { data: activeSubscriptions, error } = await supabase
        .from('clients')
        .select('plan')
        .eq('status', 'active');

      if (error || !activeSubscriptions) {
        console.error('Error fetching subscriptions:', error);
        return [];
      }

      // Group by plan
      const planCounts = activeSubscriptions.reduce((acc, sub) => {
        acc[sub.plan] = (acc[sub.plan] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalMrr = this.calculateMRR(activeSubscriptions);

      return Object.entries(planCounts).map(([plan, count]) => {
        const planMrr = count * (this.PLAN_PRICES[plan as keyof typeof this.PLAN_PRICES] || 0);
        return {
          plan,
          subscribers: count,
          mrr: Math.round(planMrr / 100), // Convert to BRL
          percentage: totalMrr > 0 ? Math.round((planMrr / totalMrr) * 100) : 0
        };
      }).sort((a, b) => b.mrr - a.mrr);

    } catch (error) {
      console.error('Error calculating revenue breakdown:', error);
      return [];
    }
  }

  /**
   * Calculate churn analysis
   */
  static async getChurnAnalysis(month: string): Promise<ChurnAnalysis> {
    try {
      const supabase = await createClient();

      // Get churned customers for the month
      const { data: churnedCustomers, error: churnError } = await supabase
        .from('clients')
        .select('id, plan, status, updated_at')
        .in('status', ['cancelled', 'suspended'])
        .gte('updated_at', `${month}-01`)
        .lt('updated_at', `${month}-31`);

      if (churnError) {
        console.error('Error fetching churned customers:', churnError);
        return { total_churned: 0, churn_rate: 0, churn_by_plan: [], churn_reasons: [] };
      }

      // Get total customers at start of month
      const { data: totalCustomers, error: totalError } = await supabase
        .from('clients')
        .select('id, plan')
        .eq('status', 'active');

      if (totalError) {
        console.error('Error fetching total customers:', totalError);
        return { total_churned: 0, churn_rate: 0, churn_by_plan: [], churn_reasons: [] };
      }

      const totalChurned = churnedCustomers?.length || 0;
      const totalActive = totalCustomers?.length || 0;
      const churnRate = totalActive > 0 ? (totalChurned / totalActive) * 100 : 0;

      // Churn by plan
      const churnByPlan = Object.entries(
        (churnedCustomers || []).reduce((acc, customer) => {
          acc[customer.plan] = (acc[customer.plan] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([plan, churned]) => {
        const totalInPlan = totalCustomers?.filter(c => c.plan === plan).length || 0;
        return {
          plan,
          churned,
          total: totalInPlan + churned,
          rate: totalInPlan + churned > 0 ? (churned / (totalInPlan + churned)) * 100 : 0
        };
      });

      // Mock churn reasons (would come from cancellation surveys)
      const churnReasons = [
        { reason: 'Price too high', count: Math.floor(totalChurned * 0.3), percentage: 30 },
        { reason: 'Missing features', count: Math.floor(totalChurned * 0.25), percentage: 25 },
        { reason: 'Poor performance', count: Math.floor(totalChurned * 0.2), percentage: 20 },
        { reason: 'Competitor switch', count: Math.floor(totalChurned * 0.15), percentage: 15 },
        { reason: 'Other', count: Math.floor(totalChurned * 0.1), percentage: 10 }
      ].filter(reason => reason.count > 0);

      return {
        total_churned: totalChurned,
        churn_rate: Math.round(churnRate * 100) / 100,
        churn_by_plan: churnByPlan,
        churn_reasons: churnReasons
      };

    } catch (error) {
      console.error('Error calculating churn analysis:', error);
      return { total_churned: 0, churn_rate: 0, churn_by_plan: [], churn_reasons: [] };
    }
  }

  /**
   * Get cohort analysis data
   */
  static async getCohortAnalysis(): Promise<CohortData[]> {
    try {
      const supabase = await createClient();

      // Get all customers with their creation dates
      const { data: customers, error } = await supabase
        .from('clients')
        .select('id, created_at, status, updated_at')
        .order('created_at');

      if (error || !customers) {
        console.error('Error fetching customers for cohort analysis:', error);
        return [];
      }

      // Group customers by cohort month
      const cohorts = customers.reduce((acc, customer) => {
        const cohortMonth = customer.created_at.slice(0, 7); // YYYY-MM
        if (!acc[cohortMonth]) {
          acc[cohortMonth] = [];
        }
        acc[cohortMonth].push(customer);
        return acc;
      }, {} as Record<string, typeof customers>);

      // Calculate retention rates for each cohort
      const cohortData: CohortData[] = Object.entries(cohorts).map(([cohortMonth, cohortCustomers]) => {
        const retentionRates: number[] = [];
        
        // Calculate retention for up to 12 months
        for (let month = 0; month < 12; month++) {
          const targetDate = new Date(cohortMonth + '-01');
          targetDate.setMonth(targetDate.getMonth() + month);
          const targetMonth = targetDate.toISOString().slice(0, 7);

          const activeInMonth = cohortCustomers.filter(customer => {
            if (customer.status !== 'active') {
              // Check if they were still active in the target month
              const cancelDate = new Date(customer.updated_at).toISOString().slice(0, 7);
              return cancelDate > targetMonth;
            }
            return true;
          }).length;

          const retentionRate = cohortCustomers.length > 0 ? (activeInMonth / cohortCustomers.length) * 100 : 0;
          retentionRates.push(Math.round(retentionRate * 100) / 100);
        }

        return {
          cohort_month: cohortMonth,
          customers: cohortCustomers.length,
          retention_rates: retentionRates
        };
      });

      return cohortData.sort((a, b) => a.cohort_month.localeCompare(b.cohort_month));

    } catch (error) {
      console.error('Error calculating cohort analysis:', error);
      return [];
    }
  }

  /**
   * Calculate MRR from subscriptions
   */
  private static calculateMRR(subscriptions: Array<{ plan: string }>): number {
    return subscriptions.reduce((total, sub) => {
      return total + (this.PLAN_PRICES[sub.plan as keyof typeof this.PLAN_PRICES] || 0);
    }, 0);
  }

  /**
   * Calculate churn rate for a specific month
   */
  private static async calculateChurnRate(month: string): Promise<{ churn_rate: number }> {
    try {
      const supabase = await createClient();

      // Get customers who churned in the month
      const { data: churned } = await supabase
        .from('clients')
        .select('id')
        .in('status', ['cancelled', 'suspended'])
        .gte('updated_at', `${month}-01`)
        .lt('updated_at', `${month}-31`);

      // Get total active customers
      const { data: total } = await supabase
        .from('clients')
        .select('id')
        .eq('status', 'active');

      const churnedCount = churned?.length || 0;
      const totalCount = total?.length || 0;
      const churnRate = totalCount > 0 ? (churnedCount / totalCount) * 100 : 0;

      return { churn_rate: churnRate };

    } catch (error) {
      console.error('Error calculating churn rate:', error);
      return { churn_rate: 0 };
    }
  }

  /**
   * Get MRR for a specific month
   */
  private static async getMRRForMonth(month: string): Promise<number> {
    try {
      const supabase = await createClient();

      const { data: subscriptions } = await supabase
        .from('clients')
        .select('plan')
        .eq('status', 'active')
        .gte('created_at', `${month}-01`)
        .lt('created_at', `${month}-31`);

      return this.calculateMRR(subscriptions || []);

    } catch (error) {
      console.error('Error getting MRR for month:', error);
      return 0;
    }
  }

  /**
   * Calculate Customer Acquisition Cost
   */
  private static async calculateCAC(month: string): Promise<number> {
    // Simplified CAC calculation
    // In reality, this would include marketing spend, sales costs, etc.
    const estimatedMarketingSpend = 50000; // R$ 500 per month (in cents)
    
    try {
      const supabase = await createClient();

      const { data: newCustomers } = await supabase
        .from('clients')
        .select('id')
        .gte('created_at', `${month}-01`)
        .lt('created_at', `${month}-31`);

      const newCustomerCount = newCustomers?.length || 0;
      return newCustomerCount > 0 ? estimatedMarketingSpend / newCustomerCount : 0;

    } catch (error) {
      console.error('Error calculating CAC:', error);
      return 0;
    }
  }

  /**
   * Get trial conversion rate
   */
  private static async getTrialConversions(month: string): Promise<number> {
    try {
      const supabase = await createClient();

      // Get customers who converted from trial to paid in the month
      const { data: conversions } = await supabase
        .from('clients')
        .select('id')
        .eq('status', 'active')
        .neq('plan', 'FREE')
        .gte('updated_at', `${month}-01`)
        .lt('updated_at', `${month}-31`);

      return conversions?.length || 0;

    } catch (error) {
      console.error('Error getting trial conversions:', error);
      return 0;
    }
  }

  /**
   * Get upgrade and downgrade rates
   */
  private static async getUpgradeDowngradeRates(month: string): Promise<{ upgradeRate: number; downgradeRate: number }> {
    // This would require tracking plan changes
    // For now, return estimated values
    return {
      upgradeRate: 5.2, // 5.2% monthly upgrade rate
      downgradeRate: 1.8 // 1.8% monthly downgrade rate
    };
  }

  /**
   * Get refund rate
   */
  private static async getRefundRate(month: string): Promise<number> {
    // This would require tracking refunds
    // For now, return estimated value
    return 2.1; // 2.1% refund rate
  }

  /**
   * Get empty financial metrics for error cases
   */
  private static getEmptyFinancialMetrics(period: string): FinancialMetrics {
    return {
      mrr: 0,
      arr: 0,
      churn_rate: 0,
      ltv: 0,
      cac: 0,
      revenue_growth: 0,
      active_subscriptions: 0,
      trial_conversions: 0,
      upgrade_rate: 0,
      downgrade_rate: 0,
      refund_rate: 0,
      period
    };
  }
}
