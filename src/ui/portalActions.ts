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

/**
 * Settle an outstanding balance.
 *
 * `returnOrigin` is this brand site, so Stripe sends the member back to the
 * booking they paid for rather than to the CarismaSoft app host. The server
 * looks it up in its registered-origin map and takes the host from THAT, so
 * this is a request for a destination, never an instruction — and a site that
 * is not registered simply lands on the old default.
 */
export const payBalanceCall = (id: string, returnOrigin?: string | null): ProxyCall => ({
  path: `${PROXY}/client/booking/appointments/${encodeURIComponent(id)}/pay-balance`,
  method: "POST",
  body: returnOrigin ? { returnOrigin } : {},
});

/**
 * Pay what is still owed on a package. The server mints the amount from the
 * package itself; the body names only where Stripe should send the member back
 * (checked against the server's registered-origin map, like `payBalanceCall`).
 */
export const packagePayCall = (id: string, origin?: string | null): ProxyCall => ({
  path: `${PROXY}/client/packages/${encodeURIComponent(id)}/pay-balance`,
  method: "POST",
  body: origin ? { origin } : {},
});

/** The return page's settle-now read of the package Checkout Stripe sent the member back from. */
export const packagePayConfirmCall = (id: string, sessionId: string): ProxyCall => ({
  path: `${PROXY}/client/packages/${encodeURIComponent(id)}/pay-balance/confirm`,
  method: "POST",
  body: { sessionId },
});

/**
 * Pay an open membership invoice (hosted Stripe Checkout). Like a package, the
 * server mints the amount from the invoice; the body only names where Stripe
 * should send the member back, checked against the registered-origin map.
 */
export const invoicePayCall = (id: string, origin?: string | null): ProxyCall => ({
  path: `${PROXY}/client/membership/invoices/${encodeURIComponent(id)}/pay`,
  method: "POST",
  body: origin ? { origin } : {},
});

/** The Payments page's settle-now read of the invoice Checkout Stripe sent the member back from. */
export const invoicePayConfirmCall = (id: string, sessionId: string): ProxyCall => ({
  path: `${PROXY}/client/membership/invoices/${encodeURIComponent(id)}/pay/confirm`,
  method: "POST",
  body: { sessionId },
});

/** `?invoice_paid=<id>&session_id=cs_...` -> what to confirm, or null. Shape-checked: anyone can type a URL. */
export function invoiceReturnFrom(search: string): { invoiceId: string; sessionId: string } | null {
  let q: URLSearchParams;
  try {
    q = new URLSearchParams(search || "");
  } catch {
    return null;
  }
  const invoiceId = q.get("invoice_paid") || "";
  const sessionId = q.get("session_id") || "";
  if (!/^[0-9a-fA-F-]{36}$/.test(invoiceId) || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return null;
  return { invoiceId, sessionId };
}

/**
 * Why a statement Pay now could not open Stripe, in the member's words. The
 * server's own sentence wins; a bare code never reaches the page, and a 409
 * here is never "that time was taken" (nothing is being booked).
 */
export function statementPayFailureMessage(body: unknown, status: number): string {
  const envelope = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const msg = envelope.message ?? (envelope.error as Record<string, unknown> | undefined)?.message;
  if (typeof msg === "string" && msg && !/^[A-Z_]+$/.test(msg) && !msg.includes('"')) return msg;
  if (status === 409) return "This one can't be paid online yet. The team can take it at your next visit.";
  if (status === 401 || status === 403) return "Please sign in again to pay.";
  return "We couldn't open the payment just now. Please try again in a moment.";
}

/**
 * `?paid=package&pkg=<id>&session_id=cs_…` → what to confirm, or null. Both
 * are shape-checked: they came in on a URL anyone can type.
 */
export function packageReturnFrom(search: string): { packageId: string; sessionId: string } | null {
  let q: URLSearchParams;
  try {
    q = new URLSearchParams(search || "");
  } catch {
    return null;
  }
  if (q.get("paid") !== "package") return null;
  const packageId = q.get("pkg") || "";
  const sessionId = q.get("session_id") || "";
  if (!/^[0-9a-fA-F-]{36}$/.test(packageId) || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return null;
  return { packageId, sessionId };
}

/**
 * Book one session against a package the member owns.
 *
 * `paymentType: "PACKAGE"` + `clientPackageId`: the server turns the line into
 * a reservation on the package and takes no card. It refuses (409) a session
 * that is not paid for yet, a time someone else just took, or a treatment the
 * package does not cover — the member is never charged here.
 */
export const packageBookCall = (opts: {
  brandId: string;
  clientPackageId: string;
  serviceId: string;
  serviceOptionId: string | null;
  brandLocationId: string;
  startTime: string;
  origin?: string | null;
}): ProxyCall => ({
  path: `${PROXY}/client/booking/checkout`,
  method: "POST",
  body: {
    brandId: opts.brandId,
    paymentType: "PACKAGE",
    clientPackageId: opts.clientPackageId,
    participants: [
      {
        isPrimary: true,
        services: [
          {
            serviceId: opts.serviceId,
            ...(opts.serviceOptionId ? { serviceOptionId: opts.serviceOptionId } : {}),
            brandLocationId: opts.brandLocationId,
            startTime: opts.startTime,
          },
        ],
      },
    ],
    ...(opts.origin ? { origin: opts.origin } : {}),
  },
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

/* ── The cancel sheet, from the server's own figures ───────────────────── */

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
export function cancelSummary(preview: CancellationPreview | null, free: boolean, fallbackPolicy = ""): CancelSummary {
  const policyText = (preview && preview.policyText) || fallbackPolicy || "";
  if (free && !preview) {
    return {
      headline: "Free to cancel",
      amount: null,
      tone: "ok",
      lines: ["There's nothing to pay."],
      policyText,
      confirmLabel: "Cancel booking",
      acceptFee: false,
    };
  }
  if (!preview) {
    return {
      headline: null,
      amount: null,
      tone: "neutral",
      lines: ["We couldn't check whether a fee applies just now. If one does, we'll ask you before anything is charged."],
      policyText,
      confirmLabel: "Cancel booking",
      acceptFee: false,
    };
  }
  const lines: string[] = [];
  if (preview.chargeAmount > 0) {
    lines.push(
      preview.cardLast4
        ? `We'll charge ${money(preview.chargeAmount)} to the card ending ${preview.cardLast4}.`
        : `A charge of ${money(preview.chargeAmount)} applies.`,
    );
  }
  if (preview.forfeitAmount > 0) lines.push(`${money(preview.forfeitAmount)} of what you've already paid is kept.`);
  if (preview.chargeAmount <= 0 && preview.forfeitAmount <= 0) {
    return {
      headline: "Free to cancel",
      amount: null,
      tone: "ok",
      lines: ["There's nothing to pay."],
      policyText,
      confirmLabel: "Cancel booking",
      acceptFee: false,
    };
  }
  return {
    headline: preview.chargeAmount > 0 ? "Cancellation fee" : "Kept from what you've paid",
    amount: money(preview.chargeAmount > 0 ? preview.chargeAmount : preview.forfeitAmount),
    tone: "warn",
    lines,
    policyText,
    confirmLabel: preview.chargeAmount > 0 ? `Cancel booking and pay ${money(preview.chargeAmount)}` : "Cancel booking",
    acceptFee: true,
  };
}

/* ── Wallet passes ─────────────────────────────────────────────────────── */

export const walletAvailabilityCall = (): ProxyCall => ({
  path: `${PROXY}/client/wallet/availability`,
  method: "GET",
});

/** Answers `{ url }` — a signed pass download (Apple) or a save link (Google). */
export const walletPassCall = (id: string, which: "apple" | "google"): ProxyCall => ({
  path: `${PROXY}/client/wallet/appointments/${encodeURIComponent(id)}/${which}`,
  method: "GET",
});

/** `{ apple, google }` from the availability read; anything else is "no". */
export function readWalletAvailability(body: unknown): { apple: boolean; google: boolean } {
  const envelope = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const inner = (
    "data" in envelope && envelope.data !== null && typeof envelope.data === "object" ? envelope.data : envelope
  ) as Record<string, unknown>;
  return { apple: inner?.apple === true, google: inner?.google === true };
}

/* ── Package: pay now / book now ───────────────────────────────────────── */

/** The Stripe Checkout URL out of a pay-balance answer, or "" (https only). */
export function readCheckoutUrl(body: unknown): string {
  const data = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const inner = (data.data && typeof data.data === "object" ? data.data : data) as Record<string, unknown>;
  const url = typeof inner.checkoutUrl === "string" ? inner.checkoutUrl : "";
  return /^https:\/\//.test(url) ? url : "";
}

/**
 * The appointment a package booking made, from the checkout answer. The
 * member checkout has answered in more than one shape over time, so every one
 * it has used is read; "" when none carries an id (the booking still stands —
 * the page re-reads and the bookings list shows it).
 */
export function readBookedAppointmentId(body: unknown): string {
  const data = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const inner = (data.data && typeof data.data === "object" ? data.data : data) as Record<string, unknown>;
  const direct = inner.appointmentId ?? (inner.appointment as Record<string, unknown> | undefined)?.id;
  if (typeof direct === "string" && direct) return direct;
  const list = Array.isArray(inner.appointments)
    ? inner.appointments
    : Array.isArray(inner.appointmentIds)
      ? inner.appointmentIds
      : [];
  const first = list[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && typeof (first as Record<string, unknown>).id === "string") {
    return (first as Record<string, unknown>).id as string;
  }
  return "";
}

/** The error code on a refusal ("PACKAGE_SESSION_LOCKED"), or "". */
export function errorCodeOf(body: unknown): string {
  const envelope = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const code = envelope.code ?? (envelope.error as Record<string, unknown> | undefined)?.code;
  return typeof code === "string" ? code : "";
}

/** What to say when a package booking is refused. */
export function packageBookFailureMessage(body: unknown, status: number, fallback: string): string {
  const code = errorCodeOf(body);
  if (code === "PACKAGE_SESSION_LOCKED") return "Your next session unlocks once it's paid. Pay now, then book.";
  if (code === "PACKAGE_EXHAUSTED" || code === "PACKAGE_NO_SESSIONS") return "There are no sessions left on this package.";
  if (code === "PACKAGE_EXPIRED" || code === "PACKAGE_NOT_ACTIVE") return "This package can't be used any more. Please call us.";
  return messageFromError(body, status, fallback);
}

/**
 * A 409 that is about the TIME (someone took it), not about the package or the
 * member. Only a refusal that names no code, or a slot/availability code, reads
 * as "someone just took it"; anything else (the member's own overlapping
 * booking, a package refusal) is said in the server's own words.
 */
export function isTakenTimeRefusal(body: unknown, status: number): boolean {
  if (status !== 409) return false;
  const code = errorCodeOf(body);
  return !code || /SLOT|TAKEN|UNAVAILABLE|NOT_AVAILABLE|STAFF_BUSY|NO_STAFF/.test(code);
}
