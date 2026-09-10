import { upstream } from "./upstream.js";
/**
 * Single-flight refresh, keyed on sid. Concurrent session reads on one instance that
 * both find the access token near expiry collapse into ONE POST /auth/refresh; the
 * in-flight promise is shared and dropped when it settles (40- section 7.4). This is
 * per-instance by design — two App Runner instances may still each refresh once, which
 * is safe until rotation lands (deferred to M7/WP-BE-8).
 */
export function createRefresher(cfg) {
    const inflight = new Map();
    async function doRefresh(rt) {
        const res = await upstream(cfg, "/auth/refresh", "POST", null, JSON.stringify({ refreshToken: rt }));
        if (res.status === 401)
            return { status: 401 };
        if (res.status === 200 && res.body && typeof res.body === "object") {
            const b = res.body;
            const accessToken = (b.accessToken ?? b.access_token);
            const atExp = (b.atExp ?? b.accessTokenExpiresAt ?? b.exp);
            const refreshToken = (b.refreshToken ?? b.refresh_token);
            if (typeof accessToken === "string" && typeof atExp === "number") {
                return { status: 200, tokens: { accessToken, atExp, refreshToken } };
            }
        }
        // 5xx, malformed, or network (status 0): transient, caller keeps the stale token.
        return { status: res.status || 0 };
    }
    return function refresh(sid, rt) {
        const existing = inflight.get(sid);
        if (existing)
            return existing;
        const p = doRefresh(rt).finally(() => inflight.delete(sid));
        inflight.set(sid, p);
        return p;
    };
}
//# sourceMappingURL=refresh.js.map