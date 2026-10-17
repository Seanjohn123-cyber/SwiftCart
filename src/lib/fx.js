/**
 * SwiftCart FX & Multi-Currency Engine
 * Handles real-time currency conversions, symbol localization,
 * and PayPal Orders v2 compatible settlement currency payloads.
 */

export const SUPPORTED_CURRENCIES = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    rate: 1.0,
    decimals: 2,
    paypalSupported: true,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    rate: 0.92,
    decimals: 2,
    paypalSupported: true,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    rate: 0.78,
    decimals: 2,
    paypalSupported: true,
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    rate: 1.36,
    decimals: 2,
    paypalSupported: true,
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    rate: 1.50,
    decimals: 2,
    paypalSupported: true,
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    rate: 152.5,
    decimals: 0,
    paypalSupported: true,
  },
};

/**
 * Convert USD amount to target currency
 * @param {number|string} amountInUSD 
 * @param {string} targetCurrency 
 * @returns {number} converted amount rounded to currency decimals
 */
export function convertAmount(amountInUSD, targetCurrency = 'USD') {
  const numericAmount = typeof amountInUSD === 'string' ? parseFloat(amountInUSD) : amountInUSD;
  if (isNaN(numericAmount)) return 0;

  const curr = SUPPORTED_CURRENCIES[targetCurrency] || SUPPORTED_CURRENCIES.USD;
  const converted = numericAmount * curr.rate;

  return curr.decimals === 0 
    ? Math.round(converted) 
    : parseFloat(converted.toFixed(curr.decimals));
}

export function multiplyCurrencyAmount(amount, quantity, decimals) {
  if (
    typeof amount !== 'string' ||
    !/^\d+(?:\.\d+)?$/.test(amount) ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 3
  ) {
    throw new Error("Invalid currency amount or quantity.");
  }

  const [whole, fractional = ""] = amount.split(".");
  const scale = 10n ** BigInt(decimals);
  const unitAmount =
    BigInt(whole) * scale +
    BigInt((fractional + "0".repeat(decimals)).slice(0, decimals) || "0");
  const total = unitAmount * BigInt(quantity);
  const totalWhole = total / scale;
  if (decimals === 0) return totalWhole.toString();

  const totalFraction = (total % scale).toString().padStart(decimals, "0");
  return `${totalWhole}.${totalFraction}`;
}

export function formatMinorUnitAmount(amountMinor, currency) {
  const definition = SUPPORTED_CURRENCIES[currency];
  if (
    !Number.isSafeInteger(amountMinor) ||
    amountMinor < 0 ||
    !definition
  ) {
    throw new Error("Invalid minor-unit amount or currency.");
  }

  if (definition.decimals === 0) return String(amountMinor);

  const scale = 10 ** definition.decimals;
  const whole = Math.floor(amountMinor / scale);
  const fraction = String(amountMinor % scale).padStart(
    definition.decimals,
    "0",
  );
  return `${whole}.${fraction}`;
}

/**
 * Format an amount with its currency symbol
 * @param {number|string} amountInUSD 
 * @param {string} targetCurrency 
 * @returns {string} e.g. "£58.49" or "¥11,436"
 */
export function formatPrice(amountInUSD, targetCurrency = 'USD') {
  const curr = SUPPORTED_CURRENCIES[targetCurrency] || SUPPORTED_CURRENCIES.USD;
  const value = convertAmount(amountInUSD, targetCurrency);

  if (curr.decimals === 0) {
    return `${curr.symbol}${value.toLocaleString()}`;
  }
  return `${curr.symbol}${value.toFixed(curr.decimals)}`;
}

/**
 * Return exchange rate info and timestamp
 */
export function getFxRates() {
  return {
    base: 'USD',
    timestamp: new Date().toISOString(),
    rates: Object.entries(SUPPORTED_CURRENCIES).reduce((acc, [code, meta]) => {
      acc[code] = meta.rate;
      return acc;
    }, {}),
    currencies: SUPPORTED_CURRENCIES,
  };
}
