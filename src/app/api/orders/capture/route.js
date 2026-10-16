import { NextResponse } from "next/server";
import { capturePayPalOrder, getPayPalOrder } from "@/lib/paypal";
import { getCatalog } from "@/lib/catalog";
import { convertAmount, SUPPORTED_CURRENCIES } from "@/lib/fx";
import { getCompletedPayPalCapture } from "@/lib/paypal-capture-validation";
import { checkRateLimit, getRequestClientKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req) {
  const rateLimit = checkRateLimit(
    `orders:capture:${getRequestClientKey(req)}`,
    { limit: 10, windowMs: 60_000 },
  );
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  try {
    const body = await req.json().catch(() => null);
    const orderId = body?.orderId;

    if (typeof orderId !== "string" || !/^[A-Z0-9]+$/i.test(orderId)) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    }

    const order = await getPayPalOrder(orderId);
    if (
      !["APPROVED", "COMPLETED"].includes(order.status) ||
      order.purchase_units?.length !== 1
    ) {
      return NextResponse.json(
        { error: "Order must be approved before capture." },
        { status: 409 },
      );
    }

    const purchaseUnit = order.purchase_units[0];
    const productId = purchaseUnit.custom_id?.startsWith("swiftcart:")
      ? purchaseUnit.custom_id.slice("swiftcart:".length)
      : null;
    const product =
      productId && getCatalog().find((item) => item.id === productId);
    const currency = purchaseUnit.amount?.currency_code;
    if (!product || !product.inStock || !SUPPORTED_CURRENCIES[currency]) {
      return NextResponse.json(
        { error: "Order does not match an available SwiftCart product." },
        { status: 400 },
      );
    }

    const decimals = SUPPORTED_CURRENCIES[currency].decimals;
    const expectedAmount = convertAmount(product.price, currency).toFixed(
      decimals,
    );
    const orderAmount = purchaseUnit.amount?.value;
    const lineItem =
      purchaseUnit.items?.length === 1 ? purchaseUnit.items[0] : null;
    if (
      orderAmount !== expectedAmount ||
      !lineItem ||
      lineItem.sku !== product.sku ||
      lineItem.name !== product.name ||
      lineItem.unit_amount?.value !== expectedAmount ||
      lineItem.quantity !== "1"
    ) {
      return NextResponse.json(
        { error: "Order amount or items failed validation." },
        { status: 400 },
      );
    }

    if (order.status === "COMPLETED") {
      const existingCapture = getCompletedPayPalCapture(
        order,
        expectedAmount,
        currency,
      );
      if (!existingCapture) {
        return NextResponse.json(
          { error: "Completed PayPal order failed capture verification." },
          { status: 502 },
        );
      }
      return NextResponse.json({
        status: "COMPLETED",
        id: existingCapture.id,
        order_id: order.id,
        purchase_units: order.purchase_units,
        payer: order.payer,
      });
    }

    const captureData = await capturePayPalOrder(orderId);
    const completedCapture = getCompletedPayPalCapture(
      captureData,
      expectedAmount,
      currency,
    );
    if (!completedCapture) {
      console.error("PayPal capture response failed status or amount verification.");
      return NextResponse.json(
        { error: "PayPal did not confirm the expected completed capture." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      status: completedCapture.status,
      id: completedCapture.id,
      purchase_units: captureData.purchase_units,
      payer: captureData.payer,
    });
  } catch (error) {
    console.error("Error capturing PayPal order:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
