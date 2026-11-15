import type { ResolvedConfig } from "./config.js";
import type { RefreshResult } from "./refresh.js";
/**
 * GET /api/auth/session  — the only route that knows whether this browser is signed in.
 *
 *  - No cw_session cookie                -> 200 {signedIn:false}, private,no-store, no network.
 *  - Cookie present but does not unseal  -> 200 {signedIn:false}, and the junk cookie is cleared.
 *  - Access token within 60s of expiry   -> single-flight refresh first.
 *  - Backend answers 401                  -> clear cw_session + hints, {signedIn:false}.
 *  - Backend answers 5xx / connection err -> DO NOT touch a cookie; return known state
 *                                            from the seal (W-9: failure never signs out).
 *  - Backend answers 200                  -> {signedIn:true, initials, profile[, upcoming][, loyalty]}.
 *
 * `include` is a comma list: `upcoming` (the panel's visits) and `loyalty`
 * (Carisma Circle). `loyalty` is folded in ONLY when the member read answers
 * 200 with `enabled: true`; off, 404, 5xx or a timeout leave the field out and
 * never touch the rest of the answer (the panel then draws what it always did).
 */
/** The most the panel waits for Carisma Circle before opening without it. */
export declare const LOYALTY_READ_BUDGET_MS = 2500;
export declare function makeSession(cfg: ResolvedConfig, refresh: (sid: string, rt: string) => Promise<RefreshResult>): (req: Request) => Promise<Response>;
//# sourceMappingURL=session.d.ts.map