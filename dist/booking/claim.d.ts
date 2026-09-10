/**
 * src/booking/claim.ts — the in-overlay post-booking account claim (section 10).
 *
 * One rule: a booking is never the proof of a mailbox. Two paths reach the same
 * primitive:
 *   via "email"       -> the address is live in the kit (gift-covered / free, in
 *                        the overlay). start = POST /auth/code/start purpose
 *                        "claim"; finish = POST /auth/code/finish with the code
 *                        AND a chosen password, which returns the token pair.
 *   via "guest-token" -> Stripe-paid on /book/confirmed, same device; the guest
 *                        token is attached as the Bearer and the address is never
 *                        typed, so start answers {maskedEmail} (10, W-13).
 *
 * In the shipped site the browser calls the site's own /api/auth/claim/* BFF,
 * which forwards to these CarismaSoft endpoints server-side so no token pair
 * enters page JavaScript. This module IS that server-side call, so it is handed
 * the API base and a fetch and never names an identity host (urls.ts owns those).
 *
 * Live shapes verified against http://localhost:5001/api/v1 (2026-09-09):
 *   POST /auth/code/start  {email,purpose:"claim"}
 *     -> 200 {success:true,data:{message},message}
 *   POST /auth/code/finish {email,code,purpose:"claim",password}
 *     -> 200 {success:true,data:{user:{id,email,...},tokens:{accessToken,refreshToken}}}
 *     -> 400 {error,code:"CODE_INVALID"} on a wrong / expired code
 */
import type { ClaimFinishInput, ClaimFinishResult, ClaimStartInput, ClaimStartResult } from "./types.js";
export interface GuestClaimDeps {
    /** CarismaSoft API base, e.g. http://localhost:5001/api/v1. Never an identity host. */
    apiBaseUrl: string;
    fetchImpl?: typeof fetch;
}
export interface GuestClaim {
    start(input: ClaimStartInput): Promise<ClaimStartResult>;
    finish(input: ClaimFinishInput): Promise<ClaimFinishResult>;
}
export declare function makeGuestClaim(deps: GuestClaimDeps): GuestClaim;
//# sourceMappingURL=claim.d.ts.map