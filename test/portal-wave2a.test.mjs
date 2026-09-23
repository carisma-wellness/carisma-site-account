/**
 * Wave 2A of the member-account redesign: the booking page, the reschedule
 * and cancel sheets, Add to calendar and wallet gating. Every behaviour has a
 * negative control — a test that could not fail proves nothing.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildBookingDetailModel,
  bookingDetailHTML,
  bookingViewParts,
  bookingPrimary,
  dueLabel,
  policyLead,
  rebookHref,
  buildIcs,
  icsUtc,
  icsEscape,
  icsFold,
  icsFileName,
  icsLocation,
  stripVenuePrefix,
  buildDayStrip,
  addDays,
  dateWords,
  instantWords,
  timeOptions,
  groupTimes,
  rescheduleTimesHTML,
  reviewBarHTML,
  rescheduleSubline,
  cancelSummary,
  cancelTitle,
  cancelFootHTML,
  cancelBodyHTML,
  readCancellationPreview,
  readWalletAvailability,
  walletPassCall,
  buildSlotsModel,
  paymentReturnNote,
  mountAccountPortal,
} from "../dist/ui/index.js";
import { PORTAL_BOOKING_CSS } from "../dist/ui/styles/index.js";

const H = 3_600_000;
const NOW = new Date("2026-09-23T10:00:00.000Z");
const iso = (hours) => new Date(NOW.getTime() + hours * H).toISOString();

const OPEN = {
  canConfirm: true,
  canReschedule: true,
  rescheduleClosesAt: iso(72),
  canCancel: true,
  cancelIsFree: true,
  freeCancelEndsAt: iso(72),
  canPayBalance: false,
  balanceDue: 0,
  canRebook: false,
  reason: null,
};

function appt(over = {}) {
  return {
    id: "u1",
    status: "BOOKED",
    startTime: "2026-09-26T08:00:00.000Z", // Sat 26 Sept, 10:00 Malta
    endTime: "2026-09-26T09:00:00.000Z",
    totalAmount: 160,
    amountPaid: 160,
    amountToPay: 160,
    venue: {
      brandLocationId: "bl-1",
      name: "Carisma Spa",
      locationName: "Hugo's Hotel",
      address: "Hugo's Hotel, Great Siege Road, Floriana FRN 1810, Malta",
      lat: 35.89,
      lng: 14.5,
    },
    services: [{ serviceId: "svc-1", name: "Couples Full Body Massage", durationMins: 60, price: 160, staffName: "Maria Borg" }],
    policyText: "Cancel free of charge up to 24 hours before your appointment.",
    actions: OPEN,
    ...over,
  };
}
const model = (over = {}) => buildBookingDetailModel({ success: true, data: appt(over) }, "u1");
const page = (over = {}, opts = {}) => bookingDetailHTML(model(over), { now: NOW, siteBrand: "Carisma Spa", ...opts });
const count = (html, re) => (html.match(re) || []).length;

/* ── One primary, chosen by the server's actions ───────────────────────── */

test("the primary is Pay > Reschedule > Confirm > Book again", () => {
  assert.equal(bookingPrimary(model({ actions: { ...OPEN, canPayBalance: true, balanceDue: 40 } })), "pay");
  assert.equal(bookingPrimary(model()), "reschedule");
  assert.equal(bookingPrimary(model({ actions: { ...OPEN, canReschedule: false } })), "confirm");
  assert.equal(bookingPrimary(model({ status: "CONFIRMED", actions: { ...OPEN, canReschedule: false } })), null);
  assert.equal(
    bookingPrimary(model({ status: "COMPLETED", actions: { ...OPEN, canConfirm: false, canReschedule: false, canRebook: true } })),
    "rebook",
  );
});

test("every state renders exactly one primary button", () => {
  const states = [
    {},
    { actions: { ...OPEN, canPayBalance: true, balanceDue: 40 }, amountPaid: 120 },
    { actions: { ...OPEN, canReschedule: false } },
    { status: "COMPLETED", actions: { ...OPEN, canConfirm: false, canReschedule: false, canRebook: true } },
    { status: "NO_SHOW", amountPaid: 0, actions: { ...OPEN, canConfirm: false, canReschedule: false, canRebook: true, canPayBalance: true, balanceDue: 35 } },
  ];
  for (const s of states) assert.equal(count(page(s), /cw-btn--primary/g), 1, JSON.stringify(s.status ?? "BOOKED"));
});

test("NEGATIVE CONTROL: no actions block means no action buttons at all", () => {
  const without = appt();
  delete without.actions;
  const html = bookingDetailHTML(buildBookingDetailModel({ success: true, data: without }, "u1"), { now: NOW });
  assert.doesNotMatch(html, /data-cw-action="(reschedule|confirm|cancel|pay|wallet)"/);
  assert.doesNotMatch(html, /cw-btn--primary/);
  // …and the same booking WITH the block does offer them.
  assert.match(page(), /data-cw-action="reschedule"/);
  assert.match(page(), /data-cw-action="cancel"/);
});

test("Pay lives in the money card as the primary, Book again follows it on a past visit", () => {
  const html = page({
    status: "NO_SHOW",
    amountPaid: 0,
    actions: { ...OPEN, canConfirm: false, canReschedule: false, canRebook: true, canPayBalance: true, balanceDue: 35 },
  });
  assert.match(html, /cw-bk-money[\s\S]*cw-btn--primary" data-cw-action="pay"[\s\S]*Pay €35\.00/);
  assert.match(html, /cw-btn--secondary" href="\/\?book=svc-1">Book again/);
});

/* ── Money ─────────────────────────────────────────────────────────────── */

test("the balance is named for what the visit became", () => {
  assert.equal(dueLabel("NO_SHOW"), "Missed-visit fee");
  assert.equal(dueLabel("COMPLETED"), "Still to pay");
  assert.equal(dueLabel("BOOKED"), "To pay");
  const missed = page({ status: "NO_SHOW", amountPaid: 0, actions: { ...OPEN, canPayBalance: true, balanceDue: 35 } });
  assert.match(missed, /Missed-visit fee/);
  // The fee is the whole story; the original ticket price beside it would invite the wrong sum.
  assert.doesNotMatch(missed, /cw-bk-money__row/);
});

test("a fully paid visit collapses to one 'Paid in full' line; a balance does not", () => {
  const paid = page();
  assert.match(paid, /Paid in full/);
  assert.match(paid, /€160\.00/);
  assert.match(paid, /Prices include VAT/);
  const owed = page({ amountPaid: 120, actions: { ...OPEN, canPayBalance: true, balanceDue: 40 } });
  assert.doesNotMatch(owed, /Paid in full/);
  assert.match(owed, /To pay/);
  assert.match(owed, /− €120\.00/);
});

/* ── Venue once, directions, facts ─────────────────────────────────────── */

test("the venue is said once — the address loses its repeated prefix", () => {
  assert.equal(stripVenuePrefix("Hugo's Hotel, Great Siege Road", "Hugo's Hotel"), "Great Siege Road");
  // Controls: a different address is untouched, and a word that merely STARTS
  // with the venue's name is not a prefix.
  assert.equal(stripVenuePrefix("Great Siege Road", "Hugo's Hotel"), "Great Siege Road");
  assert.equal(stripVenuePrefix("Hugo's Hotelier Street", "Hugo's Hotel"), "Hugo's Hotelier Street");
  const html = page();
  assert.equal(count(html, /Hugo&#39;s Hotel/g), 1);
  assert.match(html, /Great Siege Road/);
  assert.match(html, /Directions/);
  assert.match(html, /With<\/dt>[\s\S]*Maria Borg/);
});

test("the brand label shows only when the booking is another brand's", () => {
  assert.doesNotMatch(bookingViewParts(model(), { siteBrand: "Carisma Spa" }).lede, /cw-bk-brand/);
  assert.match(bookingViewParts(model(), { siteBrand: "Carisma Slimming" }).lede, /cw-bk-brand[^>]*>Carisma Spa/);
});

test("Carisma Medical never renders here", () => {
  const med = buildBookingDetailModel({ success: true, data: appt({ venue: { name: "Carisma Medical", locationName: "Telehealth" } }) }, "u1");
  const parts = bookingViewParts(med, {});
  assert.match(parts.title, /couldn't find that booking/);
  assert.doesNotMatch(parts.body, /Telehealth/);
});

/* ── Reason, deadline, policy ──────────────────────────────────────────── */

test("a booking that cannot move says why, with the phone as a link", () => {
  const html = page({
    actions: { ...OPEN, canReschedule: false, reason: "Online changes close 24 hours before. Call Pulse on +35627802062." },
  });
  assert.match(html, /cw-reason/);
  assert.match(html, /href="tel:\+35627802062">\+356 2780 2062/);
  assert.doesNotMatch(html, /data-cw-action="reschedule"/);
  // Control: a past visit needs no explanation of why it cannot be moved.
  assert.doesNotMatch(page({ status: "COMPLETED", actions: { ...OPEN, canReschedule: false, reason: "closed" } }), /cw-reason/);
});

test("the online deadline is mentioned only when it is close", () => {
  const near = page({ actions: { ...OPEN, rescheduleClosesAt: iso(20) } });
  assert.match(near, /You can move this online until /);
  const far = page({ actions: { ...OPEN, rescheduleClosesAt: iso(200) } });
  assert.doesNotMatch(far, /You can move this online until/);
});

test("the policy leads with the server's figure, and only while the visit is ahead", () => {
  assert.match(policyLead(model()), /^Free to cancel until /);
  const late = model({ actions: { ...OPEN, cancelIsFree: false, freeCancelEndsAt: null } });
  const preview = readCancellationPreview({ data: { chargeAmount: 60, feeAmount: 60, forfeitAmount: 0, cardLast4: "4242" } });
  assert.equal(policyLead(late, preview), "Cancelling now costs €60.00.");
  // No preview, no figure — never our own guess at the fee.
  assert.equal(policyLead(late, null), "");
  assert.match(page(), /Changing this booking/);
  assert.doesNotMatch(page({ status: "COMPLETED" }), /Changing this booking/);
  assert.doesNotMatch(page({ policyText: "" }), /Changing this booking/);
});

/* ── Wallet gating ─────────────────────────────────────────────────────── */

test("a wallet button appears only when availability says true for THAT wallet", () => {
  const both = page({}, { wallet: { apple: true, google: false } });
  assert.match(both, /Add to Apple Wallet/);
  assert.doesNotMatch(both, /Google Wallet/);
  assert.doesNotMatch(page({}, { wallet: { apple: false, google: false } }), /Add to (Apple|Google) Wallet/);
  assert.doesNotMatch(page(), /Apple Wallet|Google Wallet/);
  // A truthy-looking answer is not a yes.
  assert.deepEqual(readWalletAvailability({ success: true, data: { apple: "true", google: 1 } }), { apple: false, google: false });
  assert.deepEqual(readWalletAvailability({ success: true, data: { apple: true, google: true } }), { apple: true, google: true });
  assert.equal(walletPassCall("u 1", "google").path, "/api/auth/proxy/client/wallet/appointments/u%201/google");
});

test("Book again deep-links to the treatment on this brand's door", () => {
  assert.equal(rebookHref("/", "svc-1"), "/?book=svc-1");
  assert.equal(rebookHref("/book?x=1", "svc-1"), "/book?x=1&book=svc-1");
  assert.equal(rebookHref("/book", null), "/book");
});

/* ── Add to calendar (RFC 5545) ────────────────────────────────────────── */

const EVENT = {
  id: "u1",
  host: "www.carismaspa.com",
  startIso: "2026-09-26T08:00:00.000Z",
  endIso: "2026-09-26T09:00:00.000Z",
  summary: "Couples Full Body Massage · Carisma Spa",
  location: icsLocation("Hugo's Hotel", "Hugo's Hotel, Great Siege Road; Floriana\nMalta \\ EU"),
  now: new Date("2026-09-23T10:00:00.000Z"),
};

test("the .ics is CRLF, UTC, with a stable UID and a one-hour alarm", () => {
  const ics = buildIcs(EVENT);
  assert.ok(ics.endsWith("\r\n"));
  assert.equal(ics.split("\r\n").filter((l) => l.includes("\n")).length, 0, "no bare LF anywhere");
  assert.match(ics, /\r\nUID:u1@www\.carismaspa\.com\r\n/);
  assert.match(ics, /\r\nDTSTART:20260926T080000Z\r\n/);
  assert.match(ics, /\r\nDTEND:20260926T090000Z\r\n/);
  assert.match(ics, /\r\nDTSTAMP:20260923T100000Z\r\n/);
  assert.match(ics, /\r\nSEQUENCE:0\r\n/);
  assert.match(ics, /BEGIN:VALARM\r\n[\s\S]*TRIGGER:-PT1H\r\n[\s\S]*END:VALARM/);
  assert.match(ics, /SUMMARY:Couples Full Body Massage · Carisma Spa/);
});

test("the UID's host drops a port rather than gluing it on", () => {
  assert.match(buildIcs({ ...EVENT, host: "localhost:4411" }), /UID:u1@localhost\r\n/);
  assert.match(buildIcs({ ...EVENT, host: "" }), /UID:u1@carisma\r\n/);
});

test("LOCATION escapes commas, semicolons, backslashes and newlines", () => {
  assert.equal(icsEscape("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
  const ics = buildIcs(EVENT).replace(/\r\n /g, "");
  assert.match(ics, /LOCATION:Hugo's Hotel\\, Great Siege Road\\; Floriana\\nMalta \\\\ EU\r\n/);
});

test("NEGATIVE CONTROL: a rescheduled event keeps its UID and bumps SEQUENCE", () => {
  const first = buildIcs(EVENT);
  const moved = buildIcs({ ...EVENT, startIso: "2026-09-25T09:30:00.000Z", endIso: "2026-09-25T10:30:00.000Z", sequence: 1 });
  const uid = (s) => /UID:(.*)\r\n/.exec(s)[1];
  assert.equal(uid(first), uid(moved));
  assert.match(moved, /SEQUENCE:1\r\n/);
  assert.match(moved, /DTSTART:20260925T093000Z/);
  assert.notEqual(first, moved);
});

test("lines fold at 75 octets and never inside a multi-byte character", () => {
  const long = "SUMMARY:" + "Massage · ".repeat(20);
  const folded = icsFold(long);
  for (const line of folded.split("\r\n")) assert.ok(Buffer.byteLength(line, "utf8") <= 75, line);
  assert.equal(folded.replace(/\r\n /g, ""), long);
  assert.ok(!folded.includes("�"));
});

test("the file is named for the MALTA date, not the UTC one", () => {
  // 22:30 UTC on the 25th is already the 26th in Malta.
  assert.equal(icsFileName("2026-09-25T22:30:00.000Z"), "carisma-20260926.ics");
  assert.equal(icsUtc("2026-09-25T22:30:00.000Z"), "20260925T223000Z");
  assert.equal(icsFileName("not a date"), "carisma-booking.ics");
  assert.equal(buildIcs({ ...EVENT, startIso: "garbage" }), "");
});

/* ── Reschedule sheet ──────────────────────────────────────────────────── */

test("the day strip opens on the booking's day, 14 days, current day marked", () => {
  const days = buildDayStrip("2026-09-26", 14, "2026-09-26");
  assert.equal(days.length, 14);
  assert.equal(days[0].date, "2026-09-26");
  assert.equal(days[0].wk, "Sat");
  assert.equal(days[0].isCurrent, true);
  assert.equal(days.filter((d) => d.isCurrent).length, 1);
  // Across a month end, and across Malta's October clock change.
  assert.equal(days[13].date, "2026-10-09");
  assert.equal(addDays("2026-10-24", 2), "2026-10-26");
});

test("dates are words on every button, never ISO", () => {
  assert.equal(dateWords("2026-09-24", "short"), "Thu 24");
  assert.equal(dateWords("2026-09-25", "long"), "Friday 25 September");
  assert.equal(instantWords("2026-09-25T09:30:00.000Z", "long"), "Friday 25 September, 11:30");
  assert.equal(rescheduleSubline("Lipocavitation", "Excelsior", "2026-09-26T08:00:00.000Z"), "Lipocavitation · Excelsior · now Sat 26 Sept, 10:00");
});

const slotsFor = (date, times, extra = {}) =>
  buildSlotsModel({ success: true, data: { date, timeZone: "Europe/Malta", slots: times, ...extra } }, date);

test("the booking's own time is shown, disabled, as Current; taken times are not offered", () => {
  const s = slotsFor("2026-09-26", [
    { time: "09:00", available: true },
    { time: "10:00", available: false },
    { time: "11:30", available: false },
    { time: "13:00", available: true },
  ]);
  const opts = timeOptions(s, "2026-09-26", "10:00");
  assert.deepEqual(opts.map((o) => `${o.time}${o.current ? "*" : ""}`), ["09:00", "10:00*", "13:00"]);
  const html = rescheduleTimesHTML({ date: s.date, phase: "ready", slots: s, currentDate: "2026-09-26", currentTime: "10:00", selected: "13:00" });
  assert.match(html, /is-current" disabled[^>]*>.*10:00.*Current/);
  assert.match(html, /data-cw-rs-time="13:00" aria-pressed="true"/);
  assert.doesNotMatch(html, /data-cw-rs-time="11:30"/);
  // Control: on another day there is no "Current".
  assert.doesNotMatch(
    rescheduleTimesHTML({ date: "2026-09-27", phase: "ready", slots: slotsFor("2026-09-27", [{ time: "10:00", available: true }]), currentDate: "2026-09-26", currentTime: "10:00", selected: null }),
    /Current/,
  );
});

test("times group into Morning / Afternoon / Evening only past eight", () => {
  const few = ["09:00", "12:00", "18:00"].map((time) => ({ time, current: false }));
  assert.deepEqual(groupTimes(few).map((g) => g.label), [null]);
  const many = ["09:00", "09:30", "10:00", "11:00", "12:00", "13:00", "15:00", "17:00", "18:30"].map((time) => ({ time, current: false }));
  assert.deepEqual(groupTimes(many).map((g) => g.label), ["Morning", "Afternoon", "Evening"]);
});

test("a full day names itself and offers the next free day in words", () => {
  const full = slotsFor("2026-09-27", [{ time: "10:00", available: false }], { nextAvailableDate: "2026-09-28" });
  const html = rescheduleTimesHTML({ date: "2026-09-27", phase: "ready", slots: full, currentDate: "2026-09-26", currentTime: "10:00", selected: null });
  assert.match(html, /Nothing free on Sun 27\./);
  assert.match(html, /data-cw-rs-day="2026-09-28">Show Mon 28</);
  const visible = html.replace(/<[^>]+>/g, " ");
  assert.doesNotMatch(visible, /\d{4}-\d{2}-\d{2}/);
});

test("a time someone just took is named in an alert and no longer offered", () => {
  const s = slotsFor("2026-09-25", [{ time: "11:30", available: true }, { time: "14:00", available: true }]);
  const html = rescheduleTimesHTML({
    date: s.date, phase: "ready", slots: s, currentDate: "2026-09-26", currentTime: "10:00",
    selected: null, alert: "Someone just took 11:30. Pick another time.", taken: ["11:30"],
  });
  assert.match(html, /role="alert">Someone just took 11:30\. Pick another time\./);
  assert.doesNotMatch(html, /data-cw-rs-time="11:30"/);
  assert.match(html, /data-cw-rs-time="14:00"/);
});

test("the review bar states old → new and only its primary moves anything", () => {
  const bar = reviewBarHTML("Sat 26 Sept, 10:00", "Fri 25 Sept, 11:30");
  assert.match(bar, /Sat 26 Sept, 10:00[\s\S]*→[\s\S]*Fri 25 Sept, 11:30/);
  assert.match(bar, /cw-btn--primary" data-cw-rs-commit>Move my booking/);
  assert.match(bar, /data-cw-dialog-close>Keep current time/);
  const busy = reviewBarHTML("a", "b", true);
  assert.match(busy, /aria-disabled="true">Moving…/);
});

/* ── Cancel sheet ──────────────────────────────────────────────────────── */

test("the cancel sheet carries the server's fee, and only then sends acceptFee", () => {
  const fee = cancelSummary(readCancellationPreview({ data: { chargeAmount: 60, feeAmount: 60, forfeitAmount: 0, cardLast4: "4242", policyText: "50% late." } }), false);
  assert.equal(fee.confirmLabel, "Cancel booking and pay €60.00");
  assert.equal(fee.acceptFee, true);
  assert.equal(fee.amount, "€60.00");
  assert.match(fee.lines.join(" "), /card ending 4242/);
  const free = cancelSummary(null, true);
  assert.equal(free.acceptFee, false);
  assert.equal(free.confirmLabel, "Cancel booking");
  // Unknown is NOT free, and never consent to a fee nobody saw.
  const unknown = cancelSummary(null, false);
  assert.equal(unknown.acceptFee, false);
  assert.equal(unknown.headline, null);
  assert.match(unknown.lines[0], /couldn't check/);
  const zero = cancelSummary(readCancellationPreview({ data: { chargeAmount: 0, forfeitAmount: 0 } }), false);
  assert.equal(zero.acceptFee, false);
  assert.equal(zero.headline, "Free to cancel");
});

test("the cancel sheet names the day and treatment, and keeping is the easy button", () => {
  // 22:30 UTC Thursday is already Friday in Malta.
  assert.equal(cancelTitle("2026-09-24T22:30:00.000Z", "Lipocavitation"), "Cancel Friday's Lipocavitation?");
  assert.equal(cancelTitle("2026-09-24T13:00:00.000Z", "Lipocavitation"), "Cancel Thursday's Lipocavitation?");
  const foot = cancelFootHTML(cancelSummary(null, true));
  assert.match(foot, /cw-btn--primary" data-cw-dialog-close autofocus>Keep my booking[\s\S]*cw-btn--danger[^>]*>Cancel booking/);
  assert.match(cancelBodyHTML(cancelSummary(null, true), true), /Want a different time instead\?[\s\S]*Reschedule/);
  assert.doesNotMatch(cancelBodyHTML(cancelSummary(null, true), false), /Want a different time/);
  // While the preview is still on its way, the destructive button cannot fire.
  assert.match(cancelFootHTML(null), /cw-btn--danger" data-cw-cx-commit aria-disabled="true"/);
});

test("a cancellation lands on Bookings with a toast; other visits stay silent", () => {
  assert.equal(paymentReturnNote("?cancelled=1").text, "Cancelled. We've emailed you a confirmation.");
  assert.equal(paymentReturnNote("?cancelled=11"), null);
});

/* ── Styles ────────────────────────────────────────────────────────────── */

test("the booking stylesheet ships the sheet, the pinned bar and the 44px targets", () => {
  assert.match(PORTAL_BOOKING_CSS, /\.cw-dialog::backdrop/);
  assert.match(PORTAL_BOOKING_CSS, /max-height: 88vh/);
  assert.match(PORTAL_BOOKING_CSS, /border-radius: 16px 16px 0 0/);
  assert.match(PORTAL_BOOKING_CSS, /backdrop-filter: blur\(12px\)/);
  assert.match(PORTAL_BOOKING_CSS, /color-mix\(in srgb, var\(--cw-account-ground\) 92%, transparent\)/);
  assert.match(PORTAL_BOOKING_CSS, /\.cw-dialog__close \{[\s\S]*?width: 44px;[\s\S]*?height: 44px;/);
});

/* ── The list opens the sheet in place ─────────────────────────────────── */

function fakeDom() {
  const calls = { navigate: [], inserted: [], shown: 0, fetched: [] };
  let clickHandler = null;
  const dialog = {
    innerHTML: "",
    attrs: {},
    setAttribute(n, v) { this.attrs[n] = v; },
    getAttribute(n) { return this.attrs[n] ?? null; },
    removeAttribute(n) { delete this.attrs[n]; },
    addEventListener() {},
    showModal() { calls.shown++; },
    close() {},
    remove() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  let inserted = false;
  const host = {
    insertAdjacentHTML(_where, html) { calls.inserted.push(html); inserted = true; },
    querySelectorAll(sel) { return sel === "dialog.cw-dialog" && inserted ? [dialog] : []; },
    querySelector() { return null; },
  };
  const mount = {
    innerHTML: "",
    setAttribute() {},
    getAttribute() { return null; },
    addEventListener(t, h) { if (t === "click") clickHandler = h; },
    querySelector(sel) { return sel === ".carisma-portal" ? host : null; },
    querySelectorAll() { return []; },
  };
  const doc = {
    cookie: "cw-signed-in=1",
    location: { pathname: "/account/bookings", host: "www.carismaspa.com", origin: "https://www.carismaspa.com", search: "" },
    getElementById: (id) => (id === "carisma-account-portal" ? mount : null),
    querySelectorAll: () => [],
    addEventListener() {},
  };
  const json = (data, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data) });
  const fetchImpl = (url) => {
    calls.fetched.push(url);
    if (url.startsWith("/api/auth/session")) return json({ signedIn: true, profile: { firstName: "Jane" } });
    if (/\/client\/booking\/appointments\/u1$/.test(url)) return json({ success: true, data: appt({ startTime: iso(72), endTime: iso(73) }) });
    if (url.includes("/client/booking/appointments")) return json({ success: true, data: [] });
    return json({ success: true, data: { date: "2026-09-26", slots: [] } });
  };
  const btn = {
    attrs: { "data-cw-action": "reschedule", "data-cw-appt": "u1" },
    getAttribute(n) { return this.attrs[n] ?? null; },
    setAttribute() {},
    closest(sel) { return sel === "[data-cw-action]" ? this : null; },
    innerHTML: "Reschedule",
  };
  return { doc, calls, fetchImpl, dialog, click: () => clickHandler?.({ target: btn, preventDefault() {}, stopPropagation() {} }) };
}

test("Reschedule on a list card opens the sheet in place — it never navigates away", async () => {
  const f = fakeDom();
  mountAccountPortal(f.doc, { view: "bookings", fetchImpl: f.fetchImpl, navigate: (u) => f.calls.navigate.push(u) });
  f.click();
  assert.equal(f.calls.shown, 1);
  assert.match(f.calls.inserted[0], /<dialog class="cw-dialog cw-dialog--reschedule"/);
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(f.calls.navigate, []);
  assert.match(f.dialog.innerHTML, /Move your booking/);
  assert.match(f.dialog.innerHTML, /data-cw-rs-day=/);
  assert.match(f.dialog.innerHTML, /Same treatment and venue\. Malta time\./);
  // It asked for the booking (for its venue and treatment) and for free times.
  assert.ok(f.calls.fetched.some((u) => /\/client\/booking\/appointments\/u1$/.test(u)));
  assert.ok(f.calls.fetched.some((u) => u.includes("/client/booking/slots?brandLocationId=bl-1")));
});

test("NEGATIVE CONTROL: a booking the server will not move opens no picker", async () => {
  const f = fakeDom();
  const base = f.fetchImpl;
  const fetchImpl = (url) =>
    /\/client\/booking\/appointments\/u1$/.test(url)
      ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true, data: appt({ actions: { ...OPEN, canReschedule: false, reason: "Call us on +35627802062." } }) }) })
      : base(url);
  mountAccountPortal(f.doc, { view: "bookings", fetchImpl, navigate: (u) => f.calls.navigate.push(u) });
  f.click();
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(f.calls.navigate, []);
  assert.ok(!f.calls.fetched.some((u) => u.includes("/client/booking/slots")));
});
