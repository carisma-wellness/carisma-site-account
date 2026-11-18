import { test } from "node:test";
import assert from "./fixtures/plain-assert.mjs";
import {
  createAccountRoutes,
  seal,
  unseal,
  mountAccountPanel,
  mountAccountPortal,
  readPointsBookings,
  pointsCancelLine,
  POINTS_CANCEL_UNKNOWN,
  POINTS_CANCEL_NOT_READ,
  POINTS_NOT_CHECKED,
  POINTS_NOT_READ,
  policyLead,
  cancelSummary,
  buildBookingDetailModel,
  circleAllowedOn,
  circleOnFor,
  circlePlacesOf,
  readCircle,
  readCircleStatus,
  creditMoment,
  circlePrefsHTML,
  readCirclePrefs,
  circleViewHTML,
  circleLeftViewHTML,
  PANEL_SESSION_URL,
  PANEL_SESSION_URL_CIRCLE,
} from "../dist/index.js";
import { MARIA, MARIA_LIVE, SUMMARY, STATUS, LEFT, THREE_BRANDS } from "./fixtures/circle-v2.mjs";
import { El, miniDocument } from "./fixtures/mini-dom.mjs";

/**
 * The WEB fix, pass 2 (carisma-circle-v2-20261117, the second review of 18 Nov): one test per kit-side defect.
 * Every assertion below fails on the kit at 2340641 (the pass-1 head).
 */
const settle = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const json = (status, data) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(data) });

/* ── CRITICAL: a booking paid with points got the money-only cancel words ─────────────────────────────── */

const APPT = "appt-points-1";
const FAR = "2099-06-01T10:00:00.000Z"; // a free-cancel deadline far ahead (the browser reads the real clock)
const item = (o = {}) => ({ appointmentId: APPT, spendId: "sp-1", kind: "POINTS", points: 2180, status: "BOOKED", ifCancelledNow: "LOSE", keepsPoints: 2180, freeCancelUntil: null, ...o });
const pb = (...items) => ({ enabled: true, items });

test("points-bookings → the cancel line: late loses, in time comes back, a passed deadline never says 'come back'", () => {
  const now = Date.parse("2026-11-19T10:00:00Z");
  const late = readPointsBookings(pb(item()));
  assert.deepEqual(pointsCancelLine(late, APPT, now), { back: false, lines: ["Cancelling now loses the 2,180 points on this booking."], lostPoints: 2180, until: "" });
  const inTime = readPointsBookings(pb(item({ ifCancelledNow: "RETURN", keepsPoints: 0, freeCancelUntil: "2026-11-20T13:00:00Z" })));
  assert.deepEqual(pointsCancelLine(inTime, APPT, now), {
    back: true,
    lines: ["Cancel now and your 2,180 points come back."],
    lostPoints: null,
    until: "2026-11-20T13:00:00.000Z",
  });
  // Read in time, drawn after the deadline: it loses them, no figure (the server's late share is re-read at the sheet).
  assert.deepEqual(pointsCancelLine(inTime, APPT, Date.parse("2026-11-20T13:00:00Z")), { back: false, lines: ["Cancelling now loses the points on this booking."], lostPoints: null, until: "" });
  // The CEO's 5000 share (a CEO question): half kept, the rest back.
  const half = readPointsBookings(pb(item({ keepsPoints: 1090 })));
  assert.deepEqual(pointsCancelLine(half, APPT, now).lines, ["Cancelling now loses 1,090 of the 2,180 points on this booking. The rest come back."]);
  // A free Spa day.
  const spa = (v) => readPointsBookings(pb(item({ kind: "SPA_DAY", points: 0, keepsPoints: 0, ifCancelledNow: v, freeCancelUntil: v === "RETURN" ? FAR : null })));
  assert.deepEqual(pointsCancelLine(spa("RETURN"), APPT, now).lines, ["Cancel now and your free Spa day comes back."]);
  assert.deepEqual(pointsCancelLine(spa("LOSE"), APPT, now).lines, ["Cancelling now counts as using your free Spa day."]);
  // No verdict sent (R2.16(g)): unknown — no sentence, and the callers then claim nothing is free.
  assert.deepEqual(pointsCancelLine(readPointsBookings(pb(item({ ifCancelledNow: undefined }))), APPT, now), { ...POINTS_CANCEL_UNKNOWN });
  // Only a BOOKED spend on THIS booking counts.
  assert.equal(pointsCancelLine(readPointsBookings(pb(item({ status: "RETURNED" }), item({ status: "HELD" }))), APPT, now), null);
  assert.equal(pointsCancelLine(late, "another-appt", now), null);
  assert.equal(pointsCancelLine(null, APPT, now), null);
  assert.equal(readPointsBookings({ enabled: false }), null);
  assert.equal(readPointsBookings({ success: true, data: pb(item()) }).length, 1, "the house envelope is unwrapped");
});

const model = (actions, total = 0) =>
  buildBookingDetailModel(
    {
      success: true,
      data: {
        id: APPT,
        status: "BOOKED",
        startTime: "2099-06-02T14:00:00.000Z",
        endTime: "2099-06-02T14:55:00.000Z",
        venue: { name: "Carisma Spa", locationName: "Carisma Spa InterContinental", address: "St George's Bay, St Julian's" },
        services: [{ serviceId: "svc-1", name: "Anti-Stress Massage", price: total, durationMins: 55 }],
        totalAmount: total,
        amountPaid: 0,
        actions: { canCancel: true, canReschedule: false, ...actions },
        policyText: "Free to cancel up to 24 hours before your visit.",
      },
    },
    APPT,
  );
const FREE_PREVIEW = { kind: "FREE", feeAmount: 0, forfeitAmount: 0, chargeAmount: 0, cardLast4: null, policyText: "", refundAmount: 0 };

test("the policy line: a €0 points booking in the late window never reads 'Free to cancel.'", () => {
  const now = Date.parse("2026-11-19T10:00:00Z");
  const late = pointsCancelLine(readPointsBookings(pb(item())), APPT, now);
  // The money engine sees €0: today's words said "Free to cancel." — the defect.
  assert.equal(policyLead(model({ cancelIsFree: false }), FREE_PREVIEW), "Free to cancel.", "precondition: the money words alone");
  assert.equal(policyLead(model({ cancelIsFree: false }), FREE_PREVIEW, late), "Cancelling now loses the 2,180 points on this booking.");
  assert.equal(policyLead(model({ cancelIsFree: true }), null, late), "Cancelling now loses the 2,180 points on this booking.", "a money 'free' never stands beside lost points");
  // In time: the points come back, and the server's own deadline follows.
  const back = pointsCancelLine(readPointsBookings(pb(item({ ifCancelledNow: "RETURN", keepsPoints: 0, freeCancelUntil: "2026-11-20T13:00:00Z" }))), APPT, now);
  assert.equal(policyLead(model({ cancelIsFree: true }), null, back), "Cancel now and your 2,180 points come back. Free to cancel until Fri 20 Nov, 14:00.");
  // Unknown verdict: no "Free to cancel" claim at all.
  assert.equal(policyLead(model({ cancelIsFree: true, freeCancelEndsAt: "2026-11-20T13:00:00Z" }), null, { ...POINTS_CANCEL_UNKNOWN, lines: [] }), "");
  assert.equal(policyLead(model({ cancelIsFree: false }), FREE_PREVIEW, { ...POINTS_CANCEL_NOT_READ, lines: [] }), "");
  // A money fee on the same booking is still said.
  const fee = { ...FREE_PREVIEW, kind: "LATE", chargeAmount: 20, feeAmount: 20 };
  assert.equal(policyLead(model({ cancelIsFree: false }, 89), fee, late), "Cancelling now loses the 2,180 points on this booking. Cancelling now costs €20.00.");
  // No points on it (or Circle off): exactly the words it always had.
  assert.equal(policyLead(model({ cancelIsFree: true, freeCancelEndsAt: "2026-11-20T13:00:00Z" }), null, null), "Free to cancel until Fri 20 Nov, 14:00.");
});

test("the cancel sheet: points lost head the sheet, never under 'Free to cancel'; back, unknown and not read", () => {
  const now = Date.parse("2026-11-19T10:00:00Z");
  const late = pointsCancelLine(readPointsBookings(pb(item())), APPT, now);
  const s = cancelSummary(FREE_PREVIEW, false, "policy", late);
  assert.equal(s.headline, "Points lost if you cancel now");
  assert.equal(s.amount, "2,180 points");
  assert.equal(s.tone, "warn");
  assert.deepEqual(s.lines, ["Cancelling now loses the 2,180 points on this booking."]);
  assert.equal(s.acceptFee, false, "points need no fee consent (the server applies its verdict)");
  assert.equal(cancelSummary(null, true, "", late).headline, "Points lost if you cancel now", "a money-free answer too");
  const back = pointsCancelLine(readPointsBookings(pb(item({ ifCancelledNow: "RETURN", keepsPoints: 0, freeCancelUntil: FAR }))), APPT, now);
  const b = cancelSummary(null, true, "", back);
  assert.equal(b.headline, "Free to cancel");
  assert.deepEqual(b.lines, ["Cancel now and your 2,180 points come back.", "There's nothing to pay."]);
  const u = cancelSummary(null, true, "", { ...POINTS_CANCEL_UNKNOWN, lines: [] });
  assert.equal(u.headline, null, "unknown: no 'Free to cancel' headline");
  assert.ok(u.lines.includes(POINTS_NOT_CHECKED));
  const nr = cancelSummary(null, true, "", { ...POINTS_CANCEL_NOT_READ, lines: [] });
  assert.equal(nr.headline, null);
  assert.ok(nr.lines.includes(POINTS_NOT_READ));
  // A money fee keeps its own headline, figure and consent; the points line joins it.
  const fee = cancelSummary({ ...FREE_PREVIEW, chargeAmount: 20, cardLast4: "4242" }, false, "", late);
  assert.equal(fee.headline, "Cancellation fee");
  assert.equal(fee.acceptFee, true);
  assert.deepEqual(fee.lines, ["We'll charge €20.00 to the card ending 4242.", "Cancelling now loses the 2,180 points on this booking."]);
  // No points: unchanged.
  assert.deepEqual(cancelSummary(null, true, ""), cancelSummary(null, true, "", null));
});

function bookingHarness({ me = MARIA, points = pb(item()), pointsStatus = 200, cancelIsFree = false } = {}) {
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
      actions: { canCancel: true, cancelIsFree, canReschedule: false },
      policyText: "Cancel up to 24 hours before your visit at no charge.",
    },
  };
  const fetchImpl = (url) => {
    reads.push(url);
    if (url.startsWith("/api/auth/session")) return json(200, { signedIn: true, profile: { firstName: "Maria" } });
    if (url === "/api/auth/proxy/client/loyalty/me") return json(200, me);
    if (url.startsWith("/api/auth/proxy/client/loyalty/points-bookings")) return json(pointsStatus, points);
    if (url.endsWith("/cancellation-preview")) return json(200, { success: true, data: FREE_PREVIEW });
    if (url === `/api/auth/proxy/client/booking/appointments/${APPT}`) return json(200, booking);
    if (url === "/api/auth/proxy/client/wallet/availability") return json(200, { success: true, data: { apple: false, google: false } });
    return json(404, {});
  };
  return { doc, mount, reads, fetchImpl };
}
const lead = (h) => (/<p class="cw-bk-policy__lead">([^<]*)<\/p>/.exec(h.mount.innerHTML) || [])[1] ?? null;
const pointsReads = (h) => h.reads.filter((u) => u.startsWith("/api/auth/proxy/client/loyalty/points-bookings"));

test("the booking page reads the points verdict only while Circle is live, and says it", async () => {
  const h = bookingHarness();
  mountAccountPortal(h.doc, { path: `/account/bookings/${APPT}`, fetchImpl: h.fetchImpl, circle: true });
  await settle(60);
  assert.match(h.mount.innerHTML, /data-cw-qc="account-booking-detail-20260922"/, "precondition: the booking page painted");
  assert.equal(lead(h), "Cancelling now loses the 2,180 points on this booking.");
  assert.doesNotMatch(h.mount.innerHTML, /Free to cancel\./);
  assert.deepEqual(pointsReads(h), [`/api/auth/proxy/client/loyalty/points-bookings?appointmentIds=${APPT}`]);

  // The site has no Circle: not one extra request, the words as before.
  const off = bookingHarness();
  mountAccountPortal(off.doc, { path: `/account/bookings/${APPT}`, fetchImpl: off.fetchImpl, circle: false });
  await settle(60);
  assert.equal(lead(off), "Free to cancel.");
  assert.equal(pointsReads(off).length, 0);
  assert.equal(off.reads.includes("/api/auth/proxy/client/loyalty/me"), false);

  // Circle off on the server (her member read): the /me read it always made, no points read, the words as before.
  const serverOff = bookingHarness({ me: { enabled: false } });
  mountAccountPortal(serverOff.doc, { path: `/account/bookings/${APPT}`, fetchImpl: serverOff.fetchImpl, circle: true });
  await settle(60);
  assert.equal(lead(serverOff), "Free to cancel.");
  assert.equal(pointsReads(serverOff).length, 0);

  // Live, but the read failed: no "Free to cancel" claim. An API without the door (404): the words as before.
  const failed = bookingHarness({ pointsStatus: 503, points: {} });
  mountAccountPortal(failed.doc, { path: `/account/bookings/${APPT}`, fetchImpl: failed.fetchImpl, circle: true });
  await settle(60);
  assert.equal(lead(failed), null, "no lead at all");
  assert.doesNotMatch(failed.mount.innerHTML, /Free to cancel\./);
  const noDoor = bookingHarness({ pointsStatus: 404, points: {} });
  mountAccountPortal(noDoor.doc, { path: `/account/bookings/${APPT}`, fetchImpl: noDoor.fetchImpl, circle: true });
  await settle(60);
  assert.equal(lead(noDoor), "Free to cancel.");
});

test("the cancel sheet asks the server again and heads with the points it would lose", async () => {
  const h = bookingHarness();
  mountAccountPortal(h.doc, { path: `/account/bookings/${APPT}`, fetchImpl: h.fetchImpl, circle: true });
  await settle(60);
  const btn = h.mount.querySelector('[data-cw-action="cancel"]');
  assert.ok(btn, "precondition: Cancel booking is on the page");
  h.doc.click(btn);
  await settle(60);
  const dlg = h.mount.querySelector("dialog.cw-dialog");
  assert.ok(dlg, "the sheet opened");
  const body = dlg.innerHTML;
  assert.match(body, /Points lost if you cancel now/);
  assert.match(body, /2,180 points/);
  assert.match(body, /Cancelling now loses the 2,180 points on this booking\./);
  assert.doesNotMatch(body, /Free to cancel/);
  assert.equal(pointsReads(h).length, 2, "the page's read + the sheet's fresh read");
});

/* ── MAJOR: the proxy forwarded an expired access token on the Circle doors and the booking door ───────── */

const RP = "carisma-spa";
const SECRET = "primary-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const API = "http://backend.local/api/v1";
const NOW_S = 1_700_000_000;
const ORIGIN = "https://www.carismaspa.com";

function refreshBackend({ refreshStatus = 200, unreachable = false } = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const path = String(url).replace(API, "");
    const headers = new Headers(init.headers ?? {});
    calls.push({ path, auth: headers.get("authorization"), body: init.body });
    if (path === "/auth/refresh") {
      if (refreshStatus !== 200) return new Response(JSON.stringify({ success: false }), { status: refreshStatus });
      return new Response(JSON.stringify({ success: true, data: { accessToken: "NEW-ACCESS", refreshToken: "R2", atExp: NOW_S + 900 } }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (unreachable) throw new TypeError("fetch failed");
    return new Response(JSON.stringify({ success: true, data: { enabled: true } }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const routes = createAccountRoutes({
    rpId: RP, clientId: RP, clientSecret: "cs", identityOrigin: "http://account.localtest.me:3000",
    carismasoftApiUrl: API, sessionSecret: SECRET, allowedOrigins: [ORIGIN], cookieSecure: false, fetchImpl, now: () => NOW_S * 1000,
  });
  return { routes, calls };
}
const cookieAt = (atExp) => seal({ v: 1, sid: "s1", uid: "u", at: "OLD-ACCESS", atExp, rt: "R1", initials: "MB", iat: NOW_S - 1000 }, SECRET, RP);
const req = (path, atExp, method = "GET", body) =>
  new Request(`${ORIGIN}/api/auth/proxy${path}`, {
    method,
    headers: { cookie: `cw_session=${cookieAt(atExp)}`, ...(method !== "GET" ? { origin: ORIGIN, "content-type": "application/json" } : {}) },
    body,
  });
const sessionCookieOf = (res) => {
  const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie") ?? ""];
  const line = set.find((c) => c.startsWith("cw_session=")) ?? "";
  return line ? decodeURIComponent(line.slice("cw_session=".length).split(";")[0]) : null;
};

test("an expired access token on a Circle door is renewed first, and the cookie is resealed", async () => {
  const b = refreshBackend();
  const res = await b.routes.proxy(req("/client/loyalty/me", NOW_S - 5));
  assert.equal(res.status, 200);
  assert.deepEqual(b.calls.map((c) => c.path), ["/auth/refresh", "/client/loyalty/me"]);
  assert.equal(b.calls[1].auth, "Bearer NEW-ACCESS", "the door gets the renewed token, never the expired one");
  const resealed = sessionCookieOf(res);
  assert.ok(resealed, "the answer reseals the session");
  const s = unseal(resealed, { primary: SECRET }, RP);
  assert.equal(s.at, "NEW-ACCESS");
  assert.equal(s.atExp, NOW_S + 900);
  assert.equal(s.rt, "R2", "a rotated refresh token is kept");
  // The booking door (points booking) and the redeem / release doors too.
  for (const [path, method] of [["/client/booking/guest/checkout", "POST"], ["/client/loyalty/redeem", "POST"], ["/client/loyalty/redeem/release", "POST"]]) {
    const r = refreshBackend();
    const out = await r.routes.proxy(req(path, NOW_S + 30, method, "{}"));
    assert.equal(r.calls[0].path, "/auth/refresh", `${path}: within 60 s of expiry → renewed`);
    assert.equal(r.calls[1].auth, "Bearer NEW-ACCESS");
    assert.ok(sessionCookieOf(out));
  }
});

test("token renewal: fresh tokens untouched, other doors untouched, a dead refresh signs out, a blip clears nothing", async () => {
  const fresh = refreshBackend();
  const r1 = await fresh.routes.proxy(req("/client/loyalty/me", NOW_S + 600));
  assert.deepEqual(fresh.calls.map((c) => c.path), ["/client/loyalty/me"]);
  assert.equal(fresh.calls[0].auth, "Bearer OLD-ACCESS");
  assert.equal(sessionCookieOf(r1), null);
  // Every other door is forwarded exactly as before (the account pages renew through /api/auth/session).
  const other = refreshBackend();
  await other.routes.proxy(req("/client/booking/appointments", NOW_S - 5));
  assert.deepEqual(other.calls.map((c) => c.path), ["/client/booking/appointments"]);
  assert.equal(other.calls[0].auth, "Bearer OLD-ACCESS");
  // Dead refresh token: 401, signed out (cookie and hints cleared), the door never reached.
  const dead = refreshBackend({ refreshStatus: 401 });
  const r2 = await dead.routes.proxy(req("/client/loyalty/redeem", NOW_S - 5, "POST", "{}"));
  assert.equal(r2.status, 401);
  assert.deepEqual(dead.calls.map((c) => c.path), ["/auth/refresh"]);
  const cleared = r2.headers.getSetCookie().find((c) => c.startsWith("cw_session="));
  assert.match(cleared, /Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  // A transient failure (5xx): the old token goes, nothing is cleared (W-9).
  const blip = refreshBackend({ refreshStatus: 503 });
  const r3 = await blip.routes.proxy(req("/client/loyalty/me", NOW_S - 5));
  assert.equal(blip.calls[1].auth, "Bearer OLD-ACCESS");
  assert.equal((r3.headers.getSetCookie?.() ?? []).length, 0);
  // Renewed, then the API did not answer: the 502 still carries the reseal (a rotated refresh token is never lost).
  const gone = refreshBackend({ unreachable: true });
  const r4 = await gone.routes.proxy(req("/client/loyalty/me", NOW_S - 5));
  assert.equal(r4.status, 502);
  assert.equal(unseal(sessionCookieOf(r4), { primary: SECRET }, RP).at, "NEW-ACCESS");
  // Single flight: two doors at once renew ONCE.
  const both = refreshBackend();
  await Promise.all([both.routes.proxy(req("/client/loyalty/me", NOW_S - 5)), both.routes.proxy(req("/client/loyalty/perks", NOW_S - 5))]);
  assert.equal(both.calls.filter((c) => c.path === "/auth/refresh").length, 1);
});

/* ── minor: an unbracketed IPv6 viewer address kept its port ───────────────────────────────────────────── */

test("the booking door forwards CloudFront's viewer address without its port, IPv6 included", async () => {
  for (const [viewer, want] of [["2001:db8::1:443", "2001:db8::1"], ["[2001:db8::7]:443", "2001:db8::7"], ["203.0.113.7:51234", "203.0.113.7"]]) {
    const seen = [];
    const routes = createAccountRoutes({
      rpId: RP, clientId: RP, clientSecret: "cs", identityOrigin: "http://account.localtest.me:3000", carismasoftApiUrl: API,
      sessionSecret: SECRET, allowedOrigins: [ORIGIN], cookieSecure: false, now: () => NOW_S * 1000,
      fetchImpl: async (url, init) => { seen.push(init.headers); return new Response("{}", { status: 201 }); },
    });
    await routes.proxy(new Request(`${ORIGIN}/api/auth/proxy/client/booking/guest/checkout`, {
      method: "POST",
      headers: { origin: ORIGIN, cookie: `cw_session=${cookieAt(NOW_S + 600)}`, "cloudfront-viewer-address": viewer, "content-type": "application/json" },
      body: "{}",
    }));
    assert.equal(seen[0]["x-client-ip"], want, viewer);
    assert.equal(seen[0]["x-forwarded-for"], want, viewer);
  }
});

/* ── MAJOR: KIT-6, the clinic host options ─────────────────────────────────────────────────────────────── */

test("circleAllowedOn is an allow-list: Carisma Spa, Aesthetics and Slimming only", () => {
  for (const yes of ["Carisma Spa", "Carisma Aesthetics", "Carisma Slimming", "carisma spa", "Carisma Spa & Wellness International"]) assert.equal(circleAllowedOn(yes), true, yes);
  for (const no of ["", "Carisma Hair Clinic", "Pulse", "Carisma Medical", "Carisma Medical Clinic", "Carisma", "Carisma Spa Medical", "Telehealth"]) assert.equal(circleAllowedOn(no), false, no);
  // The brands a member is told about come from the API's houses; Medical never, an unknown house never.
  const m = readCircle({ ...MARIA, brands: [...THREE_BRANDS, { house: "medical", brandId: "m", name: "Carisma Medical" }, { house: "hair", brandId: "h", name: "Carisma Hair Clinic" }] });
  assert.deepEqual(m.brands.map((b) => b.name), ["Carisma Spa", "Carisma Aesthetics", "Carisma Slimming"]);
});

test("circleV2 decides when given (read at each call); circlePlaces default to every place", () => {
  assert.equal(circleOnFor({ circle: true }, "Carisma Spa"), true);
  assert.equal(circleOnFor({ circle: true }, ""), false, "an unknown site (localhost) is not on the allow-list");
  assert.equal(circleOnFor({ circle: true, circleV2: false }, "Carisma Spa"), false, "circleV2 false wins");
  assert.equal(circleOnFor({ circle: false, circleV2: true }, "Carisma Aesthetics"), true);
  let calls = 0;
  const v2 = () => ++calls % 2 === 1;
  assert.equal(circleOnFor({ circleV2: v2 }, "Carisma Slimming"), true);
  assert.equal(circleOnFor({ circleV2: v2 }, "Carisma Slimming"), false);
  assert.equal(calls, 2, "evaluated at every call");
  assert.equal(circleOnFor({ circleV2: () => { throw new Error("x"); } }, "Carisma Spa"), false, "a throwing rule is off");
  assert.deepEqual(circlePlacesOf({}), { menu: true, overview: true, rewards: true });
  assert.deepEqual(circlePlacesOf({ circlePlaces: { menu: false, overview: false } }), { menu: false, overview: false, rewards: true });
});

function panelHarness(loyalty = SUMMARY, host = "www.carismaspa.com") {
  const doc = miniDocument({ host });
  const mark = new El("a", { "data-carisma-account-mark": null, "data-cw-session": "in", href: "/account" });
  doc.body.appendChild(mark);
  const reads = [];
  const fetchImpl = (url) => {
    reads.push(url);
    if (url.startsWith("/api/auth/session")) return json(200, { signedIn: true, initials: "MB", profile: { firstName: "Maria" }, upcoming: [], loyalty });
    if (url === "/api/auth/proxy/client/loyalty/me") return json(200, MARIA);
    return json(200, { enabled: true, items: [] });
  };
  return { doc, mark, reads, fetchImpl };
}
const panelOf = (h) => h.doc.getElementById("carisma-account-panel").innerHTML;

test("the menu: circlePlaces.menu false keeps the Card out (the Credit & rewards link stays), rewards false drops the link", async () => {
  const card = panelHarness();
  mountAccountPanel(card.doc, { fetchImpl: card.fetchImpl, circle: true });
  card.doc.click(card.mark);
  await settle(40);
  assert.match(panelOf(card), /data-cw-circle="panel"/, "precondition: the default draws the Card");
  // KIT-1: under her live Card the menu carries board 11's rows ("Credit and rewards" with its subtitle).
  assert.match(panelOf(card), /href="\/account\/rewards"><b>Credit and rewards<\/b>/);

  const noCard = panelHarness();
  mountAccountPanel(noCard.doc, { fetchImpl: noCard.fetchImpl, circle: true, circlePlaces: { menu: false } });
  noCard.doc.click(noCard.mark);
  await settle(40);
  assert.doesNotMatch(panelOf(noCard), /data-cw-circle|data-cw-jewel/);
  assert.match(panelOf(noCard), /href="\/account\/rewards">Credit &amp; rewards/, "the link to Credit & rewards remains");
  assert.equal(noCard.reads.includes("/api/auth/proxy/client/loyalty/me"), false, "no extras read for a Card that is not drawn");

  const none = panelHarness();
  mountAccountPanel(none.doc, { fetchImpl: none.fetchImpl, circle: true, circlePlaces: { menu: false, rewards: false } });
  none.doc.click(none.mark);
  await settle(40);
  assert.doesNotMatch(panelOf(none), /Credit &amp; rewards|data-cw-circle/);
  assert.equal(none.reads[0], PANEL_SESSION_URL, "no place left: the session read without the loyalty fold");
});

test("the menu: siteBrand is honoured before the host; circleV2 is read at every open", async () => {
  const local = panelHarness(SUMMARY, "localhost:3197");
  mountAccountPanel(local.doc, { fetchImpl: local.fetchImpl, circle: true });
  local.doc.click(local.mark);
  await settle(40);
  assert.equal(local.reads[0], PANEL_SESSION_URL, "an unknown host is off the allow-list");
  assert.doesNotMatch(panelOf(local), /data-cw-circle/);

  const named = panelHarness(SUMMARY, "localhost:3197");
  mountAccountPanel(named.doc, { fetchImpl: named.fetchImpl, circle: true, siteBrand: "Carisma Spa" });
  named.doc.click(named.mark);
  await settle(40);
  assert.equal(named.reads[0], PANEL_SESSION_URL_CIRCLE);
  assert.match(panelOf(named), /data-cw-circle="panel"/);

  let on = false;
  const v2 = panelHarness();
  mountAccountPanel(v2.doc, { fetchImpl: v2.fetchImpl, circleV2: () => on });
  v2.doc.click(v2.mark);
  await settle(40);
  assert.doesNotMatch(panelOf(v2), /data-cw-circle/, "off at the first open");
  v2.doc.click(v2.mark); // close
  on = true;
  v2.doc.click(v2.mark);
  await settle(40);
  assert.match(panelOf(v2), /data-cw-circle="panel"/, "on at the next open, with no remount");
});

function portalHarness({ view = "home", path = "/account", me = MARIA } = {}) {
  const doc = miniDocument({ pathname: path });
  const mount = new El("div", { id: "carisma-account-portal" });
  doc.body.appendChild(mount);
  const reads = [];
  const navs = [];
  const fetchImpl = (url) => {
    reads.push(url);
    if (url.startsWith("/api/auth/session")) return json(200, { signedIn: true, profile: { firstName: "Maria" } });
    if (url === "/api/auth/proxy/client/loyalty/me") return json(200, me);
    if (url === "/api/auth/proxy/client/loyalty/preferences") {
      return json(200, { enabled: true, left: false, brands: [{ brandId: "b1", name: "Carisma Slimming", house: "slimming", offersEmail: false, offersWhatsapp: false, canEmail: true, canWhatsapp: true }] });
    }
    if (url.startsWith("/api/auth/proxy/client/loyalty/")) return json(200, { enabled: true, items: [], nextCursor: null });
    return json(200, { success: true, data: [] });
  };
  return { doc, mount, reads, navs, fetchImpl, navigate: (u) => navs.push(u) };
}

test("the account: overview false keeps the Circle off Overview and the Wallet; rewards false removes Credit & rewards", async () => {
  const base = portalHarness();
  mountAccountPortal(base.doc, { view: "home", fetchImpl: base.fetchImpl, navigate: base.navigate, circle: true });
  await settle(60);
  assert.match(base.mount.innerHTML, /data-cw-circle="overview"/, "precondition: the default draws Overview's block");
  assert.match(base.mount.innerHTML, /data-cw-circle-rail/);

  const clinic = portalHarness();
  mountAccountPortal(clinic.doc, { view: "home", fetchImpl: clinic.fetchImpl, navigate: clinic.navigate, circle: true, circlePlaces: { menu: false, overview: false, rewards: true } });
  await settle(60);
  assert.doesNotMatch(clinic.mount.innerHTML, /data-cw-circle="overview"|data-cw-circle-slot="home"/);
  assert.match(clinic.mount.innerHTML, /data-cw-circle-rail/, "Credit & rewards stays on the rail");

  const wallet = portalHarness({ view: "wallet", path: "/account/wallet" });
  mountAccountPortal(wallet.doc, { view: "wallet", fetchImpl: wallet.fetchImpl, navigate: wallet.navigate, circle: true, circlePlaces: { overview: false } });
  await settle(60);
  assert.doesNotMatch(wallet.mount.innerHTML, /data-cw-circle-slot="wallet"/, "the Wallet line is an Overview place");

  const noRewards = portalHarness({ view: "rewards", path: "/account/rewards" });
  mountAccountPortal(noRewards.doc, { view: "rewards", fetchImpl: noRewards.fetchImpl, navigate: noRewards.navigate, circle: true, circlePlaces: { rewards: false } });
  await settle(60);
  assert.deepEqual(noRewards.navs, ["/account"], "Credit & rewards does not exist on such a site");
  const home = portalHarness();
  mountAccountPortal(home.doc, { view: "home", fetchImpl: home.fetchImpl, navigate: home.navigate, circle: true, circlePlaces: { rewards: false } });
  await settle(60);
  assert.doesNotMatch(home.mount.innerHTML, /data-cw-circle-rail/);

  // circleV2 false at mount: the Circle is off everywhere, and the member read is never made.
  const v2 = portalHarness();
  mountAccountPortal(v2.doc, { view: "home", fetchImpl: v2.fetchImpl, navigate: v2.navigate, circle: true, circleV2: () => false });
  await settle(60);
  assert.doesNotMatch(v2.mount.innerHTML, /data-cw-circle/);
  assert.equal(v2.reads.includes("/api/auth/proxy/client/loyalty/me"), false);
});

test("circleWhatsappPref false: no WhatsApp box on Credit & rewards (live or left); the default keeps both", async () => {
  const prefs = readCirclePrefs({ enabled: true, brands: [{ brandId: "b1", name: "Carisma Slimming", house: "slimming", offersEmail: true, offersWhatsapp: false, canEmail: true, canWhatsapp: true }] });
  assert.match(circlePrefsHTML(prefs), /data-cw-circle-pref="whatsapp"/, "precondition: the default draws it");
  assert.doesNotMatch(circlePrefsHTML(prefs, null, false, { whatsapp: false }), /whatsapp|WhatsApp/);
  assert.doesNotMatch(circleViewHTML({ me: readCircle(MARIA), activity: null, rewards: null, prefs, whatsappPref: false }), /data-cw-circle-pref="whatsapp"/);
  assert.doesNotMatch(circleLeftViewHTML({ left: { leftAt: "" }, prefs, whatsappPref: false }), /data-cw-circle-pref="whatsapp"/);
  const h = portalHarness({ view: "rewards", path: "/account/rewards" });
  mountAccountPortal(h.doc, { view: "rewards", fetchImpl: h.fetchImpl, navigate: h.navigate, circle: true, circleWhatsappPref: false });
  await settle(60);
  assert.match(h.mount.innerHTML, /data-cw-circle-pref="email"/, "precondition: the box rendered");
  assert.doesNotMatch(h.mount.innerHTML, /data-cw-circle-pref="whatsapp"/);
});

/* ── MAJOR: perks.live on the Credit & rewards perks block ─────────────────────────────────────────────── */

test("Credit & rewards draws a perk row only while her own perks.live says that perk is on", async () => {
  const perks = { enabled: true, year: 2026, level: { key: "ruby", number: 3, name: "Ruby" }, spaDays: { entitlement: 1, used: 0, left: 1, serviceIds: ["x"], resetsOn: "2027-01-01" }, noDeposit: { active: true }, earlyAccess: { hours: 48, upcoming: [] } };
  const run = async (me) => {
    const h = portalHarness({ view: "rewards", path: "/account/rewards", me });
    const fetchImpl = (url) => (url === "/api/auth/proxy/client/loyalty/perks" ? json(200, perks) : h.fetchImpl(url));
    mountAccountPortal(h.doc, { view: "rewards", fetchImpl, navigate: h.navigate, circle: true, circleSpaDayHref: "/spa-day" });
    await settle(60);
    return h.mount.innerHTML;
  };
  const real = await run(MARIA);
  assert.match(real, /data-cw-circle="balance"/, "precondition: the page drew");
  assert.doesNotMatch(real, /free Spa day|No deposit/, "BE-1's real /me (no live block): no perk row, no unlock, no benefit");
  const live = await run(MARIA_LIVE);
  assert.match(live, /1 free Spa day this year · 1 left/);
  assert.match(live, /No deposit when you book by phone or at the desk/);
  // The public ladder has no fallback: absent = not live.
  const status = readCircleStatus(STATUS);
  assert.equal(status.levels[2].live.spaDays, false);
  assert.equal(readCircleStatus({ ...STATUS, levels: STATUS.levels.map((l) => ({ ...l, live: { spaDays: true, noDeposit: "yes" } })) }).levels[2].live.noDeposit, false, "only a literal true counts");
});

/* ── minor: a bill with a points line AND money lines kept only the points line ────────────────────────── */

test("creditMoment: a mixed bill keeps its earned moment and carries the points line beside it", () => {
  const m = readCircle(MARIA);
  const mixed = creditMoment({ earnedCents: 545, earnedPoints: 109, member: m, hasExcludedLine: false, paidWithPoints: { points: 2180 } });
  assert.equal(mixed.kind, "earned");
  assert.match(mixed.sentence, /€5\.45/);
  assert.equal(mixed.paidLine, "Paid with points · 2,180 points · This treatment earns no points");
  const only = creditMoment({ earnedCents: 0, member: m, hasExcludedLine: false, paidWithPoints: { points: 2180 } });
  assert.equal(only.kind, "paid");
  assert.equal(only.quiet, only.paidLine);
  const guest = creditMoment({ earnedCents: 545, member: null, hasExcludedLine: false, paidWithPoints: { points: 2180 } });
  assert.equal(guest.kind, "received");
  assert.ok(guest.paidLine);
  assert.equal(creditMoment({ earnedCents: 545, member: m, hasExcludedLine: false }).paidLine, "");
  assert.equal(creditMoment({ earnedCents: 545, member: m, hasExcludedLine: true, paidWithPoints: { points: 2180 } }).kind, "none");
});

test("left members: the WhatsApp option and the left fixture stay figure-free", () => {
  assert.doesNotMatch(circleLeftViewHTML({ left: { leftAt: LEFT.leftAt }, prefs: null }), /€\s?\d/);
});

/* ── minors: the menu's unlock rate ignored rules.earnPerEuro; the chip printed a balance below zero ───── */

test("the menu's unlock line follows rules.earnPerEuro; the header chip draws no figure below zero", async () => {
  const { accountPanelHTML, buildPanelModel, circleChipHTML, readCircleSummary } = await import("../dist/index.js");
  const { SUMMARY_ASKED } = await import("./fixtures/circle-v2.mjs");
  const base = { signedIn: true, initials: "MB", profile: { firstName: "Maria" }, upcoming: [] };
  assert.match(accountPanelHTML(buildPanelModel({ ...base, loyalty: SUMMARY_ASKED })), /Level 4 · Sapphire unlocks 8\.75% back/, "precondition: 1 point per €1");
  const doubled = { ...SUMMARY_ASKED, rules: { pointsPerEuro: 20, earnPerEuro: 2 } };
  assert.equal(readCircleSummary(doubled).earnPerEuro, 2);
  assert.match(accountPanelHTML(buildPanelModel({ ...base, loyalty: doubled })), /Level 4 · Sapphire unlocks 17\.5% back/, "2 points per €1 doubles the share");
  const chip = circleChipHTML(readCircleSummary(SUMMARY));
  assert.match(chip, /cc-chip__bal">€72\.40</);
  const below = circleChipHTML(readCircleSummary({ ...SUMMARY, balance: { points: -70, cents: -350, display: "−€3.50 · −70 points" } }));
  assert.doesNotMatch(below, /cc-chip__bal|€|−/, "below zero: the mark alone, never '−€3.50' in the header");
  assert.match(below, /Carisma credit, Level 3 · Ruby/);
});
