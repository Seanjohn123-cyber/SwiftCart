import { NextResponse } from "next/server";
import { createPayPalOrder } from "@/lib/paypal";
import { getCatalog } from "@/lib/catalog";
import { convertAmount, SUPPORTED_CURRENCIES } from "@/lib/fx";
import { checkRateLimit, getRequestClientKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req) {
  const rateLimit = checkRateLimit(
    `orders:create:${getRequestClientKey(req)}`,
    { limit: 5, windowMs: 60_000 },
  );
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  try {
    const body = await req.json().catch(() => null);
    const productId = body?.productId;
    const currency = body?.currency || "USD";
    const requestId = req.headers.get("idempotency-key");
    if (
      typeof productId !== "string" ||
      !SUPPORTED_CURRENCIES[currency] ||
      !requestId ||
      !/^[0-9a-f-]{36}$/i.test(requestId)
    ) {
      return NextResponse.json(
        { error: "A valid product, currency, and idempotency key are required." },
        { status: 400 },
      );
    }

    const product = getCatalog().find((item) => item.id === productId);
    if (
      !product ||
      !product.inStock ||
      !Number.isFinite(Number(product.price)) ||
      Number(product.price) <= 0
    ) {
      return NextResponse.json(
        { error: "Product is unavailable for checkout." },
        { status: 400 },
      );
    }

    const decimals = SUPPORTED_CURRENCIES[currency].decimals;
    const price = convertAmount(product.price, currency).toFixed(decimals);

    const order = await createPayPalOrder({
      name: product.name,
      price,
      currency,
      sku: product.sku,
      customId: `swiftcart:${product.id}`,
      requestId,
    });

    return NextResponse.json({
      id: order.id,
      status: order.status,
      productId,
      currency,
      price,
    });
  } catch (error) {
    console.error("Error creating PayPal order:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
