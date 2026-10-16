/**
 * PayPal REST API v2 helper library
 * Handles authentication, order creation, and capture.
 */

const configuredPayPalApiBase =
  process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";
const parsedPayPalApiBase = new URL(configuredPayPalApiBase);
if (
  parsedPayPalApiBase.protocol !== "https:" ||
  !["api-m.sandbox.paypal.com", "api-m.paypal.com"].includes(
    parsedPayPalApiBase.hostname,
  )
) {
  throw new Error("PAYPAL_API_BASE must be an official HTTPS PayPal API host.");
}

export const PAYPAL_API_BASE = parsedPayPalApiBase.origin;

export function getAppBaseUrl() {
  const configuredUrl =
    process.env.APP_BASE_URL ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "");
  if (!configuredUrl) {
    throw new Error("APP_BASE_URL must be configured for production checkout.");
  }

  const url = new URL(configuredUrl);
  const isLocalDevelopment =
    process.env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !isLocalDevelopment) {
    throw new Error("APP_BASE_URL must use HTTPS.");
  }

  return url.origin;
}

/**
 * Generate an OAuth 2.0 access token using client credentials
 */
export async function getPayPalAccessToken() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "PayPal Client ID or Secret missing in environment variables.",
    );
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Failed to fetch PayPal access token: ${errorData}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Create a PayPal Order v2
 * @param {Object} itemDetails - { name, price, currency, quantity, sku }
 */
export async function createPayPalOrder({
  name = "SwiftCart Product",
  price = "49.99",
  currency = "USD",
  sku = "SKU-001",
  customId,
  requestId,
} = {}) {
  const accessToken = await getPayPalAccessToken();
  const appBaseUrl = getAppBaseUrl();

  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: `REF-${Date.now()}`,
        ...(customId ? { custom_id: customId } : {}),
        description: `Order via SwiftCart Agentic Checkout: ${name}`,
        amount: {
          currency_code: currency,
          value: price,
          breakdown: {
            item_total: {
              currency_code: currency,
              value: price,
            },
          },
        },
        items: [
          {
            name: name,
            unit_amount: {
              currency_code: currency,
              value: price,
            },
            quantity: "1",
            sku: sku,
            category: "PHYSICAL_GOODS",
          },
        ],
      },
    ],
    application_context: {
      brand_name: "SwiftCart Agent",
      landing_page: "NO_PREFERENCE",
      user_action: "PAY_NOW",
      return_url: `${appBaseUrl}/?checkout=success`,
      cancel_url: `${appBaseUrl}/?checkout=cancelled`,
    },
  };

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
    },
    body: JSON.stringify(payload),
  });

  const orderData = await response.json();
  if (!response.ok) {
    throw new Error(
      `Failed to create PayPal order: ${JSON.stringify(orderData)}`,
    );
  }

  return orderData;
}

export async function getPayPalOrder(orderId) {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const orderData = await response.json();
  if (!response.ok) {
    throw new Error(
      `Failed to fetch PayPal order: ${JSON.stringify(orderData)}`,
    );
  }

  return orderData;
}

/**
 * Capture a PayPal Order v2 once approved by buyer
 * @param {string} orderId - PayPal Order ID
 */
export async function capturePayPalOrder(orderId) {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        "PayPal-Request-Id": `swiftcart-capture-${orderId}`,
      },
    },
  );

  const captureData = await response.json();
  if (!response.ok) {
    throw new Error(
      `Failed to capture PayPal order: ${JSON.stringify(captureData)}`,
    );
  }

  return captureData;
}
