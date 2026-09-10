/**
 * @carisma/site-account/booking (WP-PKG-3) — Step 3 of 3, the three states.
 *
 * Framework-agnostic and re-exported into the package root. The brand booking
 * kit (React, in the site repo) delegates the DECISIONS of Step 3 to this
 * module: which screen renders, the reducer whose only guest-writer is
 * SUBMIT_DETAILS (W-10), the member checkout payload (no turnstileToken, ever),
 * the corrected marketing tick (unticked + brand-named for guests, hidden for
 * members), and the in-overlay guest claim. All identity URLs come from ../urls.
 */
export type { GuestDetails, SecondGuestDetails, MemberProfile, BookingSession, Step3View, Step3State, Step3Action, CheckoutEssentials, CheckoutAppointment, CheckoutResult, GuestCheckoutPayload, ClientCheckoutPayload, ClaimVia, ClaimStartInput, ClaimFinishInput, ClaimStartResult, ClaimTokens, ClaimFinishResult, } from "./types.js";
export { step3InitialState, step3Reducer, step3View, isReadyToCheckout, assertReadyToPay, NotReadyToPayError, } from "./reducer.js";
export type { Step3InitInput } from "./reducer.js";
export { guestFromProfile, profileHasPhone, profileHasName, joinE164, splitE164 } from "./prefill.js";
export { MARKETING_DEFAULT_CHECKED, showMarketingConsent, marketingConsentField, } from "./consent.js";
export type { MarketingConsentField } from "./consent.js";
export { buildCheckoutPayload, toClientCheckoutBody, makeClientCheckout, } from "./checkout.js";
export type { BuildPayloadInput, ClientCheckoutDeps } from "./checkout.js";
export { makeGuestClaim } from "./claim.js";
export type { GuestClaim, GuestClaimDeps } from "./claim.js";
export { STEP3_QC, STEP3_ATTR, step3DoorsHTML, step3ConfirmHTML, marketingTickHTML, } from "./views.js";
export type { DoorsOptions, ConfirmModel } from "./views.js";
//# sourceMappingURL=index.d.ts.map