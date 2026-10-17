import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMinorUnitAmount,
  multiplyCurrencyAmount,
} from "../src/lib/fx.js";

test("formats integer minor units at the currency boundary", () => {
  assert.equal(formatMinorUnitAmount(5800, "USD"), "58.00");
  assert.equal(formatMinorUnitAmount(5800, "JPY"), "5800");
  assert.throws(() => formatMinorUnitAmount(58.5, "USD"));
  assert.throws(() => formatMinorUnitAmount(5800, "BAD"));
});

test("currency multiplication uses integer minor units", () => {
  assert.equal(multiplyCurrencyAmount("58.00", 3, 2), "174.00");
  assert.equal(multiplyCurrencyAmount("153", 2, 0), "306");
});

test("currency multiplication rejects invalid amounts and quantities", () => {
  assert.throws(() => multiplyCurrencyAmount("0.01", 0, 2));
  assert.throws(() => multiplyCurrencyAmount("1.00", 1.5, 2));
  assert.throws(() => multiplyCurrencyAmount("not-money", 1, 2));
});
