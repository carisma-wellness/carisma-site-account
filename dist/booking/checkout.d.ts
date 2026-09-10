/**
 * src/booking/checkout.ts — the pure half of "tap pay", for both doors.
 *
 * `buildCheckoutPayload` returns null without a submitted guest (W-10), exactly
 * as the kit's checkout-flow.ts:56@87e2670 does. The member path differs in two
 * measured ways (8.5): it NEVER carries a turnstileToken (the session is the
 * proof of a person), and its wire body drops the top-level `guest{}` block and
 * carries `countryCode` + `phone` split instead (W-18). `startClientCheckout`
 * POSTs to the site's OWN origin proxy — the bearer is attached server-side, so
 * no CarismaSoft token is ever in page JavaScript.
 */
import type { CheckoutEssentials, CheckoutResult, ClientCheckoutPayload, GuestCheckoutPayload, Step3State } from "./types.js";
export interface BuildPayloadInput {
    state: Pick<Step3State, "guest" | "secondGuest" | "notes" | "marketingConsent" | "session">;
    essentials: CheckoutEssentials;
    /** Host-supplied Turnstile token; ignored entirely on the member path (8.5). */
    turnstileToken?: string | null;
    origin?: string;
    attribution?: Record<string, string | undefined>;
    giftCardCode?: string | null;
    promoCode?: string | null;
}
/**
 * The shared payload. `state.guest` is required and this returns null rather
 * than inventing an empty guest if the caller forgets (W-10, the negative
 * control). On the MEMBER path a turnstileToken is never attached, even if one
 * is passed — the field cannot reach the wire from a signed-in checkout.
 */
export declare function buildCheckoutPayload(input: BuildPayloadInput): GuestCheckoutPayload | null;
/**
 * Transform the shared payload into the MEMBER wire body (8.5): drop the
 * top-level `guest{}` block (the session is the identity), split the phone into
 * `countryCode` + national `phone` (W-18), and carry `origin`. There is no
 * `turnstileToken` field on ClientCheckoutPayload, so it cannot ride along even
 * by accident. `marketingConsent` is dropped: a member has no tick to read.
 */
export declare function toClientCheckoutBody(payload: GuestCheckoutPayload, fallbackCountryCode?: string): ClientCheckoutPayload;
export interface ClientCheckoutDeps {
    /** The site's OWN origin, e.g. http://localhost:3100 — never the API host. */
    siteOrigin: string;
    /** Defaults to /api/auth/proxy (the BFF proxy mount, 7.1/7.3). */
    proxyBasePath?: string;
    fetchImpl?: typeof fetch;
}
/**
 * Build `sdk.startClientCheckout`. It POSTs the member wire body to the site's
 * own `/api/auth/proxy/client/booking/checkout` (an allowlisted path, 7.3); the
 * site's BFF attaches the bearer server-side. No Authorization header is set
 * here and no token is ever in the browser. The response is `{appointments,
 * checkoutUrl}` — no guest token (8.5).
 */
export declare function makeClientCheckout(deps: ClientCheckoutDeps): (payload: ClientCheckoutPayload) => Promise<CheckoutResult>;
//# sourceMappingURL=checkout.d.ts.map