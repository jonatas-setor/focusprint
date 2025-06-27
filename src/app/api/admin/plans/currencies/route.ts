// Currency management API for FocuSprint
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAuth } from '@/lib/auth/server';
import { AdminPermission } from '@/types/admin-permissions';
import { CurrencyService } from '@/lib/plans/currency-service';
import { logger } from '@/lib/logger';

// GET /api/admin/plans/currencies - Get supported currencies
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.VIEW_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    try {
      const supportedCurrencies = await CurrencyService.getSupportedCurrencies();

      // Get current exchange rates
      const { data: rates, error } = await supabase
        .from('currency_rates')
        .select('from_currency, to_currency, rate, updated_at')
        .order('from_currency');

      if (error) {
        throw new Error(`Failed to get exchange rates: ${error.message}`);
      }

      logger.info('Retrieved supported currencies', 'CURRENCY', {
        currenciesCount: supportedCurrencies.length,
        ratesCount: rates?.length || 0,
        admin_id: authResult.user.id
      });

      return NextResponse.json({
        success: true,
        data: {
          supported_currencies: supportedCurrencies,
          exchange_rates: rates || [],
          default_currency: 'BRL',
          last_updated: rates?.[0]?.updated_at || null
        }
      });

    } catch (error) {
      logger.error('Failed to get supported currencies', error instanceof Error ? error : new Error('Unknown error'), 'CURRENCY');

      return NextResponse.json(
        { error: 'Failed to retrieve supported currencies' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Currency API error', error instanceof Error ? error : new Error('Unknown error'), 'API');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/plans/currencies - Add new currency support
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication and permissions
    const authResult = await checkAdminAuth(supabase, AdminPermission.MODIFY_PLANS, request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { currency, rates } = body;

    if (!currency || typeof currency !== 'string' || currency.length !== 3) {
      return NextResponse.json(
        { error: 'Valid 3-letter currency code is required' },
        { status: 400 }
      );
    }

    if (!rates || !Array.isArray(rates) || rates.length === 0) {
      return NextResponse.json(
        { error: 'Exchange rates array is required' },
        { status: 400 }
      );
    }

    // Validate that all rates involve the new currency
    for (const rate of rates) {
      if (rate.from !== currency && rate.to !== currency) {
        return NextResponse.json(
          { error: `All rates must involve the new currency: ${currency}` },
          { status: 400 }
        );
      }

      if (typeof rate.rate !== 'number' || rate.rate <= 0) {
        return NextResponse.json(
          { error: 'All rates must be positive numbers' },
          { status: 400 }
        );
      }
    }

    try {
      await CurrencyService.updateExchangeRates(rates);

      logger.info('Added new currency support', 'CURRENCY', {
        currency,
        ratesCount: rates.length,
        admin_id: authResult.user.id
      });

      return NextResponse.json({
        success: true,
        message: `Added support for ${currency} with ${rates.length} exchange rates`,
        data: {
          currency,
          rates_added: rates.length,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to add currency support', error instanceof Error ? error : new Error('Unknown error'), 'CURRENCY', {
        currency,
        ratesCount: rates.length
      });

      return NextResponse.json(
        { error: 'Failed to add currency support' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Currency addition API error', error instanceof Error ? error : new Error('Unknown error'), 'API');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
