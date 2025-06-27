/**
 * Pricing utilities for FocuSprint plans
 */

export interface PricingCalculation {
  monthlyPriceCents: number;
  annualPriceCents: number;
  annualDiscountPercent: number;
  annualSavingsCents: number;
  annualSavingsAmount: string;
}

/**
 * Calculate annual pricing with discount
 */
export function calculateAnnualPricing(
  monthlyPriceCents: number,
  discountPercent: number = 20
): PricingCalculation {
  const yearlyPriceWithoutDiscount = monthlyPriceCents * 12;
  const discountAmount = yearlyPriceWithoutDiscount * (discountPercent / 100);
  const annualPriceCents = yearlyPriceWithoutDiscount - discountAmount;
  
  return {
    monthlyPriceCents,
    annualPriceCents: Math.round(annualPriceCents),
    annualDiscountPercent: discountPercent,
    annualSavingsCents: Math.round(discountAmount),
    annualSavingsAmount: '' // Will be calculated separately to avoid build issues
  };
}

/**
 * Format currency amount from cents
 */
export function formatCurrency(cents: number, currency: string = 'BRL'): string {
  const amount = cents / 100;
  
  const formatters: Record<string, Intl.NumberFormat> = {
    BRL: new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }),
    USD: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }),
    EUR: new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    })
  };

  const formatter = formatters[currency] || formatters.BRL;
  return formatter.format(amount);
}

/**
 * Calculate effective monthly price for annual plans
 */
export function calculateEffectiveMonthlyPrice(annualPriceCents: number): number {
  return Math.round(annualPriceCents / 12);
}

/**
 * Calculate total first payment including setup fee
 */
export function calculateFirstPayment(
  priceCents: number,
  setupFeeCents: number = 0,
  currency: string = 'BRL'
): {
  recurringAmount: string;
  setupFee: string;
  totalFirstPayment: string;
  hasSetupFee: boolean;
} {
  const hasSetupFee = setupFeeCents > 0;
  const totalCents = priceCents + setupFeeCents;

  return {
    recurringAmount: formatCurrency(priceCents, currency),
    setupFee: formatCurrency(setupFeeCents, currency),
    totalFirstPayment: formatCurrency(totalCents, currency),
    hasSetupFee
  };
}

/**
 * Format setup fee display text
 */
export function formatSetupFeeDisplay(setupFeeCents: number, currency: string = 'BRL'): string {
  if (!setupFeeCents || setupFeeCents <= 0) {
    return 'Sem taxa de setup';
  }

  return `Taxa de setup: ${formatCurrency(setupFeeCents, currency)}`;
}

/**
 * Validate pricing configuration
 */
export function validatePricing(
  monthlyPriceCents: number,
  annualPriceCents?: number,
  discountPercent?: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (monthlyPriceCents < 0) {
    errors.push('Monthly price cannot be negative');
  }

  if (annualPriceCents !== undefined) {
    if (annualPriceCents < 0) {
      errors.push('Annual price cannot be negative');
    }

    const expectedAnnualPrice = monthlyPriceCents * 12;
    if (annualPriceCents > expectedAnnualPrice) {
      errors.push('Annual price cannot be higher than 12x monthly price');
    }

    if (discountPercent !== undefined) {
      if (discountPercent < 0 || discountPercent > 50) {
        errors.push('Discount percent must be between 0% and 50%');
      }

      const calculatedDiscount = ((expectedAnnualPrice - annualPriceCents) / expectedAnnualPrice) * 100;
      const discountDifference = Math.abs(calculatedDiscount - discountPercent);
      
      if (discountDifference > 1) { // Allow 1% tolerance
        errors.push('Annual price does not match the specified discount percentage');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get default pricing for plan types
 */
export function getDefaultPricing(planType: 'free' | 'pro' | 'business' | 'enterprise') {
  const defaults = {
    free: {
      monthlyPriceCents: 0,
      annualPriceCents: 0,
      annualDiscountPercent: 0,
      hasAnnualDiscount: false
    },
    pro: {
      monthlyPriceCents: 9700, // R$ 97.00
      annualPriceCents: 93120, // R$ 931.20 (20% discount)
      annualDiscountPercent: 20,
      hasAnnualDiscount: true
    },
    business: {
      monthlyPriceCents: 39900, // R$ 399.00
      annualPriceCents: 383040, // R$ 3,830.40 (20% discount)
      annualDiscountPercent: 20,
      hasAnnualDiscount: true
    },
    enterprise: {
      monthlyPriceCents: 200000, // R$ 2,000.00 (starting price)
      annualPriceCents: 1920000, // R$ 19,200.00 (20% discount)
      annualDiscountPercent: 20,
      hasAnnualDiscount: true
    }
  };

  return defaults[planType];
}
