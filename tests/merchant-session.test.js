import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createMerchantSession,
  isValidMerchantSession,
} from "../src/lib/merchant-session.js";

const TOKEN = "a".repeat(64);

test("merchant session is valid only for its configured secret and lifetime", () => {
  const now = 1_800_000_000_000;
  const session = createMerchantSession(TOKEN, now);
  assert.equal(isValidMerchantSession(TOKEN, session, now), true);
  assert.equal(isValidMerchantSession("b".repeat(64), session, now), false);
  assert.equal(isValidMerchantSession(TOKEN, session, now + 3_600_000), false);
});

test("merchant session rejects malformed input and short secrets", () => {
  assert.equal(isValidMerchantSession(TOKEN, "invalid"), false);
  assert.equal(isValidMerchantSession("short", "1800003600.abc"), false);
  assert.throws(() => createMerchantSession("short"));
});
