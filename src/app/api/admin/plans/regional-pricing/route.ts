// Regional pricing management API for FocuSprint
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { AdminPermission } from '@/types/admin-permissions';
import { CurrencyService } from '@/lib/plans/currency-service';
import { logger } from '@/lib/logger';

// GET /api/admin/plans/regional-pricing - Get plan prices in multiple currencies
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');
    const currenciesParam = searchParams.get('currencies');

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Default currencies if not specified
    const currencies = currenciesParam ? currenciesParam.split(',') : ['BRL', 'USD', 'EUR'];

    try {
      const regionalPrices = await CurrencyService.getPlanPricesInCurrencies(planId, currencies);

      logger.info('Retrieved regional pricing', 'REGIONAL_PRICING', {
        planId,
        currencies: currencies.length,
        admin_id: authResult.user.id
      });

      return NextResponse.json({
        success: true,
        data: {
          plan_id: planId,
          regional_prices: regionalPrices,
          supported_currencies: currencies
        }
      });

    } catch (error) {
      logger.error('Failed to get regional pricing', error instanceof Error ? error : new Error('Unknown error'), 'REGIONAL_PRICING', {
        planId,
        currencies
      });

      return NextResponse.json(
        { error: 'Failed to retrieve regional pricing' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Regional pricing API error', error instanceof Error ? error : new Error('Unknown error'), 'API');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/plans/regional-pricing - Update currency exchange rates
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { rates } = body;

    if (!rates || !Array.isArray(rates)) {
      return NextResponse.json(
        { error: 'Exchange rates array is required' },
        { status: 400 }
      );
    }

    // Validate rate format
    for (const rate of rates) {
      if (!rate.from || !rate.to || typeof rate.rate !== 'number') {
        return NextResponse.json(
          { error: 'Invalid rate format. Expected: {from: string, to: string, rate: number}' },
          { status: 400 }
        );
      }

      if (rate.rate <= 0) {
        return NextResponse.json(
          { error: 'Exchange rate must be positive' },
          { status: 400 }
        );
      }
    }

    try {
      await CurrencyService.updateExchangeRates(rates);

      logger.info('Updated exchange rates', 'REGIONAL_PRICING', {
        ratesCount: rates.length,
        admin_id: authResult.user.id
      });

      return NextResponse.json({
        success: true,
        message: `Updated ${rates.length} exchange rates`,
        data: {
          updated_rates: rates.length,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to update exchange rates', error instanceof Error ? error : new Error('Unknown error'), 'REGIONAL_PRICING', {
        ratesCount: rates.length
      });

      return NextResponse.json(
        { error: 'Failed to update exchange rates' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Regional pricing update API error', error instanceof Error ? error : new Error('Unknown error'), 'API');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
