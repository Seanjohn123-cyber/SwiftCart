import { NextResponse } from "next/server";
import { createPayPalOrder } from "@/lib/paypal";
import { getCatalogVariantBySku } from "@/lib/catalog";
import {
  formatMinorUnitAmount,
  multiplyCurrencyAmount,
  SUPPORTED_CURRENCIES,
} from "@/lib/fx";
import { getVariantLabel } from "@/lib/catalog-shapes";
import { checkRateLimit, getRequestClientKey, rateLimitResponse } from "@/lib/rate-limit";
import { getCustomerSessionSubjectFromRequest } from "@/lib/customer-auth";
import {
  isCustomerDatabaseConfigured,
  linkCustomerCheckoutOrder,
  reserveCustomerCheckoutIntent,
} from "@/lib/customer-db";

export async function POST(req) {
  const rateLimit = checkRateLimit(
    `orders:create:${getRequestClientKey(req)}`,
    { limit: 5, windowMs: 60_000 },
  );
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  try {
    const body = await req.json().catch(() => null);
    const sku = body?.sku;
    const quantity = body?.qty;
    const requestId = req.headers.get("idempotency-key");
    if (
      typeof sku !== "string" ||
      !/^[A-Za-z0-9._:-]{1,80}$/.test(sku) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10 ||
      !requestId ||
      !/^[0-9a-f-]{36}$/i.test(requestId)
    ) {
      return NextResponse.json(
        { error: "A valid product, quantity, and idempotency key are required." },
        { status: 400 },
      );
    }

    const product = getCatalogVariantBySku(sku);
    if (
      !product ||
      product.stock < quantity ||
      !Number.isInteger(product.priceMinor) ||
      product.priceMinor <= 0 ||
      !SUPPORTED_CURRENCIES[product.currency]
    ) {
      return NextResponse.json(
        { error: "Product is unavailable for checkout." },
        { status: 400 },
      );
    }

    const currency = product.currency;
    const decimals = SUPPORTED_CURRENCIES[currency].decimals;
    const price = formatMinorUnitAmount(product.priceMinor, currency);
    const totalPrice = multiplyCurrencyAmount(price, quantity, decimals);
    const customerId = getCustomerSessionSubjectFromRequest(req);
    if (customerId) {
      if (!isCustomerDatabaseConfigured()) {
        return NextResponse.json(
          { error: "Customer accounts are temporarily unavailable." },
          { status: 503 },
        );
      }
      const reserved = await reserveCustomerCheckoutIntent({
        idempotencyKey: requestId,
        customerId,
        productId: product.sku,
      });
      if (!reserved) {
        return NextResponse.json(
          { error: "This checkout request does not match the signed-in account." },
          { status: 409 },
        );
      }
    }

    const order = await createPayPalOrder({
      name: getVariantLabel(product.name, product.color, product.size),
      price,
      totalPrice,
      quantity,
      currency,
      sku: product.sku,
      customId: `swiftcart:${product.id}:${product.sku}`,
      requestId,
    });

    if (
      customerId &&
      !(await linkCustomerCheckoutOrder({
        idempotencyKey: requestId,
        customerId,
        productId: product.sku,
        orderId: order.id,
      }))
    ) {
      console.error("PayPal order could not be linked to its customer checkout intent.");
      return NextResponse.json(
        {
          error:
            "The PayPal order was created, but account tracking could not be confirmed. Contact support before retrying checkout.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      id: order.id,
      status: order.status,
      productId: product.id,
      sku: product.sku,
      quantity,
      currency,
      price,
      totalPrice,
    });
  } catch (error) {
    console.error("Error creating PayPal order:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
