import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';

// GET /api/admin/trials - Get all trial licenses with stats
export async function GET(request: NextRequest) {
  let authResult: any = null;
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_LICENSES, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get all licenses with trial information
    const { data: licenses, error: licensesError } = await supabase
      .schema('platform_admin')
      .from('licenses')
      .select(`
        id,
        status,
        trial_ends_at,
        plan_type,
        created_at,
        updated_at,
        client_id,
        plan_id
      `)
      .order('created_at', { ascending: false });

    if (licensesError) {
      throw new Error(`Failed to fetch licenses: ${licensesError.message}`);
    }

    // Get client information
    const clientIds = licenses?.map(l => l.client_id).filter(Boolean) || [];
    let clientsData: any[] = [];
    
    if (clientIds.length > 0) {
      const { data: clients, error: clientsError } = await supabase
        .schema('client_data')
        .from('clients')
        .select('id, name, email')
        .in('id', clientIds);

      if (!clientsError) {
        clientsData = clients || [];
      }
    }

    // Get plan information
    const planIds = licenses?.map(l => l.plan_id).filter(Boolean) || [];
    let plansData: any[] = [];
    
    if (planIds.length > 0) {
      const { data: plans, error: plansError } = await supabase
        .from('plans')
        .select('id, name, code')
        .in('id', planIds);

      if (!plansError) {
        plansData = plans || [];
      }
    }

    // Process licenses and calculate trial information
    const now = new Date();
    const processedLicenses = licenses?.map(license => {
      const client = clientsData.find(c => c.id === license.client_id);
      const plan = plansData.find(p => p.id === license.plan_id);
      
      let days_remaining = 0;
      if (license.trial_ends_at && license.status === 'trial') {
        const trialEndDate = new Date(license.trial_ends_at);
        if (trialEndDate > now) {
          days_remaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }
      }

      return {
        ...license,
        client_name: client?.name,
        client_email: client?.email,
        plan_name: plan?.name || license.plan_type,
        days_remaining
      };
    }) || [];

    // Calculate statistics
    const stats = {
      total_trials: processedLicenses.filter(l => l.trial_ends_at).length,
      active_trials: processedLicenses.filter(l => l.status === 'trial').length,
      expiring_soon: processedLicenses.filter(l => 
        l.status === 'trial' && l.days_remaining > 0 && l.days_remaining <= 3
      ).length,
      expired_trials: processedLicenses.filter(l => 
        l.status === 'trial' && l.trial_ends_at && new Date(l.trial_ends_at) <= now
      ).length,
      conversion_rate: 0 // Will be calculated separately if needed
    };

    // Calculate conversion rate (trials that became active)
    const totalTrialsEver = processedLicenses.filter(l => l.trial_ends_at).length;
    const convertedTrials = processedLicenses.filter(l => 
      l.trial_ends_at && l.status === 'active'
    ).length;
    
    if (totalTrialsEver > 0) {
      stats.conversion_rate = (convertedTrials / totalTrialsEver) * 100;
    }

    // Filter to show only trial-related licenses
    const trialLicenses = processedLicenses.filter(l => 
      l.trial_ends_at || l.status === 'trial'
    );

    return NextResponse.json({
      trials: trialLicenses,
      stats,
      total: trialLicenses.length
    });

  } catch (error) {
    console.error('GET /api/admin/trials error:', error);

    if (error instanceof Error) {
      if (error.message.includes('connection')) {
        return NextResponse.json(
          { 
            error: 'Database connection error',
            details: 'Unable to connect to the database. Please try again later.',
            timestamp: new Date().toISOString()
          },
          { status: 503 }
        );
      }

      if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        return NextResponse.json(
          { 
            error: 'Insufficient permissions',
            details: 'You do not have permission to view trial information.',
            timestamp: new Date().toISOString()
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch trials',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
