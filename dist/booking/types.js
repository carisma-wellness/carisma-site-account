/**
 * src/booking/types.ts — the Step-3-of-3 contract, framework-agnostic.
 *
 * The brand booking kit (React, in the site repo) delegates the *decisions* of
 * Step 3 to this package so five brands share one reducer, one payload builder,
 * one consent rule and one guest-claim client. Nothing here imports React or a
 * DOM lib; the views are string builders (ui/html.ts style) and the reducer is
 * a pure function. Shapes mirror the live kit at spa-website@87e2670:
 *   GuestDetails / SecondGuestDetails   components/booking/types.ts:186-207
 *   GuestCheckoutPayload / CheckoutResult                     :210-267
 *   SUBMIT_DETAILS / isReadyToCheckout   components/booking/reducer.ts:235-244,333-341
 * so a payload this package builds is byte-compatible with the kit's own PayStep
 * and the backend's createAppointmentSchema.
 */
export {};
//# sourceMappingURL=types.js.map