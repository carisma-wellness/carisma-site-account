/**
 * Realistic member data for the design lab, shaped exactly like the live
 * CarismaSoft DTOs (booking.service formatAppointmentCard / formatAppointmentDetail,
 * client-account statement/documents, gift cards, packages, membership).
 *
 * Every time is relative to NOW so the 24-hour window lands where the scenario
 * says it does: a booking "3 days out" is reschedulable, one "tomorrow 09:00"
 * may or may not be, one "in 5 hours" never is.
 */
const H = 3600_000;
const now = Date.now();
/** Round to the next half hour, so the lab never shows a 00:35 appointment. */
const half = (ms) => Math.ceil(ms / (30 * 60_000)) * 30 * 60_000;
const at = (hours) => new Date(half(now + hours * H)).toISOString();
/** N days from today at HH:MM Malta (CEST, +02:00 — the lab is a September world). */
const maltaDay = (days, hhmm) => {
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Malta", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(now + days * 24 * H));
  return new Date(`${d}T${hhmm}:00+02:00`).toISOString();
};
const plus = (iso, mins) => new Date(Date.parse(iso) + mins * 60_000).toISOString();

const ACTIONS = {
  open: (over = {}) => ({ canConfirm: true, canReschedule: true, rescheduleClosesAt: null, canCancel: true, cancelIsFree: true, freeCancelEndsAt: null, canPayBalance: false, balanceDue: 0, canRebook: false, reason: null, ...over }),
};

function card(o) {
  const start = o.start;
  return {
    id: o.id,
    status: o.status || "BOOKED",
    startTime: start,
    endTime: plus(start, o.mins || 60),
    totalAmount: o.total ?? 0,
    amountPaid: o.paid ?? 0,
    brandId: o.brandId || "b",
    brandName: o.brand,
    locationName: o.venue,
    primaryServiceName: o.service,
    staffName: o.staff || null,
    serviceCount: 1,
    venuePhone: "+35627802062",
    balance: o.balanceDue ? { amount: o.balanceDue, since: at(-48) } : null,
    actions: o.actions,
  };
}

export const UPCOMING = [
  card({ id: "u1", start: maltaDay(3, "10:00"), mins: 60, brand: "Carisma Spa", venue: "Hugo's Hotel", service: "Couples Full Body Massage", staff: "Maria Borg", total: 160, paid: 160,
    actions: ACTIONS.open({ rescheduleClosesAt: at(48), freeCancelEndsAt: at(48) }) }),
  card({ id: "u2", start: at(28), mins: 45, brand: "Carisma Slimming", venue: "Grand Hotel Excelsior", service: "Lipocavitation", staff: "Katya", total: 120, paid: 80, balanceDue: 40,
    actions: ACTIONS.open({ rescheduleClosesAt: at(4), freeCancelEndsAt: at(4), canPayBalance: true, balanceDue: 40 }) }),
  card({ id: "u3", start: at(5), mins: 20, brand: "Pulse", venue: "Grand Hotel Excelsior", service: "Club Tour", staff: "David Jangelovski", total: 0, paid: 0,
    actions: ACTIONS.open({ canReschedule: false, cancelIsFree: false, reason: "Online changes close 24 hours before your appointment. To move this one, call Pulse on +35627802062." }) }),
  card({ id: "u4", start: maltaDay(5, "16:30"), mins: 30, brand: "Carisma Aesthetics", venue: "InterContinental Malta", service: "Free Skin Consultation", staff: "Dr Elena", total: 0, paid: 0,
    actions: ACTIONS.open({ rescheduleClosesAt: at(96), freeCancelEndsAt: at(96) }) }),
];

export const PAST = [
  card({ id: "p1", status: "COMPLETED", start: maltaDay(-10, "11:00"), brand: "Carisma Spa", venue: "Hyatt Regency", service: "Hydrafacial", staff: "Anna", total: 95, paid: 95,
    actions: ACTIONS.open({ canConfirm: false, canReschedule: false, canCancel: false, canRebook: true }) }),
  card({ id: "p2", status: "CANCELLED", start: maltaDay(-20, "14:00"), brand: "Carisma Slimming", venue: "Grand Hotel Excelsior", service: "EMSculpt Neo · 30 min", total: 150, paid: 0,
    actions: ACTIONS.open({ canConfirm: false, canReschedule: false, canCancel: false, canRebook: true }) }),
  card({ id: "p3", status: "NO_SHOW", start: maltaDay(-30, "09:30"), brand: "Carisma Spa", venue: "Novotel", service: "Hammam Ritual", total: 70, paid: 0, balanceDue: 35,
    actions: ACTIONS.open({ canConfirm: false, canReschedule: false, canCancel: false, canRebook: true, canPayBalance: true, balanceDue: 35 }) }),
];

function detail(c, extra = {}) {
  return {
    ...c,
    durationMinutes: Math.round((Date.parse(c.endTime) - Date.parse(c.startTime)) / 60000),
    amountToPay: c.totalAmount,
    bookingRef: "CW-" + c.id.toUpperCase(),
    venue: {
      brandLocationId: "bl-" + c.id,
      name: c.brandName,
      locationName: c.locationName,
      address: c.locationName + ", Great Siege Road, Floriana FRN 1810, Malta",
      lat: 35.8936, lng: 14.5064,
    },
    services: [{ serviceId: "svc-" + c.id, name: c.primaryServiceName, optionName: null, price: c.totalAmount, durationMins: 45, staffName: c.staffName }],
    policyText: "Cancel free of charge up to 24 hours before your appointment. Later cancellations are charged 50% and no-shows 100% of the booked services.",
    ...extra,
  };
}

export const DETAIL = Object.fromEntries([...UPCOMING, ...PAST].map((c) => [c.id, detail(c)]));

export const SESSION = {
  signedIn: true,
  initials: "MG",
  profile: { firstName: "Mert", lastName: "Gulen", emailMasked: "m***@gmail.com", countryCode: "+356", phone: "79123456", initials: "MG" },
  upcoming: UPCOMING,
};

const EMPTY_SESSION = { ...SESSION, upcoming: [] };

export const GIFT_CARDS = [
  { code: "GC-4K7Q-19", balance: 50, originalValue: 100, expiresAt: at(24 * 120), purchaserName: "Sarah" },
  { code: "GC-9P2M-44", balance: 150, originalValue: 150, expiresAt: at(24 * 300), purchaserName: null },
];
export const PACKAGES = [{ planNameSnapshot: "Six Signature Facials", sessionsRemaining: 4, sessionsTotal: 6, expiresAt: at(24 * 90), amountDue: 0 }];
export const STATEMENT = {
  totalDue: 75,
  due: [
    { kind: "appointment_balance", description: "Lipocavitation", amountDue: 40, amountPaid: 80, total: 120, dueAt: at(28), occurredAt: at(-48), appointmentId: "u2" },
    { kind: "cancellation_fee", description: "Missed appointment — Hammam Ritual", amountDue: 35, amountPaid: 0, total: 35, dueAt: at(-700), occurredAt: at(-720), appointmentId: "p3" },
  ],
  history: [
    { kind: "appointment_balance", description: "Hydrafacial", amountDue: 0, amountPaid: 95, total: 95, dueAt: null, occurredAt: at(-240), appointmentId: "p1" },
    { kind: "membership_invoice", description: "Gold Membership · INV-2026-0931", amountDue: 0, amountPaid: 49, total: 49, dueAt: null, occurredAt: at(-600) },
  ],
};
export const DOCUMENTS = [
  { id: "d1", category: "consent", name: "Laser consent form.pdf", mimeType: "application/pdf", sizeBytes: 182000, url: "#signed", isImage: false, uploadedAt: at(-240) },
  { id: "d2", category: "other", name: "Aftercare guide — Lipocavitation.pdf", mimeType: "application/pdf", sizeBytes: 94000, url: "#signed", isImage: false, uploadedAt: at(-48) },
];
export const MEMBERSHIP_ACTIVE = [{ id: "m1", status: "ACTIVE", price: 49, membership: { name: "Gold Membership" }, nextBillingAt: at(24 * 8), storedValue: 30 }];
export const MEMBERSHIP_PAUSED = [{ id: "m1", status: "PAUSED", price: 49, membership: { name: "Gold Membership" }, nextBillingAt: null, storedValue: 30 }];

const SLOTS = (date) => ({
  date, timeZone: "Europe/Malta", nextAvailableDate: null, serviceOfferedHere: true,
  slots: ["09:00", "09:30", "10:00", "11:30", "13:00", "14:30", "15:00", "16:30", "17:00"].map((t, i) => ({ time: t, available: i % 4 !== 1 })),
});

/** state = "full" | "empty" — which world the member lives in. */
export function fixtureFetch(state = "full") {
  const empty = state === "empty";
  const ok = (data) => Promise.resolve(new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { "content-type": "application/json" } }));
  return (url, init = {}) => {
    const u = new URL(url, location.origin);
    const p = u.pathname.replace("/api/auth/proxy", "");
    const method = (init.method || "GET").toUpperCase();
    console.log("[lab fetch]", method, u.pathname + u.search);
    if (u.pathname === "/api/auth/session") return Promise.resolve(new Response(JSON.stringify(empty ? EMPTY_SESSION : SESSION), { status: 200 }));
    if (method !== "GET") return ok({ ok: true, checkoutUrl: "#stripe" });
    if (p === "/client/booking/appointments") {
      const f = u.searchParams.get("filter");
      if (empty) return ok([]);
      return ok(f === "past" ? PAST : UPCOMING);
    }
    const m = /^\/client\/booking\/appointments\/([^/]+)$/.exec(p);
    if (m) return DETAIL[m[1]] ? ok(DETAIL[m[1]]) : Promise.resolve(new Response(JSON.stringify({ error: "Appointment not found" }), { status: 404 }));
    if (/cancellation-preview$/.test(p)) return ok({ kind: "LATE_CANCEL", feeAmount: 60, forfeitAmount: 0, chargeAmount: 60, cardLast4: "4242", policyText: "Later cancellations are charged 50%." });
    if (p === "/client/booking/slots") return ok(SLOTS(u.searchParams.get("date")));
    if (p === "/client/gift-cards") return ok(empty ? [] : GIFT_CARDS);
    if (p === "/client/packages") return ok(empty ? [] : PACKAGES);
    if (p === "/client/credit-balance") return ok({ balance: empty ? 0 : 85 });
    if (p === "/client/account/statement") return ok(empty ? { totalDue: 0, due: [], history: [] } : STATEMENT);
    if (p === "/client/account/documents") return ok(empty ? [] : DOCUMENTS);
    if (p === "/client/membership") return ok(empty ? [] : state === "paused" ? MEMBERSHIP_PAUSED : MEMBERSHIP_ACTIVE);
    if (p === "/client/wallet/availability") return ok({ apple: false, google: false });
    return Promise.resolve(new Response("{}", { status: 404 }));
  };
}
