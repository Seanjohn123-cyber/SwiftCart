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
