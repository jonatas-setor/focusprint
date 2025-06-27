// Currency and regional pricing service for FocuSprint
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface CurrencyRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at: string;
}

export interface RegionalPrice {
  currency: string;
  price: number;
  formatted_price: string;
}

export class CurrencyService {
  /**
   * Get current exchange rate between currencies
   */
  static async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) return 1;

    const supabase = await createClient();

    try {
      const { data: rate, error } = await supabase
        .from('currency_rates')
        .select('rate')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .single();

      if (error || !rate) {
        // Try reverse rate
        const { data: reverseRate } = await supabase
          .from('currency_rates')
          .select('rate')
          .eq('from_currency', toCurrency)
          .eq('to_currency', fromCurrency)
          .single();

        if (reverseRate) {
          return 1 / reverseRate.rate;
        }

        throw new Error(`Exchange rate not found: ${fromCurrency} to ${toCurrency}`);
      }

      return rate.rate;

    } catch (error) {
      logger.error('Failed to get exchange rate', error instanceof Error ? error : new Error('Unknown error'), 'CURRENCY', {
        fromCurrency,
        toCurrency
      });
      throw error;
    }
  }

  /**
   * Convert price to different currency
   */
  static async convertPrice(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    try {
      const rate = await this.getExchangeRate(fromCurrency, toCurrency);
      return Math.round(amount * rate * 100) / 100; // Round to 2 decimal places

    } catch (error) {
      logger.error('Failed to convert price', error instanceof Error ? error : new Error('Unknown error'), 'CURRENCY', {
        amount,
        fromCurrency,
        toCurrency
      });
      throw error;
    }
  }

  /**
   * Get plan price in multiple currencies
   */
  static async getPlanPricesInCurrencies(planId: string, currencies: string[]): Promise<RegionalPrice[]> {
    const supabase = await createClient();

    try {
      // Get plan base price
      const { data: plan, error } = await supabase
        .from('plans')
        .select('price, currency')
        .eq('id', planId)
        .single();

      if (error || !plan) {
        throw new Error(`Plan not found: ${planId}`);
      }

      const prices: RegionalPrice[] = [];

      for (const currency of currencies) {
        try {
          const convertedPrice = await this.convertPrice(plan.price, plan.currency, currency);
          
          prices.push({
            currency,
            price: convertedPrice,
            formatted_price: this.formatPrice(convertedPrice, currency)
          });

        } catch (error) {
          // Skip currencies that can't be converted
          logger.warn(`Failed to convert price to ${currency}`, 'CURRENCY', {
            planId,
            baseCurrency: plan.currency,
            targetCurrency: currency
          });
        }
      }

      return prices;

    } catch (error) {
      logger.error('Failed to get plan prices in currencies', error instanceof Error ? error : new Error('Unknown error'), 'CURRENCY', {
        planId,
        currencies
      });
      throw error;
    }
  }

  /**
   * Format price according to currency
   */
  static formatPrice(amount: number, currency: string): string {
    const formatters: Record<string, Intl.NumberFormat> = {
      'BRL': new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
      'USD': new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
      'EUR': new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
    };

    const formatter = formatters[currency] || new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency 
    });

    return formatter.format(amount);
  }

  /**
   * Update exchange rates
   */
  static async updateExchangeRates(rates: Array<{from: string, to: string, rate: number}>): Promise<void> {
    const supabase = await createClient();

    try {
      const updates = rates.map(rate => ({
        from_currency: rate.from,
        to_currency: rate.to,
        rate: rate.rate,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('currency_rates')
        .upsert(updates, { 
          onConflict: 'from_currency,to_currency',
          ignoreDuplicates: false 
        });

      if (error) {
        throw new Error(`Failed to update exchange rates: ${error.message}`);
      }

      logger.info(`Updated ${rates.length} exchange rates`, 'CURRENCY', {
        updatedRates: rates.length
      });

    } catch (error) {
      logger.error('Failed to update exchange rates', error instanceof Error ? error : new Error('Unknown error'), 'CURRENCY');
      throw error;
    }
  }

  /**
   * Get supported currencies
   */
  static async getSupportedCurrencies(): Promise<string[]> {
    const supabase = await createClient();

    try {
      const { data: currencies, error } = await supabase
        .from('currency_rates')
        .select('from_currency, to_currency');

      if (error) {
        throw new Error(`Failed to get supported currencies: ${error.message}`);
      }

      const uniqueCurrencies = new Set<string>();
      currencies?.forEach(rate => {
        uniqueCurrencies.add(rate.from_currency);
        uniqueCurrencies.add(rate.to_currency);
      });

      return Array.from(uniqueCurrencies).sort();

    } catch (error) {
      logger.error('Failed to get supported currencies', error instanceof Error ? error : new Error('Unknown error'), 'CURRENCY');
      throw error;
    }
  }
}
