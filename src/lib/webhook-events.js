import { randomUUID } from "node:crypto";

export function recordWebhookEvent(events, event, limit = 50) {
  if (events.some((existing) => existing.id === event.id)) {
    return false;
  }

  events.unshift(event);
  if (events.length > limit) {
    events.length = limit;
  }
  return true;
}

export function createRejectedWebhookEvent({
  eventId,
  eventType,
  reason,
  now = new Date().toISOString(),
}) {
  const safeEventType =
    typeof eventType === "string" && /^[A-Z0-9._-]{1,100}$/i.test(eventType)
      ? eventType
      : "UNKNOWN";
  const safeEventId =
    typeof eventId === "string" ? eventId.slice(0, 100) : undefined;

  return {
    id: `REJECTED-${randomUUID()}`,
    ...(safeEventId ? { source_event_id: safeEventId } : {}),
    event_type: safeEventType,
    resource_type: "unknown",
    summary: `Rejected webhook: ${reason}`,
    create_time: now,
    status: "REJECTED",
    source: "PAYPAL_REJECTED",
    resource: {},
  };
}
