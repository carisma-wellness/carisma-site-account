/**
 * src/urls.ts — lib/account/urls: THE ONLY PLACE an identity-origin URL is built.
 *
 * scripts/verify-account-boundary.mjs fails the build if any other source file
 * references `identityOrigin` (or hard-codes an identity host) to assemble a URL —
 * mirroring Medical's scripts/verify-portal-boundary.mjs@33c86ac. Medical defect 5
 * (two hand-coded sign-in paths in one repo) is what that guard exists to stop.
 *
 * Two kinds of URL live here:
 *   1. identity-origin URLs   — /authorize, /logout (built from cfg.identityOrigin)
 *   2. the site's own door     — /api/auth/start?next=…, the doorway to identity
 * Both belong in one file so the `next` validation and the origin string can never
 * drift between the door, the header, the panel and the link interceptor.
 */
import type { ResolvedConfig } from "./routes/config.js";
export interface AuthorizeParams {
    /** the brand site's OWN origin — the redirect_uri is first-party (its callback) */
    origin: string;
    state: string;
    challenge: string;
    /** `none` is the silent cross-brand check: a code or `error=login_required`, never a card. */
    prompt: "login" | "create" | "none";
}
/** The site's own first-party callback. redirect_uri is never the identity origin. */
export declare function callbackRedirectUri(origin: string): string;
/**
 * The identity origin's /authorize URL for the PKCE authorization-code flow.
 * Byte-for-byte the URL WP-PKG-1's makeStart built inline; param order is fixed.
 */
export declare function buildAuthorizeUrl(cfg: Pick<ResolvedConfig, "identityOrigin" | "clientId">, p: AuthorizeParams): string;
/**
 * The identity origin's /logout confirm page (sign-out-everywhere lands here), or
 * null when no identity origin is configured — so the one caller (logout.ts) never
 * needs to name `identityOrigin` itself, keeping URL assembly in this file alone.
 */
export declare function buildLogoutUrl(cfg: Pick<ResolvedConfig, "identityOrigin">): string | null;
/**
 * The identity origin's /sso/seed door: hand it a single-use crossing token so it can
 * learn about a sign-in that happened on this brand without it (the booking pop-up),
 * then continue to `/authorize` on the SAME origin. `continueTo` must be the
 * /authorize URL this module just built; only its path and query travel, so the
 * identity origin never has to trust a host in a query string.
 */
export declare function buildSeedUrl(cfg: Pick<ResolvedConfig, "identityOrigin">, p: {
    token: string;
    audience: string;
    continueTo: string;
}): string;
/**
 * Validate a `next` target: a same-origin RELATIVE path only. Rejects a scheme, a
 * protocol-relative `//host`, a backslash, an `@`, and ASCII control characters,
 * then resolves against a placeholder origin and refuses anything that escaped it.
 * (design pack 40- 4.3: "relative only, reject `\`, `@`, control characters,
 * resolve with new URL(next, siteOrigin) and origin-compare".)
 */
export declare function validateNext(next: string | null | undefined, fallback?: string): string;
/** The site's own /api/auth/start door. `next` is validated; `prompt=create` optional. */
export declare function startUrl(next: string | null | undefined, prompt?: "login" | "create"): string;
/**
 * Carry the person to ANOTHER brand site on a click (the cross-brand link
 * interceptor, ADR invariant 31): the target brand's OWN /api/auth/start?next=…,
 * never the identity origin. The caller has already excluded Medical hosts.
 */
export declare function brandStartUrl(targetOrigin: string, next: string): string;
/** The site's own silent check: /api/auth/start with prompt=none. */
export declare function silentStartUrl(next: string | null | undefined): string;
/** The site's own seed door: tell the identity origin about a sign-in made here. */
export declare function seedDoorUrl(next: string | null | undefined): string;
/** A same-origin hub link reached through the door so the person arrives signed in. */
export declare function hubStartUrl(hubPath: string): string;
//# sourceMappingURL=urls.d.ts.map