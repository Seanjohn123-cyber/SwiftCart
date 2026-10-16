import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const paypalConfigured = Boolean(
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_SECRET,
  );
  const openAiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const webhookConfigured = Boolean(process.env.PAYPAL_WEBHOOK_ID);
  const merchantImportConfigured = Boolean(
    process.env.MERCHANT_IMPORT_TOKEN &&
      process.env.MERCHANT_IMPORT_TOKEN.length >= 32,
  );

  const results = {
    timestamp: new Date().toISOString(),
    services: [
      {
        id: "paypal_oauth",
        name: "PayPal Sandbox OAuth 2.0 Service",
        endpoint: "https://api-m.sandbox.paypal.com/v1/oauth2/token",
        status: paypalConfigured ? "configured" : "degraded",
        latency: "not probed",
        details: paypalConfigured
          ? "Credentials are configured. This public health check does not request or expose access tokens."
          : "PayPal credentials are not configured.",
      },
      {
        id: "paypal_orders_v2",
        name: "PayPal Orders v2 Checkout Engine",
        endpoint: "https://api-m.sandbox.paypal.com/v2/checkout/orders",
        status: paypalConfigured ? "configured" : "degraded",
        latency: "checked during checkout",
        details: paypalConfigured
          ? "Checkout connectivity is checked when an order is created or captured."
          : "Configure PayPal credentials to enable checkout.",
      },
      {
        id: "catalog_db",
        name: "Multi-Merchant Product Catalog",
        endpoint: "local://catalog.json",
        status: "operational",
        latency: "local",
        details: `${getCatalog().length} items available in the local catalog.`,
      },
      {
        id: "agent_orchestrator",
        name: "SwiftCart Agentic Decision Engine",
        endpoint: "/api/agent",
        status: openAiConfigured ? "configured" : "degraded",
        latency: "request-based",
        details: openAiConfigured
          ? `OpenAI tool planner configured (${process.env.OPENAI_MODEL || "gpt-4o-mini"}); catalog prices are validated server-side.`
          : "Local catalog rules are active; configure OPENAI_API_KEY for model-based tool calling.",
      },
      {
        id: "paypal_webhooks",
        name: "PayPal Asynchronous Webhook Listener",
        endpoint: "/api/webhooks/paypal",
        status: webhookConfigured ? "configured" : "degraded",
        latency: "request-based",
        details: webhookConfigured
          ? "Signature verification is configured. Event history is held in process memory for this demo."
          : "PayPal webhook signature verification is not configured.",
      },
      {
        id: "merchant_import",
        name: "Protected Merchant Inventory Import",
        endpoint: "/api/merchant/import",
        status: merchantImportConfigured ? "configured" : "degraded",
        latency: "request-based",
        details: merchantImportConfigured
          ? "Inventory writes require the configured bearer token."
          : "Set a merchant import token of at least 32 characters to enable inventory writes.",
      },
      {
        id: "fx_engine",
        name: "Multi-Currency & FX Engine",
        endpoint: "/api/fx",
        status: "operational",
        latency: "local",
        details: "6 PayPal settlement currencies active: USD, EUR, GBP, CAD, AUD, JPY.",
      },
    ],
  };

  return NextResponse.json(results, {
    headers: { "Cache-Control": "no-store" },
  });
}
