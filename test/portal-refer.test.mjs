/**
 * Refer a friend (referral v2 pack, W2): the member's code, this site's link,
 * share, the deal in plain words, friends by initial, and the vouchers.
 *
 * The fixture is the shape GET /client/referrals/me sends on the backend branch
 * feat/referral-v2-core (referral.report.ts getMyReferralsV2, wrapped by
 * successResponse). It is replaced by a capture from api-stage once Wave 1 is
 * live there (06-api-contract.md, "before any surface ships").
 *
 * Every positive assertion has a negative control beside it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildReferModel,
  referHTML,
  referShareText,
  referFamily,
  sectionsFor,
  bodyFor,
  requestsFor,
  subjectFor,
  titleFor,
  mountAccountPortal,
} from "../dist/ui/index.js";
import { PORTAL_RECORDS_CSS } from "../dist/ui/styles/index.js";
import { isAllowed } from "../dist/index.js";

/** What a browser would decode an attribute or text node to. */
const decode = (s) =>
  s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const text = (html) => decode(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
const count = (html, re) => (html.match(re) || []).length;

const AESTHETICS = {
  brandId: "b-aes",
  brandName: "Carisma Aesthetics",
  brandSlug: "carisma-aesthetics",
  offerText: "€20 off your first visit (minimum spend €50)",
  rewardText: "€20 voucher for you",
  releaseText: "After your friend's visit",
  voucherValidityDays: 180,
  termsUrl: "https://www.carismaaesthetics.com/referral-terms",
  shareUrl: "https://www.carismaaesthetics.com/?ref=7K2MX9QA",
};
const SLIMMING = {
  brandId: "b-slim",
  brandName: "Carisma Slimming",
  brandSlug: "carisma-slimming",
  offerText: "10% off your first visit (up to €30, minimum spend €60)",
  rewardText: "10% of what your friend pays, as a voucher for you",
  releaseText: "As soon as your friend has paid",
  voucherValidityDays: 365,
  termsUrl: null,
  shareUrl: "https://www.carismaslimming.com/?ref=7K2MX9QA",
};

const ME = {
  success: true,
  data: {
    // v1 compatibility fields, still sent
    code: "7K2MX9QA",
    shareUrl: "https://www.carismaaesthetics.com/?ref=7K2MX9QA",
    invited: 3,
    qualified: 1,
    rewarded: 1,
    creditEarned: 0,
    referredBy: null,
    byBrand: [],
    referrals: [],
    // v2
    programmes: [AESTHETICS, SLIMMING],
    friends: [
      { id: "r1", friendInitial: "A.", brandName: "Carisma Aesthetics", status: "rewarded", createdOn: "Tue 18 August 2026" },
      { id: "r2", friendInitial: "M.", brandName: "Carisma Aesthetics", status: "on_its_way", createdOn: "Mon 21 September 2026" },
      { id: "r3", friendInitial: "J.", brandName: "Carisma Slimming", status: "joined", createdOn: "Wed 23 September 2026" },
      { id: "r4", friendInitial: "K.", brandName: null, status: "withdrawn", createdOn: "Fri 4 September 2026" },
      { id: "r5", friendInitial: "?", brandName: "Carisma Aesthetics", status: "SOMETHING_NEW", createdOn: "" },
    ],
    rewards: [
      { giftCardId: "g1", code: "A7K2MX9QAB", brandId: "b-aes", brandName: "Carisma Aesthetics", amountCents: 2000, balanceCents: 2000, expiresOn: "2027-03-23", status: "active" },
      { giftCardId: "g2", code: "A7K2MX9QAC", brandId: "b-aes", brandName: "Carisma Aesthetics", amountCents: 2000, balanceCents: 0, expiresOn: "2027-02-01", status: "cancelled" },
    ],
    pendingRewardsCents: 2000,
    rememberedCode: null,
  },
};

// A fixed Malta clock, so a voucher's expiry is judged against the day the
// fixture was written for, not the day the suite happens to run.
const AES_SITE = {
  siteBrand: "Carisma Aesthetics",
  siteOrigin: "https://www.carismaaesthetics.com",
  now: new Date("2026-09-24T10:00:00.000Z"),
};

/* ── Which programme leads, and which link is shared ──────────────────── */

test("an Aesthetics member on the Aesthetics site shares this site's link, and Slimming is listed under it", () => {
  const m = buildReferModel(ME, AES_SITE);
  assert.equal(m.code, "7K2MX9QA");
  assert.equal(m.programme?.brandName, "Carisma Aesthetics");
  assert.equal(m.shareUrl, "https://www.carismaaesthetics.com/?ref=7K2MX9QA");
  assert.deepEqual(m.others.map((p) => p.brandName), ["Carisma Slimming"]);
});

test("Hair Clinic runs on Aesthetics' programme, and shares a Hair Clinic link", () => {
  const m = buildReferModel(ME, { siteBrand: "Carisma Hair Clinic", siteOrigin: "https://www.carismahairclinic.com" });
  assert.equal(m.programme?.brandName, "Carisma Aesthetics");
  assert.equal(m.shareUrl, "https://www.carismahairclinic.com/?ref=7K2MX9QA");
  // NEGATIVE CONTROL: the Slimming site leads with Slimming, on its own link.
  const s = buildReferModel(ME, { siteBrand: "Carisma Slimming", siteOrigin: "https://www.carismaslimming.com" });
  assert.equal(s.programme?.brandName, "Carisma Slimming");
  assert.equal(s.shareUrl, "https://www.carismaslimming.com/?ref=7K2MX9QA");
  assert.deepEqual(s.others.map((p) => p.brandName), ["Carisma Aesthetics"]);
});

test("a non-https origin (localhost, a preview) never becomes the shared link; the server's link is used", () => {
  const m = buildReferModel(ME, { siteBrand: "Carisma Aesthetics", siteOrigin: "http://localhost:3000" });
  assert.equal(m.shareUrl, AESTHETICS.shareUrl);
  const odd = buildReferModel(ME, { siteBrand: "Carisma Aesthetics", siteOrigin: 'https://evil.example/"><script>' });
  assert.equal(odd.shareUrl, AESTHETICS.shareUrl);
});

test("a site with no programme of its own (Pulse) leads with the first live one on that brand's own link", () => {
  const m = buildReferModel(ME, { siteBrand: "Pulse", siteOrigin: "https://www.pulsewellness.com" });
  assert.equal(m.programme?.brandName, "Carisma Aesthetics");
  assert.equal(m.shareUrl, AESTHETICS.shareUrl, "never a pulsewellness.com link");
});

test("referFamily folds Hair Clinic into Aesthetics and knows every site", () => {
  assert.equal(referFamily("Carisma Hair Clinic"), "aesthetics");
  assert.equal(referFamily("carisma-aesthetics"), "aesthetics");
  assert.equal(referFamily("Carisma Slimming"), "slimming");
  assert.equal(referFamily("carisma-spa"), "spa");
  assert.equal(referFamily("Pulse"), "pulse");
  assert.equal(referFamily("Carisma Medical"), "medical");
  assert.equal(referFamily(""), "");
});

/* ── The page ─────────────────────────────────────────────────────────── */

test("the deal reads plainly: the friend's offer, the member's voucher, when it arrives", () => {
  const html = referHTML(buildReferModel(ME, AES_SITE));
  const t = text(html);
  assert.match(t, /For your friend €20 off your first visit Minimum spend €50/);
  assert.match(t, /For you €20 voucher After your friend's visit/);
  // The server's "for you" tail is dropped under the "For you" label…
  assert.doesNotMatch(t, /voucher for you/);
  // …and the percent wording keeps its meaning.
  const s = text(referHTML(buildReferModel(ME, { siteBrand: "Carisma Slimming" })));
  assert.match(s, /For you 10% of what your friend pays, as a voucher /);
  assert.match(s, /Up to €30, minimum spend €60/);
});

test("the code, the share row and the link are all there, and every share carries the code", () => {
  const m = buildReferModel(ME, AES_SITE);
  const html = referHTML(m);
  assert.match(html, /<p class="cw-refer__code"[^>]*>7K2MX9QA<\/p>/);
  assert.equal(count(html, /data-cw-refer-share/g), 1);
  assert.match(html, /data-cw-refer-copy="https:\/\/www\.carismaaesthetics\.com\/\?ref=7K2MX9QA"/);
  assert.match(html, /data-cw-refer-copy="7K2MX9QA"/);
  assert.match(text(html), /carismaaesthetics\.com\/\?ref=7K2MX9QA/);
  const wa = /href="(https:\/\/wa\.me\/\?text=[^"]+)"/.exec(html);
  assert.ok(wa, "a WhatsApp link");
  const message = decodeURIComponent(decode(wa[1]).split("text=")[1]);
  assert.equal(
    message,
    "Here's €20 off your first visit (minimum spend €50) at Carisma Aesthetics. Use my code 7K2MX9QA when you book. https://www.carismaaesthetics.com/?ref=7K2MX9QA",
  );
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.equal(referShareText(m.programme, m.code), message.replace(/ https:\/\/\S+$/, ""));
});

test("with no link to share, Share shares the code and there is no Copy link", () => {
  const body = structuredClone(ME);
  body.data.programmes = [{ ...AESTHETICS, shareUrl: null }];
  const html = referHTML(buildReferModel(body, { siteBrand: "Carisma Aesthetics", siteOrigin: "http://localhost:3000" }));
  assert.match(html, />Share your code</);
  assert.doesNotMatch(html, />Copy link</);
  assert.match(html, />Copy code</);
  // NEGATIVE CONTROL: with a link, it is "Share your link" and Copy link exists.
  const withLink = referHTML(buildReferModel(ME, AES_SITE));
  assert.match(withLink, />Share your link</);
  assert.match(withLink, />Copy link</);
});

test("terms: the release and validity are stated, and only an https terms page is linked", () => {
  const html = referHTML(buildReferModel(ME, AES_SITE));
  assert.match(text(html), /Your voucher arrives after your friend's visit and is valid for 180 days\. Full terms/);
  assert.match(html, /href="https:\/\/www\.carismaaesthetics\.com\/referral-terms"/);
  for (const bad of ["javascript:alert(1)", "http://www.carismaaesthetics.com/terms", "//evil.example"]) {
    const body = structuredClone(ME);
    body.data.programmes = [{ ...AESTHETICS, termsUrl: bad }];
    const h = referHTML(buildReferModel(body, AES_SITE));
    assert.doesNotMatch(h, /Full terms/, bad);
    assert.doesNotMatch(h, /javascript:/, bad);
  }
});

test("friends: an initial, the brand and a status, never a name; an unknown status gets no chip", () => {
  const html = referHTML(buildReferModel(ME, AES_SITE));
  const t = text(html);
  assert.match(t, /Friends 5/);
  assert.match(t, /A\. Carisma Aesthetics Voucher sent/);
  assert.match(t, /M\. Carisma Aesthetics Voucher on its way/);
  assert.match(t, /J\. Carisma Slimming Booked/);
  assert.match(t, /K\. Withdrawn/);
  assert.match(html, /cw-chip--bad">Withdrawn/);
  assert.doesNotMatch(t, /SOMETHING_NEW/);
  assert.equal(count(html, /class="cw-chip /g), 4, "four known statuses, four chips");
  assert.match(t, /You'll only ever see a friend's initial\./);
});

// 02 §11: initial, brand and status only. The backend is dropping `createdOn`;
// until it has, a date the server still sends must not reach the page.
test("friends: no date renders, even when the server still sends createdOn", () => {
  const m = buildReferModel(ME, AES_SITE);
  assert.ok(ME.data.friends.every((f) => "createdOn" in f), "the fixture carries the field");
  assert.ok(m.friends.every((f) => !("createdOn" in f)), "the view model drops it");
  const t = text(referHTML(m));
  for (const day of ["Tue 18 August 2026", "Mon 21 September 2026", "Wed 23 September 2026", "Fri 4 September 2026"]) {
    assert.ok(!t.includes(day), day);
  }
  const SERVER_DAY = /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} [A-Z][a-z]+ 20\d\d\b/;
  assert.doesNotMatch(t, SERVER_DAY);
  // NEGATIVE CONTROLS: the pattern catches the row as it used to render, and
  // the page text still carries a date where one belongs (a voucher's expiry).
  assert.match("A. Carisma Aesthetics · Tue 18 August 2026 Voucher sent", SERVER_DAY);
  assert.match(t, /valid until 23 Mar 2027/);
});

test("vouchers: earned ones show as wallet cards tagged Referral reward; a cancelled one does not; pending is stated", () => {
  const html = referHTML(buildReferModel(ME, AES_SITE));
  assert.match(html, /A7K2MX9QAB/);
  assert.doesNotMatch(html, /A7K2MX9QAC/, "the cancelled voucher is left out");
  assert.equal(count(html, /cw-gift__tag">Referral reward/g), 1);
  assert.match(text(html), /€20\.00 on its way/);
  assert.match(text(html), /valid until 23 Mar 2027/);
});

test("vouchers: an expired one is left out of the list AND the count, by status or by its Malta expiry day", () => {
  const body = structuredClone(ME);
  const card = (code, expiresOn, status = "active") => ({
    giftCardId: code, code, brandId: "b-aes", brandName: "Carisma Aesthetics",
    amountCents: 2000, balanceCents: 2000, expiresOn, status,
  });
  body.data.rewards = [
    card("LIVE000001", "2027-03-23"),
    card("TODAY00001", "2026-09-24"),
    card("GONE000001", "2026-09-23"),
    card("STAT000001", "2027-01-01", "expired"),
    card("STAT000002", "2027-01-01", "EXPIRED"),
  ];
  // 23:30 on 24 September in Malta (21:30 UTC): the voucher expiring today is
  // still good through the end of the day; yesterday's is gone.
  const lateEvening = { ...AES_SITE, now: new Date("2026-09-24T21:30:00.000Z") };
  const m = buildReferModel(body, lateEvening);
  assert.deepEqual(m.rewards.map((r) => r.code), ["LIVE000001", "TODAY00001"]);
  const html = referHTML(m);
  assert.match(html, /Your vouchers<span class="cw-section__count">2<\/span>/);
  for (const gone of ["GONE000001", "STAT000001", "STAT000002"]) assert.doesNotMatch(html, new RegExp(gone));
  // NEGATIVE CONTROL: half an hour later it is 25 September in Malta while it
  // is still the 24th in UTC. The Malta clock decides: today's voucher is gone.
  const pastMidnight = buildReferModel(body, { ...AES_SITE, now: new Date("2026-09-24T22:30:00.000Z") });
  assert.deepEqual(pastMidnight.rewards.map((r) => r.code), ["LIVE000001"]);
  assert.match(referHTML(pastMidnight), /Your vouchers<span class="cw-section__count">1<\/span>/);
  // An expiry nothing can read is shown rather than guessed away.
  body.data.rewards = [card("ODD0000001", "soon")];
  assert.deepEqual(buildReferModel(body, lateEvening).rewards.map((r) => r.code), ["ODD0000001"]);
});

test("nothing live and nothing earned: an empty state, and no code to share", () => {
  const body = { success: true, data: { code: "7K2MX9QA", shareUrl: null, programmes: [], friends: [], rewards: [], pendingRewardsCents: 0 } };
  const html = referHTML(buildReferModel(body, AES_SITE));
  assert.match(text(html), /Refer a friend isn't open yet/);
  assert.doesNotMatch(html, /7K2MX9QA/, "a code that works nowhere is not shown");
  assert.doesNotMatch(html, /data-cw-refer-/);
});

test("paused with history: the vouchers stay, the share row goes", () => {
  const body = structuredClone(ME);
  body.data.programmes = [];
  const html = referHTML(buildReferModel(body, AES_SITE));
  assert.match(text(html), /Refer a friend is paused\./);
  assert.match(html, /A7K2MX9QAB/);
  assert.doesNotMatch(html, /data-cw-refer-share/);
  assert.doesNotMatch(html, /cw-refer__code/);
});

test("a v1-shaped body (kill switch off) renders the empty state rather than throwing", () => {
  const v1 = { success: true, data: { code: "7K2MX9QA", shareUrl: "https://app.carismasoft.com/r/7K2MX9QA", invited: 0, qualified: 0, rewarded: 0, referrals: [] } };
  assert.match(text(referHTML(buildReferModel(v1, AES_SITE))), /isn't open yet/);
  for (const junk of [null, undefined, "", 42, [], { data: null }, { success: false }]) {
    assert.match(text(referHTML(buildReferModel(junk, AES_SITE))), /isn't open yet/);
  }
});

test("brand and offer text from the server are escaped", () => {
  const body = structuredClone(ME);
  body.data.programmes = [{ ...AESTHETICS, brandName: 'Carisma Aesthetics<img src=x onerror=alert(1)>', offerText: '€20 off <b>"now"</b>' }];
  const html = referHTML(buildReferModel(body, AES_SITE));
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /&lt;img/);
});

test("the other brands each offer their own link, named for a screen reader", () => {
  const html = referHTML(buildReferModel(ME, AES_SITE));
  // The "S" is the brand's initial tile (aria-hidden), then the row itself.
  assert.match(text(html), /Your code works here too S Carisma Slimming Your friend gets 10% off your first visit/);
  assert.match(html, /data-cw-refer-copy="https:\/\/www\.carismaslimming\.com\/\?ref=7K2MX9QA"/);
  assert.match(html, /Copy link<span class="cw-vh"> for Carisma Slimming<\/span>/);
});

/* ── Wiring: the section, the proxy, the rail ─────────────────────────── */

test("the section reads one member path, which the proxy allows, and bodyFor renders the page", () => {
  assert.deepEqual(requestsFor("refer"), ["/api/auth/proxy/client/referrals/me"]);
  assert.equal(isAllowed("GET", "/client/referrals/me"), true);
  // NEGATIVE CONTROL: the staff routes are not reachable through the member proxy.
  assert.equal(isAllowed("GET", "/hod/referrals"), false);
  assert.equal(titleFor("refer", "x"), "Refer a friend");
  assert.equal(subjectFor("refer"), "referrals");
  assert.equal(bodyFor("refer", [ME], AES_SITE), referHTML(buildReferModel(ME, AES_SITE)));
});

test("the rail row is OPT-IN: off by default on every site and every page, its own included", () => {
  const ids = (view, brand, referRail) => sectionsFor(view, brand, referRail).map((s) => s.id);
  for (const brand of ["Carisma Aesthetics", "Carisma Hair Clinic", "Carisma Slimming", "Carisma Spa", "Pulse", ""]) {
    for (const view of ["home", "wallet", "refer"]) {
      assert.ok(!ids(view, brand).includes("refer"), `${brand || "unknown host"} ${view}: default`);
      assert.ok(!ids(view, brand, false).includes("refer"), `${brand || "unknown host"} ${view}: off`);
    }
  }
  // NEGATIVE CONTROL: the rest of the rail is untouched by the switch.
  assert.deepEqual(ids("home", "Carisma Aesthetics"), ["home", "bookings", "wallet", "payments", "membership", "documents", "details"]);
});

test("opted in, the rail shows Refer a friend on the voucher brands only, and always on its own page", () => {
  const ids = (view, brand) => sectionsFor(view, brand, true).map((s) => s.id);
  for (const brand of ["Carisma Aesthetics", "Carisma Hair Clinic", "Carisma Slimming", "Carisma Spa"]) {
    assert.ok(ids("home", brand).includes("refer"), brand);
  }
  for (const brand of ["Pulse", "", "Carisma Medical"]) {
    assert.ok(!ids("home", brand).includes("refer"), `hidden on ${brand || "an unknown host"}`);
  }
  assert.ok(ids("refer", "Pulse").includes("refer"), "on its own page it is the current row");
  // NEGATIVE CONTROL: the unlimited sections are on every site.
  assert.ok(ids("home", "Pulse").includes("wallet"));
});

test("the stylesheet has the refer rules and no raw colours in them", () => {
  const block = PORTAL_RECORDS_CSS.slice(PORTAL_RECORDS_CSS.indexOf("/* ── Refer a friend"), PORTAL_RECORDS_CSS.indexOf("/* ── Phones"));
  assert.match(block, /\.carisma-portal \.cw-refer__code/);
  assert.doesNotMatch(block, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(block, /rgba?\(/i);
});

/* ── The buttons, through the real mount ──────────────────────────────── */

function harness(host = "www.carismaaesthetics.com") {
  const handlers = [];
  const status = { innerHTML: "" };
  const mount = {
    innerHTML: "", setAttribute() {}, getAttribute() { return null; },
    addEventListener(t, h) { if (t === "click") handlers.push(h); },
    querySelector(sel) { return sel === ".cw-status" ? status : null; },
    querySelectorAll() { return []; },
  };
  const doc = {
    cookie: "cw-signed-in=1",
    location: { pathname: "/account/refer", host, origin: `https://${host}`, search: "" },
    getElementById: (id) => (id === "carisma-account-portal" ? mount : null),
    querySelectorAll: () => [], addEventListener() {},
  };
  const json = (data) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
  const fetchImpl = (url) => {
    if (url.startsWith("/api/auth/session")) return json({ signedIn: true, profile: { firstName: "Sarah" } });
    if (url === "/api/auth/proxy/client/referrals/me") return json(ME);
    return json({ success: true, data: [] });
  };
  const click = (attrs) => {
    const btn = {
      attrs,
      getAttribute(n) { return this.attrs[n] ?? null; }, setAttribute() {}, focus() {},
      closest(sel) {
        const m = /^\[([a-z-]+)\]$/.exec(sel);
        return m && m[1] in this.attrs ? this : null;
      },
    };
    for (const h of handlers) h({ target: btn, preventDefault() {}, stopPropagation() {} });
  };
  return { doc, mount, status, fetchImpl, click };
}

const settle = () => new Promise((r) => setTimeout(r, 20));

function withNavigator(nav, fn) {
  const before = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { value: nav, configurable: true, writable: true });
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (before) Object.defineProperty(globalThis, "navigator", before);
      else delete globalThis.navigator;
    });
}

test("with the rail off (the default), /account/refer still renders, and no rail anywhere links it", async () => {
  const h = harness();
  mountAccountPortal(h.doc, { view: "refer", fetchImpl: h.fetchImpl, navigate() {} });
  await settle();
  assert.match(h.mount.innerHTML, /data-cw-portal="refer"/);
  assert.match(h.mount.innerHTML, /<h1 class="cw-title"[^>]*>Refer a friend<\/h1>/);
  assert.match(h.mount.innerHTML, /data-cw-refer-copy="https:\/\/www\.carismaaesthetics\.com\/\?ref=7K2MX9QA"/);
  assert.doesNotMatch(h.mount.innerHTML, /href="\/account\/refer"/, "not even as the current row");
  const w = harness();
  mountAccountPortal(w.doc, { view: "wallet", fetchImpl: w.fetchImpl, navigate() {} });
  await settle();
  assert.match(w.mount.innerHTML, /href="\/account\/wallet"/);
  assert.doesNotMatch(w.mount.innerHTML, /href="\/account\/refer"/);
  // NEGATIVE CONTROL: the same mounts, opted in, list it.
  const on = harness();
  mountAccountPortal(on.doc, { view: "refer", fetchImpl: on.fetchImpl, navigate() {}, referRail: true });
  await settle();
  assert.match(on.mount.innerHTML, /href="\/account\/refer" aria-current="page"/);
});

test("opted in, Pulse's rail still does not link to a page Pulse never built", async () => {
  const h = harness("www.pulsewellness.com");
  mountAccountPortal(h.doc, { view: "wallet", fetchImpl: h.fetchImpl, navigate() {}, referRail: true });
  await settle();
  assert.match(h.mount.innerHTML, /href="\/account\/wallet"/);
  assert.doesNotMatch(h.mount.innerHTML, /href="\/account\/refer"/);
  // NEGATIVE CONTROL: the Aesthetics rail, opted in, has it.
  const a = harness();
  mountAccountPortal(a.doc, { view: "wallet", fetchImpl: a.fetchImpl, navigate() {}, referRail: true });
  await settle();
  assert.match(a.mount.innerHTML, /href="\/account\/refer"/);
});

test("the model-driven views (Overview) follow the same switch", async () => {
  const off = harness();
  mountAccountPortal(off.doc, { view: "home", fetchImpl: off.fetchImpl, navigate() {} });
  await settle();
  assert.match(off.mount.innerHTML, /data-cw-portal="home"/);
  assert.doesNotMatch(off.mount.innerHTML, /href="\/account\/refer"/);
  const on = harness();
  mountAccountPortal(on.doc, { view: "home", fetchImpl: on.fetchImpl, navigate() {}, referRail: true });
  await settle();
  assert.match(on.mount.innerHTML, /href="\/account\/refer"/);
});

test("Copy puts the value on the clipboard and says so; a refused clipboard says so too", async () => {
  const written = [];
  await withNavigator({ clipboard: { writeText: (t) => (written.push(t), Promise.resolve()) } }, async () => {
    const h = harness();
    mountAccountPortal(h.doc, { view: "refer", fetchImpl: h.fetchImpl, navigate() {} });
    await settle();
    h.click({ "data-cw-refer-copy": "7K2MX9QA", "data-cw-refer-done": "Code copied." });
    await settle();
    assert.deepEqual(written, ["7K2MX9QA"]);
    assert.match(h.status.innerHTML, /cw-toast--ok[^>]*><span class="cw-toast__text">Code copied\./);
  });
  await withNavigator({ clipboard: { writeText: () => Promise.reject(new Error("denied")) } }, async () => {
    const h = harness();
    mountAccountPortal(h.doc, { view: "refer", fetchImpl: h.fetchImpl, navigate() {} });
    await settle();
    h.click({ "data-cw-refer-copy": "7K2MX9QA", "data-cw-refer-done": "Code copied." });
    await settle();
    assert.match(h.status.innerHTML, /cw-toast--bad/);
    assert.match(h.status.innerHTML, /Select it here instead: 7K2MX9QA/);
  });
});

test("Share opens the share sheet with the link; with no sheet it copies the link instead; closing the sheet is silent", async () => {
  const shared = [];
  const copied = [];
  const attrs = {
    "data-cw-refer-share": "",
    "data-cw-refer-title": "Carisma Aesthetics",
    "data-cw-refer-text": "Here's €20 off your first visit at Carisma Aesthetics. Use my code 7K2MX9QA when you book.",
    "data-cw-refer-url": "https://www.carismaaesthetics.com/?ref=7K2MX9QA",
  };
  await withNavigator({ share: (d) => (shared.push(d), Promise.resolve()), clipboard: { writeText: (t) => (copied.push(t), Promise.resolve()) } }, async () => {
    const h = harness();
    mountAccountPortal(h.doc, { view: "refer", fetchImpl: h.fetchImpl, navigate() {} });
    await settle();
    h.click(attrs);
    await settle();
    assert.deepEqual(shared, [{ title: "Carisma Aesthetics", text: attrs["data-cw-refer-text"], url: attrs["data-cw-refer-url"] }]);
    assert.deepEqual(copied, [], "shared, so nothing was copied");
    assert.equal(h.status.innerHTML, "");
  });
  await withNavigator({ clipboard: { writeText: (t) => (copied.push(t), Promise.resolve()) } }, async () => {
    const h = harness();
    mountAccountPortal(h.doc, { view: "refer", fetchImpl: h.fetchImpl, navigate() {} });
    await settle();
    h.click(attrs);
    await settle();
    assert.deepEqual(copied, [attrs["data-cw-refer-url"]]);
    assert.match(h.status.innerHTML, /Link copied\. Paste it anywhere to share\./);
  });
  await withNavigator(
    { share: () => Promise.reject(Object.assign(new Error("closed"), { name: "AbortError" })), clipboard: { writeText: (t) => (copied.push(t), Promise.resolve()) } },
    async () => {
      const h = harness();
      mountAccountPortal(h.doc, { view: "refer", fetchImpl: h.fetchImpl, navigate() {} });
      await settle();
      const before = copied.length;
      h.click(attrs);
      await settle();
      assert.equal(copied.length, before, "closing the sheet does not copy");
      assert.equal(h.status.innerHTML, "", "and says nothing");
    },
  );
});
