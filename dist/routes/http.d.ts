import type { ResolvedConfig } from "./config.js";
export declare const NO_STORE_HEADERS: Record<string, string>;
export declare function json(body: unknown, status?: number, extra?: Record<string, string>): Response;
/**
 * Unwrap the CarismaSoft house envelope {success:true,data,message} to its flat `data`.
 * EVERY backend reply is enveloped (shared/utils/apiResponse.successResponse), while the
 * session/exchange builders read tokens and profile fields FLAT — so a token exchange
 * finds no session and /profile renders a card with an empty name unless the reply is
 * unwrapped here. A non-enveloped body, an error body {success:false}, or an array
 * (never a house envelope) passes through untouched.
 */
export declare function unwrapEnvelope(body: unknown): unknown;
/**
 * THE load-bearing predicate. The session/proxy layer clears the sealed cookie and
 * the hints only when this returns true. It returns true for EXACTLY one status: 401.
 *
 * NEGATIVE CONTROL (charter Sec.5): widen this to `status === 401 || status >= 500`
 * and session.test.mjs "a 500 must NOT clear the cookie" goes red. A gate that
 * cannot fail is not a gate — this is the one line the sabotage flips.
 */
export declare function shouldClearSession(status: number): boolean;
/** Append Set-Cookie headers that clear cw_session and both hints. */
export declare function appendClearSession(headers: Headers, cfg: ResolvedConfig): void;
/** A signed-out JSON response that also clears the sealed cookie and the hints. */
export declare function jsonClearing(body: unknown, cfg: ResolvedConfig, status?: number): Response;
/** Append Set-Cookie headers that establish the sealed session + readable hints. */
export declare function appendSetSession(headers: Headers, cfg: ResolvedConfig, sealed: string, initials: string | undefined, keep: boolean): void;
/** Origin check for state-changing BFF routes (W-7). */
export declare function originAllowed(req: Request, cfg: ResolvedConfig): boolean;
//# sourceMappingURL=http.d.ts.map