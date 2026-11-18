import type { ResolvedConfig } from "./config.js";
import type { RefreshResult } from "./refresh.js";
/**
 * POST|GET|PATCH|DELETE /api/auth/proxy/[...path]
 *
 * The member proxy. A path is forwarded to the CarismaSoft API ONLY when the
 * allowlist matches; everything else answers 404 without reaching the backend, so
 * the proxy is not a readable map of the API (W-8). The bearer is attached
 * server-side from the sealed cookie; an upstream Set-Cookie is never replayed onto
 * the brand origin; the response carries the upstream status and body verbatim with
 * only content-type forwarded.
 */
export declare function makeProxy(cfg: ResolvedConfig, refresh?: (sid: string, rt: string) => Promise<RefreshResult>): (req: Request) => Promise<Response>;
//# sourceMappingURL=proxy.d.ts.map