/**
 * The member-proxy allowlist. An ALLOWLIST, never a denylist: a path is proxyable
 * only if a rule here matches it, and everything else is refused with a 404 (not a
 * 403) so the proxy is not a readable map of the CarismaSoft API
 * (40-brand-website-integration.md sections 7.3, W-8; invariants W-24).
 *
 * Account-destroying and profile-writing acts are, by construction, absent — they
 * belong on the identity origin behind its own card and its own Origin check.
 * Adding any of them here is the negative control this module is written to fail:
 *   - /auth/change-password            (a session-credential change)
 *   - DELETE /profile                  (account deletion)
 *   - /auth/sessions/* , /auth/logout-all (session revoke)
 * If any of the FORBIDDEN_PATHS below becomes allowed, allowlist.test.mjs goes red.
 */
export interface AllowRule {
    method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
    /** Human label for the rule, surfaced by the boundary verifier (WP-PKG-2). */
    label: string;
    match: (path: string) => boolean;
}
/** Paths reachable through the member proxy. Read paths plus the two member writes. */
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