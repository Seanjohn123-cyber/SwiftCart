import { NextResponse } from 'next/server';
import { createPayPalOrder } from '@/lib/paypal';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, price, sku, currency } = body;

    const order = await createPayPalOrder({
      name: name || 'Nike Air Zoom Pegasus (AI Match)',
      price: price || '74.99',
      currency: currency || 'USD',
      sku: sku || 'NIKE-PEGASUS-10',
    });

    return NextResponse.json({ id: order.id, status: order.status });
  } catch (error) {
    console.error('Error creating PayPal order:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
