import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';

// GET /api/admin/licenses - Get all licenses
export async function GET() {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_LICENSES);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get licenses using RPC function
    const { data: licenses, error: licensesError } = await supabase.rpc('get_all_licenses');

    if (licensesError) {
      console.error('Error fetching licenses:', licensesError);
      return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 });
    }

    // Get all clients to manually join with licenses
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, plan_type, max_users, max_projects');

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      // Continue without client data rather than failing
    }

    // Manually link licenses to clients based on plan type and limits
    const enrichedLicenses = (licenses || []).map((license: any) => {
      // Find matching client based on plan type and limits
      const matchingClient = clients?.find(client =>
        client.plan_type === license.plan_type &&
        client.max_users === license.max_users &&
        client.max_projects === license.max_projects
      );

      return {
        ...license,
        client_id: matchingClient?.id || null,
        client_name: matchingClient?.name || null,
        current_users: 0, // TODO: Implement actual usage tracking
        current_projects: 0, // TODO: Implement actual usage tracking
        usage_users: matchingClient ? `0/${license.max_users}` : `--/${license.max_users}`,
        usage_projects: matchingClient ? `0/${license.max_projects}` : `--/${license.max_projects}`
      };
    });

    return NextResponse.json({
      licenses: enrichedLicenses,
      total: enrichedLicenses.length
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/licenses - Create new license
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_LICENSES);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { plan_type, max_users, max_projects, client_id, status = 'active' } = body;

    // Validate required fields
    if (!plan_type || !max_users || !max_projects) {
      return NextResponse.json({ 
        error: 'Missing required fields: plan_type, max_users, max_projects' 
      }, { status: 400 });
    }

    // Validate plan_type
    if (!['free', 'pro', 'business'].includes(plan_type)) {
      return NextResponse.json({ 
        error: 'Invalid plan_type. Must be: free, pro, or business' 
      }, { status: 400 });
    }

    // Create license data
    const licenseData = {
      plan_type,
      status,
      max_users,
      max_projects,
      client_id: client_id || null,
      current_period_start: new Date().toISOString(),
      current_period_end: plan_type !== 'free' 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        : null
    };

    // Insert license using direct query (since we can't use RPC for insert)
    const { data: license, error } = await supabase
      .from('licenses')
      .insert([licenseData])
      .select()
      .single();

    if (error) {
      console.error('Error creating license:', error);
      return NextResponse.json({ error: 'Failed to create license' }, { status: 500 });
    }

    return NextResponse.json({ license }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
