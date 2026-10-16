import { NextResponse } from "next/server";
import { isAuthorizedMerchantImport } from "@/lib/merchant-import-auth";
import {
  createMerchantSession,
  isValidMerchantSession,
  MERCHANT_SESSION_COOKIE,
  MERCHANT_SESSION_SECONDS,
} from "@/lib/merchant-session";
import { checkRateLimit, getRequestClientKey, rateLimitResponse } from "@/lib/rate-limit";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/merchant",
  maxAge: MERCHANT_SESSION_SECONDS,
};

export async function POST(request) {
  const rateLimit = checkRateLimit(
    `merchant:login:${getRequestClientKey(request)}`,
    { limit: 5, windowMs: 15 * 60_000 },
  );
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const expectedToken = process.env.MERCHANT_IMPORT_TOKEN;
  if (!expectedToken || expectedToken.length < 32) {
    return NextResponse.json(
      { error: "Merchant import is not configured." },
      { status: 503 },
    );
  }

  if (Number(request.headers.get("content-length") || 0) > 4096) {
    return NextResponse.json(
      { error: "Merchant sign-in request is too large." },
      { status: 413 },
    );
  }
  const requestBody = await request.text();
  if (Buffer.byteLength(requestBody, "utf8") > 4096) {
    return NextResponse.json(
      { error: "Merchant sign-in request is too large." },
      { status: 413 },
    );
  }
  let body;
  try {
    body = JSON.parse(requestBody);
  } catch {
    body = null;
  }
  if (
    typeof body?.token !== "string" ||
    !isAuthorizedMerchantImport(expectedToken, `Bearer ${body.token}`)
  ) {
    return NextResponse.json(
      { error: "Merchant credentials are invalid." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(
    MERCHANT_SESSION_COOKIE,
    createMerchantSession(expectedToken),
    cookieOptions,
  );
  return response;
}

export async function GET(request) {
  const expectedToken = process.env.MERCHANT_IMPORT_TOKEN;
  const authenticated = isValidMerchantSession(
    expectedToken,
    request.cookies.get(MERCHANT_SESSION_COOKIE)?.value,
  );
  return NextResponse.json({ authenticated });
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(MERCHANT_SESSION_COOKIE, "", {
    ...cookieOptions,
    maxAge: 0,
  });
  return response;
}
