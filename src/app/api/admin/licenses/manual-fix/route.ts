import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';

// POST /api/admin/licenses/manual-fix - Manually fix license-client relationships
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_LICENSES);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Manual mapping based on our analysis
    const manualMappings = [
      {
        license_id: 'ca1ba0d0-82c5-478b-9974-c0e067fb818b', // PRO license
        client_id: '8c247799-c025-4baa-a69c-8defc8260561',   // Acme Corporation (PRO)
        plan_type: 'pro'
      },
      {
        license_id: '65441b31-ed9f-4469-acc2-609801b36a7e', // FREE license
        client_id: '193985fe-e6b0-4a39-b926-5b68b278d6f4',   // Empresa Teste (FREE)
        plan_type: 'free'
      },
      {
        license_id: '432379c4-fa20-4e24-8750-c9fc75046ded', // BUSINESS license
        client_id: '41ba6ce4-dc68-4762-9748-4c29b38dc2fa',   // Valid Company Name (BUSINESS)
        plan_type: 'business'
      }
    ];

    const results = [];
    const errors = [];

    for (const mapping of manualMappings) {
      try {
        // Try using raw SQL through RPC
        const { data, error } = await supabase.rpc('update_license_client', {
          p_license_id: mapping.license_id,
          p_client_id: mapping.client_id
        });

        if (error) {
          // If RPC doesn't exist, try direct update
          const { data: updateData, error: updateError } = await supabase
            .from('licenses')
            .update({ client_id: mapping.client_id })
            .eq('id', mapping.license_id)
            .select();

          if (updateError) {
            errors.push({
              license_id: mapping.license_id,
              client_id: mapping.client_id,
              error: updateError.message
            });
          } else {
            results.push({
              license_id: mapping.license_id,
              client_id: mapping.client_id,
              plan_type: mapping.plan_type,
              status: 'updated'
            });
          }
        } else {
          results.push({
            license_id: mapping.license_id,
            client_id: mapping.client_id,
            plan_type: mapping.plan_type,
            status: 'updated_via_rpc'
          });
        }
      } catch (error) {
        errors.push({
          license_id: mapping.license_id,
          client_id: mapping.client_id,
          error: `Exception: ${error}`
        });
      }
    }

    return NextResponse.json({
      message: 'Manual license-client relationship fix completed',
      fixed: results.length,
      errors: errors.length,
      details: {
        fixed_licenses: results,
        errors: errors
      }
    });

  } catch (error) {
    console.error('Error in manual fix:', error);
    return NextResponse.json(
      { error: 'Failed to execute manual fix' },
      { status: 500 }
    );
  }
}

// GET /api/admin/licenses/manual-fix - Show the manual mappings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_LICENSES);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get current license and client data
    const [licensesResult, clientsResult] = await Promise.all([
      supabase.rpc('get_all_licenses'),
      supabase.from('clients').select('id, name, plan_type, status')
    ]);

    const licenses = licensesResult.data || [];
    const clients = clientsResult.data || [];

    // Show the proposed mappings
    const proposedMappings = [
      {
        license: licenses.find((l: any) => l.id === 'ca1ba0d0-82c5-478b-9974-c0e067fb818b'),
        client: clients.find(c => c.id === '8c247799-c025-4baa-a69c-8defc8260561'),
        reason: 'PRO license → Acme Corporation (PRO client)'
      },
      {
        license: licenses.find((l: any) => l.id === '65441b31-ed9f-4469-acc2-609801b36a7e'),
        client: clients.find(c => c.id === '193985fe-e6b0-4a39-b926-5b68b278d6f4'),
        reason: 'FREE license → Empresa Teste (FREE client)'
      },
      {
        license: licenses.find((l: any) => l.id === '432379c4-fa20-4e24-8750-c9fc75046ded'),
        client: clients.find(c => c.id === '41ba6ce4-dc68-4762-9748-4c29b38dc2fa'),
        reason: 'BUSINESS license → Valid Company Name (BUSINESS client)'
      }
    ];

    return NextResponse.json({
      current_orphaned_licenses: licenses.filter((l: any) => !l.client_id).length,
      available_clients: clients.length,
      proposed_mappings: proposedMappings,
      ready_to_fix: true
    });

  } catch (error) {
    console.error('Error getting manual fix info:', error);
    return NextResponse.json(
      { error: 'Failed to get manual fix info' },
      { status: 500 }
    );
  }
}
