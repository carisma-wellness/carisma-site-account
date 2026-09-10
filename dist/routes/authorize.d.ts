import type { ResolvedConfig } from "./config.js";
/**
 * GET /api/auth/start — mint state + PKCE, seal cw_txn (Path=/api/auth, 10 min),
 * 302 to the identity origin's /authorize. Never carries an email.
 */
export declare function makeStart(cfg: ResolvedConfig): (req: Request) => Promise<Response>;
/**
 * GET /api/auth/callback — unseal+clear cw_txn, compare state, exchange the code,
 * seal cw_session, stamp the hints, 302 to the validated next.
 * Contract-first against WP-BE-3; the round-trip is live-proved at wave close.
 */
export declare function makeCallback(cfg: ResolvedConfig): (req: Request) => Promise<Response>;
/** POST /api/auth/establish — the popup path: same exchange without leaving the page. */
export declare function makeEstablish(cfg: ResolvedConfig): (req: Request) => Promise<Response>;
//# sourceMappingURL=authorize.d.ts.map