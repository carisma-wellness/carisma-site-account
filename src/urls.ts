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

const stripTrailingSlash = (s: string): string => s.replace(/\/+$/, "");

/* ── 1. identity-origin URLs ────────────────────────────────────────────── */

export interface AuthorizeParams {
  /** the brand site's OWN origin — the redirect_uri is first-party (its callback) */
  origin: string;
  state: string;
  challenge: string;
  prompt: "login" | "create";
}

/** The site's own first-party callback. redirect_uri is never the identity origin. */
export function callbackRedirectUri(origin: string): string {
  return `${origin}/api/auth/callback`;
}

/**
 * The identity origin's /authorize URL for the PKCE authorization-code flow.
 * Byte-for-byte the URL WP-PKG-1's makeStart built inline; param order is fixed.
 */
export function buildAuthorizeUrl(
  cfg: Pick<ResolvedConfig, "identityOrigin" | "clientId">,
  p: AuthorizeParams,
): string {
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
export function buildLogoutUrl(cfg: Pick<ResolvedConfig, "identityOrigin">): string | null {
  if (!cfg.identityOrigin) return null;
  return `${stripTrailingSlash(cfg.identityOrigin)}/logout`;
}

/* ── 2. the site's own door (/api/auth/start) and `next` validation ─────── */

/**
 * Validate a `next` target: a same-origin RELATIVE path only. Rejects a scheme, a
 * protocol-relative `//host`, a backslash, an `@`, and ASCII control characters,
 * then resolves against a placeholder origin and refuses anything that escaped it.
 * (design pack 40- 4.3: "relative only, reject `\`, `@`, control characters,
 * resolve with new URL(next, siteOrigin) and origin-compare".)
 */
export function validateNext(next: string | null | undefined, fallback = "/"): string {
  if (typeof next !== "string" || next.length === 0) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.includes("\\") || next.includes("@")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    const base = "https://site.invalid";
    const resolved = new URL(next, base);
    if (resolved.origin !== "https://site.invalid") return fallback;
  } catch {
    return fallback;
  }
  return next;
}

/** The site's own /api/auth/start door. `next` is validated; `prompt=create` optional. */
export function startUrl(
  next: string | null | undefined,
  prompt: "login" | "create" = "login",
): string {
  const params = new URLSearchParams();
  params.set("next", validateNext(next, "/"));
  if (prompt === "create") params.set("prompt", "create");
  return `/api/auth/start?${params.toString()}`;
}

/**
 * Carry the person to ANOTHER brand site on a click (the cross-brand link
 * interceptor, ADR invariant 31): the target brand's OWN /api/auth/start?next=…,
 * never the identity origin. The caller has already excluded Medical hosts.
 */
export function brandStartUrl(targetOrigin: string, next: string): string {
  const clean = stripTrailingSlash(targetOrigin);
  return `${clean}/api/auth/start?next=${encodeURIComponent(next)}`;
}

/** A same-origin hub link reached through the door so the person arrives signed in. */
export function hubStartUrl(hubPath: string): string {
  return startUrl(hubPath, "login");
}
