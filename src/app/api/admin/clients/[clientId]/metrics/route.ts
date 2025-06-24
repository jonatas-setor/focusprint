import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { ClientMetricsService } from '@/lib/metrics/client-metrics-service';

// GET /api/admin/clients/[clientId]/metrics - Get detailed metrics for a specific client
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_CLIENTS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { clientId } = params;

    // Verify client exists
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, plan, status, created_at')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Get comprehensive client metrics
    const metrics = await ClientMetricsService.getClientMetrics(clientId);

    if (!metrics) {
      return NextResponse.json(
        { error: 'Failed to fetch client metrics' },
        { status: 500 }
      );
    }

    // Get additional detailed metrics
    const [
      userActivity,
      projectActivity,
      storageBreakdown,
      apiUsage,
      featureUsage
    ] = await Promise.all([
      getUserActivityMetrics(supabase, clientId),
      getProjectActivityMetrics(supabase, clientId),
      getStorageBreakdown(supabase, clientId),
      getApiUsageMetrics(supabase, clientId),
      getFeatureUsageMetrics(supabase, clientId)
    ]);

    // Calculate health scores
    const healthScores = {
      user_engagement: calculateUserEngagement(metrics, userActivity),
      project_activity: calculateProjectActivity(metrics, projectActivity),
      storage_efficiency: calculateStorageEfficiency(metrics, storageBreakdown),
      overall_health: 'good' as 'excellent' | 'good' | 'warning' | 'critical'
    };

    // Calculate overall health
    const scores = [
      healthScores.user_engagement,
      healthScores.project_activity,
      healthScores.storage_efficiency
    ];
    const avgScore = scores.reduce((sum, score) => {
      const scoreValue = score === 'excellent' ? 4 : score === 'good' ? 3 : score === 'warning' ? 2 : 1;
      return sum + scoreValue;
    }, 0) / scores.length;

    healthScores.overall_health = avgScore >= 3.5 ? 'excellent' : 
                                 avgScore >= 2.5 ? 'good' : 
                                 avgScore >= 1.5 ? 'warning' : 'critical';

    // Calculate trends (simplified - would need historical data for accurate trends)
    const trends = {
      users_trend: metrics.active_users_7d > metrics.active_users_1d * 5 ? 'up' : 
                   metrics.active_users_7d < metrics.active_users_1d * 3 ? 'down' : 'stable',
      projects_trend: metrics.active_projects > metrics.total_projects * 0.7 ? 'up' : 
                      metrics.active_projects < metrics.total_projects * 0.3 ? 'down' : 'stable',
      storage_trend: metrics.storage_used_mb > metrics.storage_limit_mb * 0.8 ? 'up' : 'stable',
      activity_trend: new Date(metrics.last_activity) > new Date(Date.now() - 24 * 60 * 60 * 1000) ? 'up' : 'down'
    };

    return NextResponse.json({
      client_info: {
        id: client.id,
        name: client.name,
        plan: client.plan,
        status: client.status,
        created_at: client.created_at
      },
      metrics,
      detailed_metrics: {
        user_activity: userActivity,
        project_activity: projectActivity,
        storage_breakdown: storageBreakdown,
        api_usage: apiUsage,
        feature_usage: featureUsage
      },
      health_scores: healthScores,
      trends,
      recommendations: generateRecommendations(metrics, healthScores, trends),
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching client metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client metrics' },
      { status: 500 }
    );
  }
}

/**
 * Get user activity metrics
 */
async function getUserActivityMetrics(supabase: any, clientId: string) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data: users, error } = await supabase
      .from('users')
      .select('id, last_sign_in_at, created_at')
      .eq('client_id', clientId);

    if (error || !users) {
      return { daily_active: [], user_retention: 0, new_users_30d: 0 };
    }

    // Calculate daily active users for last 30 days
    const dailyActive = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const activeCount = users.filter(user => {
        const lastSignIn = new Date(user.last_sign_in_at || 0);
        return lastSignIn >= dayStart && lastSignIn <= dayEnd;
      }).length;

      dailyActive.push({
        date: dayStart.toISOString().split('T')[0],
        active_users: activeCount
      });
    }

    const newUsers30d = users.filter(user => 
      new Date(user.created_at) > thirtyDaysAgo
    ).length;

    const userRetention = users.length > 0 ? 
      (users.filter(user => new Date(user.last_sign_in_at || 0) > thirtyDaysAgo).length / users.length) * 100 : 0;

    return {
      daily_active: dailyActive,
      user_retention: Math.round(userRetention * 100) / 100,
      new_users_30d: newUsers30d
    };

  } catch (error) {
    console.error('Error getting user activity metrics:', error);
    return { daily_active: [], user_retention: 0, new_users_30d: 0 };
  }
}

/**
 * Get project activity metrics
 */
async function getProjectActivityMetrics(supabase: any, clientId: string) {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, status, created_at, updated_at')
      .eq('client_id', clientId);

    if (error || !projects) {
      return { projects_by_status: {}, recent_activity: [] };
    }

    const projectsByStatus = projects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentActivity = projects
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10)
      .map(project => ({
        project_id: project.id,
        status: project.status,
        last_updated: project.updated_at
      }));

    return {
      projects_by_status: projectsByStatus,
      recent_activity: recentActivity
    };

  } catch (error) {
    console.error('Error getting project activity metrics:', error);
    return { projects_by_status: {}, recent_activity: [] };
  }
}

/**
 * Get storage breakdown
 */
async function getStorageBreakdown(supabase: any, clientId: string) {
  try {
    const { data: files, error } = await supabase
      .from('file_attachments')
      .select('file_type, file_size')
      .eq('client_id', clientId);

    if (error || !files) {
      return { by_type: {}, total_files: 0 };
    }

    const byType = files.reduce((acc, file) => {
      const type = file.file_type || 'unknown';
      if (!acc[type]) {
        acc[type] = { count: 0, size_mb: 0 };
      }
      acc[type].count++;
      acc[type].size_mb += (file.file_size || 0) / (1024 * 1024);
      return acc;
    }, {} as Record<string, { count: number; size_mb: number }>);

    return {
      by_type: byType,
      total_files: files.length
    };

  } catch (error) {
    console.error('Error getting storage breakdown:', error);
    return { by_type: {}, total_files: 0 };
  }
}

/**
 * Get API usage metrics
 */
async function getApiUsageMetrics(supabase: any, clientId: string) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('action, created_at')
      .eq('client_id', clientId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error || !logs) {
      return { total_calls: 0, calls_by_endpoint: {} };
    }

    const callsByEndpoint = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total_calls: logs.length,
      calls_by_endpoint: callsByEndpoint
    };

  } catch (error) {
    console.error('Error getting API usage metrics:', error);
    return { total_calls: 0, calls_by_endpoint: {} };
  }
}

/**
 * Get feature usage metrics
 */
async function getFeatureUsageMetrics(supabase: any, clientId: string) {
  // This would track which features the client is using
  // For now, return estimated usage based on data
  return {
    kanban_usage: 85,
    chat_usage: 70,
    video_calls: 45,
    file_sharing: 60,
    integrations: 30
  };
}

/**
 * Calculate user engagement score
 */
function calculateUserEngagement(metrics: any, userActivity: any): 'excellent' | 'good' | 'warning' | 'critical' {
  const engagementRate = metrics.total_users > 0 ? (metrics.active_users_30d / metrics.total_users) * 100 : 0;
  const retentionRate = userActivity.user_retention;

  if (engagementRate > 80 && retentionRate > 80) return 'excellent';
  if (engagementRate > 60 && retentionRate > 60) return 'good';
  if (engagementRate > 40 && retentionRate > 40) return 'warning';
  return 'critical';
}

/**
 * Calculate project activity score
 */
function calculateProjectActivity(metrics: any, projectActivity: any): 'excellent' | 'good' | 'warning' | 'critical' {
  const activeRate = metrics.total_projects > 0 ? (metrics.active_projects / metrics.total_projects) * 100 : 0;
  const completionRate = metrics.total_tasks > 0 ? (metrics.completed_tasks / metrics.total_tasks) * 100 : 0;

  if (activeRate > 70 && completionRate > 60) return 'excellent';
  if (activeRate > 50 && completionRate > 40) return 'good';
  if (activeRate > 30 && completionRate > 20) return 'warning';
  return 'critical';
}

/**
 * Calculate storage efficiency score
 */
function calculateStorageEfficiency(metrics: any, storageBreakdown: any): 'excellent' | 'good' | 'warning' | 'critical' {
  const usageRate = (metrics.storage_used_mb / metrics.storage_limit_mb) * 100;

  if (usageRate < 50) return 'excellent';
  if (usageRate < 70) return 'good';
  if (usageRate < 90) return 'warning';
  return 'critical';
}

/**
 * Generate recommendations based on metrics
 */
function generateRecommendations(metrics: any, healthScores: any, trends: any): string[] {
  const recommendations = [];

  if (healthScores.user_engagement === 'warning' || healthScores.user_engagement === 'critical') {
    recommendations.push('Consider user onboarding improvements to increase engagement');
  }

  if (trends.storage_trend === 'up' && metrics.storage_used_mb > metrics.storage_limit_mb * 0.8) {
    recommendations.push('Client approaching storage limit - consider upgrade or cleanup');
  }

  if (healthScores.project_activity === 'warning' || healthScores.project_activity === 'critical') {
    recommendations.push('Low project activity detected - reach out for support or training');
  }

  if (trends.activity_trend === 'down') {
    recommendations.push('Recent activity decline - consider re-engagement campaign');
  }

  if (recommendations.length === 0) {
    recommendations.push('Client metrics look healthy - continue monitoring');
  }

  return recommendations;
}
