/**
 * PayPal REST API v2 helper library
 * Handles authentication, order creation, and capture.
 */

export const PAYPAL_API_BASE =
  process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";

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
} = {}) {
  const accessToken = await getPayPalAccessToken();

  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: `REF-${Date.now()}`,
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
      return_url: "http://localhost:3000/order/success",
      cancel_url: "http://localhost:3000/order/cancel",
    },
  };

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
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
