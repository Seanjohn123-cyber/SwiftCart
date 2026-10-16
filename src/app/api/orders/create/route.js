import { NextResponse } from "next/server";
import { createPayPalOrder } from "@/lib/paypal";
import { getCatalog } from "@/lib/catalog";
import { convertAmount, SUPPORTED_CURRENCIES } from "@/lib/fx";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    const productId = body?.productId;
    const currency = body?.currency || "USD";
    if (typeof productId !== "string" || !SUPPORTED_CURRENCIES[currency]) {
      return NextResponse.json(
        { error: "A valid product and currency are required." },
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
