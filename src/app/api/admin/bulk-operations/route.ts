import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';
import { BulkOperationsService } from '@/lib/bulk/bulk-operations-service';
import { 
  BulkOperationRequest,
  BulkOperationType,
  BulkTargetType,
  BulkOperationFilters,
  BulkOperationStatus
} from '@/types/bulk-operations';

// Initialize the service
BulkOperationsService.initializeService();

// GET /api/admin/bulk-operations - Get bulk operations with filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.SYSTEM_CONFIG, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 per page

    // Parse filter parameters
    const filters: BulkOperationFilters = {};

    if (searchParams.get('operation_type')) {
      filters.operation_type = searchParams.get('operation_type')!.split(',') as BulkOperationType[];
    }

    if (searchParams.get('target_type')) {
      filters.target_type = searchParams.get('target_type')!.split(',') as BulkTargetType[];
    }

    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')!.split(',') as BulkOperationStatus[];
    }

    if (searchParams.get('created_by')) {
      filters.created_by = searchParams.get('created_by')!;
    }

    if (searchParams.get('date_from')) {
      filters.date_from = searchParams.get('date_from')!;
    }

    if (searchParams.get('date_to')) {
      filters.date_to = searchParams.get('date_to')!;
    }

    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')!;
    }

    // Get bulk operations
    const response = await BulkOperationsService.getBulkOperations(filters, page, limit);

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
    console.error('Error fetching bulk operations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bulk operations' },
      { status: 500 }
    );
  }
}

// POST /api/admin/bulk-operations - Create and start a bulk operation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.SYSTEM_CONFIG, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { 
      operation_type, 
      target_type, 
      target_ids, 
      parameters, 
      reason, 
      dry_run, 
      batch_size, 
      metadata 
    } = body;

    // Validate required fields
    if (!operation_type || !target_type || !target_ids || !Array.isArray(target_ids) || target_ids.length === 0) {
      return NextResponse.json(
        { error: 'operation_type, target_type, and target_ids array are required' },
        { status: 400 }
      );
    }

    // Validate operation type
    if (!Object.values(BulkOperationType).includes(operation_type)) {
      return NextResponse.json(
        { error: `Invalid operation_type. Must be one of: ${Object.values(BulkOperationType).join(', ')}` },
        { status: 400 }
      );
    }

    // Validate target type
    if (!Object.values(BulkTargetType).includes(target_type)) {
      return NextResponse.json(
        { error: `Invalid target_type. Must be one of: ${Object.values(BulkTargetType).join(', ')}` },
        { status: 400 }
      );
    }

    // Validate target IDs count
    if (target_ids.length > 1000) {
      return NextResponse.json(
        { error: 'Cannot process more than 1000 targets in a single operation' },
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

    // Create bulk operation request
    const bulkRequest: BulkOperationRequest = {
      operation_type,
      target_type,
      target_ids,
      parameters: parameters || {},
      reason,
      dry_run: dry_run || false,
      batch_size: batch_size || 50,
      metadata
    };

    // Create and start bulk operation
    const response = await BulkOperationsService.createBulkOperation(
      bulkRequest,
      authResult.user.id,
      `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
      requestInfo
    );

    return NextResponse.json({
      message: dry_run ? 'Bulk operation validated successfully' : 'Bulk operation created and started successfully',
      ...response,
      created_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        created_at: response.operation.created_at
      }
    });

  } catch (error) {
    console.error('Error creating bulk operation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create bulk operation' },
      { status: 500 }
    );
  }
}
