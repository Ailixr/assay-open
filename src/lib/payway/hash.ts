import { createHmac } from "crypto";

/**
 * Generate PayWay HMAC-SHA512 hash.
 * Base64(HMAC-SHA512(api_key, param1 + param2 + ...))
 * Parameters must be concatenated in the exact order they appear in the form data.
 */
export function generatePayWayHash(apiKey: string, params: Record<string, string>): string {
  const message = Object.values(params).join("");
  const hmac = createHmac("sha512", apiKey);
  hmac.update(message);
  return hmac.digest("base64");
}

/** PayWay timestamp format: YYYYMMDDHHmmss */
export function payWayTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-T:]/g, "")
    .slice(0, 14);
}
