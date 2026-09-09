/**
 * @carisma/site-account — the shared BFF + seal kit every Carisma brand website
 * mounts to become a relying party of the unified member-login identity origin.
 *
 * WP-PKG-1 surface: the sealed cw_session cookie, the createAccountRoutes() factory
 * (session probe, allowlisted member proxy, logout, authorize start/callback/establish).
 * UI (AccountMark, AccountPanel) and the booking Step-3 kit land in WP-PKG-2..4.
 */
export { seal, unseal, SEAL_KEY_ID, SEAL_VERSION } from "./seal/index.js";
export type { SessionPlaintext, UnsealKeys } from "./seal/index.js";

export { createAccountRoutes } from "./routes/index.js";
export type { AccountRoutes } from "./routes/index.js";
export type { AccountRoutesConfig } from "./routes/config.js";

export { PROXY_ALLOWLIST, FORBIDDEN_PATHS, isAllowed, normalizePath } from "./routes/allowlist.js";
export type { AllowRule } from "./routes/allowlist.js";

export { COOKIES, parseCookies, serializeCookie, clearCookie } from "./routes/cookies.js";
export { maskProfile, maskEmail, initialsFrom } from "./routes/profile.js";
export { safeNext } from "./routes/pkce.js";

/**
 * Build marker. WP-LOC-3's distribution-channel proof bumps this string and checks it
 * appears verbatim in the consumer's node_modules/@carisma/site-account/dist AND in
 * the site's built chunk — the negative control that a site is resolving the pinned
 * tarball and not a live workspace path.
 */
export const SITE_ACCOUNT_BUILD_MARKER = "carisma-site-account@wp-pkg-1";
