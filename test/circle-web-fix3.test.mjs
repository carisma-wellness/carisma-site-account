import { test } from "node:test";
import assert from "node:assert/strict";
import { mountAccountPortal, circleSaysOff } from "../dist/index.js";
import { MARIA } from "./fixtures/circle-v2.mjs";
import { El, miniDocument } from "./fixtures/mini-dom.mjs";

/**
 * The WEB ship step (carisma-circle-v2-20261117; the third review of 18 Nov, CRITICAL #2 and minor #4): a member
 * read that FAILED was taken for "Circle is off", so a late booking paid with points read "Free to cancel." on the
 * page and under the sheet's headline, after zero points-bookings reads; a 2xx points answer that did not parse read
 * as "no points"; a hanging member read held the whole booking page on its skeleton. Every assertion marked (R3)
 * fails on the kit at c741b4b.
 */
const settle = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const json = (status, data) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(data) });
const APPT = "appt-points-1";
const LATE = { appointmentId: APPT, spendId: "sp-1", kind: "POINTS", points: 2180, status: "BOOKED", ifCancelledNow: "LOSE", keepsPoints: 2180, freeCancelUntil: null };
const FREE_PREVIEW = { chargeAmount: 0, refundAmount: 0, isLateCancellation: false, policyText: "" };
const POINTS_URL = `/api/auth/proxy/client/loyalty/points-bookings?appointmentIds=${APPT}`;

/**
 * `me`: an answer body (200), or { status, body }, or "network" (the fetch rejects), or a function returning a
 * promise (a read the test settles by hand). `points` likewise for points-bookings.
 */
function harness({ me = MARIA, points = { enabled: true, items: [LATE] } } = {}) {
  const doc = miniDocument({ pathname: `/account/bookings/${APPT}` });
  const mount = new El("div", { id: "carisma-account-portal" });
  doc.body.appendChild(mount);
  const reads = [];
  const booking = {
    success: true,
    data: {
      id: APPT,
      status: "BOOKED",
      startTime: "2099-06-02T14:00:00.000Z",
      endTime: "2099-06-02T14:55:00.000Z",
      venue: { name: "Carisma Spa", locationName: "Carisma Spa InterContinental", address: "St Julian's" },
      services: [{ serviceId: "svc-1", name: "Anti-Stress Massage", price: 0, durationMins: 55 }],
      totalAmount: 0,
      amountPaid: 0,
      actions: { canCancel: true, cancelIsFree: false, canReschedule: false },
      policyText: "Cancel up to 24 hours before your visit at no charge.",
    },
  };
  const answer = (spec) => {
    if (spec === "network") return Promise.reject(new TypeError("fetch failed"));
    if (typeof spec === "function") return spec();
    if (spec && typeof spec === "object" && "status" in spec && "body" in spec) return json(spec.status, spec.body);
    return json(200, spec);
  };
  const fetchImpl = (url) => {
    reads.push(url);
    if (url.startsWith("/api/auth/session")) return json(200, { signedIn: true, profile: { firstName: "Maria" } });
    if (url === "/api/auth/proxy/client/loyalty/me") return answer(me);
    if (url.startsWith("/api/auth/proxy/client/loyalty/points-bookings")) return answer(points);
    if (url.endsWith("/cancellation-preview")) return json(200, { success: true, data: FREE_PREVIEW });
    if (url === `/api/auth/proxy/client/booking/appointments/${APPT}`) return json(200, booking);
    if (url === "/api/auth/proxy/client/wallet/availability") return json(200, { success: true, data: { apple: false, google: false } });
    return json(404, {});
  };
  return { doc, mount, reads, fetchImpl };
}
const mount = (h) => mountAccountPortal(h.doc, { path: `/account/bookings/${APPT}`, fetchImpl: h.fetchImpl, circle: true });
const lead = (h) => (/<p class="cw-bk-policy__lead">([^<]*)<\/p>/.exec(h.mount.innerHTML) || [])[1] ?? null;
const pointsReads = (h) => h.reads.filter((u) => u.startsWith("/api/auth/proxy/client/loyalty/points-bookings"));
const painted = (h) => /data-cw-qc="account-booking-detail-20260922"/.test(h.mount.innerHTML);
async function openSheet(h) {
  const btn = h.mount.querySelector('[data-cw-action="cancel"]');
  assert.ok(btn, "precondition: Cancel booking is on the page");
  h.doc.click(btn);
  await settle(80);
  const dlg = h.mount.querySelector("dialog.cw-dialog");
  assert.ok(dlg, "the sheet opened");
  return dlg.innerHTML;
}
/** A read the test answers by hand. */
function deferred() {
  let settleWith;
  const p = new Promise((resolve) => {
    settleWith = (status, body) => resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
  });
  return { read: () => p, answer: settleWith };
}

test("circleSaysOff: only a clean enabled:false (bare or enveloped) is off", () => {
  assert.equal(circleSaysOff({ enabled: false }), true);
  assert.equal(circleSaysOff({ success: true, data: { enabled: false } }), true);
  for (const garbage of [null, undefined, {}, [], "off", { enabled: "false" }, { enabled: true }, { success: true, data: null }]) {
    assert.equal(circleSaysOff(garbage), false, JSON.stringify(garbage));
  }
});

for (const [name, me] of [
  ["503", { status: 503, body: { error: "busy" } }],
  ["429", { status: 429, body: {} }],
  ["a network error", "network"],
  ["a 2xx that is neither on nor off", {}],
]) {
  test(`member read ${name}: a late points booking never reads "Free to cancel" — the server's verdict is asked (R3)`, async () => {
    const h = harness({ me });
    mount(h);
    await settle(80);
    assert.ok(painted(h), "precondition: the booking page painted");
    assert.deepEqual(pointsReads(h), [POINTS_URL], "the points verdict is asked even though the member read failed");
    assert.equal(lead(h), "Cancelling now loses the 2,180 points on this booking.");
    assert.doesNotMatch(h.mount.innerHTML, /Free to cancel/);
    const sheet = await openSheet(h);
    assert.match(sheet, /Points lost if you cancel now/);
    assert.doesNotMatch(sheet, /Free to cancel/);
  });
}

test("member read failed AND the points read failed: no claim on the page, the sheet says it could not check (R3)", async () => {
  const h = harness({ me: { status: 503, body: {} }, points: { status: 503, body: {} } });
  mount(h);
  await settle(80);
  assert.ok(painted(h));
  assert.equal(lead(h), null, "no 'Free to cancel.' lead");
  const sheet = await openSheet(h);
  assert.doesNotMatch(sheet, /Free to cancel/);
  assert.match(sheet, /We couldn&#39;t check your Carisma credit just now|We couldn't check your Carisma credit just now/);
  assert.equal(pointsReads(h).length, 2, "the page's read + the sheet's fresh read");
});

for (const [name, body] of [
  ["{}", {}],
  ["enabled:true without items", { enabled: true }],
  ["an empty list", []],
  ["null", null],
]) {
  test(`a 2xx points answer that does not parse (${name}) is no answer, never "no points on it" (R3)`, async () => {
    const h = harness({ points: body });
    mount(h);
    await settle(80);
    assert.ok(painted(h));
    assert.equal(lead(h), null);
    assert.doesNotMatch(h.mount.innerHTML, /Free to cancel/);
    const sheet = await openSheet(h);
    assert.doesNotMatch(sheet, /Free to cancel/);
  });
}

test("off stays off: a clean enabled:false or a 404 member read asks no points and keeps the money words", async () => {
  for (const me of [{ enabled: false }, { success: true, data: { enabled: false } }, { status: 404, body: {} }]) {
    const h = harness({ me });
    mount(h);
    await settle(80);
    assert.ok(painted(h));
    assert.equal(pointsReads(h).length, 0, JSON.stringify(me));
    assert.equal(lead(h), "Free to cancel.");
    const sheet = await openSheet(h);
    assert.match(sheet, /Free to cancel/);
    assert.equal(pointsReads(h).length, 0, "the sheet asks nothing either");
  }
  // A clean "off" points answer (the member read live, the points door off for her): the money words.
  const pbOff = harness({ points: { enabled: false } });
  mount(pbOff);
  await settle(80);
  assert.equal(lead(pbOff), "Free to cancel.");
});

test("a hanging member read never holds the booking page; an off answer landing late restores the money words (R3)", async () => {
  const slow = deferred();
  const h = harness({ me: slow.read });
  mount(h);
  await settle(200);
  assert.equal(painted(h), false, "inside the budget the page waits (as before)");
  await settle(2600);
  assert.ok(painted(h), "the budget (2.5 s) covers the member read too: the page is on screen");
  assert.equal(lead(h), null, "drawn without a verdict: no 'Free to cancel.' claim");
  assert.equal(pointsReads(h).length, 0);
  slow.answer(200, { enabled: false });
  await settle(60);
  assert.equal(lead(h), "Free to cancel.", "off, late: the policy line is exactly what the page always said");
  assert.equal(pointsReads(h).length, 0, "off asks no points, even late");
  const sheet = await openSheet(h);
  assert.match(sheet, /Free to cancel/);
  assert.equal(pointsReads(h).length, 0);
});

test("a hanging member read that lands live re-says the policy line with the server's points verdict", async () => {
  const slow = deferred();
  const h = harness({ me: slow.read });
  mount(h);
  await settle(2700);
  assert.ok(painted(h));
  assert.equal(lead(h), null);
  slow.answer(200, MARIA);
  await settle(80);
  assert.deepEqual(pointsReads(h), [POINTS_URL]);
  assert.equal(lead(h), "Cancelling now loses the 2,180 points on this booking.");
});
