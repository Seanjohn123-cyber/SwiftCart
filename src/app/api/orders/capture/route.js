import { NextResponse } from "next/server";
import { capturePayPalOrder, getPayPalOrder } from "@/lib/paypal";
import { getCatalogVariantBySku } from "@/lib/catalog";
import { getVariantLabel } from "@/lib/catalog-shapes";
import {
  formatMinorUnitAmount,
  multiplyCurrencyAmount,
  SUPPORTED_CURRENCIES,
} from "@/lib/fx";
import { getCompletedPayPalCapture } from "@/lib/paypal-capture-validation";
import {
  isCustomerDatabaseConfigured,
  saveCustomerPurchase,
} from "@/lib/customer-db";
import { checkRateLimit, getRequestClientKey, rateLimitResponse } from "@/lib/rate-limit";

async function getPurchaseHistoryStatus(orderId, capture, product, currency) {
  if (!isCustomerDatabaseConfigured()) {
    return {
      purchaseHistorySaved: false,
      purchaseHistoryMessage:
        "Customer accounts are not configured; this purchase was not added to purchase history.",
    };
  }

  try {
    const saved = await saveCustomerPurchase({
      orderId,
      captureId: capture.id,
      product,
      amount: capture.amount.value,
      currency,
    });
    return {
      purchaseHistorySaved: saved,
      purchaseHistoryMessage: saved
        ? "Purchase saved to your SwiftCart account."
        : "This guest purchase was not saved. Sign in before checkout to keep it in your purchase history.",
    };
  } catch (error) {
    console.error(
      "PayPal capture completed, but purchase history could not be saved:",
      error,
    );
    return {
      purchaseHistorySaved: false,
      purchaseHistoryMessage:
        "Payment completed, but purchase history could not be saved. Contact support with your capture ID.",
    };
  }
}

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
    const customId = purchaseUnit.custom_id || "";
    const [namespace, productId, ...skuParts] = customId.split(":");
    const sku = namespace === "swiftcart" ? skuParts.join(":") : "";
    const product = sku ? getCatalogVariantBySku(sku) : null;
    const currency = purchaseUnit.amount?.currency_code;
    if (
      !product ||
      product.id !== productId ||
      !SUPPORTED_CURRENCIES[currency] ||
      product.currency !== currency
    ) {
      return NextResponse.json(
        { error: "Order does not match a SwiftCart catalog variant." },
        { status: 400 },
      );
    }

    const lineItem =
      purchaseUnit.items?.length === 1 ? purchaseUnit.items[0] : null;
    const quantity = Number(lineItem?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return NextResponse.json(
        { error: "Order quantity failed validation." },
        { status: 400 },
      );
    }
    if (order.status === "APPROVED" && product.stock < quantity) {
      return NextResponse.json(
        { error: "This variant no longer has enough stock to capture." },
        { status: 409 },
      );
    }

    const decimals = SUPPORTED_CURRENCIES[currency].decimals;
    const expectedUnitAmount = formatMinorUnitAmount(
      product.priceMinor,
      currency,
    );
    const expectedAmount = multiplyCurrencyAmount(
      expectedUnitAmount,
      quantity,
      decimals,
    );
    const orderAmount = purchaseUnit.amount?.value;
    if (
      orderAmount !== expectedAmount ||
      !lineItem ||
      lineItem.sku !== product.sku ||
      lineItem.name !==
        getVariantLabel(product.name, product.color, product.size) ||
      lineItem.unit_amount?.value !== expectedUnitAmount ||
      lineItem.quantity !== String(quantity)
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
      const historyStatus = await getPurchaseHistoryStatus(
        orderId,
        existingCapture,
        product,
        currency,
      );
      return NextResponse.json({
        status: "COMPLETED",
        id: existingCapture.id,
        order_id: order.id,
        purchase_units: order.purchase_units,
        payer: order.payer,
        ...historyStatus,
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

    const historyStatus = await getPurchaseHistoryStatus(
      orderId,
      completedCapture,
      product,
      currency,
    );
    return NextResponse.json({
      status: completedCapture.status,
      id: completedCapture.id,
      purchase_units: captureData.purchase_units,
      payer: captureData.payer,
      ...historyStatus,
    });
  } catch (error) {
    console.error("Error capturing PayPal order:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
