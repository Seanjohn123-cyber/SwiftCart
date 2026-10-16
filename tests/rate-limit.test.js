import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import {
  checkRateLimit,
  getRequestClientKey,
} from "../src/lib/rate-limit.js";
import { getAppBaseUrl } from "../src/lib/paypal.js";

test("rate limit allows configured requests and blocks the next one", () => {
  const key = `test:${randomUUID()}`;
  assert.equal(
    checkRateLimit(key, { limit: 2, windowMs: 1000, now: 1000 }).allowed,
    true,
  );
  assert.equal(
    checkRateLimit(key, { limit: 2, windowMs: 1000, now: 1100 }).allowed,
    true,
  );
  const blocked = checkRateLimit(key, {
    limit: 2,
    windowMs: 1000,
    now: 1200,
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfter, 1);
});

test("rate limit starts a new window after expiry", () => {
  const key = `test:${randomUUID()}`;
  checkRateLimit(key, { limit: 1, windowMs: 1000, now: 1000 });
  assert.equal(
    checkRateLimit(key, { limit: 1, windowMs: 1000, now: 2000 }).allowed,
    true,
  );
});

test("client key uses the last forwarded address added by the proxy", () => {
  const request = new Request("https://example.test", {
    headers: { "x-forwarded-for": "forged, proxy, actual-client" },
  });
  assert.equal(getRequestClientKey(request), "actual-client");
});

test("production checkout requires an HTTPS public origin", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousAppBaseUrl = process.env.APP_BASE_URL;
  try {
    process.env.NODE_ENV = "production";
    process.env.APP_BASE_URL = "https://shop.example";
    assert.equal(getAppBaseUrl(), "https://shop.example");

    process.env.APP_BASE_URL = "http://shop.example";
    assert.throws(() => getAppBaseUrl(), /must use HTTPS/);

    delete process.env.APP_BASE_URL;
    assert.throws(() => getAppBaseUrl(), /must be configured/);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousAppBaseUrl === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = previousAppBaseUrl;
  }
});
