import type { ResolvedConfig } from "./config.js";
import { upstream } from "./upstream.js";

export interface RefreshResult {
  status: number; // 200 refreshed, 401 dead refresh token, 0/5xx transient
  tokens?: { accessToken: string; atExp: number; refreshToken?: string };
}

/**
 * Single-flight refresh, keyed on sid. Concurrent session reads on one instance that
 * both find the access token near expiry collapse into ONE POST /auth/refresh; the
 * in-flight promise is shared and dropped when it settles (40- section 7.4). This is
 * per-instance by design — two App Runner instances may still each refresh once, which
 * is safe until rotation lands (deferred to M7/WP-BE-8).
 */
export function createRefresher(cfg: ResolvedConfig) {
  const inflight = new Map<string, Promise<RefreshResult>>();

  async function doRefresh(rt: string): Promise<RefreshResult> {
    const res = await upstream(cfg, "/auth/refresh", "POST", null, JSON.stringify({ refreshToken: rt }));
    if (res.status === 401) return { status: 401 };
    if (res.status === 200 && res.body && typeof res.body === "object") {
      const b = res.body as Record<string, unknown>;
      const accessToken = (b.accessToken ?? b.access_token) as string | undefined;
      const atExp = (b.atExp ?? b.accessTokenExpiresAt ?? b.exp) as number | undefined;
      const refreshToken = (b.refreshToken ?? b.refresh_token) as string | undefined;
      if (typeof accessToken === "string" && typeof atExp === "number") {
        return { status: 200, tokens: { accessToken, atExp, refreshToken } };
      }
    }
    // 5xx, malformed, or network (status 0): transient, caller keeps the stale token.
    return { status: res.status || 0 };
  }

  return function refresh(sid: string, rt: string): Promise<RefreshResult> {
    const existing = inflight.get(sid);
    if (existing) return existing;
    const p = doRefresh(rt).finally(() => inflight.delete(sid));
    inflight.set(sid, p);
    return p;
  };
}
