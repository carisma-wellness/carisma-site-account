import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createAccountRoutes,
  seal,
  isAllowed,
  readCircle,
  readCircleActivity,
  readCircleRewards,
  readyText,
  gapText,
  useByText,
  levelText,
  waysToEarnText,
  pointsText,
  ladderHTML,
  circlePanelRowHTML,
  circleOverviewHTML,
  circleWalletLineHTML,
  circleViewHTML,
  circleShopHTML,
  CIRCLE_TERMS_HREF,
  creditMoment,
  earnLine,
  earnPoints,
  circleAllowedOn,
  buildPanelModel,
  accountPanelHTML,
  buildPortalModel,
  accountPortalHTML,
  sectionsFor,
  walletHTML,
  buildWalletModel,
  mountAccountPortal,
  requestsFor,
  PAY_STEP_DISCLOSURE,
} from "../dist/index.js";
import { PORTAL_RULES_CSS } from "../dist/ui/styles/index.js";

/**
 * Carisma Circle in the account kit. The one rule every test below defends:
 * NOTHING renders unless the member read answers `enabled: true`. The backend
 * ships OFF and answers `{ enabled: false }`; an API without the route answers
 * 404; a dead one 5xx. Every one of those must leave the account exactly as it
 * was — and the live case (Maria Borg, the Bible's demo member) is the negative
 * control that proves the "nothing" is not just a broken builder.
 */

// Maria Borg (panel/demo-member.json): €62.00 · 1,240 points, III Golden Hour,
// €1,210 of €1,250 this year, €20.00 birthday credit until 7 Dec, 2 of 5 done.
const MARIA = {
  tier: "gold",
  enabled: true,
  programme: { name: "Carisma Circle", currencyName: "Carisma credit", unitName: "points", tagline: "Come back to more." },
  level: { key: "golden_hour", name: "Golden Hour", numeral: "III", multiplier: 1.5, heldUntil: "2027-12-31" },
  nextLevel: { key: "moonlight", name: "Moonlight", numeral: "IV", thresholdCents: 125000 },
  spendThisYearCents: 121000,
  headStartCents: 0,
  toNextLevelCents: 4000,
  credit: { points: 1240, cents: 6200, display: "€62.00" },
  pending: { points: 0, cents: 0 },
  expiring: { points: 400, cents: 2000, date: "2026-12-07" },
  passport: { spa: true, aesthetics: true, slimming: false, count: 2 },
  actions: [
    { key: "profile", label: "Complete your profile", points: 100, done: true },
    { key: "app", label: "Sign in on the Carisma app", points: 40, done: true },
    { key: "whatsapp", label: "Booking updates and credit receipts on WhatsApp", points: 40, done: false },
    { key: "second_house", label: "Your first visit at a second Carisma brand", points: 200, done: false },
    { key: "full_circle", label: "Complete your Full Circle", points: 500, done: false },
  ],
  actionsSummary: { done: 2, of: 5, leftPoints: 740, leftCents: 3700 },
  nextVisitCredit: null,
  rules: { pointsPerEuro: 20, minRedeemPoints: 100, maxSharePct: 50 },
};
const OFF_BODIES = [
  { enabled: false },
  { success: true, data: { enabled: false } },
  { tier: "gold", tierLabel: "Gold", perks: [] }, // the v0 answer, no `enabled`
  { error: "not_found" },
  null,
  "nope",
  [],
  { enabled: "true", credit: { cents: 6200, points: 1240 }, level: { key: "golden_hour" } }, // a string is not true
  { enabled: true }, // no credit block
  { ...MARIA, level: { key: "platinum", name: "Platinum" } }, // an unknown level
];

test("every OFF / 404 / garbage answer reads as null, and every surface then renders NOTHING", () => {
  for (const body of OFF_BODIES) {
    const m = readCircle(body);
    assert.equal(m, null, JSON.stringify(body));
    assert.equal(circlePanelRowHTML(m), "");
    assert.equal(circleOverviewHTML(m), "");
    assert.equal(circleWalletLineHTML(m), "");
  }
  assert.equal(circleViewHTML(null), "");
  assert.equal(readCircleActivity({ enabled: false }), null);
  assert.equal(readCircleRewards({ enabled: false }), null);
  assert.equal(readCircleRewards({ error: "not_found" }), null);
});

test("NEGATIVE CONTROL: the live answer (and its envelope) builds Maria's model", () => {
  for (const body of [MARIA, { success: true, data: MARIA }]) {
    const m = readCircle(body);
    assert.ok(m);
    assert.equal(m.creditCents, 6200);
    assert.equal(m.points, 1240);
    assert.equal(m.ready, true);
    assert.equal(m.level.numeral, "III");
    assert.equal(m.nextLevel.name, "Moonlight");
  }
});

test("copy follows the Bible: euro first, numerals, verb-gaps rounded up, the soonest use-by", () => {
  const m = readCircle(MARIA);
  assert.equal(readyText(m), "€62.00 ready to use");
  assert.equal(levelText(m.level), "III Golden Hour");
  assert.equal(gapText(m), "Spend €40 more this year to reach Moonlight");
  assert.equal(gapText(readCircle({ ...MARIA, toNextLevelCents: 3901 })), "Spend €40 more this year to reach Moonlight", "rounded UP");
  assert.equal(gapText(readCircle({ ...MARIA, toNextLevelCents: 29000 })), "", "a gap one visit cannot close is not nudged");
  assert.equal(useByText(m), "€20.00 of it until 7 Dec");
  assert.equal(waysToEarnText(m), "2 of 5 done · €37.00 more to earn");
  assert.equal(pointsText(1240), "1,240 points");
  assert.equal(pointsText(1), "1 point");
  const below = readCircle({ ...MARIA, credit: { points: 65, cents: 325 }, expiring: null });
  assert.equal(below.ready, false);
  assert.equal(readyText(below), "€3.25 Carisma credit · €1.75 more and you can use it");
});

test("the ladder always shows all five numerals and marks the member's step", () => {
  const html = ladderHTML(readCircle(MARIA).level);
  for (const n of ["I", "II", "III", "IV", "V"]) assert.match(html, new RegExp(`>${n}<`));
  assert.match(html, /aria-label="Level III of V: Golden Hour"/);
  assert.equal((html.match(/aria-current="step"/g) || []).length, 1);
});

test("customer copy names the brands and never says 'house', 'voucher' or 'store credit'", () => {
  const m = readCircle(MARIA);
  const rewards = readCircleRewards({
    enabled: true,
    items: [
      { id: "r1", brand: { slug: "carisma-spa", name: "Carisma Spa", house: "spa" }, name: "Glass of Prosecco with your treatment", points: 150, valueCents: 750, levelLock: null, discovery: false, discoveryPoints: null, affordable: true },
      { id: "r2", brand: { slug: "carisma-spa", name: "Carisma Spa", house: "spa" }, name: "Back, Neck & Shoulder (40 min)", points: 1300, valueCents: 6500, levelLock: null, discovery: false, discoveryPoints: null, affordable: false },
    ],
  });
  const all = [
    circlePanelRowHTML(m),
    circleOverviewHTML(m),
    circleWalletLineHTML(m),
    circleViewHTML({ me: m, activity: { items: [], nextCursor: null }, rewards, bookHref: "/" }),
  ].join("\n");
  assert.doesNotMatch(all, /\bhouse\b|voucher|store credit|Carisma points/i);
  assert.match(all, /Carisma Spa, Aesthetics and Slimming/);
  assert.match(all, /data-clarity-mask="True"/);
  assert.match(all, /No credit is given for reviews, ratings, follows, posts, tags or shares\./);
  assert.match(all, /Prices include VAT/);
});

test("every 'Terms' beside credit links the Carisma Circle terms page (W2)", () => {
  const m = readCircle(MARIA);
  assert.equal(CIRCLE_TERMS_HREF, "/carisma-circle/terms");
  const view = circleViewHTML({ me: m, activity: null, rewards: null });
  assert.match(view, /<a class="cw-link" href="\/carisma-circle\/terms" data-cw-circle-terms>Terms of Carisma Circle<\/a><\/p>/);
  assert.match(circleOverviewHTML(m), /On up to half of any booking at Carisma Spa, Aesthetics and Slimming\. <a class="cw-link" href="\/carisma-circle\/terms" data-cw-circle-terms>Terms<\/a>/);
  // A site hosting the page elsewhere passes its own address; null draws no link at all.
  assert.match(circleViewHTML({ me: m, activity: null, rewards: null, termsHref: "https://www.carismaspa.com/carisma-circle/terms" }), /href="https:\/\/www\.carismaspa\.com\/carisma-circle\/terms"/);
  assert.doesNotMatch(circleViewHTML({ me: m, activity: null, rewards: null, termsHref: null }), /data-cw-circle-terms/);
  assert.doesNotMatch(circleOverviewHTML(m, null), /data-cw-circle-terms/);
  // Off / unknown member: still nothing at all.
  assert.equal(circleOverviewHTML(null), "");
  assert.equal(circleViewHTML(null), "");
});

test("the shop opens 'Yours now', then at most two 'Next up' with the euro gap", () => {
  const m = readCircle(MARIA);
  const item = (id, points, affordable) => ({ id, brand: { name: "Carisma Spa" }, name: `Reward ${id}`, points, valueCents: points * 5, levelLock: null, discovery: false, discoveryPoints: null, affordable });
  const html = circleShopHTML(readCircleRewards({ enabled: true, items: [item("a", 150, true), item("b", 2000, false), item("c", 1300, false), item("d", 3000, false)] }), m);
  assert.match(html, /Yours now[\s\S]*Reward a[\s\S]*Next up/);
  assert.match(html, /Reward c[\s\S]*Reward b/, "nearest next-up first");
  assert.doesNotMatch(html, /Reward d/, "at most two Next up");
  assert.match(html, /€3\.00 more credit and it&#39;s yours|€3\.00 more credit and it's yours/);
  assert.equal(circleShopHTML(null, m), "");
  assert.equal(circleShopHTML([], m), "");
});

test("the credit moment: hero only when the bill gave credit, balance ≥ €5.00 and no excluded line", () => {
  const hero = creditMoment({ earnedCents: 1190, balanceCents: 6200, hasExcludedLine: false, useBy: { cents: 2000, date: "2026-12-07" } });
  assert.equal(hero.kind, "hero");
  assert.equal(hero.hero, "€62.00 ready to use");
  assert.equal(
    hero.sentence,
    "You've just received €11.90 in Carisma credit, usable at Carisma Spa, Aesthetics and Slimming. You can use it already.",
  );
  assert.deepEqual(hero.conditions, ["On up to half of any other booking", "€20.00 of it until 7 Dec", "Comes off if this booking is cancelled"]);
  const quiet = creditMoment({ earnedCents: 325, balanceCents: 325, hasExcludedLine: false, useBy: null });
  assert.equal(quiet.kind, "quiet");
  assert.equal(quiet.quiet, "€3.25 added to your Carisma credit · €1.75 more and you can use it.");
  assert.equal(creditMoment({ earnedCents: 495, balanceCents: 9000, hasExcludedLine: true }).kind, "none", "an excluded line never gets the hero");
  assert.equal(creditMoment({ earnedCents: 0, balanceCents: 9000, hasExcludedLine: false }).kind, "none");
  assert.equal(creditMoment(null).kind, "none");
  // A guest page is never given a balance: the bill's own figure, "You can use
  // it already" only when the bill alone reaches €5.00, never a "€X more" sum.
  const guest = creditMoment({ earnedCents: 1545, balanceCents: null, hasExcludedLine: false, useBy: null });
  assert.equal(guest.kind, "received");
  assert.equal(guest.hero, "€15.45");
  assert.doesNotMatch(guest.hero, /ready to use/);
  assert.match(guest.sentence, /You can use it already\.$/);
  const guestSmall = creditMoment({ earnedCents: 325, balanceCents: null, hasExcludedLine: false });
  assert.equal(guestSmall.kind, "quiet");
  assert.equal(guestSmall.quiet, "€3.25 added to your Carisma credit.");
  assert.equal(creditMoment({ earnedCents: 1545, balanceCents: null, hasExcludedLine: true }).kind, "none");
  assert.equal(
    PAY_STEP_DISCLOSURE,
    "If you cancel, the credit this booking gives you is removed. If you've already used it, your balance can go below zero. We never take it from your refund.",
  );
});

test("earn lines: floor(euros × level) points, 20 points = €1 (the Bible's Hammam figures)", () => {
  assert.equal(earnPoints(10900, 1), 109);
  assert.equal(earnLine(10900, 1), "You'll receive €5.45 in Carisma credit");
  assert.equal(earnLine(10900, 1.5), "You'll receive €8.15 in Carisma credit");
  assert.equal(earnLine(10900, 1.25), "You'll receive €6.80 in Carisma credit");
  assert.equal(earnLine(6500, 1, true), "You'll receive from €3.25 in Carisma credit");
  assert.equal(earnLine(0, 1), "");
});

test("the header panel: no loyalty (or loyalty off) is the panel it always was; live adds the row and the link", () => {
  const base = { signedIn: true, profile: { firstName: "Maria", lastName: "Borg", emailMasked: "m•••••@gmail.com" }, upcoming: [] };
  const before = accountPanelHTML(buildPanelModel(base));
  assert.equal(accountPanelHTML(buildPanelModel({ ...base, loyalty: { enabled: false } })), before);
  assert.equal(accountPanelHTML(buildPanelModel({ ...base, loyalty: null })), before);
  const live = accountPanelHTML(buildPanelModel({ ...base, loyalty: MARIA }));
  assert.match(live, /€62\.00 ready to use/);
  assert.match(live, /1,240 points · €20\.00 of it until 7 Dec/);
  assert.match(live, /III Golden Hour/);
  assert.match(live, /Spend €40 more this year to reach Moonlight/);
  assert.match(live, /href="\/account\/rewards"/);
});

test("the portal: not opted in draws nothing Circle; opted in draws only HIDDEN, EMPTY placeholders", () => {
  const session = { signedIn: true, profile: { firstName: "Maria" } };
  const off = accountPortalHTML(buildPortalModel(session, "home", { siteBrand: "Carisma Spa" }));
  assert.doesNotMatch(off, /data-cw-circle|Credit &amp; rewards|\/account\/rewards/);
  const on = accountPortalHTML(buildPortalModel(session, "home", { siteBrand: "Carisma Spa", circleRail: true }));
  assert.match(on, /<a class="cw-nav__link" href="\/account\/rewards" data-cw-circle-rail hidden>Credit &amp; rewards<\/a>/);
  assert.match(on, /<div class="cw-circle-slot" data-cw-circle-slot="home" hidden><\/div>/);
  // Medical never, opted in or not.
  assert.equal(circleAllowedOn("Carisma Medical"), false);
  const med = accountPortalHTML(buildPortalModel(session, "home", { siteBrand: "Carisma Medical", circleRail: true }));
  assert.doesNotMatch(med, /data-cw-circle/);
  assert.equal(sectionsFor("home", "Carisma Medical", false, true).some((s) => s.id === "rewards"), false);
  // The wallet slot follows the same opt-in.
  const w = buildWalletModel({ credit: { balance: 10 } });
  assert.doesNotMatch(walletHTML(w, {}), /data-cw-circle-slot/);
  assert.match(walletHTML(w, { circleSlot: true }), /data-cw-circle-slot="wallet" hidden/);
  assert.deepEqual(requestsFor("rewards"), [
    "/api/auth/proxy/client/loyalty/me",
    "/api/auth/proxy/client/loyalty/activity?limit=20",
    "/api/auth/proxy/client/loyalty/rewards",
    // W3: "Offers and reminders" (the member's own consent for the three brands).
    "/api/auth/proxy/client/loyalty/preferences",
  ]);
});

test("Circle CSS reads tokens only (no raw colour)", () => {
  const circle = PORTAL_RULES_CSS.slice(PORTAL_RULES_CSS.indexOf("Carisma Circle") - 200);
  assert.ok(circle.includes(".cw-circle"));
  assert.doesNotMatch(circle, /#[0-9a-f]{3,8}\b|rgba?\(/i);
});

/* ── Browser mount ─────────────────────────────────────────────────────── */

function harness({ me, view = "home", path = "/account" }) {
  const reads = [];
  const navs = [];
  const mount = {
    innerHTML: "",
    setAttribute() {}, getAttribute() { return null; }, addEventListener() {},
    querySelector(sel) {
      const m = /^\[data-cw-circle-slot="(\w+)"\]$/.exec(sel);
      if (!m) return null;
      const tag = `<div class="cw-circle-slot" data-cw-circle-slot="${m[1]}" hidden></div>`;
      if (!mount.innerHTML.includes(tag)) return null;
      return {
        get innerHTML() { return ""; },
        set innerHTML(v) { mount.innerHTML = mount.innerHTML.replace(tag, `<div class="cw-circle-slot" data-cw-circle-slot="${m[1]}">${v}</div>`); },
        removeAttribute() {},
      };
    },
    querySelectorAll(sel) {
      if (sel === "[data-cw-circle-rail]" && /data-cw-circle-rail hidden/.test(mount.innerHTML)) {
        return [{ removeAttribute() { mount.innerHTML = mount.innerHTML.replace("data-cw-circle-rail hidden", "data-cw-circle-rail"); } }];
      }
      return [];
    },
  };
  const doc = {
    cookie: "cw-signed-in=1",
    location: { pathname: path, host: "www.carismaspa.com", origin: "https://www.carismaspa.com", search: "" },
    getElementById: (id) => (id === "carisma-account-portal" ? mount : null),
    querySelectorAll: () => [], addEventListener() {},
  };
  const json = (status, data) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(data) });
  const fetchImpl = (url) => {
    reads.push(url);
    if (url.startsWith("/api/auth/session")) return json(200, { signedIn: true, profile: { firstName: "Maria" } });
    if (url === "/api/auth/proxy/client/loyalty/me") return typeof me === "number" ? json(me, { error: "x" }) : json(200, me);
    if (url.startsWith("/api/auth/proxy/client/loyalty/")) return json(200, { enabled: true, items: [], nextCursor: null });
    return json(200, { success: true, data: [] });
  };
  return { doc, mount, reads, navs, fetchImpl, navigate: (u) => navs.push(u), view };
}
const settle = () => new Promise((r) => setTimeout(r, 30));

test("Overview: Circle OFF on the server = the slot stays hidden and empty; live = it is filled", async () => {
  for (const me of [{ enabled: false }, 404, 500, { success: true, data: { enabled: false } }]) {
    const h = harness({ me });
    mountAccountPortal(h.doc, { view: "home", fetchImpl: h.fetchImpl, navigate: h.navigate, circle: true });
    await settle();
    assert.match(h.mount.innerHTML, /data-cw-circle-slot="home" hidden><\/div>/, `me=${JSON.stringify(me)}`);
    assert.match(h.mount.innerHTML, /data-cw-circle-rail hidden/);
    assert.doesNotMatch(h.mount.innerHTML, /ready to use|Carisma credit/);
  }
  const live = harness({ me: MARIA });
  mountAccountPortal(live.doc, { view: "home", fetchImpl: live.fetchImpl, navigate: live.navigate, circle: true });
  await settle();
  assert.match(live.mount.innerHTML, /data-cw-circle="overview"/);
  assert.match(live.mount.innerHTML, /€62\.00/);
  assert.doesNotMatch(live.mount.innerHTML, /data-cw-circle-rail hidden/, "the rail row is revealed");
});

test("not opted in: not one loyalty request is made", async () => {
  const h = harness({ me: MARIA });
  mountAccountPortal(h.doc, { view: "home", fetchImpl: h.fetchImpl, navigate: h.navigate });
  await settle();
  assert.equal(h.reads.some((u) => u.includes("loyalty")), false, h.reads.join(", "));
  assert.doesNotMatch(h.mount.innerHTML, /data-cw-circle/);
});

test("/account/rewards: off or 404 sends the member back to the account; live draws the page", async () => {
  for (const me of [{ enabled: false }, 404]) {
    const h = harness({ me, view: "rewards", path: "/account/rewards" });
    mountAccountPortal(h.doc, { view: "rewards", fetchImpl: h.fetchImpl, navigate: h.navigate, circle: true });
    await settle();
    assert.deepEqual(h.navs, ["/account"], `me=${JSON.stringify(me)}`);
    assert.doesNotMatch(h.mount.innerHTML, /ready to use/);
  }
  const notOpted = harness({ me: MARIA, view: "rewards", path: "/account/rewards" });
  mountAccountPortal(notOpted.doc, { view: "rewards", fetchImpl: notOpted.fetchImpl, navigate: notOpted.navigate });
  assert.deepEqual(notOpted.navs, ["/account"]);
  const live = harness({ me: MARIA, view: "rewards", path: "/account/rewards" });
  mountAccountPortal(live.doc, { view: "rewards", fetchImpl: live.fetchImpl, navigate: live.navigate, circle: true, bookHref: "/treatments" });
  await settle();
  assert.deepEqual(live.navs, []);
  assert.match(live.mount.innerHTML, /<h1 class="cw-title"[^>]*>Credit &amp; rewards<\/h1>/);
  assert.match(live.mount.innerHTML, /data-cw-qc="carisma-circle-20261115"/);
  assert.match(live.mount.innerHTML, /href="\/account\/rewards" aria-current="page" data-cw-circle-rail>/);
  assert.match(live.mount.innerHTML, /Book and use it/);
});

/* ── Server: the session fold and the proxy doors ──────────────────────── */

const RP = "carisma-spa";
const SECRET = "primary-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const API = "http://backend.local/api/v1";
const NOW_S = 1_700_000_000;
function cfg(fetchImpl) {
  return {
    rpId: RP, clientId: RP, clientSecret: "cs",
    identityOrigin: "http://account.localtest.me:3000",
    carismasoftApiUrl: API, sessionSecret: SECRET,
    allowedOrigins: ["http://localhost:3100"],
    cookieSecure: false, fetchImpl, now: () => NOW_S * 1000,
  };
}
const cookie = () => seal({ v: 1, sid: "s", uid: "u", at: "ACCESS", atExp: NOW_S + 99999, rt: "R", initials: "MB", iat: NOW_S }, SECRET, RP);
const sessionReq = (include) =>
  new Request(`http://localhost:3100/api/auth/session${include ? `?include=${include}` : ""}`, {
    headers: { cookie: `cw_session=${cookie()}` },
  });
function backend(loyalty) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const body = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
    if (url.endsWith("/profile")) return body({ success: true, data: { firstName: "Maria", lastName: "Borg", email: "maria@example.com" } });
    if (url.includes("/client/booking/appointments")) return body({ success: true, data: { data: [] } });
    if (url.endsWith("/client/loyalty/me")) {
      if (loyalty === "throw") throw new Error("ECONNRESET");
      if (typeof loyalty === "number") return body({ error: "x" }, loyalty);
      return body({ success: true, data: loyalty });
    }
    return body({}, 404);
  };
  return { calls, fetchImpl };
}

test("session: include=upcoming alone never asks for loyalty (today's panel, unchanged)", async () => {
  const b = backend(MARIA);
  const res = await createAccountRoutes(cfg(b.fetchImpl)).session(sessionReq("upcoming"));
  const out = await res.json();
  assert.equal(out.signedIn, true);
  assert.equal("loyalty" in out, false);
  assert.equal(b.calls.some((u) => u.includes("loyalty")), false);
});

test("session: include=upcoming,loyalty folds in ONLY an enabled:true answer; off/404/500/throw leave it out", async () => {
  for (const loyalty of [{ enabled: false }, 404, 500, "throw"]) {
    const b = backend(loyalty);
    const res = await createAccountRoutes(cfg(b.fetchImpl)).session(sessionReq("upcoming,loyalty"));
    const out = await res.json();
    assert.equal(res.status, 200);
    assert.equal(out.signedIn, true, `loyalty=${JSON.stringify(loyalty)} must never sign anyone out`);
    assert.equal(out.profile.firstName, "Maria");
    assert.deepEqual(out.upcoming, []);
    assert.equal("loyalty" in out, false, `loyalty=${JSON.stringify(loyalty)}`);
    assert.equal(res.headers.getSetCookie().length, 0, "a loyalty failure clears no cookie");
  }
  const b = backend(MARIA);
  const out = await (await createAccountRoutes(cfg(b.fetchImpl)).session(sessionReq("upcoming,loyalty"))).json();
  assert.equal(out.loyalty.enabled, true);
  assert.equal(out.loyalty.credit.cents, 6200);
});

test("proxy: the five Circle doors are exact literals; their siblings and the staff twins are refused", () => {
  const allowed = [
    ["GET", "/client/loyalty/me"],
    ["GET", "/client/loyalty/activity"],
    ["GET", "/client/loyalty/activity?cursor=abc&limit=20"],
    ["GET", "/client/loyalty/rewards"],
    ["POST", "/client/loyalty/redeem/preview"],
    ["POST", "/client/loyalty/redeem"],
    ["POST", "/client/loyalty/redeem/release"],
  ];
  for (const [m, p] of allowed) assert.equal(isAllowed(m, p), true, `${m} ${p}`);
  const refused = [
    ["POST", "/client/loyalty/me"],
    ["GET", "/client/loyalty/redeem"],
    ["GET", "/client/loyalty/redeem/preview"],
    ["DELETE", "/client/loyalty/redeem"],
    ["POST", "/client/loyalty/redeem/abc"],
    ["POST", "/client/loyalty/redeem/release/abc"],
    ["POST", "/client/loyalty/activity"],
    ["GET", "/client/loyalty/rewards/abc"],
    ["POST", "/client/loyalty/rewards"],
    ["POST", "/client/loyalty/adjustments"],
    ["GET", "/hod/clients/abc/loyalty"],
    ["POST", "/hod/clients/abc/loyalty/adjustments"],
    ["GET", "/hod/settings/loyalty"],
    ["PATCH", "/hod/settings/loyalty"],
    ["GET", "/public/loyalty/status"],
  ];
  for (const [m, p] of refused) assert.equal(isAllowed(m, p), false, `${m} ${p}`);
});

test("proxy: a redeem from another origin is refused 403 and never reaches the backend", async () => {
  let called = 0;
  const routes = createAccountRoutes(cfg(async () => { called++; return new Response("{}", { status: 200 }); }));
  const res = await routes.proxy(
    new Request("http://localhost:3100/api/auth/proxy/client/loyalty/redeem", {
      method: "POST",
      headers: { cookie: `cw_session=${cookie()}`, origin: "http://evil.example", "content-type": "application/json" },
      body: JSON.stringify({ brandId: "b", points: 100 }),
    }),
  );
  assert.equal(res.status, 403);
  assert.equal(called, 0);
});
