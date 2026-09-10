import type { ResolvedConfig } from "./config.js";
export interface RefreshResult {
    status: number;
    tokens?: {
        accessToken: string;
        atExp: number;
        refreshToken?: string;
    };
}
/**
 * Single-flight refresh, keyed on sid. Concurrent session reads on one instance that
 * both find the access token near expiry collapse into ONE POST /auth/refresh; the
 * in-flight promise is shared and dropped when it settles (40- section 7.4). This is
 * per-instance by design — two App Runner instances may still each refresh once, which
 * is safe until rotation lands (deferred to M7/WP-BE-8).
 */
export declare function createRefresher(cfg: ResolvedConfig): (sid: string, rt: string) => Promise<RefreshResult>;
//# sourceMappingURL=refresh.d.ts.map