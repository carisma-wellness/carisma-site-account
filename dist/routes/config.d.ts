import type { UnsealKeys } from "../seal/index.js";
/**
 * The one configuration object a brand site passes to createAccountRoutes(). Every
 * name maps to a server-only env on the site (40-brand-website-integration.md 2.1):
 *   rpId/clientId  <- IDENTITY_CLIENT_ID          identityOrigin <- IDENTITY_ORIGIN
 *   clientSecret   <- IDENTITY_CLIENT_SECRET       sessionSecret  <- SITE_SESSION_SECRET
 *   carismasoftApiUrl <- CARISMASOFT_API_URL       sessionSecretPrev <- SITE_SESSION_SECRET_PREV
 *   keyVersion     <- IDENTITY_KEY_VERSION (default 1)
 * `clientSecret` is the per-client service key (HEX): IDENTITY_CLIENT_SECRET =
 * HMAC-SHA256(ACCOUNT_SERVICE_ROOT, "carisma:service:<clientId>:v<keyVersion>"); the site
 * never holds ACCOUNT_SERVICE_ROOT. It signs the token exchange with that key + keyVersion
 * (routes/pkce.signService). fetchImpl and now are injection seams for tests, never set in production.
 */
export interface AccountRoutesConfig {
    rpId: string;
    clientId: string;
    clientSecret: string;
    /** Version of the per-client service key, sent as X-Carisma-Key-Version. Default 1. */
    keyVersion?: number;
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
export declare function resolveConfig(cfg: AccountRoutesConfig): ResolvedConfig;
//# sourceMappingURL=config.d.ts.map