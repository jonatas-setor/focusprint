import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/admin/setup/diagnose - Diagnose database schema
 */
export async function GET(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const diagnosis = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Test 1: Check if we can access admin_profiles in public schema
    try {
      const { data: publicProfiles, error: publicError } = await supabase
        .from('admin_profiles')
        .select('*')
        .limit(1);
      
      diagnosis.tests.public_admin_profiles = {
        success: !publicError,
        error: publicError?.message,
        count: publicProfiles?.length || 0
      };
    } catch (error) {
      diagnosis.tests.public_admin_profiles = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: Check if we can access admin_profiles in platform_admin schema
    try {
      const { data: platformProfiles, error: platformError } = await supabase
        .from('platform_admin.admin_profiles')
        .select('*')
        .limit(1);
      
      diagnosis.tests.platform_admin_profiles = {
        success: !platformError,
        error: platformError?.message,
        count: platformProfiles?.length || 0
      };
    } catch (error) {
      diagnosis.tests.platform_admin_profiles = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 3: Try to list all tables
    try {
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_schema_tables', { schema_name: 'public' });
      
      diagnosis.tests.list_public_tables = {
        success: !tablesError,
        error: tablesError?.message,
        tables: tables || []
      };
    } catch (error) {
      diagnosis.tests.list_public_tables = {
        success: false,
        error: error instanceof Error ? error.message : 'RPC not available'
      };
    }

    // Test 4: Check auth users
    try {
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      
      diagnosis.tests.auth_users = {
        success: !usersError,
        error: usersError?.message,
        count: users?.users?.length || 0,
        users: users?.users?.map(u => ({ id: u.id, email: u.email, created_at: u.created_at })) || []
      };
    } catch (error) {
      diagnosis.tests.auth_users = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 5: Try direct SQL query
    try {
      const { data: sqlResult, error: sqlError } = await supabase
        .rpc('exec_sql', { 
          query: "SELECT table_name, table_schema FROM information_schema.tables WHERE table_name LIKE '%admin%'" 
        });
      
      diagnosis.tests.sql_query = {
        success: !sqlError,
        error: sqlError?.message,
        result: sqlResult
      };
    } catch (error) {
      diagnosis.tests.sql_query = {
        success: false,
        error: error instanceof Error ? error.message : 'RPC not available'
      };
    }

    return NextResponse.json({
      status: 'diagnosis_complete',
      diagnosis,
      recommendations: [
        'Check which test succeeded to determine correct table location',
        'If no tests succeed, the admin_profiles table may not exist',
        'Use Supabase dashboard to verify table structure',
        'Check if RLS policies are blocking access'
      ]
    });

  } catch (error) {
    console.error('Diagnosis API Error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
