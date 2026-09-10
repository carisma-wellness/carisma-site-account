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
 *  - Backend answers 200                  -> {signedIn:true, initials, profile[, upcoming]}.
 */
export declare function makeSession(cfg: ResolvedConfig, refresh: (sid: string, rt: string) => Promise<RefreshResult>): (req: Request) => Promise<Response>;
//# sourceMappingURL=session.d.ts.map