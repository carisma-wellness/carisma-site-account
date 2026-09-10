import type { ResolvedConfig } from "./config.js";
/**
 * POST /api/auth/logout {everywhere?: true}
 * Revokes this session upstream, then clears cw_session and both hints locally.
 * everywhere:true 303s to the identity origin's /logout confirm page (ADR 4.8).
 * Logout is a first-class BFF route, not a proxied path — it is not on the allowlist.
 */
export declare function makeLogout(cfg: ResolvedConfig): (req: Request) => Promise<Response>;
//# sourceMappingURL=logout.d.ts.map