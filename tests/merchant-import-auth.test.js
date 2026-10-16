import assert from "node:assert/strict";
import { test } from "node:test";
import { isAuthorizedMerchantImport } from "../src/lib/merchant-import-auth.js";

const TOKEN = "a".repeat(64);

test("authorizes an exact bearer token of sufficient length", () => {
  assert.equal(isAuthorizedMerchantImport(TOKEN, `Bearer ${TOKEN}`), true);
});

test("rejects missing, malformed, short, or incorrect tokens", () => {
  assert.equal(isAuthorizedMerchantImport(TOKEN, null), false);
  assert.equal(isAuthorizedMerchantImport(TOKEN, TOKEN), false);
  assert.equal(isAuthorizedMerchantImport(TOKEN, `Bearer ${"b".repeat(64)}`), false);
  assert.equal(isAuthorizedMerchantImport("short", `Bearer ${TOKEN}`), false);
});

test("rejects bearer values containing whitespace", () => {
  assert.equal(
    isAuthorizedMerchantImport(TOKEN, `Bearer ${TOKEN} extra`),
    false,
  );
});
