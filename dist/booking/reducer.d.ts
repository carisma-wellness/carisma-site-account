/**
 * src/booking/reducer.ts — the Step 3 state machine.
 *
 * The one invariant this file exists to hold is W-10: SUBMIT_DETAILS is the
 * ONLY writer of `state.guest`, in every state — the signed-in confirm card
 * dispatches it from the profile, the guest form dispatches it from its fields,
 * and nothing else ever sets `guest`. `isReadyToCheckout` requires `guest`, and
 * the pay guard refuses without it. That is the negative control: bypass
 * SUBMIT_DETAILS and no payload can be built.
 *
 * Mirrors the live kit (components/booking/reducer.ts:235-244,333-341@87e2670)
 * for the Step-3 slice, minus the parts the kit owns (service/venue/slot live in
 * the wider BookingFlowState; this reducer is only the details step).
 */
import type { Step3Action, Step3State, Step3View } from "./types.js";
export interface Step3InitInput {
    accountLoginEnabled: boolean;
    guestEnabled?: boolean;
    session: Step3State["session"];
    /** A resume snapshot may seed notes / secondGuest, never `guest` (W-10, W-19). */
    seed?: Partial<Pick<Step3State, "notes" | "secondGuest">>;
}
export declare function step3InitialState(input: Step3InitInput): Step3State;
export declare function step3Reducer(state: Step3State, action: Step3Action): Step3State;
/**
 * Which screen renders at the details step (8, the three-row table):
 *   ACCOUNT_LOGIN off                    -> guest-form  (today's DetailsStep)
 *   on + signed out                      -> doors       (State A three doors)
 *   on + signed out + guest door opened  -> guest-form  (the guest form in place)
 *   on + signed in                       -> confirm     (State B confirm card)
 *   on + signed in + editing             -> confirm-edit (the seeded form)
 */
export declare function step3View(state: Step3State): Step3View;
/** True only once SUBMIT_DETAILS has written a guest (W-10). */
export declare function isReadyToCheckout(state: Step3State): boolean;
/**
 * The pay guard. Throws unless a guest has been submitted, in EVERY state — this
 * is what makes "bypass SUBMIT_DETAILS" a real refusal and not a silent empty
 * payload. `buildCheckoutPayload` also returns null without a guest; this throws
 * so a caller that forgets the null check cannot proceed either.
 */
export declare class NotReadyToPayError extends Error {
    constructor();
}
export declare function assertReadyToPay(state: Step3State): void;
//# sourceMappingURL=reducer.d.ts.map