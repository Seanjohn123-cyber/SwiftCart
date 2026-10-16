import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

export const CUSTOMER_SESSION_COOKIE = "swiftcart_customer_session";
export const CUSTOMER_SESSION_SECONDS = 60 * 60 * 24 * 30;

const scrypt = promisify(scryptCallback);
const SESSION_SECRET_MIN_BYTES = 32;

function getSessionSecret(secret = process.env.CUSTOMER_SESSION_SECRET) {
  if (
    typeof secret !== "string" ||
    Buffer.byteLength(secret, "utf8") < SESSION_SECRET_MIN_BYTES
  ) {
    throw new Error(
      "Customer accounts require a CUSTOMER_SESSION_SECRET of at least 32 bytes.",
    );
  }
  return secret;
}

function signPayload(payload, secret) {
  return createHmac("sha256", secret).update(`v1.${payload}`).digest("hex");
}

export function createCustomerSession(
  customerId,
  secret = process.env.CUSTOMER_SESSION_SECRET,
  now = Date.now(),
) {
  const signingSecret = getSessionSecret(secret);
  const payload = Buffer.from(
    JSON.stringify({
      sub: customerId,
      exp: Math.floor(now / 1000) + CUSTOMER_SESSION_SECONDS,
    }),
  ).toString("base64url");
  return `${payload}.${signPayload(payload, signingSecret)}`;
}

export function getCustomerSessionSubject(
  session,
  secret = process.env.CUSTOMER_SESSION_SECRET,
  now = Date.now(),
) {
  if (typeof session !== "string") return null;

  let signingSecret;
  try {
    signingSecret = getSessionSecret(secret);
  } catch {
    return null;
  }

  const [payload, signature, extra] = session.split(".");
  if (
    !payload ||
    !signature ||
    extra !== undefined ||
    !/^[a-f0-9]{64}$/i.test(signature)
  ) {
    return null;
  }

  const expected = Buffer.from(signPayload(payload, signingSecret), "hex");
  const provided = Buffer.from(signature, "hex");
  if (!timingSafeEqual(expected, provided)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      typeof decoded.sub !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        decoded.sub,
      ) ||
      !Number.isInteger(decoded.exp) ||
      decoded.exp <= Math.floor(now / 1000)
    ) {
      return null;
    }
    return decoded.sub;
  } catch {
    return null;
  }
}

export function getCustomerSessionSubjectFromRequest(request) {
  return getCustomerSessionSubject(
    request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value,
  );
}

export function normalizeCustomerEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isValidCustomerEmail(email) {
  return (
    typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

export async function hashCustomerPassword(password, salt = randomBytes(16)) {
  const saltBuffer = Buffer.isBuffer(salt) ? salt : Buffer.from(salt, "hex");
  const hash = await scrypt(password, saltBuffer, 64, {
    N: 32_768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return {
    salt: saltBuffer.toString("hex"),
    hash: Buffer.from(hash).toString("hex"),
  };
}

export async function verifyCustomerPassword(password, salt, expectedHash) {
  if (
    typeof salt !== "string" ||
    !/^[a-f0-9]{32}$/i.test(salt) ||
    typeof expectedHash !== "string" ||
    !/^[a-f0-9]{128}$/i.test(expectedHash)
  ) {
    return false;
  }

  const { hash } = await hashCustomerPassword(password, salt);
  return timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(expectedHash, "hex"),
  );
}
