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

export function step3InitialState(input: Step3InitInput): Step3State {
  return {
    accountLoginEnabled: input.accountLoginEnabled,
    guestEnabled: input.guestEnabled ?? true,
    session: input.session,
    guest: null,
    secondGuest: input.seed?.secondGuest ?? null,
    notes: input.seed?.notes ?? "",
    // UNTICKED by default (8.6). The kit ships `true`; this is the fix, shipped
    // unconditionally so it holds even under ACCOUNT_LOGIN=off (W-23).
    marketingConsent: false,
    guestDoorOpen: false,
    editing: false,
  };
}

export function step3Reducer(state: Step3State, action: Step3Action): Step3State {
  switch (action.type) {
    case "SUBMIT_DETAILS":
      // The ONLY writer of `guest` (W-10). A member never sends turnstileToken;
      // consent, when a member submits, is left untouched because the member
      // screen never shows the tick (8.6) — the field is ignored on that path.
      return {
        ...state,
        guest: action.guest,
        secondGuest: action.secondGuest ?? state.secondGuest,
        notes: action.notes ?? state.notes,
        marketingConsent: state.session.signedIn
          ? state.marketingConsent
          : action.marketingConsent ?? state.marketingConsent,
        editing: false,
      };

    case "OPEN_GUEST_DOOR":
      // State A's "Book as a guest": swap the guest form in place, same step,
      // no navigation (8.1, W-12). Never touches `guest`.
      return { ...state, guestDoorOpen: true };

    case "BACK_TO_DOORS":
      return { ...state, guestDoorOpen: false };

    case "EDIT_DETAILS":
      // State B "Edit details": expand the form seeded from the profile (8.2).
      return { ...state, editing: true };

    case "SIGN_OUT_LOCAL":
      // State B "Not you?": sign out on THIS site only and drop into State A with
      // the booking intact (8.2). `guest` clears with the session; notes and the
      // second guest survive because they are diary text, not identity.
      return {
        ...state,
        session: { signedIn: false },
        guest: null,
        guestDoorOpen: false,
        editing: false,
      };

    default:
      return state;
  }
}

/**
 * Which screen renders at the details step (8, the three-row table):
 *   ACCOUNT_LOGIN off                    -> guest-form  (today's DetailsStep)
 *   on + signed out                      -> doors       (State A three doors)
 *   on + signed out + guest door opened  -> guest-form  (the guest form in place)
 *   on + signed in                       -> confirm     (State B confirm card)
 *   on + signed in + editing             -> confirm-edit (the seeded form)
 */
export function step3View(state: Step3State): Step3View {
  if (!state.accountLoginEnabled) return "guest-form";
  if (state.session.signedIn) return state.editing ? "confirm-edit" : "confirm";
  return state.guestDoorOpen ? "guest-form" : "doors";
}

/** True only once SUBMIT_DETAILS has written a guest (W-10). */
export function isReadyToCheckout(state: Step3State): boolean {
  return state.guest !== null;
}

/**
 * The pay guard. Throws unless a guest has been submitted, in EVERY state — this
 * is what makes "bypass SUBMIT_DETAILS" a real refusal and not a silent empty
 * payload. `buildCheckoutPayload` also returns null without a guest; this throws
 * so a caller that forgets the null check cannot proceed either.
 */
export class NotReadyToPayError extends Error {
  constructor() {
    super("Step 3 is not ready to pay: no guest details have been submitted (dispatch SUBMIT_DETAILS first).");
    this.name = "NotReadyToPayError";
  }
}

export function assertReadyToPay(state: Step3State): void {
  if (!isReadyToCheckout(state)) throw new NotReadyToPayError();
}
