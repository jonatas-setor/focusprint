import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';

// POST /api/admin/clients/link-licenses - Link clients to existing licenses
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_CLIENTS);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get all licenses and clients
    const [licensesResult, clientsResult] = await Promise.all([
      supabase.rpc('get_all_licenses'),
      supabase.from('clients').select('id, name, plan_type, max_users, max_projects')
    ]);

    if (licensesResult.error) {
      return NextResponse.json(
        { error: 'Failed to fetch licenses' },
        { status: 500 }
      );
    }

    if (clientsResult.error) {
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      );
    }

    const licenses = licensesResult.data || [];
    const clients = clientsResult.data || [];

    // Create mappings based on plan type and limits
    const mappings = [
      {
        license_id: 'ca1ba0d0-82c5-478b-9974-c0e067fb818b', // PRO license (15 users, 10 projects)
        client_id: '8c247799-c025-4baa-a69c-8defc8260561',   // Acme Corporation (PRO)
        plan_type: 'pro'
      },
      {
        license_id: '65441b31-ed9f-4469-acc2-609801b36a7e', // FREE license (5 users, 3 projects)
        client_id: '193985fe-e6b0-4a39-b926-5b68b278d6f4',   // Empresa Teste (FREE)
        plan_type: 'free'
      },
      {
        license_id: '432379c4-fa20-4e24-8750-c9fc75046ded', // BUSINESS license (50 users, 50 projects)
        client_id: '41ba6ce4-dc68-4762-9748-4c29b38dc2fa',   // Valid Company Name (BUSINESS)
        plan_type: 'business'
      }
    ];

    const results = [];
    const errors = [];

    // Try to add license_id to clients table
    for (const mapping of mappings) {
      try {
        // Check if client exists
        const client = clients.find(c => c.id === mapping.client_id);
        if (!client) {
          errors.push({
            client_id: mapping.client_id,
            error: 'Client not found'
          });
          continue;
        }

        // Update client with license_id
        const { data: updateResult, error: updateError } = await supabase
          .from('clients')
          .update({ 
            license_id: mapping.license_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', mapping.client_id)
          .select();

        if (updateError) {
          errors.push({
            client_id: mapping.client_id,
            license_id: mapping.license_id,
            error: updateError.message
          });
        } else {
          results.push({
            client_id: mapping.client_id,
            client_name: client.name,
            license_id: mapping.license_id,
            plan_type: mapping.plan_type,
            status: 'linked'
          });
        }
      } catch (error) {
        errors.push({
          client_id: mapping.client_id,
          license_id: mapping.license_id,
          error: `Exception: ${error}`
        });
      }
    }

    return NextResponse.json({
      message: 'Client-license linking completed',
      linked: results.length,
      errors: errors.length,
      details: {
        linked_clients: results,
        errors: errors
      }
    });

  } catch (error) {
    console.error('Error linking clients to licenses:', error);
    return NextResponse.json(
      { error: 'Failed to link clients to licenses' },
      { status: 500 }
    );
  }
}

// GET /api/admin/clients/link-licenses - Check current linking status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_CLIENTS);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get clients and check if they have license_id
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, plan_type, license_id');

    if (clientsError) {
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      );
    }

    const clientsWithLicenses = clients?.filter(c => c.license_id) || [];
    const clientsWithoutLicenses = clients?.filter(c => !c.license_id) || [];

    return NextResponse.json({
      total_clients: clients?.length || 0,
      clients_with_licenses: clientsWithLicenses.length,
      clients_without_licenses: clientsWithoutLicenses.length,
      clients_needing_licenses: clientsWithoutLicenses,
      ready_to_link: clientsWithoutLicenses.length > 0
    });

  } catch (error) {
    console.error('Error checking client-license linking:', error);
    return NextResponse.json(
      { error: 'Failed to check client-license linking' },
      { status: 500 }
    );
  }
}
