import crypto from "node:crypto";

/** RFC 7636 PKCE + opaque state + the X-Carisma-* service-auth signer for the token exchange. */

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

/**
 * Deterministic JSON: object keys sorted at every level. This MUST byte-match the
 * backend verifier (identity.serviceAuth.stableStringify), because both sides hash
 * `stableStringify(parsedBody)`, not the raw request bytes — express.json() has
 * already consumed the raw body before requireServiceCaller runs, so the verifier
 * re-serialises the PARSED body and the signer must hash the same canonical form.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

const sha256Hex = (s: string): string => crypto.createHash("sha256").update(s, "utf8").digest("hex");

export interface ServiceSignOptions {
  /** The relying-party id; sent as X-Carisma-Service and bound into the signing string. */
  clientId: string;
  /**
   * The per-client service key, HEX. This is IDENTITY_CLIENT_SECRET on the site, and equals
   *   HMAC-SHA256(ACCOUNT_SERVICE_ROOT, "carisma:service:<clientId>:v<keyVersion>")
   * so the site holds ONLY its own derived key, never the shared ACCOUNT_SERVICE_ROOT.
   * The backend derives the identical key (identity.serviceAuth.deriveServiceKey) and
   * HMACs the signing string with it.
   */
  serviceKeyHex: string;
  keyVersion: number;
  /** HTTP method, bound into the signing string (the backend uses req.method). */
  method: string;
  /**
   * The path the backend sees as req.originalUrl — e.g. /api/v1/auth/token, WITH the
   * /api/v1 mount that CARISMASOFT_API_URL carries, plus any ?query. Never the bare
   * /auth/token: the verifier signs originalUrl and a shorter path fails the HMAC.
   */
  pathWithQuery: string;
  /** The exact request body string being sent; parsed and canonicalised for the body hash. */
  body: string;
  /** The client IP; sent as X-Carisma-Client-IP and bound into the signing string. */
  clientIp: string;
  /** Injection seams for tests. Production uses a fresh unix-second ts + 16-byte nonce per call. */
  ts?: number;
  nonce?: string;
}

/**
 * Emit the X-Carisma-* service-auth envelope the backend verifies verbatim
 * (identity.serviceAuth.requireServiceCaller, `30-identity-and-session-architecture.md` §4).
 * The signing string is exactly:
 *   v1\n<service>\n<keyVersion>\n<ts>\n<nonce>\n<METHOD>\n<pathWithQuery>\n<clientIp>\n<hex(sha256(stableStringify(body)))>
 * signed with HMAC-SHA256 under the per-client service key, and the signature header
 * is `v1=<hex>`. The old x-service-* header set (a bespoke `${id}.${ts}...` MAC) is gone:
 * the backend never read it and answered 401 SERVICE_AUTH_INVALID.
 */
export function signService(opts: ServiceSignOptions): Record<string, string> {
  const ts = opts.ts ?? Math.floor(Date.now() / 1000);
  const nonce = opts.nonce ?? crypto.randomBytes(16).toString("hex");
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(opts.body);
  } catch {
    /* empty / non-JSON body hashes as {} — the backend hashes req.body ?? {} the same way */
  }
  const bodyHashHex = sha256Hex(stableStringify(parsed ?? {}));
  const signingString = [
    "v1",
    opts.clientId,
    String(opts.keyVersion),
    String(ts),
    nonce,
    opts.method.toUpperCase(),
    opts.pathWithQuery,
    opts.clientIp,
    bodyHashHex,
  ].join("\n");
  const key = Buffer.from(opts.serviceKeyHex, "hex");
  const sig = "v1=" + crypto.createHmac("sha256", key).update(signingString).digest("hex");
  return {
    "x-carisma-service": opts.clientId,
    "x-carisma-key-version": String(opts.keyVersion),
    "x-carisma-timestamp": String(ts),
    "x-carisma-nonce": nonce,
    "x-carisma-client-ip": opts.clientIp,
    "x-carisma-signature": sig,
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
