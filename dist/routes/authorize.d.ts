import type { ResolvedConfig } from "./config.js";
import type { RefreshResult } from "./refresh.js";
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
/**
 * GET /api/auth/seed?next=… — tell the identity origin about a sign-in that happened
 * on this brand WITHOUT it (the booking pop-up signs in server-side, so the identity
 * origin never saw it and no other brand could find it).
 *
 * The person's own bearer mints a single-use, 90-second crossing token for this
 * brand's audience; the browser carries it to the identity origin's /sso/seed, which
 * redeems it into its own session and continues to /authorize with prompt=none; that
 * crosses straight back here through the ordinary callback. No token ever touches the
 * browser except the opaque crossing token, which is spent on arrival.
 *
 * ONE attempt: cw-sso-seed is cleared on every path, success or not, so a backend
 * that refuses cannot turn every page view into a redirect. Every failure goes
 * quietly back to `next`.
 */
export declare function makeSeed(cfg: ResolvedConfig, refresh: (sid: string, rt: string) => Promise<RefreshResult>): (req: Request) => Promise<Response>;
//# sourceMappingURL=authorize.d.ts.map