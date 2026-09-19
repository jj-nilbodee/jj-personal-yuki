export const CURRENCY_SYMBOLS: Record<string, string> = {
  THB: '฿',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SGD: 'S$',
  JPY: '¥',
};

// Simple conversion rates relative to THB (for display estimation when converting multi-currency portfolios)
export const RATES_TO_THB: Record<string, number> = {
  THB: 1.0,
  USD: 36.2,
  EUR: 39.5,
  GBP: 46.8,
  SGD: 27.8,
  JPY: 0.24,
};

export function formatMoney(amount: number, currencyCode: string = 'THB', compact: boolean = false): string {
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
  
  if (compact && Math.abs(amount) >= 1_000_000) {
    return `${symbol}${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (compact && Math.abs(amount) >= 100_000) {
    return `${symbol}${(amount / 1_000).toFixed(1)}k`;
  }

  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function convertToCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return amount;
  const inTHB = amount * (RATES_TO_THB[fromCurrency] || 1);
  return inTHB / (RATES_TO_THB[toCurrency] || 1);
}
