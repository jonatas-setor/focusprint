import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';

// POST /api/admin/setup/add-2fa-fields - Add 2FA fields to admin_profiles table
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions (super admin only)
    const authResult = await checkAdminAuth(supabase, AdminPermission.MANAGE_SYSTEM);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Add 2FA fields to admin_profiles table
    const alterTableQueries = [
      // Add two_factor_enabled column
      `ALTER TABLE admin_profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;`,
      
      // Add two_factor_secret column (encrypted)
      `ALTER TABLE admin_profiles ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;`,
      
      // Add two_factor_backup_codes column (encrypted JSON array)
      `ALTER TABLE admin_profiles ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[];`,
      
      // Update existing records to have 2FA disabled by default
      `UPDATE admin_profiles SET two_factor_enabled = FALSE WHERE two_factor_enabled IS NULL;`,
      
      // Add NOT NULL constraint after setting default values
      `ALTER TABLE admin_profiles ALTER COLUMN two_factor_enabled SET NOT NULL;`
    ];

    const results = [];
    const errors = [];

    for (const query of alterTableQueries) {
      try {
        const { data, error } = await supabase.rpc('execute_sql', { sql: query });
        
        if (error) {
          errors.push({
            query: query.substring(0, 50) + '...',
            error: error.message
          });
        } else {
          results.push({
            query: query.substring(0, 50) + '...',
            status: 'success'
          });
        }
      } catch (err) {
        errors.push({
          query: query.substring(0, 50) + '...',
          error: `Exception: ${err}`
        });
      }
    }

    // Verify the changes by checking table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('admin_profiles')
      .select('two_factor_enabled, two_factor_secret, two_factor_backup_codes')
      .limit(1);

    return NextResponse.json({
      message: '2FA fields migration completed',
      successful_queries: results.length,
      failed_queries: errors.length,
      results: results,
      errors: errors,
      verification: {
        table_accessible: !tableError,
        table_error: tableError?.message,
        sample_data: tableInfo?.[0] || null
      }
    });

  } catch (error) {
    console.error('Error adding 2FA fields:', error);
    return NextResponse.json(
      { error: 'Failed to add 2FA fields to database' },
      { status: 500 }
    );
  }
}

// GET /api/admin/setup/add-2fa-fields - Check if 2FA fields exist
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_ADMINS);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Check if 2FA fields exist by trying to select them
    const { data, error } = await supabase
      .from('admin_profiles')
      .select('id, two_factor_enabled, two_factor_secret, two_factor_backup_codes')
      .limit(1);

    const fieldsExist = !error;
    const sampleProfile = data?.[0] || null;

    return NextResponse.json({
      fields_exist: fieldsExist,
      error: error?.message,
      sample_profile: sampleProfile,
      ready_for_2fa: fieldsExist && sampleProfile?.hasOwnProperty('two_factor_enabled')
    });

  } catch (error) {
    console.error('Error checking 2FA fields:', error);
    return NextResponse.json(
      { error: 'Failed to check 2FA fields' },
      { status: 500 }
    );
  }
}
