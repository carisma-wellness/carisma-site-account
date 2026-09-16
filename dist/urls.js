const stripTrailingSlash = (s) => s.replace(/\/+$/, "");
/** The site's own first-party callback. redirect_uri is never the identity origin. */
export function callbackRedirectUri(origin) {
    return `${origin}/api/auth/callback`;
}
/**
 * The identity origin's /authorize URL for the PKCE authorization-code flow.
 * Byte-for-byte the URL WP-PKG-1's makeStart built inline; param order is fixed.
 */
export function buildAuthorizeUrl(cfg, p) {
    const u = new URL(`${stripTrailingSlash(cfg.identityOrigin)}/authorize`);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("client_id", cfg.clientId);
    u.searchParams.set("redirect_uri", callbackRedirectUri(p.origin));
    u.searchParams.set("state", p.state);
    u.searchParams.set("code_challenge", p.challenge);
    u.searchParams.set("code_challenge_method", "S256");
    u.searchParams.set("prompt", p.prompt);
    return u.toString();
}
/**
 * The identity origin's /logout confirm page (sign-out-everywhere lands here), or
 * null when no identity origin is configured — so the one caller (logout.ts) never
 * needs to name `identityOrigin` itself, keeping URL assembly in this file alone.
 */
export function buildLogoutUrl(cfg) {
    if (!cfg.identityOrigin)
        return null;
    return `${stripTrailingSlash(cfg.identityOrigin)}/logout`;
}
/**
 * The identity origin's /sso/seed door: hand it a single-use crossing token so it can
 * learn about a sign-in that happened on this brand without it (the booking pop-up),
 * then continue to `/authorize` on the SAME origin. `continueTo` must be the
 * /authorize URL this module just built; only its path and query travel, so the
 * identity origin never has to trust a host in a query string.
 */
export function buildSeedUrl(cfg, p) {
    const cont = new URL(p.continueTo);
    const u = new URL(`${stripTrailingSlash(cfg.identityOrigin)}/sso/seed`);
    u.searchParams.set("token", p.token);
    u.searchParams.set("aud", p.audience);
    u.searchParams.set("continue", cont.pathname + cont.search);
    return u.toString();
}
/* ── 2. the site's own door (/api/auth/start) and `next` validation ─────── */
/**
 * Validate a `next` target: a same-origin RELATIVE path only. Rejects a scheme, a
 * protocol-relative `//host`, a backslash, an `@`, and ASCII control characters,
 * then resolves against a placeholder origin and refuses anything that escaped it.
 * (design pack 40- 4.3: "relative only, reject `\`, `@`, control characters,
 * resolve with new URL(next, siteOrigin) and origin-compare".)
 */
export function validateNext(next, fallback = "/") {
    if (typeof next !== "string" || next.length === 0)
        return fallback;
    if (!next.startsWith("/"))
        return fallback;
    if (next.startsWith("//") || next.startsWith("/\\"))
        return fallback;
    if (next.includes("\\") || next.includes("@"))
        return fallback;
    if (/[\u0000-\u001f\u007f]/.test(next))
        return fallback;
    try {
        const base = "https://site.invalid";
        const resolved = new URL(next, base);
        if (resolved.origin !== "https://site.invalid")
            return fallback;
    }
    catch {
        return fallback;
    }
    return next;
}
/** The site's own /api/auth/start door. `next` is validated; `prompt=create` optional. */
export function startUrl(next, prompt = "login") {
    const params = new URLSearchParams();
    params.set("next", validateNext(next, "/"));
    if (prompt === "create")
        params.set("prompt", "create");
    return `/api/auth/start?${params.toString()}`;
}
/**
 * Carry the person to ANOTHER brand site on a click (the cross-brand link
 * interceptor, ADR invariant 31): the target brand's OWN /api/auth/start?next=…,
 * never the identity origin. The caller has already excluded Medical hosts.
 */
export function brandStartUrl(targetOrigin, next) {
    const clean = stripTrailingSlash(targetOrigin);
    return `${clean}/api/auth/start?next=${encodeURIComponent(next)}`;
}
/** The site's own silent check: /api/auth/start with prompt=none. */
export function silentStartUrl(next) {
    const params = new URLSearchParams();
    params.set("next", validateNext(next, "/"));
    params.set("prompt", "none");
    return `/api/auth/start?${params.toString()}`;
}
/** The site's own seed door: tell the identity origin about a sign-in made here. */
export function seedDoorUrl(next) {
    const params = new URLSearchParams();
    params.set("next", validateNext(next, "/"));
    return `/api/auth/seed?${params.toString()}`;
}
/** A same-origin hub link reached through the door so the person arrives signed in. */
export function hubStartUrl(hubPath) {
    return startUrl(hubPath, "login");
}
//# sourceMappingURL=urls.js.map