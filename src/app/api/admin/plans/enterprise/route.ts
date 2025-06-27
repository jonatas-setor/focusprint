// Enterprise plan management API for FocuSprint
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { AdminPermission } from '@/types/admin-permissions';
import { EnterpriseService } from '@/lib/plans/enterprise-service';
import { logger } from '@/lib/logger';

// GET /api/admin/plans/enterprise - Get enterprise plan details and quotes
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'plan';

    try {
      if (action === 'plan') {
        // Get enterprise plan details
        const enterprisePlan = await EnterpriseService.getEnterprisePlan();
        const enterpriseFeatures = EnterpriseService.getEnterpriseFeatures();

        return NextResponse.json({
          success: true,
          data: {
            plan: enterprisePlan,
            features: enterpriseFeatures,
            pricing_model: 'custom',
            base_price_range: {
              min_monthly: 2000,
              max_monthly: 50000,
              setup_fee_range: { min: 5000, max: 50000 }
            }
          }
        });

      } else if (action === 'quotes') {
        // Get enterprise quote requests
        const status = searchParams.get('status');
        const company = searchParams.get('company');
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

        const quotes = await EnterpriseService.listQuoteRequests({
          status: status || undefined,
          company_name: company || undefined,
          limit
        });

        return NextResponse.json({
          success: true,
          data: {
            quotes,
            total: quotes.length,
            filters: { status, company, limit }
          }
        });

      } else {
        return NextResponse.json(
          { error: 'Invalid action. Use "plan" or "quotes"' },
          { status: 400 }
        );
      }

    } catch (error) {
      logger.error('Failed to get enterprise data', error instanceof Error ? error : new Error('Unknown error'), 'ENTERPRISE');

      return NextResponse.json(
        { error: 'Failed to retrieve enterprise data' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Enterprise API error', error instanceof Error ? error : new Error('Unknown error'), 'API');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/plans/enterprise - Create enterprise quote or update quote status
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { action, ...data } = body;

    try {
      if (action === 'create_quote') {
        // Create new enterprise quote
        const {
          contact_email,
          company_name,
          estimated_users,
          estimated_projects,
          storage_requirements_gb,
          required_features,
          compliance_requirements,
          sla_requirements,
          custom_integrations,
          deployment_type,
          contract_duration_months,
          notes
        } = data;

        // Validate required fields
        if (!contact_email || !company_name || !estimated_users) {
          return NextResponse.json(
            { error: 'Contact email, company name, and estimated users are required' },
            { status: 400 }
          );
        }

        const quote = await EnterpriseService.createQuoteRequest({
          contact_email,
          company_name,
          estimated_users: parseInt(estimated_users),
          estimated_projects: parseInt(estimated_projects) || 0,
          storage_requirements_gb: parseInt(storage_requirements_gb) || 100,
          required_features: required_features || [],
          compliance_requirements: compliance_requirements || [],
          sla_requirements: sla_requirements || {
            uptime_percent: 99.9,
            response_time_minutes: 60,
            support_level: 'business_hours'
          },
          custom_integrations: custom_integrations || [],
          deployment_type: deployment_type || 'cloud',
          contract_duration_months: parseInt(contract_duration_months) || 12,
          created_by: authResult.user.id,
          notes: notes || ''
        });

        logger.info('Created enterprise quote', 'ENTERPRISE', {
          quote_id: quote.id,
          company: company_name,
          admin_id: authResult.user.id
        });

        return NextResponse.json({
          success: true,
          message: 'Enterprise quote created successfully',
          data: { quote }
        });

      } else if (action === 'update_quote_status') {
        // Update quote status
        const { quote_id, status, notes } = data;

        if (!quote_id || !status) {
          return NextResponse.json(
            { error: 'Quote ID and status are required' },
            { status: 400 }
          );
        }

        const validStatuses = ['draft', 'sent', 'negotiating', 'approved', 'rejected'];
        if (!validStatuses.includes(status)) {
          return NextResponse.json(
            { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
            { status: 400 }
          );
        }

        const updatedQuote = await EnterpriseService.updateQuoteStatus(quote_id, status, notes);

        logger.info('Updated enterprise quote status', 'ENTERPRISE', {
          quote_id,
          status,
          admin_id: authResult.user.id
        });

        return NextResponse.json({
          success: true,
          message: `Quote status updated to ${status}`,
          data: { quote: updatedQuote }
        });

      } else {
        return NextResponse.json(
          { error: 'Invalid action. Use "create_quote" or "update_quote_status"' },
          { status: 400 }
        );
      }

    } catch (error) {
      logger.error('Failed to process enterprise request', error instanceof Error ? error : new Error('Unknown error'), 'ENTERPRISE');

      return NextResponse.json(
        { error: 'Failed to process enterprise request' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Enterprise API error', error instanceof Error ? error : new Error('Unknown error'), 'API');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
