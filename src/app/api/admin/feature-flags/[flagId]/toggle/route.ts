import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { FeatureFlagService } from '@/lib/feature-flags/feature-flags-service';

// POST /api/admin/feature-flags/[flagId]/toggle - Toggle feature flag enabled/disabled
export async function POST(
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
    const { enabled, reason } = body;

    // Validate required fields
    if (enabled === undefined) {
      return NextResponse.json(
        { error: 'enabled field is required (true or false)' },
        { status: 400 }
      );
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled field must be a boolean' },
        { status: 400 }
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

    // Toggle feature flag
    const updatedFlag = await FeatureFlagService.toggleFlag(
      flagId,
      enabled,
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      reason || `Feature flag ${enabled ? 'enabled' : 'disabled'} via API`,
      requestInfo
    );

    return NextResponse.json({
      message: `Feature flag ${enabled ? 'enabled' : 'disabled'} successfully`,
      flag: updatedFlag,
      action: enabled ? 'enabled' : 'disabled',
      performed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        performed_at: updatedFlag.updated_at
      }
    });

  } catch (error) {
    console.error('Error toggling feature flag:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to toggle feature flag' },
      { status: 500 }
    );
  }
}

// GET /api/admin/feature-flags/[flagId]/toggle - Get current toggle state and options
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

    return NextResponse.json({
      flag_id: flag.id,
      flag_key: flag.key,
      flag_name: flag.name,
      current_state: {
        is_enabled: flag.is_enabled,
        status: flag.status,
        last_updated: flag.updated_at,
        updated_by: flag.updated_by_name
      },
      toggle_options: {
        can_enable: !flag.is_enabled && flag.status === 'active',
        can_disable: flag.is_enabled,
        requires_reason: true,
        warning_messages: getToggleWarnings(flag)
      },
      admin_info: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        has_permission: true
      }
    });

  } catch (error) {
    console.error('Error getting toggle state:', error);
    return NextResponse.json(
      { error: 'Failed to get toggle state' },
      { status: 500 }
    );
  }
}

// Helper function to get toggle warnings
function getToggleWarnings(flag: any): string[] {
  const warnings: string[] = [];

  if (flag.environment === 'production' && flag.rollout_percentage === 100) {
    warnings.push('This flag affects all production users');
  }

  if (flag.target_audience === 'all_users' && flag.is_enabled) {
    warnings.push('Disabling this flag will affect all users');
  }

  if (flag.client_overrides && flag.client_overrides.length > 0) {
    warnings.push(`This flag has ${flag.client_overrides.length} client-specific overrides`);
  }

  if (flag.expires_at && new Date(flag.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
    warnings.push('This flag is set to expire within 7 days');
  }

  if (flag.category === 'security' || flag.category === 'billing') {
    warnings.push('This is a critical system flag - toggle with caution');
  }

  return warnings;
}
