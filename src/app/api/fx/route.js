import { NextResponse } from 'next/server';
import { getFxRates, convertAmount, formatPrice, SUPPORTED_CURRENCIES } from '@/lib/fx';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const amount = searchParams.get('amount');
  const to = searchParams.get('to');

  if (amount && to) {
    const converted = convertAmount(amount, to);
    const formatted = formatPrice(amount, to);
    return NextResponse.json({
      baseAmountUSD: parseFloat(amount),
      targetCurrency: to,
      convertedAmount: converted,
      formattedPrice: formatted,
      rate: SUPPORTED_CURRENCIES[to]?.rate || 1.0,
      timestamp: new Date().toISOString()
    });
  }

  return NextResponse.json(getFxRates());
}
