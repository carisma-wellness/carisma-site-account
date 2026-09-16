import crypto from "node:crypto";
/** RFC 7636 PKCE + opaque state + the X-Carisma-* service-auth signer for the token exchange. */
export function randomToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString("base64url");
}
export function pkcePair() {
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
export function stableStringify(value) {
    if (value === null || typeof value !== "object")
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(stableStringify).join(",")}]`;
    const obj = value;
    return `{${Object.keys(obj)
        .sort()
        .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
        .join(",")}}`;
}
const sha256Hex = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex");
/**
 * Emit the X-Carisma-* service-auth envelope the backend verifies verbatim
 * (identity.serviceAuth.requireServiceCaller, `30-identity-and-session-architecture.md` §4).
 * The signing string is exactly:
 *   v1\n<service>\n<keyVersion>\n<ts>\n<nonce>\n<METHOD>\n<pathWithQuery>\n<clientIp>\n<hex(sha256(stableStringify(body)))>
 * signed with HMAC-SHA256 under the per-client service key, and the signature header
 * is `v1=<hex>`. The old x-service-* header set (a bespoke `${id}.${ts}...` MAC) is gone:
 * the backend never read it and answered 401 SERVICE_AUTH_INVALID.
 */
export function signService(opts) {
    const ts = opts.ts ?? Math.floor(Date.now() / 1000);
    const nonce = opts.nonce ?? crypto.randomBytes(16).toString("hex");
    let parsed = {};
    try {
        parsed = JSON.parse(opts.body);
    }
    catch {
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
/**
 * The visitor's IP as the brand's edge reported it, for the signed X-Carisma-Client-IP.
 *
 * Until 2026-09-16 every exchange was signed as 127.0.0.1, and the backend keys its
 * exchange limit (30 / 15 min) on that signed value — so every sign-in on every brand
 * shared ONE bucket. Harmless while sign-ins were rare; a hard platform-wide ceiling
 * once single sign-on exchanges a code on every brand a person opens.
 *
 * `X-Forwarded-For` GROWS left to right and the edge APPENDS the peer it saw, so the
 * LAST entry is the one our own infrastructure put there and the FIRST is whatever the
 * caller sent. Taking the first would let anyone mint a fresh bucket per request.
 * CloudFront's `cloudfront-viewer-address` wins where present — CloudFront overwrites it.
 */
export function visitorIp(req) {
    const viewer = req.headers.get("cloudfront-viewer-address");
    const fromViewer = viewer ? stripPort(viewer.trim()) : "";
    if (ipish(fromViewer))
        return fromViewer;
    const xff = req.headers.get("x-forwarded-for");
    if (xff) {
        const hops = xff.split(",").map((h) => h.trim()).filter(Boolean);
        const last = hops[hops.length - 1];
        if (ipish(last))
            return last;
    }
    return "127.0.0.1";
}
/** "1.2.3.4:5678" / "[2001:db8::1]:443" / a bare address -> the address. */
function stripPort(value) {
    const bracket = /^\[([^\]]+)\](?::\d+)?$/.exec(value);
    if (bracket)
        return bracket[1];
    const parts = value.split(":");
    if (parts.length === 2)
        return parts[0];
    return value;
}
function ipish(value) {
    return /^[0-9a-fA-F:.]{2,45}$/.test(value);
}
/** Validate a `next` target: relative, no scheme, no backslash, no protocol-relative. */
export function safeNext(next, fallback = "/") {
    if (!next)
        return fallback;
    if (!next.startsWith("/"))
        return fallback;
    if (next.startsWith("//") || next.startsWith("/\\"))
        return fallback;
    if (next.includes("\\") || next.includes("@"))
        return fallback;
    // reject ASCII control characters (C0 range and DEL)
    if (/[\u0000-\u001f\u007f]/.test(next))
        return fallback;
    return next;
}
//# sourceMappingURL=pkce.js.map