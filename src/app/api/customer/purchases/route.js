import { NextResponse } from "next/server";
import { getCustomerSessionSubjectFromRequest } from "@/lib/customer-auth";
import {
  isCustomerDatabaseConfigured,
  listCustomerPurchases,
} from "@/lib/customer-db";
import {
  checkRateLimit,
  getRequestClientKey,
  rateLimitResponse,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const rateLimit = checkRateLimit(
    `customer:purchases:${getRequestClientKey(request)}`,
    { limit: 30, windowMs: 60_000 },
  );
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const customerId = getCustomerSessionSubjectFromRequest(request);
  if (!customerId) {
    return NextResponse.json(
      { error: "Sign in to view purchase history." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!isCustomerDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Customer accounts are temporarily unavailable." },
      { status: 503 },
    );
  }

  try {
    const purchases = await listCustomerPurchases(customerId);
    return NextResponse.json(
      { purchases },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to load customer purchase history:", error);
    return NextResponse.json(
      { error: "Purchase history is temporarily unavailable." },
      { status: 503 },
    );
  }
}
