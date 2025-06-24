import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { FeatureFlagService } from '@/lib/feature-flags/feature-flags-service';

// POST /api/admin/feature-flags/[flagId]/overrides - Add client override
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
    const { client_id, client_name, value, reason, expires_at } = body;

    // Validate required fields
    if (!client_id || !client_name || value === undefined || !reason) {
      return NextResponse.json(
        { error: 'client_id, client_name, value, and reason are required' },
        { status: 400 }
      );
    }

    // Validate expiration date if provided
    if (expires_at) {
      const expirationDate = new Date(expires_at);
      if (isNaN(expirationDate.getTime()) || expirationDate <= new Date()) {
        return NextResponse.json(
          { error: 'expires_at must be a valid future date' },
          { status: 400 }
        );
      }
    }

    // Get the flag to validate value type
    const flag = await FeatureFlagService.getFlagById(flagId);
    if (!flag) {
      return NextResponse.json(
        { error: 'Feature flag not found' },
        { status: 404 }
      );
    }

    // Validate value type compatibility
    if (!validateValueType(flag.type, value)) {
      return NextResponse.json(
        { error: `Override value is not compatible with flag type ${flag.type}` },
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

    // Add client override
    const updatedFlag = await FeatureFlagService.addClientOverride(
      flagId,
      client_id,
      client_name,
      value,
      reason,
      authResult.user.id,
      expires_at,
      requestInfo
    );

    return NextResponse.json({
      message: 'Client override added successfully',
      flag: updatedFlag,
      override: updatedFlag.client_overrides.find(o => o.client_id === client_id),
      created_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error adding client override:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add client override' },
      { status: 500 }
    );
  }
}

// GET /api/admin/feature-flags/[flagId]/overrides - Get client overrides for a flag
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

    // Process overrides to add status information
    const processedOverrides = flag.client_overrides.map(override => {
      const isExpired = override.expires_at && new Date(override.expires_at) <= new Date();
      return {
        ...override,
        status: isExpired ? 'expired' : (override.is_enabled ? 'active' : 'disabled'),
        is_expired: isExpired,
        time_until_expiry: override.expires_at ? 
          Math.max(0, new Date(override.expires_at).getTime() - Date.now()) : null
      };
    });

    // Calculate summary
    const summary = {
      total_overrides: processedOverrides.length,
      active_overrides: processedOverrides.filter(o => o.status === 'active').length,
      expired_overrides: processedOverrides.filter(o => o.status === 'expired').length,
      disabled_overrides: processedOverrides.filter(o => o.status === 'disabled').length,
      overrides_by_value: processedOverrides.reduce((acc, override) => {
        const valueKey = JSON.stringify(override.value);
        acc[valueKey] = (acc[valueKey] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return NextResponse.json({
      flag_info: {
        id: flag.id,
        key: flag.key,
        name: flag.name,
        type: flag.type,
        default_value: flag.default_value,
        current_value: flag.current_value
      },
      overrides: processedOverrides,
      summary,
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching client overrides:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client overrides' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/feature-flags/[flagId]/overrides - Remove client override
export async function DELETE(
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
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const reason = searchParams.get('reason') || 'Client override removed';

    if (!clientId) {
      return NextResponse.json(
        { error: 'client_id query parameter is required' },
        { status: 400 }
      );
    }

    // Get the flag
    const flag = await FeatureFlagService.getFlagById(flagId);
    if (!flag) {
      return NextResponse.json(
        { error: 'Feature flag not found' },
        { status: 404 }
      );
    }

    // Find the override to remove
    const overrideIndex = flag.client_overrides.findIndex(override => override.client_id === clientId);
    if (overrideIndex === -1) {
      return NextResponse.json(
        { error: 'Client override not found' },
        { status: 404 }
      );
    }

    const removedOverride = flag.client_overrides[overrideIndex];

    // Remove the override
    flag.client_overrides.splice(overrideIndex, 1);

    // Update the flag (this would normally use the service method)
    const updatedFlag = await FeatureFlagService.updateFlag(
      flagId,
      { client_overrides: flag.client_overrides },
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      reason
    );

    // Log the removal
    try {
      const { AuditService } = await import('@/lib/audit/audit-service');
      const { AuditAction, ResourceType, AuditSeverity } = await import('@/types/audit-log');
      
      await AuditService.log({
        admin_id: authResult.user.id,
        admin_email: authResult.user.email || '',
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        action: AuditAction.FEATURE_FLAG_UPDATED,
        resource_type: ResourceType.FEATURE_FLAG,
        resource_id: flag.id,
        resource_name: flag.name,
        details: {
          description: `Client override removed for ${removedOverride.client_name}`,
          context: {
            flag_key: flag.key,
            client_id: clientId,
            client_name: removedOverride.client_name,
            removed_value: removedOverride.value,
            reason
          }
        },
        severity: AuditSeverity.MEDIUM,
        status: 'success'
      });
    } catch (auditError) {
      console.error('Failed to log override removal:', auditError);
    }

    return NextResponse.json({
      message: 'Client override removed successfully',
      removed_override: removedOverride,
      flag: updatedFlag,
      removed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        removed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error removing client override:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove client override' },
      { status: 500 }
    );
  }
}

// Helper function to validate value type
function validateValueType(flagType: string, value: any): boolean {
  switch (flagType) {
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
