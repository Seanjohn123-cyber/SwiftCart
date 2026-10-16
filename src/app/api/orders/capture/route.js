import { NextResponse } from "next/server";
import { capturePayPalOrder, getPayPalOrder } from "@/lib/paypal";
import { getCatalog } from "@/lib/catalog";
import { convertAmount, SUPPORTED_CURRENCIES } from "@/lib/fx";

export async function POST(req) {
  try {
    const { orderId } = await req.json();

    if (typeof orderId !== "string" || !/^[A-Z0-9]+$/i.test(orderId)) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    }

    const order = await getPayPalOrder(orderId);
    if (order.status === "COMPLETED") {
      const existingCapture =
        order.purchase_units?.[0]?.payments?.captures?.[0];
      if (existingCapture?.status === "COMPLETED") {
        return NextResponse.json({
          status: "COMPLETED",
          id: existingCapture.id,
          order_id: order.id,
          purchase_units: order.purchase_units,
          payer: order.payer,
        });
      }
    }

    if (order.status !== "APPROVED" || order.purchase_units?.length !== 1) {
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

    const captureData = await capturePayPalOrder(orderId);

    return NextResponse.json({
      status: captureData.status,
      id: captureData.id,
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
