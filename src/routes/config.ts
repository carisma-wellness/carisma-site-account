import type { UnsealKeys } from "../seal/index.js";

/**
 * The one configuration object a brand site passes to createAccountRoutes(). Every
 * name maps to a server-only env on the site (40-brand-website-integration.md 2.1):
 *   rpId/clientId  <- IDENTITY_CLIENT_ID          identityOrigin <- IDENTITY_ORIGIN
 *   clientSecret   <- IDENTITY_CLIENT_SECRET       sessionSecret  <- SITE_SESSION_SECRET
 *   carismasoftApiUrl <- CARISMASOFT_API_URL       sessionSecretPrev <- SITE_SESSION_SECRET_PREV
 * fetchImpl and now are injection seams for tests and are never set in production.
 */
export interface AccountRoutesConfig {
  rpId: string;
  clientId: string;
  clientSecret: string;
  identityOrigin: string;
  carismasoftApiUrl: string;
  sessionSecret: string;
  sessionSecretPrev?: string;
  /** Origins allowed to POST to the state-changing BFF routes (the site's own hosts). */
  allowedOrigins: string[];
  /** Local http origins cannot receive a Secure cookie; set false for local bring-up. */
  cookieSecure?: boolean;
  /** Mount prefix the proxy sub-path is measured against. Default /api/auth/proxy. */
  proxyBasePath?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export interface ResolvedConfig extends Required<Omit<AccountRoutesConfig, "sessionSecretPrev">> {
  sessionSecretPrev?: string;
  unsealKeys: UnsealKeys;
}

export function resolveConfig(cfg: AccountRoutesConfig): ResolvedConfig {
  if (!cfg.rpId) throw new Error("createAccountRoutes: rpId is required");
  if (!cfg.sessionSecret) throw new Error("createAccountRoutes: sessionSecret is required");
  if (!cfg.carismasoftApiUrl) throw new Error("createAccountRoutes: carismasoftApiUrl is required");
  return {
    rpId: cfg.rpId,
    clientId: cfg.clientId ?? cfg.rpId,
    clientSecret: cfg.clientSecret ?? "",
    identityOrigin: cfg.identityOrigin ?? "",
    carismasoftApiUrl: cfg.carismasoftApiUrl.replace(/\/+$/, ""),
    sessionSecret: cfg.sessionSecret,
    sessionSecretPrev: cfg.sessionSecretPrev,
    allowedOrigins: cfg.allowedOrigins ?? [],
    cookieSecure: cfg.cookieSecure ?? true,
    proxyBasePath: cfg.proxyBasePath ?? "/api/auth/proxy",
    fetchImpl: cfg.fetchImpl ?? fetch,
    now: cfg.now ?? Date.now,
    unsealKeys: { primary: cfg.sessionSecret, prev: cfg.sessionSecretPrev },
  };
}
