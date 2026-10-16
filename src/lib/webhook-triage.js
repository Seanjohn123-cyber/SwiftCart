const ATTENTION_LEVELS = new Set([
  "none",
  "check_order",
  "investigate_payment",
]);

export function createWebhookTriageInput(event) {
  const amount = event.resource?.amount || {};
  const input = {
    event_type: event.event_type,
    resource_type: event.resource_type,
    status: event.status,
  };

  if (/^[A-Z]{3}$/.test(amount.currency_code || "")) {
    input.currency = amount.currency_code;
  }
  if (/^\d{1,9}(?:\.\d{1,2})?$/.test(amount.value || "")) {
    input.amount = amount.value;
  }

  return input;
}

export function parseWebhookTriageArguments(text) {
  const advisory = JSON.parse(text);
  if (
    !advisory ||
    typeof advisory.summary !== "string" ||
    !advisory.summary.trim() ||
    !ATTENTION_LEVELS.has(advisory.attention)
  ) {
    throw new Error("AI webhook triage response is invalid.");
  }

  return {
    summary: advisory.summary.trim().slice(0, 240),
    attention: advisory.attention,
  };
}
