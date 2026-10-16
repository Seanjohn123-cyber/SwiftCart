import { NextResponse } from "next/server";
import {
  createCustomerSession,
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_SECONDS,
  hashCustomerPassword,
  isValidCustomerEmail,
  normalizeCustomerEmail,
  verifyCustomerPassword,
} from "@/lib/customer-auth";
import {
  createCustomer,
  getCustomerByEmail,
  isCustomerDatabaseConfigured,
} from "@/lib/customer-db";
import {
  checkRateLimit,
  getRequestClientKey,
  rateLimitResponse,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
  maxAge: CUSTOMER_SESSION_SECONDS,
};

const DUMMY_PASSWORD_SALT = "f123456789abcdef0123456789abcde";
const DUMMY_PASSWORD_HASH = "0".repeat(128);

function accountsUnavailable() {
  return NextResponse.json(
    {
      error:
        "Customer accounts are not configured. Set DATABASE_URL and CUSTOMER_SESSION_SECRET.",
    },
    { status: 503 },
  );
}

export async function POST(request) {
  const clientKey = getRequestClientKey(request);
  const rateLimit = checkRateLimit(
    `customer:auth:${clientKey}`,
    { limit: 8, windowMs: 15 * 60_000 },
  );
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  if (!isCustomerDatabaseConfigured()) return accountsUnavailable();
  if (
    typeof process.env.CUSTOMER_SESSION_SECRET !== "string" ||
    Buffer.byteLength(process.env.CUSTOMER_SESSION_SECRET, "utf8") < 32
  ) {
    return accountsUnavailable();
  }

  if (Number(request.headers.get("content-length") || 0) > 4096) {
    return NextResponse.json(
      { error: "Account request is too large." },
      { status: 413 },
    );
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 4096) {
    return NextResponse.json(
      { error: "Account request is too large." },
      { status: 413 },
    );
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = null;
  }

  const mode = body?.mode;
  const email = normalizeCustomerEmail(body?.email);
  const password = body?.password;
  if (
    !["register", "login"].includes(mode) ||
    !isValidCustomerEmail(email) ||
    typeof password !== "string" ||
    password.length > 128 ||
    (mode === "register" && password.length < 12)
  ) {
    return NextResponse.json(
      {
        error:
          mode === "register"
            ? "Enter a valid email and a password of at least 12 characters."
            : "Enter a valid email and password.",
      },
      { status: 400 },
    );
  }

  const emailRateLimit = checkRateLimit(
    `customer:auth-email:${mode}:${email}`,
    {
      limit: mode === "register" ? 4 : 8,
      windowMs: 15 * 60_000,
    },
  );
  if (!emailRateLimit.allowed) return rateLimitResponse(emailRateLimit);

  try {
    let customer;
    if (mode === "register") {
      const { salt, hash } = await hashCustomerPassword(password);
      try {
        customer = await createCustomer({
          email,
          passwordSalt: salt,
          passwordHash: hash,
        });
      } catch (error) {
        if (error.code === "23505") {
          return NextResponse.json(
            { error: "An account with this email already exists. Sign in instead." },
            { status: 409 },
          );
        }
        throw error;
      }
    } else {
      const existingCustomer = await getCustomerByEmail(email);
      const passwordValid = await verifyCustomerPassword(
        password,
        existingCustomer?.password_salt || DUMMY_PASSWORD_SALT,
        existingCustomer?.password_hash || DUMMY_PASSWORD_HASH,
      );
      if (!existingCustomer || !passwordValid) {
        return NextResponse.json(
          { error: "Email or password is incorrect." },
          { status: 401 },
        );
      }
      customer = {
        id: existingCustomer.id,
        email: existingCustomer.email,
      };
    }

    const response = NextResponse.json({
      authenticated: true,
      customer: { email: customer.email },
    });
    response.cookies.set(
      CUSTOMER_SESSION_COOKIE,
      createCustomerSession(customer.id),
      cookieOptions,
    );
    return response;
  } catch (error) {
    console.error("Customer account authentication failed:", error);
    return NextResponse.json(
      { error: "Customer accounts are temporarily unavailable. Try again shortly." },
      { status: 503 },
    );
  }
}
