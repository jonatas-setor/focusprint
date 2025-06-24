import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { FeatureFlagService } from '@/lib/feature-flags/feature-flags-service';

// GET /api/admin/feature-flags/[flagId] - Get a specific feature flag
export async function GET(
  request: NextRequest,
  { params }: { params: { flagId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.FEATURE_FLAGS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { flagId } = params;

    // Get feature flag
    const flag = await FeatureFlagService.getFlagById(flagId);
    
    if (!flag) {
      return NextResponse.json(
        { error: 'Feature flag not found' },
        { status: 404 }
      );
    }

    // Get flag history
    const history = await FeatureFlagService.getFlagHistory(flagId);

    return NextResponse.json({
      flag,
      history: history.slice(0, 10), // Last 10 changes
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching feature flag:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature flag' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/feature-flags/[flagId] - Update a feature flag
export async function PUT(
  request: NextRequest,
  { params }: { params: { flagId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.FEATURE_FLAGS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { flagId } = params;
    const body = await request.json();
    const { reason, ...updates } = body;

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.created_by;
    delete updates.created_by_name;
    delete updates.created_at;
    delete updates.updated_by;
    delete updates.updated_by_name;
    delete updates.updated_at;

    // Validate type and value compatibility if both are being updated
    if (updates.type && updates.current_value !== undefined) {
      if (!validateTypeValue(updates.type, updates.current_value)) {
        return NextResponse.json(
          { error: `current_value is not compatible with type ${updates.type}` },
          { status: 400 }
        );
      }
    }

    // Extract request information
    const getClientIP = (req: Request): string => {
      const forwarded = req.headers.get('x-forwarded-for');
      const realIP = req.headers.get('x-real-ip');
      
      if (forwarded) return forwarded.split(',')[0].trim();
      if (realIP) return realIP;
      return 'unknown';
    };

    const requestInfo = {
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || undefined
    };

    // Update feature flag
    const updatedFlag = await FeatureFlagService.updateFlag(
      flagId,
      updates,
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      reason,
      requestInfo
    );

    return NextResponse.json({
      message: 'Feature flag updated successfully',
      flag: updatedFlag,
      updated_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        updated_at: updatedFlag.updated_at
      }
    });

  } catch (error) {
    console.error('Error updating feature flag:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update feature flag' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/feature-flags/[flagId] - Delete a feature flag
export async function DELETE(
  request: NextRequest,
  { params }: { params: { flagId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions (higher permission for deletion)
    const authResult = await checkAdminAuth(supabase, AdminPermission.SYSTEM_CONFIG, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { flagId } = params;
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || 'Feature flag deleted';

    // Get the flag before deletion for logging
    const flag = await FeatureFlagService.getFlagById(flagId);
    if (!flag) {
      return NextResponse.json(
        { error: 'Feature flag not found' },
        { status: 404 }
      );
    }

    // Extract request information
    const getClientIP = (req: Request): string => {
      const forwarded = req.headers.get('x-forwarded-for');
      const realIP = req.headers.get('x-real-ip');
      
      if (forwarded) return forwarded.split(',')[0].trim();
      if (realIP) return realIP;
      return 'unknown';
    };

    const requestInfo = {
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || undefined
    };

    // Perform bulk delete operation (which handles logging)
    const result = await FeatureFlagService.bulkOperation(
      {
        action: 'delete',
        flag_ids: [flagId],
        reason
      },
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      requestInfo
    );

    if (result.failure_count > 0) {
      return NextResponse.json(
        { error: result.results[0].error || 'Failed to delete feature flag' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Feature flag deleted successfully',
      deleted_flag: {
        id: flag.id,
        key: flag.key,
        name: flag.name
      },
      deleted_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        deleted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error deleting feature flag:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete feature flag' },
      { status: 500 }
    );
  }
}

// Helper function to validate type and value compatibility
function validateTypeValue(type: string, value: any): boolean {
  switch (type) {
    case 'boolean':
      return typeof value === 'boolean';
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'percentage':
      return typeof value === 'number' && value >= 0 && value <= 100;
    case 'json':
      try {
        if (typeof value === 'string') {
          JSON.parse(value);
        }
        return true;
      } catch {
        return typeof value === 'object';
      }
    default:
      return false;
  }
}
