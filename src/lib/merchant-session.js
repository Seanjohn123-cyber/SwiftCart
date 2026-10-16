import { createHmac, timingSafeEqual } from "node:crypto";
import { isAuthorizedMerchantImport } from "./merchant-import-auth.js";

export const MERCHANT_SESSION_COOKIE = "swiftcart_merchant_session";
export const MERCHANT_SESSION_SECONDS = 60 * 60;

function signExpiry(secret, expiry) {
  return createHmac("sha256", secret).update(`v1:${expiry}`).digest("hex");
}

export function createMerchantSession(expectedToken, now = Date.now()) {
  if (typeof expectedToken !== "string" || expectedToken.length < 32) {
    throw new Error("Merchant import is not configured.");
  }

  const expiry = Math.floor(now / 1000) + MERCHANT_SESSION_SECONDS;
  return `${expiry}.${signExpiry(expectedToken, expiry)}`;
}

export function isValidMerchantSession(expectedToken, session, now = Date.now()) {
  if (
    typeof expectedToken !== "string" ||
    expectedToken.length < 32 ||
    typeof session !== "string"
  ) {
    return false;
  }

  const match = /^(\d{10})\.([a-f0-9]{64})$/.exec(session);
  if (!match || Number(match[1]) <= Math.floor(now / 1000)) return false;

  const expected = Buffer.from(signExpiry(expectedToken, match[1]), "hex");
  const provided = Buffer.from(match[2], "hex");
  return timingSafeEqual(expected, provided);
}

export function isAuthorizedMerchantRequest(request, expectedToken) {
  return (
    isAuthorizedMerchantImport(
      expectedToken,
      request.headers.get("authorization"),
    ) ||
    isValidMerchantSession(
      expectedToken,
      request.cookies.get(MERCHANT_SESSION_COOKIE)?.value,
    )
  );
}
