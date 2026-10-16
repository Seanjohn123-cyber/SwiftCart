import { NextResponse } from "next/server";
import {
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_SECONDS,
  getCustomerSessionSubjectFromRequest,
} from "@/lib/customer-auth";
import {
  getCustomerById,
  isCustomerDatabaseConfigured,
} from "@/lib/customer-db";
import {
  checkRateLimit,
  getRequestClientKey,
  rateLimitResponse,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
  maxAge: CUSTOMER_SESSION_SECONDS,
};

export async function GET(request) {
  const rateLimit = checkRateLimit(
    `customer:session:${getRequestClientKey(request)}`,
    { limit: 60, windowMs: 60_000 },
  );
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const customerId = getCustomerSessionSubjectFromRequest(request);
  if (!customerId) {
    return NextResponse.json(
      { authenticated: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isCustomerDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Customer accounts are temporarily unavailable." },
      { status: 503 },
    );
  }

  try {
    const customer = await getCustomerById(customerId);
    return NextResponse.json(
      customer
        ? {
            authenticated: true,
            customer: { fullName: customer.full_name, email: customer.email },
          }
        : { authenticated: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to load customer session:", error);
    return NextResponse.json(
      { error: "Customer accounts are temporarily unavailable." },
      { status: 503 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, "", {
    ...cookieOptions,
    maxAge: 0,
  });
  return response;
}
