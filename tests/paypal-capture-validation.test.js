import assert from "node:assert/strict";
import { test } from "node:test";
import { getCompletedPayPalCapture } from "../src/lib/paypal-capture-validation.js";

function completedOrder(overrides = {}) {
  return {
    status: "COMPLETED",
    purchase_units: [
      {
        payments: {
          captures: [
            {
              id: "CAPTURE-1",
              status: "COMPLETED",
              amount: { value: "19.95", currency_code: "USD" },
            },
          ],
        },
      },
    ],
    ...overrides,
  };
}

test("accepts only a completed capture with the expected amount and currency", () => {
  assert.equal(
    getCompletedPayPalCapture(completedOrder(), "19.95", "USD").id,
    "CAPTURE-1",
  );
  assert.equal(
    getCompletedPayPalCapture(completedOrder(), "20.00", "USD"),
    null,
  );
  assert.equal(
    getCompletedPayPalCapture(completedOrder(), "19.95", "EUR"),
    null,
  );
  assert.equal(
    getCompletedPayPalCapture(completedOrder({ status: "PENDING" }), "19.95", "USD"),
    null,
  );
});
