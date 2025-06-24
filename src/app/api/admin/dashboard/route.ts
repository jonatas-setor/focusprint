import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { ClientMetricsService } from '@/lib/metrics/client-metrics-service';
import { FinancialMetricsService } from '@/lib/metrics/financial-metrics-service';
import { SystemMetricsService } from '@/lib/metrics/system-metrics-service';

// GET /api/admin/dashboard - Get comprehensive dashboard metrics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_METRICS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get all dashboard metrics in parallel for better performance
    const [
      platformMetrics,
      financialMetrics,
      systemMetrics,
      revenueBreakdown,
      churnAnalysis,
      cohortData,
      performanceMetrics,
      errorMetrics,
      hourlyUsage
    ] = await Promise.all([
      ClientMetricsService.getPlatformOverviewMetrics(),
      FinancialMetricsService.getCurrentFinancialMetrics(),
      SystemMetricsService.getSystemMetrics(),
      FinancialMetricsService.getRevenueBreakdown(),
      FinancialMetricsService.getChurnAnalysis(new Date().toISOString().slice(0, 7)),
      FinancialMetricsService.getCohortAnalysis(),
      SystemMetricsService.getPerformanceMetrics(),
      SystemMetricsService.getErrorMetrics(),
      SystemMetricsService.getHourlyUsageMetrics()
    ]);

    // Calculate additional KPIs
    const kpis = {
      // Financial KPIs
      mrr: financialMetrics.mrr,
      arr: financialMetrics.arr,
      churn_rate: financialMetrics.churn_rate,
      ltv: financialMetrics.ltv,
      cac: financialMetrics.cac,
      ltv_cac_ratio: financialMetrics.cac > 0 ? Math.round((financialMetrics.ltv / financialMetrics.cac) * 100) / 100 : 0,
      revenue_growth: financialMetrics.revenue_growth,
      
      // Platform KPIs
      total_clients: platformMetrics.total_clients,
      active_clients: platformMetrics.active_clients,
      client_growth: platformMetrics.client_growth_30d,
      total_users: platformMetrics.total_users,
      active_users: platformMetrics.active_users_30d,
      user_growth: platformMetrics.user_growth_30d,
      
      // System KPIs
      uptime: systemMetrics.uptime_percentage,
      avg_response_time: systemMetrics.avg_response_time_ms,
      error_rate: systemMetrics.error_rate_percentage,
      active_sessions: systemMetrics.active_sessions
    };

    // Client distribution by plan
    const clientDistribution = {
      free: platformMetrics.total_clients - platformMetrics.active_clients,
      pro: Math.floor(platformMetrics.active_clients * 0.6),
      business: Math.floor(platformMetrics.active_clients * 0.3),
      enterprise: Math.floor(platformMetrics.active_clients * 0.1)
    };

    // Recent activity summary
    const recentActivity = {
      new_clients_7d: Math.floor(platformMetrics.client_growth_30d / 4),
      new_users_7d: Math.floor(platformMetrics.user_growth_30d / 4),
      support_tickets_7d: await this.getRecentTicketsCount(),
      system_alerts_7d: errorMetrics.length
    };

    // Health indicators
    const healthIndicators = {
      financial_health: this.calculateFinancialHealth(financialMetrics),
      platform_health: this.calculatePlatformHealth(platformMetrics),
      system_health: this.calculateSystemHealth(systemMetrics),
      overall_health: 'good' // Will be calculated based on other indicators
    };

    // Calculate overall health
    const healthScores = [
      healthIndicators.financial_health,
      healthIndicators.platform_health,
      healthIndicators.system_health
    ];
    const avgHealthScore = healthScores.reduce((sum, score) => {
      const scoreValue = score === 'excellent' ? 4 : score === 'good' ? 3 : score === 'warning' ? 2 : 1;
      return sum + scoreValue;
    }, 0) / healthScores.length;

    healthIndicators.overall_health = avgHealthScore >= 3.5 ? 'excellent' : 
                                     avgHealthScore >= 2.5 ? 'good' : 
                                     avgHealthScore >= 1.5 ? 'warning' : 'critical';

    return NextResponse.json({
      kpis,
      platform_metrics: platformMetrics,
      financial_metrics: financialMetrics,
      system_metrics: systemMetrics,
      revenue_breakdown: revenueBreakdown,
      client_distribution: clientDistribution,
      churn_analysis: churnAnalysis,
      cohort_data: cohortData.slice(-6), // Last 6 months
      performance_metrics: performanceMetrics.slice(0, 10), // Top 10 endpoints
      error_metrics: errorMetrics.slice(0, 5), // Top 5 error types
      hourly_usage: hourlyUsage,
      recent_activity: recentActivity,
      health_indicators: healthIndicators,
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }

  /**
   * Get recent support tickets count
   */
  async function getRecentTicketsCount(): Promise<number> {
    try {
      const supabase = await createClient();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('support_tickets')
        .select('id')
        .gte('created_at', sevenDaysAgo.toISOString());

      if (error) {
        console.error('Error fetching recent tickets:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error getting recent tickets count:', error);
      return 0;
    }
  }

  /**
   * Calculate financial health indicator
   */
  function calculateFinancialHealth(metrics: any): 'excellent' | 'good' | 'warning' | 'critical' {
    const score = 
      (metrics.revenue_growth > 10 ? 2 : metrics.revenue_growth > 0 ? 1 : 0) +
      (metrics.churn_rate < 3 ? 2 : metrics.churn_rate < 5 ? 1 : 0) +
      (metrics.ltv / metrics.cac > 3 ? 2 : metrics.ltv / metrics.cac > 1 ? 1 : 0);

    return score >= 5 ? 'excellent' : score >= 3 ? 'good' : score >= 1 ? 'warning' : 'critical';
  }

  /**
   * Calculate platform health indicator
   */
  function calculatePlatformHealth(metrics: any): 'excellent' | 'good' | 'warning' | 'critical' {
    const score = 
      (metrics.client_growth_30d > 20 ? 2 : metrics.client_growth_30d > 0 ? 1 : 0) +
      (metrics.user_growth_30d > 15 ? 2 : metrics.user_growth_30d > 0 ? 1 : 0) +
      (metrics.active_clients / metrics.total_clients > 0.8 ? 2 : 
       metrics.active_clients / metrics.total_clients > 0.6 ? 1 : 0);

    return score >= 5 ? 'excellent' : score >= 3 ? 'good' : score >= 1 ? 'warning' : 'critical';
  }

  /**
   * Calculate system health indicator
   */
  function calculateSystemHealth(metrics: any): 'excellent' | 'good' | 'warning' | 'critical' {
    const score = 
      (metrics.uptime_percentage > 99.5 ? 2 : metrics.uptime_percentage > 99 ? 1 : 0) +
      (metrics.avg_response_time_ms < 200 ? 2 : metrics.avg_response_time_ms < 500 ? 1 : 0) +
      (metrics.error_rate_percentage < 1 ? 2 : metrics.error_rate_percentage < 3 ? 1 : 0);

    return score >= 5 ? 'excellent' : score >= 3 ? 'good' : score >= 1 ? 'warning' : 'critical';
  }
}
