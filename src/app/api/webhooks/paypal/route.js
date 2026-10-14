import { NextResponse } from "next/server";
import { getPayPalAccessToken, PAYPAL_API_BASE } from "@/lib/paypal";

let recentEvents = [];

export async function POST(req) {
  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json(
      { error: "Invalid webhook payload." },
      { status: 400 },
    );
  }

  const isSimulation =
    process.env.NODE_ENV !== "production" &&
    req.headers.get("x-swiftcart-simulation") === "true";

  if (!isSimulation) {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      return NextResponse.json(
        { error: "PayPal webhook verification is not configured." },
        { status: 503 },
      );
    }

    const verificationData = {
      auth_algo: req.headers.get("paypal-auth-algo"),
      cert_url: req.headers.get("paypal-cert-url"),
      transmission_id: req.headers.get("paypal-transmission-id"),
      transmission_sig: req.headers.get("paypal-transmission-sig"),
      transmission_time: req.headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: payload,
    };
    const missingHeader = [
      "auth_algo",
      "cert_url",
      "transmission_id",
      "transmission_sig",
      "transmission_time",
    ].some((name) => !verificationData[name]);

    if (missingHeader) {
      return NextResponse.json(
        { error: "Required PayPal signature headers are missing." },
        { status: 400 },
      );
    }

    try {
      const accessToken = await getPayPalAccessToken();
      const response = await fetch(
        `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(verificationData),
        },
      );

      const verification = await response.json();
      if (!response.ok) {
        console.error(
          "PayPal webhook verification request failed:",
          verification,
        );
        return NextResponse.json(
          { error: "PayPal could not verify the webhook." },
          { status: 502 },
        );
      }
      if (verification.verification_status !== "SUCCESS") {
        return NextResponse.json(
          { error: "PayPal webhook signature is invalid." },
          { status: 401 },
        );
      }
    } catch (error) {
      console.error("PayPal webhook verification failed:", error);
      return NextResponse.json(
        { error: "PayPal webhook verification failed." },
        { status: 502 },
      );
    }
  }

  if (!payload.id || typeof payload.id !== "string") {
    return NextResponse.json(
      { error: "Webhook event ID is required." },
      { status: 400 },
    );
  }

  const duplicate = recentEvents.find((event) => event.id === payload.id);
  if (duplicate) {
    return NextResponse.json({
      received: true,
      duplicate: true,
      eventId: duplicate.id,
    });
  }

  try {
    const newEvent = {
      id: payload.id,
      event_type: payload.event_type || "UNKNOWN",
      resource_type:
        payload.resource_type || payload.resource?.resource_type || "unknown",
      summary:
        payload.summary || `${payload.event_type || "PayPal event"} received`,
      create_time: payload.create_time || new Date().toISOString(),
      status: isSimulation
        ? payload.status || "SIMULATED"
        : payload.resource?.status || "VERIFIED",
      source: isSimulation ? "SIMULATOR" : "PAYPAL_VERIFIED",
      resource: payload.resource || {},
    };

    recentEvents.unshift(newEvent);
    if (recentEvents.length > 50) recentEvents.pop();

    return NextResponse.json({
      received: true,
      eventId: newEvent.id,
      timestamp: newEvent.create_time,
    });
  } catch (error) {
    console.error("Failed to record PayPal webhook:", error);
    return NextResponse.json(
      { error: "Failed to record webhook event." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    totalEvents: recentEvents.length,
    events: recentEvents,
  });
}
