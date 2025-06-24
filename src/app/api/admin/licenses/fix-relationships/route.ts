import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';

// POST /api/admin/licenses/fix-relationships - Fix license-client relationships
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_LICENSES);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get all licenses using RPC function (same as licenses API)
    const { data: allLicenses, error: licensesError } = await supabase.rpc('get_all_licenses');

    // Filter for licenses without client_id
    const orphanedLicenses = allLicenses?.filter((license: any) => !license.client_id) || [];

    if (licensesError) {
      console.error('Error fetching orphaned licenses:', licensesError);
      return NextResponse.json(
        { error: 'Failed to fetch orphaned licenses' },
        { status: 500 }
      );
    }

    // Get all clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, plan_type, max_users, max_projects, status')
      .eq('status', 'active');

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      );
    }

    if (!orphanedLicenses || orphanedLicenses.length === 0) {
      return NextResponse.json({
        message: 'No orphaned licenses found',
        fixed: 0
      });
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({
        error: 'No active clients found to link licenses to'
      }, { status: 400 });
    }

    // Group clients by plan type
    const clientsByPlan = clients.reduce((acc, client) => {
      if (!acc[client.plan_type]) {
        acc[client.plan_type] = [];
      }
      acc[client.plan_type].push(client);
      return acc;
    }, {} as Record<string, typeof clients>);

    const fixedLicenses = [];
    const errors = [];

    // Fix each orphaned license
    for (const license of orphanedLicenses) {
      try {
        const availableClients = clientsByPlan[license.plan_type] || [];
        
        if (availableClients.length === 0) {
          errors.push({
            license_id: license.id,
            plan_type: license.plan_type,
            error: `No clients found with plan type: ${license.plan_type}`
          });
          continue;
        }

        // Find a client that matches the license limits
        const matchingClient = availableClients.find(client => 
          client.max_users === license.max_users && 
          client.max_projects === license.max_projects
        );

        // If no exact match, use the first available client of the same plan type
        const targetClient = matchingClient || availableClients[0];

        // Update the license with the client_id using direct table access
        const { data: updateResult, error: updateError } = await supabase
          .from('licenses')
          .update({
            client_id: targetClient.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', license.id)
          .select();

        if (updateError) {
          errors.push({
            license_id: license.id,
            client_id: targetClient.id,
            error: updateError.message || 'Unknown update error'
          });
          console.error('License update error:', updateError);
        } else {
          fixedLicenses.push({
            license_id: license.id,
            client_id: targetClient.id,
            client_name: targetClient.name,
            plan_type: license.plan_type
          });

          // Remove the client from available list to avoid duplicate assignments
          const clientIndex = availableClients.indexOf(targetClient);
          if (clientIndex > -1) {
            availableClients.splice(clientIndex, 1);
          }
        }
      } catch (error) {
        errors.push({
          license_id: license.id,
          error: `Unexpected error: ${error}`
        });
      }
    }

    return NextResponse.json({
      message: 'License-client relationship fix completed',
      fixed: fixedLicenses.length,
      errors: errors.length,
      details: {
        fixed_licenses: fixedLicenses,
        errors: errors
      }
    });

  } catch (error) {
    console.error('Error fixing license-client relationships:', error);
    return NextResponse.json(
      { error: 'Failed to fix license-client relationships' },
      { status: 500 }
    );
  }
}

// GET /api/admin/licenses/fix-relationships - Check orphaned licenses
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_LICENSES);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get all licenses using RPC function
    const { data: allLicenses, error: licensesError } = await supabase.rpc('get_all_licenses');

    // Filter for licenses without client_id
    const orphanedLicenses = allLicenses?.filter((license: any) => !license.client_id) || [];

    if (licensesError) {
      console.error('Error fetching orphaned licenses:', licensesError);
      return NextResponse.json(
        { error: 'Failed to fetch orphaned licenses' },
        { status: 500 }
      );
    }

    // Get clients count by plan type
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('plan_type')
      .eq('status', 'active');

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      );
    }

    const clientsByPlan = clients?.reduce((acc, client) => {
      acc[client.plan_type] = (acc[client.plan_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const orphanedByPlan = orphanedLicenses?.reduce((acc, license) => {
      acc[license.plan_type] = (acc[license.plan_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return NextResponse.json({
      orphaned_licenses: orphanedLicenses?.length || 0,
      orphaned_by_plan: orphanedByPlan,
      clients_by_plan: clientsByPlan,
      can_fix: (orphanedLicenses?.length || 0) > 0 && (clients?.length || 0) > 0
    });

  } catch (error) {
    console.error('Error checking orphaned licenses:', error);
    return NextResponse.json(
      { error: 'Failed to check orphaned licenses' },
      { status: 500 }
    );
  }
}
