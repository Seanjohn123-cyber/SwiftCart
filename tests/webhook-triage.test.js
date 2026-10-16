import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createWebhookTriageInput,
  parseWebhookTriageArguments,
} from "../src/lib/webhook-triage.js";
import { recordWebhookEvent } from "../src/lib/webhook-events.js";

test("sends only allowlisted fields to the AI webhook reviewer", () => {
  const input = createWebhookTriageInput({
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource_type: "capture",
    status: "COMPLETED",
    summary: "private summary",
    resource: {
      id: "private-capture-id",
      payer: { email_address: "buyer@example.com" },
      amount: { currency_code: "USD", value: "19.95" },
    },
  });

  assert.deepEqual(input, {
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource_type: "capture",
    status: "COMPLETED",
    currency: "USD",
    amount: "19.95",
  });
});

test("omits invalid currency and amount values", () => {
  assert.deepEqual(
    createWebhookTriageInput({
      event_type: "UNKNOWN",
      resource_type: "unknown",
      status: "UNKNOWN",
      resource: { amount: { currency_code: "US D", value: "-5" } },
    }),
    {
      event_type: "UNKNOWN",
      resource_type: "unknown",
      status: "UNKNOWN",
    },
  );
});

test("validates AI advisory fields and limits summary length", () => {
  const result = parseWebhookTriageArguments(
    JSON.stringify({
      summary: "  " + "A".repeat(300) + "  ",
      attention: "check_order",
      action: "capture_payment",
    }),
  );

  assert.equal(result.summary.length, 240);
  assert.equal(result.attention, "check_order");
  assert.equal("action" in result, false);
});

test("rejects invalid AI advisory values", () => {
  assert.throws(() =>
    parseWebhookTriageArguments(
      JSON.stringify({ summary: "Approve it", attention: "capture_payment" }),
    ),
  );
});

test("duplicate webhook events do not create a second event", () => {
  const events = [];
  const event = { id: "WH-123", status: "COMPLETED" };

  assert.equal(recordWebhookEvent(events, event), true);
  assert.equal(recordWebhookEvent(events, event), false);
  assert.deepEqual(events, [event]);
});
