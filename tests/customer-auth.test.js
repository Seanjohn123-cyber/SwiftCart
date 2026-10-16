import test from "node:test";
import assert from "node:assert/strict";
import {
  createCustomerSession,
  getCustomerSessionSubject,
  hashCustomerPassword,
  isValidCustomerEmail,
  normalizeCustomerEmail,
  verifyCustomerPassword,
} from "../src/lib/customer-auth.js";

const customerId = "45d1f8b5-0891-4d63-950b-54f56f7d780c";
const secret = "a-long-test-session-secret-value-0123456789";

test("customer sessions are signed, scoped to a customer, and expire", () => {
  const now = Date.UTC(2026, 0, 1);
  const session = createCustomerSession(customerId, secret, now);

  assert.equal(getCustomerSessionSubject(session, secret, now), customerId);
  assert.equal(getCustomerSessionSubject(session, "wrong-secret", now), null);
  assert.equal(
    getCustomerSessionSubject(session, secret, now + 31 * 24 * 60 * 60 * 1000),
    null,
  );
  assert.equal(
    getCustomerSessionSubject(`${session}tampered`, secret, now),
    null,
  );
});

test("customer session creation rejects a weak signing secret", () => {
  assert.throws(
    () => createCustomerSession(customerId, "too-short"),
    /at least 32 bytes/,
  );
});

test("customer passwords verify only against the matching password and salt", async () => {
  const { salt, hash } = await hashCustomerPassword("correct horse battery staple");

  assert.equal(
    await verifyCustomerPassword("correct horse battery staple", salt, hash),
    true,
  );
  assert.equal(
    await verifyCustomerPassword("incorrect password", salt, hash),
    false,
  );
  assert.equal(await verifyCustomerPassword("bad", "invalid", hash), false);
});

test("customer emails are normalized before validation", () => {
  assert.equal(normalizeCustomerEmail("  Buyer@Example.com "), "buyer@example.com");
  assert.equal(isValidCustomerEmail("buyer@example.com"), true);
  assert.equal(isValidCustomerEmail("not-an-email"), false);
});
