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
export const PROXY_ALLOWLIST: readonly AllowRule[] = [
  { method: "POST", label: "member checkout", match: (p) => p === "/client/booking/checkout" },
  { method: "GET", label: "appointments list", match: (p) => p === "/client/booking/appointments" },
  { method: "GET", label: "appointment counts", match: (p) => p === "/client/booking/appointments/counts" },
  { method: "GET", label: "one appointment", match: (p) => /^\/client\/booking\/appointments\/[^/]+$/.test(p) && p !== "/client/booking/appointments/counts" },
  { method: "GET", label: "profile (read only)", match: (p) => p === "/profile" },
  { method: "POST", label: "member cancel/return", match: (p) => p === "/client/booking/abandon" },
];

/**
 * Paths that MUST never be proxyable. Not consulted by isAllowed() at runtime — the
 * allowlist alone decides — but asserted refused by the test suite, and used as the
 * named negative control (add one to PROXY_ALLOWLIST and the suite fails).
 */
export const FORBIDDEN_PATHS: ReadonlyArray<{ method: string; path: string; why: string }> = [
  { method: "POST", path: "/auth/change-password", why: "credential change belongs on the identity origin" },
  { method: "POST", path: "/auth/logout-all", why: "global revoke belongs on the identity origin" },
  { method: "DELETE", path: "/profile", why: "account deletion belongs on the identity origin" },
  { method: "DELETE", path: "/auth/sessions/abc123", why: "session revoke belongs on the identity origin" },
  { method: "PUT", path: "/profile", why: "profile writes live on the hub" },
  { method: "PUT", path: "/profile/addresses", why: "profile writes live on the hub" },
  { method: "GET", path: "/client/medical/records", why: "Medical trust boundary (W-24)" },
  { method: "GET", path: "/hod/dashboard", why: "staff surface" },
  { method: "GET", path: "/internal/auth/me", why: "internal surface" },
  { method: "GET", path: "/admin/users", why: "admin surface" },
];

/** Normalise a proxy sub-path: strip query/hash, collapse to a leading-slash path. */
export function normalizePath(path: string): string {
  let p = path.split("?")[0].split("#")[0];
  if (!p.startsWith("/")) p = "/" + p;
  // collapse a trailing slash except for the root
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

/** True only when a rule matches this method+path exactly. */
export function isAllowed(method: string, path: string): boolean {
  const m = method.toUpperCase();
  const p = normalizePath(path);
  return PROXY_ALLOWLIST.some((rule) => rule.method === m && rule.match(p));
}
