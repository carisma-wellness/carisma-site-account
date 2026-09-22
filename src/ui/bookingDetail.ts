/**
 * One booking, and everything the member can do to it.
 *
 * This is the page the whole account area exists for. Until now a brand site
 * could show that a booking existed and nothing else: no balance, no
 * directions, no way to move it, and a cancellation policy the member could
 * only hear by ringing the desk.
 *
 * The rule that shapes every button here: **the server decides.** The
 * appointment DTO carries an `actions` block (backend appointmentActions.ts)
 * computed from the workspace reschedule window, the brand's own cancellation
 * policy, the payment state and a Malta clock. This module renders that block
 * and never re-derives it. If `actions` is missing — an older backend, a
 * partial deploy — every action is treated as unavailable and the page says so,
 * because a button that refuses on the tap is worse than a button that is not
 * there.
 */
import { escapeHtml } from "./html.js";
import { eur, whenRange, untilPhrase, plainDate, timeOfDay } from "./money.js";
import { unwrapEnvelope } from "./appointments.js";

export const BOOKING_DETAIL_QC = "account-booking-detail-20260922";

/** Mirrors the backend's AppointmentActions. Every field optional on the wire. */
export interface BookingActions {
  canConfirm: boolean;
  canReschedule: boolean;
  rescheduleClosesAt: string | null;
  canCancel: boolean;
  cancelIsFree: boolean;
  freeCancelEndsAt: string | null;
  canPayBalance: boolean;
  balanceDue: number;
  canRebook: boolean;
  reason: string | null;
}

export interface BookingServiceLine {
  /** The catalogue id. What /booking/slots qualifies its staff pool by. */
  serviceId: string | null;
  name: string;
  optionName: string | null;
  price: number;
  durationMins: number | null;
  staffName: string | null;
}

export interface BookingDetailModel {
  id: string;
  found: boolean;
  status: string;
  /** "Booked" / "Confirmed" / "Reserved — payment pending" … */
  statusLabel: string;
  brand: string;
  venue: string;
  address: string;
  mapHref: string | null;
  when: string;
  services: BookingServiceLine[];
  staffName: string | null;
  total: number;
  paid: number;
  due: number;
  actions: BookingActions;
  /** The brand's own policy sentence, verbatim from CarismaSoft. */
  policyText: string;
  bookingRef: string | null;
  isMedical: boolean;
  /**
   * The three fields a reschedule picker cannot work without: the (brand,
   * venue) pair, the treatment, and how long it takes. Null on an older
   * backend, and `openReschedule` refuses rather than asking for availability
   * it cannot describe.
   */
  brandLocationId: string | null;
  serviceId: string | null;
  durationMins: number | null;
  walletAppleHref: string;
  walletGoogleHref: string;
}

const NO_ACTIONS: BookingActions = {
  canConfirm: false,
  canReschedule: false,
  rescheduleClosesAt: null,
  canCancel: false,
  cancelIsFree: false,
  freeCancelEndsAt: null,
  canPayBalance: false,
  balanceDue: 0,
  canRebook: false,
  reason: null,
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * The words a member reads for a machine status.
 *
 * PENDING is the one that matters: it is an unpaid hold created by a checkout
 * that never settled, and calling it "Booked" tells someone they have an
 * appointment they do not have.
 */
export function statusLabel(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "Confirmed";
    case "BOOKED":
      return "Booked";
    case "PENDING":
      return "Reserved — payment pending";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "NO_SHOW":
      return "Missed";
    case "PAYMENT_FAILED":
      return "Payment failed";
    default:
      return status ? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ") : "";
  }
}

function mapHrefFor(lat: unknown, lng: unknown, address: string): string | null {
  const la = Number(lat);
  const ln = Number(lng);
  if (Number.isFinite(la) && Number.isFinite(ln) && (la !== 0 || ln !== 0)) {
    return `https://www.google.com/maps/search/?api=1&query=${la},${ln}`;
  }
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return null;
}

/** Read the `actions` block, defaulting every capability to OFF when absent. */
export function readActions(raw: unknown): BookingActions {
  if (!raw || typeof raw !== "object") return NO_ACTIONS;
  const a = raw as Record<string, unknown>;
  return {
    canConfirm: a.canConfirm === true,
    canReschedule: a.canReschedule === true,
    rescheduleClosesAt: typeof a.rescheduleClosesAt === "string" ? a.rescheduleClosesAt : null,
    canCancel: a.canCancel === true,
    cancelIsFree: a.cancelIsFree === true,
    freeCancelEndsAt: typeof a.freeCancelEndsAt === "string" ? a.freeCancelEndsAt : null,
    canPayBalance: a.canPayBalance === true,
    balanceDue: num(a.balanceDue),
    canRebook: a.canRebook === true,
    reason: typeof a.reason === "string" && a.reason ? a.reason : null,
  };
}

export function buildBookingDetailModel(body: unknown, id: string): BookingDetailModel {
  const inner = unwrapEnvelope(body);
  if (!inner || typeof inner !== "object") {
    return {
      id,
      found: false,
      status: "",
      statusLabel: "",
      brand: "",
      venue: "",
      address: "",
      mapHref: null,
      when: "",
      services: [],
      staffName: null,
      total: 0,
      paid: 0,
      due: 0,
      actions: NO_ACTIONS,
      policyText: "",
      bookingRef: null,
      isMedical: false,
      brandLocationId: null,
      serviceId: null,
      durationMins: null,
      walletAppleHref: "",
      walletGoogleHref: "",
    };
  }
  const a = inner as Record<string, unknown>;
  const venue = (a.venue && typeof a.venue === "object" ? a.venue : {}) as Record<string, unknown>;
  const brand = str(venue.name);
  const address = str(venue.address);

  // Services arrive either flat (`services`) on a single booking, or nested
  // under `participants` on a group/couples one. Both shapes are live.
  const flat = Array.isArray(a.services) ? (a.services as Array<Record<string, unknown>>) : [];
  const participants = Array.isArray(a.participants)
    ? (a.participants as Array<Record<string, unknown>>)
    : [];
  const nested = participants.flatMap((p) =>
    Array.isArray(p.services) ? (p.services as Array<Record<string, unknown>>) : [],
  );
  const services: BookingServiceLine[] = [...flat, ...nested].map((s) => ({
    serviceId: str(s.serviceId) || null,
    name: str(s.name),
    optionName: str(s.optionName) || null,
    price: num(s.price),
    durationMins: Number.isFinite(Number(s.durationMins)) ? Number(s.durationMins) : null,
    staffName: str(s.staffName) || null,
  }));

  const total = num(a.totalAmount);
  const paid = num(a.amountPaid);
  const actions = readActions(a.actions);
  // Prefer the ledger's own figure (actions.balanceDue, which came from the
  // balance-chase service) over subtracting two numbers that may not be the
  // two numbers: a completed visit can carry products the ticket total never
  // knew about.
  const due = actions.balanceDue > 0 ? actions.balanceDue : Math.max(0, num(a.amountToPay) - paid);

  return {
    id: str(a.id) || id,
    found: true,
    status: str(a.status),
    statusLabel: statusLabel(str(a.status)),
    brand,
    venue: str(venue.locationName) || str((venue as Record<string, unknown>).name),
    address,
    mapHref: mapHrefFor(venue.lat, venue.lng, address),
    when: whenRange(str(a.startTime), str(a.endTime)),
    services,
    staffName: services.find((s) => s.staffName)?.staffName ?? null,
    total,
    paid,
    due,
    actions,
    policyText: str(a.policyText) || str((a.cancellationPolicy as Record<string, unknown> | undefined)?.policyText),
    bookingRef: str(a.bookingRef) || null,
    isMedical: brand.toLowerCase().includes("medical"),
    brandLocationId: str(venue.brandLocationId) || null,
    // The LEAD treatment. A reschedule shifts every line by one delta, so the
    // availability question is about the first service and the whole ticket
    // moves with it.
    serviceId: services.find((s) => s.serviceId)?.serviceId ?? null,
    durationMins: num(a.durationMinutes) || services.find((s) => s.durationMins)?.durationMins || null,
    walletAppleHref: `/api/auth/proxy/client/wallet/appointments/${encodeURIComponent(str(a.id) || id)}/apple`,
    walletGoogleHref: `/api/auth/proxy/client/wallet/appointments/${encodeURIComponent(str(a.id) || id)}/google`,
  };
}

/* ── Render ─────────────────────────────────────────────────────────────── */

const M = 'data-clarity-mask="True"';

function moneyBlock(m: BookingDetailModel): string {
  if (m.total <= 0 && m.paid <= 0 && m.due <= 0) return "";
  const row = (label: string, value: string, strong = false) =>
    `<div class="carisma-portal__row${strong ? " is-strong" : ""}">` +
    `<span>${escapeHtml(label)}</span><span ${M}>${escapeHtml(value)}</span></div>`;
  const lines =
    row("Treatment", eur(m.total)) +
    (m.paid > 0 ? row("Paid", eur(m.paid)) : "") +
    (m.due > 0 ? row("Due on the day", eur(m.due), true) : "");
  const pay = m.actions.canPayBalance
    ? `<button type="button" class="carisma-portal__btn is-primary" data-cw-action="pay" data-cw-appt="${escapeHtml(m.id)}">Pay ${escapeHtml(eur(m.due))} now</button>`
    : "";
  return (
    `<section class="carisma-portal__block"><h2 class="carisma-portal__eyebrow">Payment</h2>` +
    lines +
    `<p class="carisma-portal__fine">VAT included.</p>` +
    pay +
    `</section>`
  );
}

function actionsBlock(m: BookingDetailModel): string {
  const a = m.actions;
  const btn = (action: string, label: string, primary = false) =>
    `<button type="button" class="carisma-portal__btn${primary ? " is-primary" : ""}" ` +
    `data-cw-action="${action}" data-cw-appt="${escapeHtml(m.id)}">${escapeHtml(label)}</button>`;

  const buttons = [
    a.canConfirm ? btn("confirm", "Confirm I'm coming", true) : "",
    a.canReschedule ? btn("reschedule", "Reschedule") : "",
    a.canCancel ? btn("cancel", "Cancel booking") : "",
    a.canRebook ? btn("rebook", "Book again", true) : "",
  ]
    .filter(Boolean)
    .join("");

  // Wallet and calendar are always available on a future booking — they change
  // nothing, so no capability gates them.
  const keep =
    a.canConfirm || a.canReschedule || a.canCancel
      ? `<a class="carisma-portal__btn is-quiet" href="${escapeHtml(m.walletAppleHref)}">Add to Apple Wallet</a>` +
        `<a class="carisma-portal__btn is-quiet" href="${escapeHtml(m.walletGoogleHref)}">Add to Google Wallet</a>`
      : "";

  // The sentence. Shown whenever the server sent one, whether or not any
  // button survived — it is the only thing that tells a member why.
  const reason = a.reason ? `<p class="carisma-portal__note">${escapeHtml(a.reason)}</p>` : "";

  if (!buttons && !keep && !reason) return "";
  return `<section class="carisma-portal__block carisma-portal__actions">${buttons}${keep}${reason}</section>`;
}

function policyBlock(m: BookingDetailModel): string {
  const a = m.actions;
  if (!m.policyText && !a.freeCancelEndsAt) return "";
  // Malta wall clock, via timeOfDay — never toISOString().slice(), which is
  // UTC and renders the wrong hour for every reader in this country.
  const freeUntil =
    a.freeCancelEndsAt && a.cancelIsFree
      ? `<p>Free to cancel until ${escapeHtml(plainDate(a.freeCancelEndsAt))} at ` +
        `${escapeHtml(timeOfDay(a.freeCancelEndsAt))} — ` +
        `${escapeHtml(untilPhrase(a.freeCancelEndsAt))}.</p>`
      : "";
  const policy = m.policyText ? `<p>${escapeHtml(m.policyText)}</p>` : "";
  return (
    `<section class="carisma-portal__block"><h2 class="carisma-portal__eyebrow">Changing this booking</h2>` +
    freeUntil +
    policy +
    `</section>`
  );
}

export function bookingDetailHTML(m: BookingDetailModel): string {
  if (!m.found) {
    return (
      `<main class="carisma-portal" data-cw-qc="${BOOKING_DETAIL_QC}">` +
      `<p class="carisma-portal__eyebrow">Carisma</p>` +
      `<h1 class="carisma-portal__title">We couldn't find that booking</h1>` +
      `<p class="carisma-portal__empty">It may have been cancelled, or it belongs to a different account. ` +
      `<a href="/account/bookings">See all your bookings</a></p></main>`
    );
  }

  const serviceNames = m.services
    .map((s) => (s.optionName ? `${s.name} · ${s.optionName}` : s.name))
    .filter(Boolean);
  const title = serviceNames[0] || "Your booking";
  const extra = serviceNames.length > 1
    ? `<p class="carisma-portal__lede" ${M}>${escapeHtml(serviceNames.slice(1).join(" · "))}</p>`
    : "";

  const place = [m.venue, m.address].filter(Boolean).join(", ");
  const placeLine = place
    ? `<p class="carisma-portal__lede" ${M}>${escapeHtml(place)}` +
      (m.mapHref ? ` · <a href="${escapeHtml(m.mapHref)}" rel="noreferrer">Map</a>` : "") +
      `</p>`
    : "";
  const withWhom = m.staffName
    ? `<p class="carisma-portal__lede" ${M}>With ${escapeHtml(m.staffName)}</p>`
    : "";

  return (
    `<main class="carisma-portal" data-cw-qc="${BOOKING_DETAIL_QC}" data-cw-status="${escapeHtml(m.status)}">` +
    `<p class="carisma-portal__eyebrow"><a href="/account/bookings">← All bookings</a></p>` +
    `<p class="carisma-portal__eyebrow" ${M}>${escapeHtml(m.brand)}</p>` +
    `<h1 class="carisma-portal__title" ${M}>${escapeHtml(m.when)}</h1>` +
    `<p class="carisma-portal__subtitle" ${M}>${escapeHtml(title)}</p>` +
    extra +
    `<p class="carisma-portal__status">${escapeHtml(m.statusLabel)}</p>` +
    placeLine +
    withWhom +
    moneyBlock(m) +
    actionsBlock(m) +
    policyBlock(m) +
    `</main>`
  );
}
