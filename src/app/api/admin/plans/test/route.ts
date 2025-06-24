import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { AdminPermission } from '@/types/admin-permissions';

// GET /api/admin/plans/test - Simple test endpoint
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_LICENSES, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Return simple test data
    return NextResponse.json({
      message: 'Plans management system is working',
      test_plans: [
        {
          id: 'plan_free',
          name: 'free',
          display_name: 'Free',
          description: 'Perfect for individuals getting started',
          pricing: {
            monthly_price_cents: 0,
            currency: 'BRL'
          },
          status: 'active'
        },
        {
          id: 'plan_pro',
          name: 'pro',
          display_name: 'Pro',
          description: 'Ideal for growing teams',
          pricing: {
            monthly_price_cents: 9700,
            currency: 'BRL'
          },
          status: 'active'
        },
        {
          id: 'plan_business',
          name: 'business',
          display_name: 'Business',
          description: 'Comprehensive solution for larger teams',
          pricing: {
            monthly_price_cents: 39900,
            currency: 'BRL'
          },
          status: 'active'
        }
      ],
      accessed_by: {
        admin_id: authResult.user.id,
        admin_email: authResult.user.email,
        admin_name: `${authResult.adminProfile?.first_name} ${authResult.adminProfile?.last_name}`,
        access_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Test API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
