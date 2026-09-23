import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildBookingDetailModel,
  bookingDetailHTML,
  readActions,
  statusLabel,
  bookingIdFromPath,
  requestsFor,
  bodyFor,
  buildWalletModel,
  walletHTML,
  buildStatementModel,
  statementHTML,
  buildDocumentsModel,
  documentsHTML,
  buildMembershipModel,
  membershipHTML,
  venueLocalToUtcIso,
  venueDateString,
  buildSlotsModel,
  cancelQuestion,
  readCancellationPreview,
  needsPreview,
  messageFromError,
  eur,
  PORTAL_SECTIONS,
  payBalanceCall,
  paymentReturnNote,
} from "../dist/ui/index.js";

/* ── The capability block decides every button ─────────────────────────── */

const APPT = {
  id: "appt-1",
  status: "BOOKED",
  startTime: "2026-09-24T13:00:00.000Z",
  endTime: "2026-09-24T13:45:00.000Z",
  totalAmount: 120,
  amountPaid: 80,
  amountToPay: 120,
  bookingRef: "CW-1",
  venue: {
    brandLocationId: "bl-1",
    name: "Carisma Slimming",
    locationName: "Grand Hotel Excelsior",
    address: "Floriana FRN 1810",
    lat: 35.895,
    lng: 14.505,
  },
  services: [{ serviceId: "svc-1", name: "Lipocavitation", durationMins: 45, price: 120, staffName: "Katya" }],
  actions: {
    canConfirm: true,
    canReschedule: true,
    rescheduleClosesAt: "2026-09-23T13:00:00.000Z",
    canCancel: true,
    cancelIsFree: true,
    freeCancelEndsAt: "2026-09-23T13:00:00.000Z",
    canPayBalance: true,
    balanceDue: 40,
    canRebook: false,
    reason: null,
  },
  policyText: "Cancel free of charge up to 24 hours before your appointment.",
};

test("a booking renders its treatment, venue, money and every permitted action", () => {
  const m = buildBookingDetailModel({ success: true, data: APPT }, "appt-1");
  const html = bookingDetailHTML(m);
  assert.match(html, /Lipocavitation/);
  assert.match(html, /Grand Hotel Excelsior/);
  assert.match(html, /Confirm I&#39;m coming/);
  assert.match(html, /Reschedule/);
  assert.match(html, /Cancel booking/);
  assert.match(html, /Pay €40\.00 now/);
  assert.match(html, /Apple Wallet/);
  assert.match(html, /google\.com\/maps/);
  assert.match(html, /VAT included/);
});

test("the reschedule picker's three inputs survive the wire", () => {
  const m = buildBookingDetailModel({ success: true, data: APPT }, "appt-1");
  assert.equal(m.brandLocationId, "bl-1");
  assert.equal(m.serviceId, "svc-1");
  assert.equal(m.durationMins, 45);
});

test("NEGATIVE CONTROL: no actions block means no buttons, not every button", () => {
  // An older backend, a partial deploy, a 500 on one field. The page must not
  // guess — a button that refuses on the tap is the defect this prevents.
  const without = { ...APPT };
  delete without.actions;
  const m = buildBookingDetailModel({ success: true, data: without }, "appt-1");
  const html = bookingDetailHTML(m);
  assert.equal(m.actions.canConfirm, false);
  assert.equal(m.actions.canReschedule, false);
  assert.equal(m.actions.canCancel, false);
  assert.doesNotMatch(html, /Confirm I&#39;m coming/);
  assert.doesNotMatch(html, /Cancel booking/);
  // …and the control: the same payload WITH the block does render them.
  assert.match(bookingDetailHTML(buildBookingDetailModel({ success: true, data: APPT }, "appt-1")), /Cancel booking/);
});

test("a truthy-looking action value is not a true one", () => {
  const a = readActions({ canConfirm: "yes", canCancel: 1, canReschedule: "true" });
  assert.equal(a.canConfirm, false);
  assert.equal(a.canCancel, false);
  assert.equal(a.canReschedule, false);
});

test("the server's sentence is shown even when no button survives", () => {
  const closed = {
    ...APPT,
    actions: { ...APPT.actions, canConfirm: false, canReschedule: false, canCancel: false, canPayBalance: false, reason: "Online changes close 24 hours before your appointment. To move this one, call Carisma Slimming on 27802062." },
  };
  const html = bookingDetailHTML(buildBookingDetailModel({ success: true, data: closed }, "appt-1"));
  assert.match(html, /27802062/);
});

test("an unpaid hold is never called Booked", () => {
  assert.equal(statusLabel("PENDING"), "Reserved — payment pending");
  assert.equal(statusLabel("BOOKED"), "Booked");
  assert.equal(statusLabel("NO_SHOW"), "Missed");
});

test("a missing booking says so instead of rendering an empty shell", () => {
  const html = bookingDetailHTML(buildBookingDetailModel(null, "gone"));
  assert.match(html, /couldn't find that booking/);
});

/* ── Malta wall clock → UTC instant ────────────────────────────────────── */

test("a venue's wall clock becomes the right UTC instant in summer and in winter", () => {
  // Malta is UTC+2 in September (CEST) and UTC+1 in December (CET). Getting
  // this wrong books a customer an hour out — and it would look fine in July.
  assert.equal(venueLocalToUtcIso("2026-09-24", "15:00", "Europe/Malta"), "2026-09-24T13:00:00.000Z");
  assert.equal(venueLocalToUtcIso("2026-12-24", "15:00", "Europe/Malta"), "2026-12-24T14:00:00.000Z");
});

test("NEGATIVE CONTROL: the conversion is a real conversion, not a passthrough", () => {
  // If venueLocalToUtcIso ever degraded to `${date}T${time}:00Z`, every test
  // above that used a UTC-equivalent time would still pass. A zone two hours
  // the other way is what proves the arithmetic runs.
  const malta = venueLocalToUtcIso("2026-09-24", "15:00", "Europe/Malta");
  const utc = venueLocalToUtcIso("2026-09-24", "15:00", "UTC");
  const nyc = venueLocalToUtcIso("2026-09-24", "15:00", "America/New_York");
  assert.notEqual(malta, utc);
  assert.equal(utc, "2026-09-24T15:00:00.000Z");
  assert.equal(nyc, "2026-09-24T19:00:00.000Z");
});

test("the day either side of Malta's October clock change is still correct", () => {
  // DST ends 25 Oct 2026. One-pass offset arithmetic is wrong across it.
  assert.equal(venueLocalToUtcIso("2026-10-24", "15:00", "Europe/Malta"), "2026-10-24T13:00:00.000Z");
  assert.equal(venueLocalToUtcIso("2026-10-26", "15:00", "Europe/Malta"), "2026-10-26T14:00:00.000Z");
});

test("a malformed date or time is refused, never guessed", () => {
  assert.equal(venueLocalToUtcIso("24/09/2026", "15:00", "Europe/Malta"), null);
  assert.equal(venueLocalToUtcIso("2026-09-24", "3pm", "Europe/Malta"), null);
});

test("today's date is the venue's date, not the handset's", () => {
  // 23:30 UTC on the 23rd is already the 24th in Malta. A picker that opened
  // on the wrong day would silently offer yesterday's slots.
  const lateEvening = new Date("2026-09-23T23:30:00.000Z");
  assert.equal(venueDateString(lateEvening, "Europe/Malta"), "2026-09-24");
  assert.equal(venueDateString(lateEvening, "UTC"), "2026-09-23");
});

test("slots keep the server's zone and drop the unavailable times", () => {
  const m = buildSlotsModel(
    {
      success: true,
      data: {
        date: "2026-09-24",
        timeZone: "Europe/Malta",
        slots: [
          { time: "09:00", available: true },
          { time: "10:00", available: false },
        ],
        nextAvailableDate: "2026-09-25",
      },
    },
    "2026-09-24",
  );
  assert.equal(m.timeZone, "Europe/Malta");
  assert.equal(m.slots.length, 2);
  assert.equal(m.offeredHere, true);
});

test("a withdrawn treatment is named, and an older server is not mistaken for one", () => {
  assert.equal(buildSlotsModel({ data: { serviceOfferedHere: false, slots: [] } }, "d").offeredHere, false);
  // Absent means "this server has no opinion" — never "withdrawn".
  assert.equal(buildSlotsModel({ data: { slots: [] } }, "d").offeredHere, true);
});

/* ── Cancelling: the member is told before they are charged ────────────── */

test("the cancellation question carries the SERVER's figures and the real card", () => {
  const p = readCancellationPreview({
    success: true,
    data: { kind: "LATE_CANCEL", feeAmount: 60, forfeitAmount: 80, chargeAmount: 60, cardLast4: "4242", policyText: "Later cancellations are charged 50%." },
  });
  const q = cancelQuestion(p);
  assert.match(q, /€60\.00/);
  assert.match(q, /4242/);
  assert.match(q, /€80\.00 of what you've already paid is kept/);
  assert.match(q, /charged 50%/);
});

test("a free cancellation says there is nothing to pay", () => {
  const q = cancelQuestion(readCancellationPreview({ data: { kind: "FREE", feeAmount: 0, chargeAmount: 0, forfeitAmount: 0 } }));
  assert.match(q, /nothing to pay/);
});

test("NEGATIVE CONTROL: we read the preview unless the server says it is free", () => {
  assert.equal(needsPreview({ cancelIsFree: true }), false);
  assert.equal(needsPreview({ cancelIsFree: false }), true);
  // Unknown is the cautious side: ask the server before asking the member.
  assert.equal(needsPreview(null), true);
  assert.equal(needsPreview(undefined), true);
});

test("a refusal shows the server's own words, never a code or a Joi message", () => {
  assert.equal(
    messageFromError({ message: "This appointment can only be rescheduled online at least 24 hours in advance." }, 400, "fallback"),
    "This appointment can only be rescheduled online at least 24 hours in advance.",
  );
  assert.equal(messageFromError({ message: "FEE_CONSENT_REQUIRED" }, 409, "fallback"), "That time has just been taken. Please pick another.");
  assert.equal(messageFromError({ message: '"startTime" must be a valid date' }, 400, "fallback"), "fallback");
  assert.equal(messageFromError(null, 403, "fallback"), "Please sign in again to change this booking.");
});

/* ── The sections ──────────────────────────────────────────────────────── */

test("every section names the paths it reads, and they are all member paths", () => {
  for (const s of PORTAL_SECTIONS) {
    for (const url of requestsFor(s.id)) {
      assert.match(url, /^\/api\/auth\/proxy\/(client|profile)/, `${s.id} -> ${url}`);
    }
  }
  assert.deepEqual(requestsFor("payments"), ["/api/auth/proxy/client/account/statement"]);
  assert.equal(requestsFor("wallet").length, 3);
});

test("the wallet shows credit, gift cards and packages together", () => {
  const m = buildWalletModel({
    giftCards: { success: true, data: [{ code: "GC-9", balance: 50, originalValue: 100, expiresAt: "2027-01-31T00:00:00.000Z" }] },
    packages: { data: [{ planNameSnapshot: "Six facials", sessionsRemaining: 4, sessionsTotal: 6 }] },
    credit: { success: true, data: { balance: 85 } },
  });
  const html = walletHTML(m);
  assert.match(html, /€85\.00/);
  assert.match(html, /GC-9/);
  assert.match(html, /€50\.00/);
  assert.match(html, /4 of 6 sessions left/);
  assert.match(html, /valid until/i);
});

test("ONE dead endpoint costs its own block, never the page", () => {
  // Gift cards 500; packages and credit are fine. The member must still see
  // what we did manage to read.
  const m = buildWalletModel({ giftCards: null, packages: { data: [{ name: "Six facials", sessionsRemaining: 4 }] }, credit: 85 });
  const html = walletHTML(m);
  assert.match(html, /€85\.00/);
  assert.match(html, /Six facials/);
});

test("an empty wallet invites rather than apologises", () => {
  assert.match(walletHTML(buildWalletModel({})), /No credit or gift cards yet/);
});

test("the statement separates what is due from what is paid, and links to the booking", () => {
  const m = buildStatementModel({
    success: true,
    data: {
      totalDue: 40,
      due: [{ description: "Lipocavitation", amountDue: 40, amountPaid: 80, total: 120, dueAt: "2026-09-24T13:00:00.000Z", appointmentId: "appt-1" }],
      history: [{ description: "Swedish Massage", amountDue: 0, amountPaid: 70, total: 70, occurredAt: "2026-08-01T09:00:00.000Z" }],
    },
  });
  const html = statementHTML(m);
  assert.match(html.replace(/<[^>]+>/g, ""), /€40\.00 to pay/);
  assert.match(html, /\/account\/bookings\/appt-1/);
  assert.match(html, /Swedish Massage/);
});

test("documents open through the signed link and never mention the desk's note", () => {
  const docs = buildDocumentsModel({ success: true, data: [{ id: "d1", name: "consent-form.pdf", url: "https://s3/x?X-Amz-Signature=a", uploadedAt: "2026-09-14T09:00:00.000Z" }] });
  const html = documentsHTML(docs);
  assert.match(html, /consent-form/);
  assert.doesNotMatch(html.replace(/href="[^"]*"/g, ""), /consent-form\.pdf/);
  assert.match(html, /X-Amz-Signature/);
  assert.match(html, /rel="noreferrer"/);
});

test("a document with no link still appears, with somewhere to go", () => {
  const html = documentsHTML(buildDocumentsModel({ data: [{ id: "d1", name: "consent.pdf", url: null }] }));
  assert.match(html, /cw-doc__title">consent</);
  assert.match(html, /Ask at the desk/);
});

test("membership shows the plan and offers pause only while it is active", () => {
  const active = buildMembershipModel({ success: true, data: [{ id: "m1", status: "ACTIVE", price: 49, membership: { name: "Gold" }, nextBillingAt: "2026-10-01T00:00:00.000Z" }] });
  assert.equal(active.canPause, true);
  assert.equal(active.canResume, false);
  const html = membershipHTML(active);
  assert.match(html, /Gold/);
  assert.match(html, /€49\.00/);
  assert.match(html, /Pause membership/);

  const paused = buildMembershipModel({ data: [{ id: "m1", status: "PAUSED", membership: { name: "Gold" } }] });
  assert.equal(paused.canResume, true);
  assert.match(membershipHTML(paused), /Resume membership/);
});

test("the card that pays is never changeable from a brand site", () => {
  const html = membershipHTML(buildMembershipModel({ data: [{ id: "m1", status: "ACTIVE", membership: { name: "Gold" } }] }));
  assert.doesNotMatch(html, /data-cw-action="membership-cancel"/);
  assert.doesNotMatch(html, /payment-method/);
  assert.match(html, /speak to the team/);
});

test("a non-member is invited, not shown an empty membership", () => {
  assert.match(membershipHTML(buildMembershipModel({ data: [] })), /not a member yet/);
});

/* ── Routing and money ─────────────────────────────────────────────────── */

test("a booking id is read from the path, and a list path is not one", () => {
  assert.equal(bookingIdFromPath("/account/bookings/abc-123"), "abc-123");
  assert.equal(bookingIdFromPath("/account/bookings/abc-123/"), "abc-123");
  assert.equal(bookingIdFromPath("/account/bookings"), null);
  assert.equal(bookingIdFromPath("/account/bookings/counts"), null);
  assert.equal(bookingIdFromPath("/account/wallet"), null);
});

test("money is euro, two places, and nothing here ever adds VAT", () => {
  assert.equal(eur(120), "€120.00");
  assert.equal(eur(0), "€0.00");
  assert.equal(eur(undefined), "€0.00");
  assert.equal(eur(NaN), "€0.00");
});

test("every personal string carries the session-recorder mask", () => {
  const html = bookingDetailHTML(buildBookingDetailModel({ success: true, data: APPT }, "appt-1"));
  assert.match(html, /data-clarity-mask="True"/);
  const walletHtml = walletHTML(buildWalletModel({ credit: 85 }));
  assert.match(walletHtml, /data-clarity-mask="True"/);
});

test("bodyFor renders a section from its own answers, in order", () => {
  const html = bodyFor("payments", [{ data: { totalDue: 10, due: [{ description: "X", amountDue: 10 }], history: [] } }]);
  assert.match(html.replace(/<[^>]+>/g, ""), /€10\.00 to pay/);
});

/* ── Paying a balance returns the member to this brand ─────────────────── */

test("the Pay call carries this site's origin so Stripe returns here", () => {
  const call = payBalanceCall("appt-1", "https://www.carismaaesthetics.com");
  assert.equal(call.method, "POST");
  assert.match(call.path, /\/pay-balance$/);
  assert.deepEqual(call.body, { returnOrigin: "https://www.carismaaesthetics.com" });
});

test("NEGATIVE CONTROL: no origin sends no origin, rather than an empty one", () => {
  // An empty string would be a value the server has to decide about. Sending
  // nothing keeps the phone app's existing behaviour exactly as it was.
  assert.deepEqual(payBalanceCall("appt-1", null).body, {});
  assert.deepEqual(payBalanceCall("appt-1").body, {});
  assert.deepEqual(payBalanceCall("appt-1", "").body, {});
});

test("coming back from Stripe says what happened, and an ordinary visit says nothing", () => {
  assert.equal(paymentReturnNote("?paid=1").tone, "ok");
  assert.match(paymentReturnNote("?paid=1").text, /Payment received/);
  assert.match(paymentReturnNote("?paid=cancelled").text, /Nothing has been charged/);
  // The control: every other visit to this page must be silent.
  assert.equal(paymentReturnNote(""), null);
  assert.equal(paymentReturnNote("?from=email"), null);
  assert.equal(paymentReturnNote("?paid=11"), null);
});
