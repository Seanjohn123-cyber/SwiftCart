const windows = new Map();

export function checkRateLimit(key, { limit, windowMs, now = Date.now() }) {
  if (windows.size > 1000) {
    for (const [entryKey, entry] of windows) {
      if (now >= entry.resetAt) windows.delete(entryKey);
    }
  }
  if (windows.size > 5000) {
    const entriesToRemove = windows.size - 4000;
    let removed = 0;
    for (const entryKey of windows.keys()) {
      windows.delete(entryKey);
      removed += 1;
      if (removed === entriesToRemove) break;
    }
  }

  const current = windows.get(key);
  if (!current || now >= current.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return {
    allowed: true,
    remaining: limit - current.count,
    retryAfter: 0,
  };
}

export function getRequestClientKey(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const trustedProxyAddress = forwardedFor
    ?.split(",")
    .map((address) => address.trim())
    .filter(Boolean)
    .at(-1);
  const address = request.headers.get("x-real-ip") || trustedProxyAddress;
  return address || "unknown";
}

export function rateLimitResponse(result) {
  return new Response(JSON.stringify({ error: "Too many requests. Try again later." }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(result.retryAfter),
      "Cache-Control": "no-store",
    },
  });
}
