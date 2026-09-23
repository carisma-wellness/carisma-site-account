/**
 * What happens when a member presses one of the buttons on their booking.
 *
 * Split in two on purpose. The decisions — which request, what to say before
 * it, what to say after — are pure functions here, exercised by node --test
 * with no DOM. browser.ts owns only the listener and the innerHTML.
 *
 * The rule the whole file turns on: **a member is never charged, and never
 * loses a booking, without being told first.** `cancelIsFree` decides whether
 * we read the preview before asking, and the preview's own numbers go in the
 * question — never a bare "Are you sure?", and never our guess at the fee.
 */
import type { BookingActions } from "./bookingDetail.js";
export type PortalActionName = "confirm" | "cancel" | "reschedule" | "pay" | "rebook" | "membership-pause" | "membership-resume";
export interface ProxyCall {
    path: string;
    method: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
}
export declare const confirmCall: (id: string) => ProxyCall;
export declare const cancellationPreviewCall: (id: string) => ProxyCall;
/**
 * `acceptFee` is the member's answer to the preview, not a default.
 *
 * The server refuses a fee-bearing cancel with 409 FEE_CONSENT_REQUIRED unless
 * it is set, which is the behaviour we want: if this flag were ever sent
 * without asking, the refusal that protects the member would be gone and the
 * card would be charged on a single tap.
 */
export declare const cancelCall: (id: string, acceptFee: boolean) => ProxyCall;
export declare const rescheduleCall: (id: string, startTimeIso: string) => ProxyCall;
/**
 * Settle an outstanding balance.
 *
 * `returnOrigin` is this brand site, so Stripe sends the member back to the
 * booking they paid for rather than to the CarismaSoft app host. The server
 * looks it up in its registered-origin map and takes the host from THAT, so
 * this is a request for a destination, never an instruction — and a site that
 * is not registered simply lands on the old default.
 */
export declare const payBalanceCall: (id: string, returnOrigin?: string | null) => ProxyCall;
export declare const slotsCall: (opts: {
    brandLocationId: string;
    date: string;
    serviceId?: string | null;
    durationMins?: number | null;
}) => ProxyCall;
export declare const membershipCall: (id: string, verb: "pause" | "resume") => ProxyCall;
export interface CancellationPreview {
    kind: string;
    feeAmount: number;
    forfeitAmount: number;
    chargeAmount: number;
    cardLast4: string | null;
    policyText: string;
}
export declare function readCancellationPreview(body: unknown): CancellationPreview;
/**
 * The question put to the member before a cancellation.
 *
 * Every figure comes from the server's preview. Nothing here computes a fee,
 * a percentage or a deposit — the till's arithmetic and this sentence must be
 * the same arithmetic, and the only way to guarantee that is not to do it
 * twice. `autoCharge` is true on every Carisma brand, so when a card is on
 * file the money really does move: the sentence says so in those words.
 */
export declare function cancelQuestion(p: CancellationPreview): string;
/**
 * Whether we must read the preview before asking.
 *
 * `cancelIsFree` is the server's own verdict and it is the only input: asking
 * the member to wait for a network call to be told "this is free" is a worse
 * page, and guessing that a late cancel is free is a charge they did not agree
 * to. When `actions` is missing entirely we read the preview — the cautious
 * side of an unknown.
 */
export declare function needsPreview(actions: Pick<BookingActions, "cancelIsFree"> | null | undefined): boolean;
/**
 * The server's own sentence, or a safe one.
 *
 * CarismaSoft's client errors are written for customers — "This appointment
 * can only be rescheduled online at least 24 hours in advance. Please contact
 * us directly." — so showing them beats inventing a generic apology. What we
 * never show is a status code, a field path or a Joi message.
 */
export declare function messageFromError(body: unknown, status: number, fallback: string): string;
export interface CancelSummary {
    /** The label over the figure — "Cancellation fee", "Free to cancel" — or null when unknown. */
    headline: string | null;
    /** The figure itself, formatted; null when there is none to show. */
    amount: string | null;
    tone: "ok" | "warn" | "neutral";
    /** Plain sentences, in reading order. */
    lines: string[];
    policyText: string;
    /** The destructive button's words: "Cancel booking" or "Cancel booking and pay €60.00". */
    confirmLabel: string;
    /**
     * Sent as `acceptFee`. True ONLY when the sheet showed the member a figure
     * they are agreeing to lose. Unknown is false: the server then refuses a
     * fee-bearing cancel (409) rather than charging on a guess.
     */
    acceptFee: boolean;
}
/**
 * What the cancel sheet says. `preview` is the server's
 * `cancellation-preview`; `free` is `actions.cancelIsFree`. When `free` is
 * true we never read the preview (the server has already said so), and when
 * the preview could not be read we say so instead of implying it is free.
 */
export declare function cancelSummary(preview: CancellationPreview | null, free: boolean, fallbackPolicy?: string): CancelSummary;
export declare const walletAvailabilityCall: () => ProxyCall;
/** Answers `{ url }` — a signed pass download (Apple) or a save link (Google). */
export declare const walletPassCall: (id: string, which: "apple" | "google") => ProxyCall;
/** `{ apple, google }` from the availability read; anything else is "no". */
export declare function readWalletAvailability(body: unknown): {
    apple: boolean;
    google: boolean;
};
//# sourceMappingURL=portalActions.d.ts.map