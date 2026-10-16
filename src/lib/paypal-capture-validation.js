export function getCompletedPayPalCapture(
  order,
  expectedAmount,
  expectedCurrency,
) {
  if (order?.status !== "COMPLETED" || order.purchase_units?.length !== 1) {
    return null;
  }

  const captures = order.purchase_units[0]?.payments?.captures;
  if (!Array.isArray(captures) || captures.length !== 1) {
    return null;
  }

  const capture = captures[0];
  if (
    capture?.status !== "COMPLETED" ||
    capture.amount?.value !== expectedAmount ||
    capture.amount?.currency_code !== expectedCurrency
  ) {
    return null;
  }

  return capture;
}
