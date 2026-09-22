/**
 * The member-proxy allowlist. An ALLOWLIST, never a denylist: a path is proxyable
 * only if a rule here matches it, and everything else is refused with a 404 (not a
 * 403) so the proxy is not a readable map of the CarismaSoft API
 * (40-brand-website-integration.md sections 7.3, W-8; invariants W-24).
 *
 * The line this file draws
 * -----------------------
 * A member may READ their own record and ACT on things they own — a booking, a
 * membership, a balance. Those stay first-party, on the brand they are standing
 * on, because that is where the person is and the brand is half of what they
 * came for.
 *
 * A member may NOT, through a brand origin, change WHO THEY ARE or WHAT PAYS.
 * Credentials, the profile itself, session revoke, account deletion and the
 * stored card all belong to the identity origin, behind its own card and its own
 * Origin check. That split is the whole reason this file is an allowlist: the
 * FORBIDDEN_PATHS below are the named negative control, and allowlist.test.mjs
 * goes red the moment one of them becomes reachable.
 *
 * Why a booking cancel is allowed and a card change is not: cancelling is a
 * commercial act on a row the member owns, refusable and reversible by the desk.
 * Replacing the instrument that pays for everything is not — and a brand origin
 * is the wrong place to be asked for it.
 */
export interface AllowRule {
    method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
    /** Human label for the rule, surfaced by the boundary verifier (WP-PKG-2). */
    label: string;
    match: (path: string) => boolean;
}
/** Paths reachable through the member proxy. */
export declare const PROXY_ALLOWLIST: readonly AllowRule[];
/**
 * Paths that MUST never be proxyable. Not consulted by isAllowed() at runtime — the
 * allowlist alone decides — but asserted refused by the test suite, and used as the
 * named negative control (add one to PROXY_ALLOWLIST and the suite fails).
 */
export declare const FORBIDDEN_PATHS: ReadonlyArray<{
    method: string;
    path: string;
    why: string;
}>;
/** Normalise a proxy sub-path: strip query/hash, collapse to a leading-slash path. */
export declare function normalizePath(path: string): string;
/** True only when a rule matches this method+path exactly. */
export declare function isAllowed(method: string, path: string): boolean;
//# sourceMappingURL=allowlist.d.ts.map