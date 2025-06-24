import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { Database } from '@/types/database';

interface MetricsData {
  overview: {
    total_clients: number;
    active_clients: number;
    total_licenses: number;
    active_licenses: number;
    mrr: number;
    arr: number;
  };
  clients_by_plan: {
    plan_type: string;
    count: number;
    percentage: number;
  }[];
  clients_by_status: {
    status: string;
    count: number;
    percentage: number;
  }[];
  licenses_by_status: {
    status: string;
    count: number;
    percentage: number;
  }[];
  revenue_breakdown: {
    plan_type: string;
    clients: number;
    monthly_revenue: number;
    annual_revenue: number;
  }[];
  growth_metrics: {
    new_clients_this_month: number;
    new_clients_last_month: number;
    growth_rate: number;
  };
}

// GET /api/admin/metrics - Get comprehensive platform metrics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_METRICS);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get overview metrics - simplified for now
    const clientsResult = await supabase
      .from('clients')
      .select('id, status, plan_type, created_at');

    // For now, let's use the licenses RPC function that works
    const licensesResult = await supabase.rpc('get_all_licenses');

    if (clientsResult.error) {
      console.error('Error fetching clients for metrics:', clientsResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch client metrics' },
        { status: 500 }
      );
    }

    if (licensesResult.error) {
      console.error('Error fetching licenses for metrics:', licensesResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch license metrics' },
        { status: 500 }
      );
    }

    const clients = clientsResult.data || [];
    const licenses = licensesResult.data || [];

    // Map license data to expected format
    const mappedLicenses = licenses.map((license: any) => ({
      id: license.id,
      status: license.status,
      plan_type: license.plan_type,
      created_at: license.created_at
    }));

    // Get plan data for revenue calculations
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('code, price');

    if (plansError) {
      console.error('Error fetching plans for metrics:', plansError);
      return NextResponse.json(
        { error: 'Failed to fetch plan data' },
        { status: 500 }
      );
    }

    // Create plan price lookup
    const planPrices: Record<string, number> = {};
    (plans || []).forEach(plan => {
      planPrices[plan.code] = plan.price;
    });

    // Calculate overview metrics
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === 'active').length;
    const totalLicenses = mappedLicenses.length;
    const activeLicenses = mappedLicenses.filter(l => l.status === 'active').length;

    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = clients
      .filter(c => c.status === 'active')
      .reduce((sum, client) => {
        const price = planPrices[client.plan_type] || 0;
        return sum + price;
      }, 0);

    const arr = mrr * 12; // Annual Recurring Revenue

    // Calculate clients by plan
    const clientsByPlan = Object.entries(
      clients.reduce((acc, client) => {
        acc[client.plan_type] = (acc[client.plan_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([plan_type, count]) => ({
      plan_type,
      count,
      percentage: totalClients > 0 ? Math.round((count / totalClients) * 100) : 0
    }));

    // Calculate clients by status
    const clientsByStatus = Object.entries(
      clients.reduce((acc, client) => {
        acc[client.status] = (acc[client.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([status, count]) => ({
      status,
      count,
      percentage: totalClients > 0 ? Math.round((count / totalClients) * 100) : 0
    }));

    // Calculate licenses by status
    const licensesByStatus = Object.entries(
      mappedLicenses.reduce((acc, license) => {
        acc[license.status] = (acc[license.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([status, count]) => ({
      status,
      count: count as number,
      percentage: totalLicenses > 0 ? Math.round((count as number / totalLicenses) * 100) : 0
    }));

    // Calculate revenue breakdown
    const revenueBreakdown = Object.entries(
      clients
        .filter(c => c.status === 'active')
        .reduce((acc, client) => {
          if (!acc[client.plan_type]) {
            acc[client.plan_type] = { clients: 0, revenue: 0 };
          }
          acc[client.plan_type].clients += 1;
          acc[client.plan_type].revenue += planPrices[client.plan_type] || 0;
          return acc;
        }, {} as Record<string, { clients: number; revenue: number }>)
    ).map(([plan_type, data]) => ({
      plan_type,
      clients: data.clients,
      monthly_revenue: data.revenue,
      annual_revenue: data.revenue * 12
    }));

    // Calculate growth metrics
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const newClientsThisMonth = clients.filter(c => {
      const createdAt = new Date(c.created_at);
      return createdAt >= thisMonthStart;
    }).length;

    const newClientsLastMonth = clients.filter(c => {
      const createdAt = new Date(c.created_at);
      return createdAt >= lastMonthStart && createdAt <= lastMonthEnd;
    }).length;

    const growthRate = newClientsLastMonth > 0 
      ? Math.round(((newClientsThisMonth - newClientsLastMonth) / newClientsLastMonth) * 100)
      : newClientsThisMonth > 0 ? 100 : 0;

    const metrics: MetricsData = {
      overview: {
        total_clients: totalClients,
        active_clients: activeClients,
        total_licenses: totalLicenses,
        active_licenses: activeLicenses,
        mrr,
        arr
      },
      clients_by_plan: clientsByPlan,
      clients_by_status: clientsByStatus,
      licenses_by_status: licensesByStatus,
      revenue_breakdown: revenueBreakdown,
      growth_metrics: {
        new_clients_this_month: newClientsThisMonth,
        new_clients_last_month: newClientsLastMonth,
        growth_rate: growthRate
      }
    };

    return NextResponse.json({ metrics });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
