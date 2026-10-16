import { timingSafeEqual } from "node:crypto";

export function isAuthorizedMerchantImport(expectedToken, authorization) {
  if (
    typeof expectedToken !== "string" ||
    expectedToken.length < 32 ||
    typeof authorization !== "string"
  ) {
    return false;
  }

  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  if (!match) return false;

  const expected = Buffer.from(expectedToken, "utf8");
  const provided = Buffer.from(match[1], "utf8");
  return (
    expected.length === provided.length && timingSafeEqual(expected, provided)
  );
}
