import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { FeatureFlagService } from '@/lib/feature-flags/feature-flags-service';
import { 
  FeatureFlagFilters, 
  FeatureFlagType, 
  Environment, 
  FeatureFlagCategory, 
  FeatureFlagStatus,
  TargetAudience 
} from '@/types/feature-flags';

// Initialize the service
FeatureFlagService.initializeService();

// GET /api/admin/feature-flags - Get feature flags with filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.FEATURE_FLAGS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 per page

    // Parse filter parameters
    const filters: FeatureFlagFilters = {};

    if (searchParams.get('environment')) {
      filters.environment = searchParams.get('environment') as Environment;
    }

    if (searchParams.get('category')) {
      filters.category = searchParams.get('category') as FeatureFlagCategory;
    }

    if (searchParams.get('status')) {
      filters.status = searchParams.get('status') as FeatureFlagStatus;
    }

    if (searchParams.get('type')) {
      filters.type = searchParams.get('type') as FeatureFlagType;
    }

    if (searchParams.get('target_audience')) {
      filters.target_audience = searchParams.get('target_audience') as TargetAudience;
    }

    if (searchParams.get('is_enabled')) {
      filters.is_enabled = searchParams.get('is_enabled') === 'true';
    }

    if (searchParams.get('created_by')) {
      filters.created_by = searchParams.get('created_by')!;
    }

    if (searchParams.get('tags')) {
      filters.tags = searchParams.get('tags')!.split(',');
    }

    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')!;
    }

    if (searchParams.get('date_from')) {
      filters.date_from = searchParams.get('date_from')!;
    }

    if (searchParams.get('date_to')) {
      filters.date_to = searchParams.get('date_to')!;
    }

    // Get feature flags
    const response = await FeatureFlagService.getFlags(filters, page, limit);

    return NextResponse.json({
      ...response,
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature flags' },
      { status: 500 }
    );
  }
}

// POST /api/admin/feature-flags - Create a new feature flag
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.FEATURE_FLAGS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { name, key, description, type, default_value, environment, rollout_percentage, target_audience, conditions, expires_at, tags, category, metadata } = body;

    // Validate required fields
    if (!name || !key || !description || !type || default_value === undefined || !category) {
      return NextResponse.json(
        { error: 'name, key, description, type, default_value, and category are required' },
        { status: 400 }
      );
    }

    // Validate type and default_value compatibility
    if (!validateTypeValue(type, default_value)) {
      return NextResponse.json(
        { error: `default_value is not compatible with type ${type}` },
        { status: 400 }
      );
    }

    // Validate key format (alphanumeric, underscores, hyphens only)
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
      return NextResponse.json(
        { error: 'key must contain only alphanumeric characters, underscores, and hyphens' },
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

    // Create feature flag
    const flag = await FeatureFlagService.createFlag(
      {
        name,
        key,
        description,
        type,
        default_value,
        environment: environment || Environment.ALL,
        rollout_percentage: rollout_percentage || 100,
        target_audience: target_audience || TargetAudience.ALL_USERS,
        conditions: conditions || [],
        expires_at,
        tags: tags || [],
        category,
        metadata
      },
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      requestInfo
    );

    return NextResponse.json({
      message: 'Feature flag created successfully',
      flag,
      created_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        created_at: flag.created_at
      }
    });

  } catch (error) {
    console.error('Error creating feature flag:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create feature flag' },
      { status: 500 }
    );
  }
}

// Helper function to validate type and value compatibility
function validateTypeValue(type: FeatureFlagType, value: any): boolean {
  switch (type) {
    case FeatureFlagType.BOOLEAN:
      return typeof value === 'boolean';
    case FeatureFlagType.STRING:
      return typeof value === 'string';
    case FeatureFlagType.NUMBER:
      return typeof value === 'number' && !isNaN(value);
    case FeatureFlagType.PERCENTAGE:
      return typeof value === 'number' && value >= 0 && value <= 100;
    case FeatureFlagType.JSON:
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
