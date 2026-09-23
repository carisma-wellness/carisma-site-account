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
import { eur, whenRange, untilPhrase, longDate, timeOfDay } from "./money.js";
import { unwrapEnvelope } from "./appointments.js";
import { linkifyPhones, portalShellHTML } from "./portal.js";
import type { CancellationPreview } from "./portalActions.js";
import { stripVenuePrefix } from "./ics.js";
import { instantWords } from "./dialogs.js";

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
  /** The booking's start and end, UTC ISO, as the server sent them. */
  startIso: string;
  endIso: string;
  /** Minutes on the clock (end − start), else the ticket's own duration. */
  minutes: number | null;
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

function clockMinutes(start: string, end: string): number | null {
  const a = Date.parse(start);
  const b = Date.parse(end);
  return Number.isFinite(a) && Number.isFinite(b) && b > a ? Math.round((b - a) / 60_000) : null;
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
      startIso: "",
      endIso: "",
      minutes: null,
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
    startIso: str(a.startTime),
    endIso: str(a.endTime),
    minutes: clockMinutes(str(a.startTime), str(a.endTime)) ?? (num(a.durationMinutes) || services.find((s) => s.durationMins)?.durationMins || null),
  };
}

/* ── Render ─────────────────────────────────────────────────────────────── */

const M = 'data-clarity-mask="True"';
const HOUR = 3_600_000;

/** Statuses that describe a visit still ahead. The server's status, not the clock. */
const ACTIVE = new Set(["BOOKED", "CONFIRMED", "PENDING"]);

export function isActiveBooking(m: Pick<BookingDetailModel, "status">): boolean {
  return ACTIVE.has(m.status);
}

export interface BookingRenderOptions {
  /** This site's brand; the brand label shows only when the booking is another brand's. */
  siteBrand?: string;
  now?: Date;
  /** `/client/wallet/availability`. Absent = neither wallet is offered. */
  wallet?: { apple: boolean; google: boolean } | null;
  /** The server's cancellation preview, when it was read for the policy line. */
  preview?: CancellationPreview | null;
  /** This brand's booking door, for "Book again". */
  bookHref?: string;
}

export type BookingPrimary = "pay" | "reschedule" | "confirm" | "rebook" | null;

function canPay(m: BookingDetailModel): boolean {
  return m.actions.canPayBalance && m.due > 0;
}
function canMove(m: BookingDetailModel): boolean {
  return isActiveBooking(m) && m.actions.canReschedule;
}
function canConfirmIt(m: BookingDetailModel): boolean {
  return m.actions.canConfirm && m.status !== "CONFIRMED";
}

/**
 * The ONE primary: Pay > Reschedule > Confirm > Book again, from the server's
 * capabilities alone. Money owed outranks everything; moving is the CEO's ask.
 */
export function bookingPrimary(m: BookingDetailModel): BookingPrimary {
  if (canPay(m)) return "pay";
  if (canMove(m)) return "reschedule";
  if (canConfirmIt(m)) return "confirm";
  if (m.actions.canRebook) return "rebook";
  return null;
}

function brandKey(s: string): string {
  return s.toLowerCase().replace(/carisma|wellness|club|[^a-z]/g, "");
}

/** "Book again" goes to the treatment when we know it, on this brand's door. */
export function rebookHref(bookHref: string | undefined, serviceId: string | null): string {
  const base = bookHref || "/";
  if (!serviceId) return base;
  return `${base}${base.includes("?") ? "&" : "?"}book=${encodeURIComponent(serviceId)}`;
}

/** What a balance is called, by what the visit became. */
export function dueLabel(status: string): string {
  if (status === "NO_SHOW") return "Missed-visit fee";
  if (status === "COMPLETED") return "Still to pay";
  return "To pay";
}

function chipFor(m: BookingDetailModel): { label: string; tone: string } | null {
  if (m.status === "PENDING") return { label: m.statusLabel, tone: "warn" };
  if (isActiveBooking(m) && canPay(m)) return { label: "Payment due", tone: "warn" };
  switch (m.status) {
    case "BOOKED":
    case "CONFIRMED":
      return { label: m.statusLabel, tone: "ok" };
    case "NO_SHOW":
      return m.due > 0 ? { label: "Fee owed", tone: "warn" } : { label: m.statusLabel, tone: "bad" };
    case "CANCELLED":
    case "PAYMENT_FAILED":
      return { label: m.statusLabel, tone: "bad" };
    default:
      return m.statusLabel ? { label: m.statusLabel, tone: "neutral" } : null;
  }
}

const ICON = (d: string, size = 18) =>
  `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const BACK_ICON = ICON('<path d="M15 6l-6 6 6 6"></path>', 18);
const CAL_ICON = ICON('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"></rect><path d="M3.5 9.5h17M8 3v4M16 3v4M12 13v4M10 15h4"></path>');
const WALLET_ICON = ICON('<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"></path><rect x="4" y="8" width="16.5" height="11" rx="2.5"></rect><path d="M16 13.5h1.5"></path>');
const CANCEL_ICON = ICON('<circle cx="12" cy="12" r="8.5"></circle><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"></path>');
const OUT_ICON = ICON('<path d="M8 16L16 8M9.5 8H16v6.5"></path>', 16);
const CLOCK_ICON =
  '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle>' +
  '<path d="M12 7.5V12l3 2"></path></svg>';

function treatmentOf(m: BookingDetailModel): string {
  const s = m.services.find((x) => x.name);
  return s ? (s.optionName ? `${s.name} · ${s.optionName}` : s.name) : "Your booking";
}

/** The treatment, for page titles and dialog titles. */
export function bookingTreatment(m: BookingDetailModel): string {
  return treatmentOf(m);
}

function btn(action: string, label: string, kind: "primary" | "secondary", id: string, aria?: string): string {
  return (
    `<button type="button" class="cw-btn cw-btn--${kind}" data-cw-action="${action}" data-cw-appt="${escapeHtml(id)}"` +
    (aria ? ` aria-label="${escapeHtml(aria)}"` : "") +
    `>${escapeHtml(label)}</button>`
  );
}

function heroHTML(m: BookingDetailModel, o: BookingRenderOptions): string {
  const day = longDate(m.startIso);
  const from = timeOfDay(m.startIso);
  const to = m.endIso ? timeOfDay(m.endIso) : "";
  const clock = [to ? `${from} – ${to}` : from, m.minutes ? `${m.minutes} min` : ""].filter(Boolean).join(" · ");
  const rel = isActiveBooking(m) ? untilPhrase(m.startIso, o.now) : "";
  const chip = chipFor(m);
  return (
    `<section class="cw-bk-hero" aria-label="When">` +
    (day ? `<p class="cw-bk-hero__day" ${M}>${escapeHtml(day)}</p>` : `<p class="cw-bk-hero__day" ${M}>${escapeHtml(m.when)}</p>`) +
    (clock && day ? `<p class="cw-bk-hero__time" ${M}>${escapeHtml(clock)}</p>` : "") +
    `<div class="cw-bk-hero__meta">` +
    (chip ? `<span class="cw-chip cw-chip--${chip.tone}">${escapeHtml(chip.label)}</span>` : "") +
    (rel ? `<span class="cw-bk-hero__rel">${escapeHtml(rel.charAt(0).toUpperCase() + rel.slice(1))}</span>` : "") +
    `</div></section>`
  );
}

function factsHTML(m: BookingDetailModel): string {
  const fact = (label: string, value: string) =>
    `<div class="cw-fact"><dt class="cw-label">${label}</dt><dd class="cw-fact__value">${value}</dd></div>`;
  const address = stripVenuePrefix(m.address, m.venue);
  const where = m.venue || address
    ? `<span class="cw-bk-where__venue" ${M}>${escapeHtml(m.venue || address)}</span>` +
      (m.venue && address ? `<span class="cw-bk-where__addr" ${M}>${escapeHtml(address)}</span>` : "") +
      (m.mapHref
        ? `<a class="cw-link cw-bk-where__map" href="${escapeHtml(m.mapHref)}" target="_blank" rel="noreferrer">Directions${OUT_ICON}<span class="cw-vh"> (opens Google Maps)</span></a>`
        : "")
    : "";
  const names = m.services.map((s) => (s.optionName ? `${s.name} · ${s.optionName}` : s.name)).filter(Boolean);
  return (
    `<dl class="cw-facts cw-bk-facts">` +
    (where ? fact("Where", `<span class="cw-bk-where">${where}</span>`) : "") +
    (m.staffName ? fact("With", `<span ${M}>${escapeHtml(m.staffName)}</span>`) : "") +
    (m.minutes ? fact("Duration", `${m.minutes} min`) : "") +
    (names.length > 1 ? fact("Treatments", `<span ${M}>${escapeHtml(names.join(", "))}</span>`) : "") +
    `</dl>`
  );
}

function moneyHTML(m: BookingDetailModel, primary: BookingPrimary): string {
  const pay =
    primary === "pay"
      ? `<div class="cw-bk-cta">${btn("pay", `Pay ${eur(m.due)}`, "primary", m.id, `Pay ${eur(m.due)} for ${treatmentOf(m)}`)}</div>`
      : "";
  const head = `<h2 class="cw-label" id="cw-bk-money-title">Payment</h2>`;
  const open = `<section class="cw-card cw-bk-money" aria-labelledby="cw-bk-money-title">${head}`;
  const vat = `<p class="cw-fine cw-bk-money__vat">Prices include VAT</p>`;
  const row = (label: string, value: string, cls = "") =>
    `<div class="cw-bk-money__row${cls}"><span>${escapeHtml(label)}</span><span ${M}>${escapeHtml(value)}</span></div>`;

  if (m.due > 0) {
    // A missed visit's fee is the whole story; the original ticket price
    // beside it only invites the wrong sum.
    const rows =
      m.status === "NO_SHOW"
        ? ""
        : (m.total > 0 ? row("Treatment", eur(m.total)) : "") + (m.paid > 0 ? row("Paid", `− ${eur(m.paid)}`, " is-muted") : "");
    return (
      open +
      (rows ? `<div class="cw-bk-money__rows">${rows}</div>` : "") +
      `<div class="cw-bk-money__due${rows ? "" : " is-alone"}"><span class="cw-bk-money__due-label">${escapeHtml(dueLabel(m.status))}</span>` +
      `<span class="cw-bk-money__due-amount" ${M}>${escapeHtml(eur(m.due))}</span></div>` +
      vat +
      pay +
      `</section>`
    );
  }
  if (m.total > 0 || m.paid > 0) {
    return (
      open +
      `<div class="cw-bk-money__paid"><div><p class="cw-bk-money__paid-label">Paid in full</p>` +
      `<p class="cw-bk-money__paid-amount" ${M}>${escapeHtml(eur(Math.max(m.paid, m.total)))}</p></div>` +
      `<span class="cw-chip cw-chip--ok">Paid</span></div>` +
      vat +
      `</section>`
    );
  }
  if (m.status === "CANCELLED") return "";
  return open + `<p class="cw-bk-money__free">Nothing to pay for this visit.</p></section>`;
}

function actionsHTML(m: BookingDetailModel, primary: BookingPrimary, o: BookingRenderOptions): string {
  const a = m.actions;
  const t = treatmentOf(m);
  const spoken = [t, longDate(m.startIso) ? `on ${longDate(m.startIso)}` : ""].filter(Boolean).join(" ");
  const buttons: string[] = [];
  const secondary = (action: string) => {
    if (action === "reschedule") return btn("reschedule", "Reschedule", "secondary", m.id, `Reschedule ${spoken}`);
    if (action === "confirm") return btn("confirm", "Confirm I'm coming", "secondary", m.id, `Confirm you're coming to ${spoken}`);
    return `<a class="cw-btn cw-btn--secondary" href="${escapeHtml(rebookHref(o.bookHref, m.serviceId))}">Book again</a>`;
  };
  let cta = "";
  if (primary === "reschedule") cta = btn("reschedule", "Reschedule", "primary", m.id, `Reschedule ${spoken}`);
  if (primary === "confirm") cta = btn("confirm", "Confirm I'm coming", "primary", m.id, `Confirm you're coming to ${spoken}`);
  if (primary === "rebook")
    cta = `<a class="cw-btn cw-btn--primary" href="${escapeHtml(rebookHref(o.bookHref, m.serviceId))}">Book again</a>`;
  if (primary !== "reschedule" && canMove(m)) buttons.push(secondary("reschedule"));
  if (primary !== "confirm" && canConfirmIt(m)) buttons.push(secondary("confirm"));
  // Past visit with money owed: Pay leads, Book again follows.
  if (primary !== "rebook" && a.canRebook && !isActiveBooking(m)) buttons.push(secondary("rebook"));

  // Why it cannot move, in the server's words, with the phone a link.
  const reason =
    isActiveBooking(m) && !a.canReschedule && a.reason
      ? `<p class="cw-reason">${CLOCK_ICON}<span>${linkifyPhones(a.reason)}</span></p>`
      : "";
  // The deadline, only when it is close enough to matter. The server's
  // instant; the 48 hours only decides whether to mention it.
  const closes = a.rescheduleClosesAt ? Date.parse(a.rescheduleClosesAt) : NaN;
  const nowMs = (o.now ?? new Date()).getTime();
  const deadline =
    canMove(m) && Number.isFinite(closes) && closes > nowMs && closes - nowMs < 48 * HOUR
      ? `<p class="cw-reason cw-bk-deadline">${CLOCK_ICON}<span>You can move this online until ${escapeHtml(instantWords(a.rescheduleClosesAt as string))}.</span></p>`
      : "";

  const quiet: string[] = [];
  if (isActiveBooking(m) && m.startIso) {
    quiet.push(
      `<button type="button" class="cw-btn cw-btn--quiet cw-bk-quiet__item" data-cw-action="calendar" data-cw-appt="${escapeHtml(m.id)}">${CAL_ICON}Add to calendar</button>`,
    );
    if (o.wallet?.apple) {
      quiet.push(
        `<button type="button" class="cw-btn cw-btn--quiet cw-bk-quiet__item" data-cw-action="wallet" data-cw-wallet="apple" data-cw-appt="${escapeHtml(m.id)}">${WALLET_ICON}Add to Apple Wallet</button>`,
      );
    }
    if (o.wallet?.google) {
      quiet.push(
        `<button type="button" class="cw-btn cw-btn--quiet cw-bk-quiet__item" data-cw-action="wallet" data-cw-wallet="google" data-cw-appt="${escapeHtml(m.id)}">${WALLET_ICON}Add to Google Wallet</button>`,
      );
    }
  }
  const cancel =
    isActiveBooking(m) && a.canCancel
      ? `<button type="button" class="cw-btn cw-btn--danger cw-bk-quiet__item cw-bk-quiet__cancel" data-cw-action="cancel" data-cw-appt="${escapeHtml(m.id)}" aria-label="${escapeHtml(`Cancel ${spoken}`)}">${CANCEL_ICON}Cancel booking</button>`
      : "";

  if (!cta && !buttons.length && !reason && !deadline && !quiet.length && !cancel) return "";
  return (
    `<div class="cw-bk-actions">` +
    (cta ? `<div class="cw-bk-cta">${cta}</div>` : "") +
    (buttons.length ? `<div class="cw-bk-actions__more">${buttons.join("")}</div>` : "") +
    deadline +
    reason +
    (quiet.length || cancel ? `<div class="cw-bk-quiet">${quiet.join("")}${cancel}</div>` : "") +
    `</div>`
  );
}

/** The policy line that leads "Changing this booking" — server figures only. */
export function policyLead(m: BookingDetailModel, preview?: CancellationPreview | null): string {
  const a = m.actions;
  if (!a.canCancel) return "";
  if (a.cancelIsFree && a.freeCancelEndsAt) return `Free to cancel until ${instantWords(a.freeCancelEndsAt)}.`;
  if (a.cancelIsFree) return "Free to cancel.";
  if (!preview) return "";
  if (preview.chargeAmount > 0) return `Cancelling now costs ${eur(preview.chargeAmount)}.`;
  if (preview.forfeitAmount > 0) return `Cancelling now keeps ${eur(preview.forfeitAmount)} of what you've paid.`;
  return "Free to cancel.";
}

function policyHTML(m: BookingDetailModel, o: BookingRenderOptions): string {
  // Only while the visit is ahead: a policy about changing a finished visit
  // is noise at best and reads like a threat at worst.
  if (!m.policyText || !isActiveBooking(m)) return "";
  const lead = policyLead(m, o.preview);
  return (
    `<section class="cw-section cw-bk-policy" aria-labelledby="cw-bk-policy-title">` +
    `<h2 class="cw-section__title" id="cw-bk-policy-title">Changing this booking</h2>` +
    (lead ? `<p class="cw-bk-policy__lead">${escapeHtml(lead)}</p>` : "") +
    `<p class="cw-bk-policy__text cw-prose">${escapeHtml(m.policyText)}</p>` +
    `</section>`
  );
}

export interface BookingViewParts {
  title: string;
  lede: string;
  body: string;
}

function backLink(): string {
  return `<a class="cw-back" href="/account/bookings">${BACK_ICON}<span>Bookings</span></a>`;
}

/**
 * The page, in the three pieces the shell takes. The shell's own h1 IS the
 * treatment — so "focus the h1 after a change" lands on the right words.
 */
export function bookingViewParts(m: BookingDetailModel, o: BookingRenderOptions = {}): BookingViewParts {
  if (!m.found || m.isMedical) {
    return {
      title: "We couldn't find that booking",
      lede: backLink(),
      body:
        `<section class="cw-empty cw-empty--quiet cw-rise">` +
        `<p class="cw-empty__text">It may have been cancelled, or it belongs to a different account.</p>` +
        `<a class="cw-btn cw-btn--secondary" href="/account/bookings">See all your bookings</a></section>`,
    };
  }
  const primary = bookingPrimary(m);
  const showBrand = Boolean(m.brand) && (!o.siteBrand || brandKey(m.brand) !== brandKey(o.siteBrand));
  const lede =
    backLink() + (showBrand ? `<span class="cw-label cw-bk-brand" ${M}>${escapeHtml(m.brand)}</span>` : "");
  const money = moneyHTML(m, primary);
  const actions = actionsHTML(m, primary, o);
  const body =
    `<div class="cw-bk${primary ? " has-cta" : ""}" data-cw-qc="${BOOKING_DETAIL_QC}" data-cw-status="${escapeHtml(m.status)}">` +
    `<div class="cw-bk__main cw-rise">${heroHTML(m, o)}${factsHTML(m)}</div>` +
    (money || actions ? `<div class="cw-bk__side">${money}${actions}</div>` : "") +
    policyHTML(m, o) +
    `</div>`;
  return { title: treatmentOf(m), lede, body };
}

/** The skeleton for one booking: the lockup, the facts and the money card, in place. */
export function bookingSkeletonHTML(): string {
  const line = (w: string, h = 12) => `<span class="cw-skel cw-skel--line" style="width:${w};height:${h}px"></span>`;
  return (
    `<p class="cw-vh">Loading your booking…</p>` +
    `<div class="cw-bk" aria-hidden="true"><div class="cw-bk__main"><div class="cw-bk-hero">${line("62%", 22)}${line("44%", 16)}${line("28%", 24)}</div>` +
    `<div class="cw-bk-facts cw-bk-skel-facts">${line("80%")}${line("55%")}${line("35%")}</div></div>` +
    `<div class="cw-bk__side"><span class="cw-skel cw-skel--card" style="height:188px"></span></div></div>`
  );
}

/** The whole page, in the portal shell. Kept for hosts and tests that render it server-side. */
export function bookingDetailHTML(
  m: BookingDetailModel,
  o: BookingRenderOptions = {},
  shell: { emailMasked?: string; memberName?: string } = {},
): string {
  const parts = bookingViewParts(m, o);
  return portalShellHTML({
    view: "booking",
    title: parts.title,
    lede: parts.lede,
    body: parts.body,
    emailMasked: shell.emailMasked ?? "",
    memberName: shell.memberName,
  });
}
