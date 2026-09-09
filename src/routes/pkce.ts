import crypto from "node:crypto";

/** RFC 7636 PKCE + opaque state + a service-HMAC signer for the token exchange. */

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

/**
 * Service HMAC over the token exchange. CONTRACT-FIRST: the exact envelope is owned by
 * WP-BE-3 (serviceAuth.middleware) and is reconciled against the live backend at wave
 * close (50-LOCAL-VERIFICATION-LOG.md). Signature is HMAC-SHA256(clientSecret) over
 * `${clientId}.${ts}.${method}.${path}.${sha256(body)}`.
 */
export function signService(
  clientId: string,
  clientSecret: string,
  method: string,
  path: string,
  body: string,
  ts: number,
): Record<string, string> {
  const bodyHash = crypto.createHash("sha256").update(body).digest("hex");
  const mac = crypto
    .createHmac("sha256", clientSecret)
    .update(`${clientId}.${ts}.${method.toUpperCase()}.${path}.${bodyHash}`)
    .digest("hex");
  return {
    "x-service-id": clientId,
    "x-service-timestamp": String(ts),
    "x-service-signature": `sha256=${mac}`,
  };
}

/** Validate a `next` target: relative, no scheme, no backslash, no protocol-relative. */
export function safeNext(next: string | null, fallback = "/"): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.includes("\\") || next.includes("@")) return fallback;
  // reject ASCII control characters (C0 range and DEL)
  if (/[\u0000-\u001f\u007f]/.test(next)) return fallback;
  return next;
}
