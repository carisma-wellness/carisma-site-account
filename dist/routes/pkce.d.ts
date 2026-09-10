/** RFC 7636 PKCE + opaque state + the X-Carisma-* service-auth signer for the token exchange. */
export declare function randomToken(bytes?: number): string;
export declare function pkcePair(): {
    verifier: string;
    challenge: string;
};
/**
 * Deterministic JSON: object keys sorted at every level. This MUST byte-match the
 * backend verifier (identity.serviceAuth.stableStringify), because both sides hash
 * `stableStringify(parsedBody)`, not the raw request bytes — express.json() has
 * already consumed the raw body before requireServiceCaller runs, so the verifier
 * re-serialises the PARSED body and the signer must hash the same canonical form.
 */
export declare function stableStringify(value: unknown): string;
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
export declare function signService(opts: ServiceSignOptions): Record<string, string>;
/** Validate a `next` target: relative, no scheme, no backslash, no protocol-relative. */
export declare function safeNext(next: string | null, fallback?: string): string;
//# sourceMappingURL=pkce.d.ts.map