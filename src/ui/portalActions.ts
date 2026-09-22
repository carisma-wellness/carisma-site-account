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

const PROXY = "/api/auth/proxy";

export type PortalActionName =
  | "confirm"
  | "cancel"
  | "reschedule"
  | "pay"
  | "rebook"
  | "membership-pause"
  | "membership-resume";

export interface ProxyCall {
  path: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

/* ── The requests ──────────────────────────────────────────────────────── */

export const confirmCall = (id: string): ProxyCall => ({
  path: `${PROXY}/client/booking/appointments/${encodeURIComponent(id)}/confirm`,
  method: "POST",
});

export const cancellationPreviewCall = (id: string): ProxyCall => ({
  path: `${PROXY}/client/booking/appointments/${encodeURIComponent(id)}/cancellation-preview`,
  method: "GET",
});

/**
 * `acceptFee` is the member's answer to the preview, not a default.
 *
 * The server refuses a fee-bearing cancel with 409 FEE_CONSENT_REQUIRED unless
 * it is set, which is the behaviour we want: if this flag were ever sent
 * without asking, the refusal that protects the member would be gone and the
 * card would be charged on a single tap.
 */
export const cancelCall = (id: string, acceptFee: boolean): ProxyCall => ({
  path: `${PROXY}/client/booking/appointments/${encodeURIComponent(id)}`,
  method: "DELETE",
  body: { acceptFee },
});

export const rescheduleCall = (id: string, startTimeIso: string): ProxyCall => ({
  path: `${PROXY}/client/booking/appointments/${encodeURIComponent(id)}/reschedule`,
  method: "PATCH",
  body: { startTime: startTimeIso },
});

export const payBalanceCall = (id: string): ProxyCall => ({
  path: `${PROXY}/client/booking/appointments/${encodeURIComponent(id)}/pay-balance`,
  method: "POST",
});

export const slotsCall = (opts: {
  brandLocationId: string;
  date: string;
  serviceId?: string | null;
  durationMins?: number | null;
}): ProxyCall => {
  const q = new URLSearchParams();
  q.set("brandLocationId", opts.brandLocationId);
  q.set("date", opts.date);
  if (opts.serviceId) q.set("serviceId", opts.serviceId);
  if (opts.durationMins) q.set("durationMins", String(opts.durationMins));
  return { path: `${PROXY}/client/booking/slots?${q.toString()}`, method: "GET" };
};

export const membershipCall = (id: string, verb: "pause" | "resume"): ProxyCall => ({
  path: `${PROXY}/client/membership/${encodeURIComponent(id)}/${verb}`,
  method: "POST",
});

/* ── What we say before doing it ───────────────────────────────────────── */

export interface CancellationPreview {
  kind: string;
  feeAmount: number;
  forfeitAmount: number;
  chargeAmount: number;
  cardLast4: string | null;
  policyText: string;
}

export function readCancellationPreview(body: unknown): CancellationPreview {
  const envelope = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const inner = (
    "data" in envelope && envelope.data !== null && typeof envelope.data === "object"
      ? envelope.data
      : envelope
  ) as Record<string, unknown>;
  const o = inner && typeof inner === "object" ? inner : {};
  const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return {
    kind: typeof o.kind === "string" ? o.kind : "",
    feeAmount: n(o.feeAmount),
    forfeitAmount: n(o.forfeitAmount),
    chargeAmount: n(o.chargeAmount),
    cardLast4: typeof o.cardLast4 === "string" ? o.cardLast4 : null,
    policyText: typeof o.policyText === "string" ? o.policyText : "",
  };
}

const money = (n: number): string => {
  try {
    return new Intl.NumberFormat("en-MT", { style: "currency", currency: "EUR" }).format(n);
  } catch {
    return `€${n.toFixed(2)}`;
  }
};

/**
 * The question put to the member before a cancellation.
 *
 * Every figure comes from the server's preview. Nothing here computes a fee,
 * a percentage or a deposit — the till's arithmetic and this sentence must be
 * the same arithmetic, and the only way to guarantee that is not to do it
 * twice. `autoCharge` is true on every Carisma brand, so when a card is on
 * file the money really does move: the sentence says so in those words.
 */
export function cancelQuestion(p: CancellationPreview): string {
  const lines = ["Cancel this booking?"];
  if (p.chargeAmount > 0) {
    lines.push(
      p.cardLast4
        ? `We'll charge ${money(p.chargeAmount)} to the card ending ${p.cardLast4}.`
        : `A charge of ${money(p.chargeAmount)} applies.`,
    );
  }
  if (p.forfeitAmount > 0) {
    lines.push(`${money(p.forfeitAmount)} of what you've already paid is kept.`);
  }
  if (p.chargeAmount <= 0 && p.forfeitAmount <= 0) {
    lines.push("There's nothing to pay.");
  }
  if (p.policyText) lines.push(p.policyText);
  return lines.join("\n\n");
}

/**
 * Whether we must read the preview before asking.
 *
 * `cancelIsFree` is the server's own verdict and it is the only input: asking
 * the member to wait for a network call to be told "this is free" is a worse
 * page, and guessing that a late cancel is free is a charge they did not agree
 * to. When `actions` is missing entirely we read the preview — the cautious
 * side of an unknown.
 */
export function needsPreview(actions: Pick<BookingActions, "cancelIsFree"> | null | undefined): boolean {
  return actions?.cancelIsFree !== true;
}

/* ── What we say when it fails ─────────────────────────────────────────── */

/**
 * The server's own sentence, or a safe one.
 *
 * CarismaSoft's client errors are written for customers — "This appointment
 * can only be rescheduled online at least 24 hours in advance. Please contact
 * us directly." — so showing them beats inventing a generic apology. What we
 * never show is a status code, a field path or a Joi message.
 */
export function messageFromError(body: unknown, status: number, fallback: string): string {
  const envelope = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const msg = envelope.message ?? (envelope.error as Record<string, unknown> | undefined)?.message;
  if (typeof msg === "string" && msg && !/^[A-Z_]+$/.test(msg) && !msg.includes('"')) return msg;
  if (status === 409) return "That time has just been taken. Please pick another.";
  if (status === 401 || status === 403) return "Please sign in again to change this booking.";
  return fallback;
}
