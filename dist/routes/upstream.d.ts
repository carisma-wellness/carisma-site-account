import type { ResolvedConfig } from "./config.js";
export interface UpstreamResult {
    /** Backend HTTP status, or 0 for a connection error / timeout (NOT a 401). */
    status: number;
    body: unknown;
    raw: string;
    contentType: string | null;
}
/**
 * Call the CarismaSoft API with a bearer token. A network failure is reported as
 * status 0, deliberately distinct from every real HTTP status — the whole point is
 * that a connection error is NOT a 401 and must never be treated as one (W-9).
 */
export declare function upstream(cfg: ResolvedConfig, subPath: string, method: string, bearer: string | null, body?: string | null): Promise<UpstreamResult>;
//# sourceMappingURL=upstream.d.ts.map