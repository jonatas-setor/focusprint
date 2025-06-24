import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';

// GET /api/admin/debug/tables - Debug table access
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_LICENSES);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const results = {};

    // Test 1: Try to access licenses table directly
    try {
      const { data: directLicenses, error: directError } = await supabase
        .from('licenses')
        .select('id, client_id, plan_type')
        .limit(1);
      
      results.direct_licenses = {
        success: !directError,
        error: directError?.message,
        data: directLicenses
      };
    } catch (error) {
      results.direct_licenses = {
        success: false,
        error: `Exception: ${error}`
      };
    }

    // Test 2: Try RPC function
    try {
      const { data: rpcLicenses, error: rpcError } = await supabase
        .rpc('get_all_licenses');
      
      results.rpc_licenses = {
        success: !rpcError,
        error: rpcError?.message,
        count: rpcLicenses?.length || 0,
        sample: rpcLicenses?.[0] || null
      };
    } catch (error) {
      results.rpc_licenses = {
        success: false,
        error: `Exception: ${error}`
      };
    }

    // Test 3: Try to update a license directly
    try {
      const { data: updateTest, error: updateError } = await supabase
        .from('licenses')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', 'ca1ba0d0-82c5-478b-9974-c0e067fb818b')
        .select();
      
      results.direct_update = {
        success: !updateError,
        error: updateError?.message,
        data: updateTest
      };
    } catch (error) {
      results.direct_update = {
        success: false,
        error: `Exception: ${error}`
      };
    }

    // Test 4: Check if there's a platform_admin schema
    try {
      const { data: platformLicenses, error: platformError } = await supabase
        .schema('platform_admin')
        .from('licenses')
        .select('id, client_id, plan_type')
        .limit(1);
      
      results.platform_admin_licenses = {
        success: !platformError,
        error: platformError?.message,
        data: platformLicenses
      };
    } catch (error) {
      results.platform_admin_licenses = {
        success: false,
        error: `Exception: ${error}`
      };
    }

    // Test 5: Check available RPC functions
    try {
      const { data: rpcFunctions, error: rpcError } = await supabase
        .rpc('get_available_functions');
      
      results.available_functions = {
        success: !rpcError,
        error: rpcError?.message,
        data: rpcFunctions
      };
    } catch (error) {
      results.available_functions = {
        success: false,
        error: `Exception: ${error}`
      };
    }

    return NextResponse.json({
      message: 'Database access debug results',
      tests: results
    });

  } catch (error) {
    console.error('Error in debug tables:', error);
    return NextResponse.json(
      { error: 'Failed to debug table access' },
      { status: 500 }
    );
  }
}
