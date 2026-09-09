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

/* ── Guest details (byte-identical to the kit) ──────────────────────────── */

export interface GuestDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/**
 * The couples second guest. `email`/`phone` must be expressible as ABSENT: the
 * backend participantSchema allows null but 400s on `""` (kit types.ts:195-207).
 */
export interface SecondGuestDetails {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
}

/* ── The signed-in member, as the BFF /api/auth/session hands it down ────── */

export interface MemberProfile {
  firstName: string;
  lastName: string;
  email: string;
  emailMasked: string;
  /** E.164 country prefix, e.g. "+356". May be empty on a thin profile (8.4). */
  countryCode: string;
  /** National number without the prefix. May be empty (8.4 inline-ask rule). */
  phone: string;
  initials: string;
}

/** What the host adapter passes down after its one /api/auth/session read. */
export interface BookingSession {
  signedIn: boolean;
  profile?: MemberProfile;
}

/* ── Step 3 state and events ────────────────────────────────────────────── */

/** Which of the three screens renders at `step === "details"` (8, table). */
export type Step3View = "guest-form" | "doors" | "confirm" | "confirm-edit";

export interface Step3State {
  /** ACCOUNT_LOGIN. Off -> today's guest DetailsStep, a true rollback (W-23). */
  accountLoginEnabled: boolean;
  /** ACCOUNT_GUEST_ENABLED. Off drops the guest door only (2.1). */
  guestEnabled: boolean;
  session: BookingSession;
  /** SUBMIT_DETAILS is the ONLY writer of this field (W-10). */
  guest: GuestDetails | null;
  secondGuest: SecondGuestDetails | null;
  notes: string;
  /** Default UNTICKED — false (8.6 fixes the pre-ticked owner default). */
  marketingConsent: boolean;
  /** State A: "Book as a guest" swapped the guest form in place (8.1). */
  guestDoorOpen: boolean;
  /** State B: the member expanded "Edit details" (8.2). */
  editing: boolean;
}

export type Step3Action =
  | {
      type: "SUBMIT_DETAILS";
      guest: GuestDetails;
      secondGuest?: SecondGuestDetails | null;
      notes?: string;
      marketingConsent?: boolean;
    }
  | { type: "OPEN_GUEST_DOOR" }
  | { type: "BACK_TO_DOORS" }
  | { type: "EDIT_DETAILS" }
  | { type: "SIGN_OUT_LOCAL" };

/* ── Checkout ───────────────────────────────────────────────────────────── */

/** The booking essentials Step 3 does not own — chosen in earlier steps. */
export interface CheckoutEssentials {
  serviceId: string;
  optionId?: string | null;
  locationId: string;
  date: string;
  time: string;
  timeZone: string;
  durationMinutes: number;
  staffIds?: string[];
  participants: 1 | 2;
}

export interface CheckoutAppointment {
  id: string;
  bookingRef: string;
}

export interface CheckoutResult {
  appointments: CheckoutAppointment[];
  /** Null when a gift card / free treatment covered the total (no Stripe). */
  checkoutUrl: string | null;
  /** Only the GUEST path returns one; the member path never does (8.5). */
  guestSessionToken?: string;
}

/** The guest checkout body — mirrors the kit's GuestCheckoutPayload exactly. */
export interface GuestCheckoutPayload {
  serviceId: string;
  optionId?: string | null;
  locationId: string;
  date: string;
  time: string;
  timeZone: string;
  durationMinutes: number;
  staffIds?: string[];
  participants: 1 | 2;
  guest: GuestDetails;
  secondGuest?: SecondGuestDetails | null;
  notes?: string;
  marketingConsent?: boolean;
  giftCardCode?: string | null;
  promoCode?: string | null;
  turnstileToken?: string | null;
  origin?: string;
  attribution?: Record<string, string | undefined>;
}

/**
 * The member wire body: the same createAppointmentSchema fields WITHOUT the
 * top-level `guest{}` block (the session is the identity), plus `origin` and
 * `countryCode` (8.5). There is NO `turnstileToken` field on this type at all —
 * the session is the proof of a person, so a member checkout can never carry one.
 */
export interface ClientCheckoutPayload {
  serviceId: string;
  optionId?: string | null;
  locationId: string;
  date: string;
  time: string;
  timeZone: string;
  durationMinutes: number;
  staffIds?: string[];
  participants: 1 | 2;
  secondGuest?: SecondGuestDetails | null;
  notes?: string;
  /** E.164 prefix + national number, split for the backend (W-18). */
  countryCode?: string;
  phone?: string;
  origin?: string;
  giftCardCode?: string | null;
  promoCode?: string | null;
}

/* ── Guest claim (section 10) ───────────────────────────────────────────── */

export type ClaimVia = "email" | "guest-token";

export type ClaimStartInput =
  | { via: "email"; email: string }
  | { via: "guest-token"; guestToken: string };

export type ClaimFinishInput =
  | { via: "email"; email: string; code: string; password: string }
  | { via: "guest-token"; guestToken: string; code: string; password: string };

export interface ClaimStartResult {
  ok: boolean;
  /** Only the guest-token path returns which inbox to open (10, {maskedEmail}). */
  maskedEmail?: string;
}

export interface ClaimTokens {
  accessToken: string;
  refreshToken: string;
}

export type ClaimFinishResult =
  | { signedIn: true; tokens: ClaimTokens; user: { id: string; email: string } }
  | { signedIn: false; error: string };
