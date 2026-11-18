import { test } from "node:test";
import assert from "./fixtures/plain-assert.mjs";
import {
  createAccountRoutes,
  seal,
  isAllowed,
  readCircle,
  readCircleActivity,
  readCircleRewards,
  readingText,
  endsText,
  pointsText,
  circlePanelRowHTML,
  circleOverviewHTML,
  circleWalletLineHTML,
  circleViewHTML,
  circleRewardsHTML,
  CIRCLE_TERMS_HREF,
  creditMoment,
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
  readCircleSummary,
} from "../dist/index.js";
import { MARIA, SUMMARY, SUMMARY_ASKED, SUMMARY_ASKED_LIVE, REWARDS, THREE_BRANDS } from "./fixtures/circle-v2.mjs";
import { PORTAL_RULES_CSS } from "../dist/ui/styles/index.js";

/**
 * Carisma Circle in the account kit. The one rule every test below defends:
 * NOTHING renders unless the member read answers `enabled: true`. The backend
 * ships OFF and answers `{ enabled: false }`; an API without the route answers
 * 404; a dead one 5xx. Every one of those must leave the account exactly as it
 * was — and the live case (Maria Borg, the Bible's demo member) is the negative
 * control that proves the "nothing" is not just a broken builder.
 */

// Maria Borg (fixtures/circle-v2.mjs): Level 3 · Ruby, €72.40 · 1,448 points, €710 of €1,000 paid this year.
const OFF_BODIES = [
  { enabled: false },
  { success: true, data: { enabled: false } },
  { tier: "gold", tierLabel: "Gold", perks: [] }, // the v0 answer, no `enabled`
  { error: "not_found" },
  null,
  "nope",
  [],
  { enabled: "true", credit: { cents: 7240, points: 1448 }, level: { key: "ruby", number: 3, name: "Ruby" } }, // a string is not true
  { enabled: true }, // no credit block
  { ...MARIA, level: { key: "platinum", number: 3, name: "Platinum" } }, // an unknown level
  // A v1 answer (First Light … Starlight) never picks a stone: the v2 kit draws nothing for it.
  { ...MARIA, level: { key: "golden_hour", name: "Golden Hour", numeral: "III", multiplier: 1.5 } },
  { ...MARIA, level: { numeral: "III", name: "Golden Hour" } },
  { ...MARIA, left: true }, // a left member never gets a figure
  { ...MARIA, minor: true }, // under the minimum age: one line elsewhere, never a model
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
    assert.equal(m.creditCents, 7240);
    assert.equal(m.points, 1448);
    assert.equal(m.affordable, true);
    assert.equal(m.level.key, "ruby");
    assert.equal(m.level.label, "Level 3 · Ruby");
    assert.equal(m.nextLevel.key, "sapphire");
    assert.equal(m.nextLevel.thresholdCents, 100000);
  }
});

test("copy: euro first, the API's level label and sentence, 'ready to use' only when the server says affordable", () => {
  const m = readCircle(MARIA);
  assert.equal(m.display, "€72.40 · 1,448 points");
  assert.equal(m.level.label, "Level 3 · Ruby");
  assert.equal(m.levelSentence, "€290 more this year to reach Level 4 · Sapphire");
  assert.equal(readingText(m), "ready to use · 1,448 points");
  assert.equal(readingText(readCircle({ ...MARIA, affordable: false })), "1,448 points", "no affordable → no 'ready to use'");
  assert.equal(readingText(readCircle({ ...MARIA, affordable: undefined })), "1,448 points", "a missing flag is never 'ready'");
  assert.equal(endsText(m), "1,448 points end on 17 Nov 2027 unless you visit or use points");
  assert.equal(pointsText(1448), "1,448 points");
  assert.equal(pointsText(1), "1 point");
});

test("customer copy names the brands from the API and never says 'house', 'voucher', 'store credit' or 'up to half'", () => {
  const m = readCircle(MARIA);
  const rewards = readCircleRewards(REWARDS);
  const all = [
    circlePanelRowHTML(readCircleSummary(SUMMARY)),
    circleOverviewHTML(m),
    circleWalletLineHTML(m),
    circleViewHTML({ me: m, activity: { items: [], nextCursor: null }, rewards, bookHref: "/" }),
  ].join("\n");
  assert.doesNotMatch(all, /\bhouse\b|voucher|store credit|Carisma points|up to half|from €5|First Light|Sunrise|Golden Hour|Moonlight|Starlight/i);
  assert.match(all, /For one whole treatment at Carisma Spa/);
  assert.doesNotMatch(all, /Aesthetics|Slimming/, "a Spa-only config names no other brand (R5.2)");
  assert.match(all, /data-clarity-mask="True"/);
  assert.match(all, /We never give points for public reviews, ratings, posts, tags or shares\./);
  assert.match(all, /Prices include VAT/);
  const three = circleWalletLineHTML(readCircle({ ...MARIA, brands: THREE_BRANDS }));
  assert.match(three, /For one whole treatment at Carisma Spa, Aesthetics and Slimming/);
});

test("every 'Terms' beside a points sentence links the Carisma Circle terms page", () => {
  const m = readCircle(MARIA);
  assert.equal(CIRCLE_TERMS_HREF, "/carisma-circle/terms");
  const view = circleViewHTML({ me: m, activity: null, rewards: null });
  assert.match(view, /<a class="cw-link cc-link" href="\/carisma-circle\/terms" data-cw-circle-terms>Terms of Carisma Circle<\/a><\/p>/);
  assert.match(circleOverviewHTML(m), /For one whole treatment at Carisma Spa · <a class="cw-link cc-link" href="\/carisma-circle\/terms" data-cw-circle-terms>Terms<\/a>/);
  assert.match(circleViewHTML({ me: m, activity: null, rewards: null, termsHref: "https://www.carismaspa.com/carisma-circle/terms" }), /href="https:\/\/www\.carismaspa\.com\/carisma-circle\/terms"/);
  assert.doesNotMatch(circleViewHTML({ me: m, activity: null, rewards: null, termsHref: null }), /data-cw-circle-terms/);
  assert.doesNotMatch(circleOverviewHTML(m, { termsHref: null }), /data-cw-circle-terms/);
  assert.equal(circleOverviewHTML(null), "");
  assert.equal(circleViewHTML(null), "");
});

test("what her points buy: Yours now (the server's affordable), Next up (nearest), One day; gaps in euros", () => {
  const m = readCircle(MARIA);
  const html = circleRewardsHTML(readCircleRewards(REWARDS), m.points, { pointsPerEuro: 20 });
  assert.match(html, /Yours now[\s\S]*Japanese Short &amp; Sweet, 30 min[\s\S]*€65\.00 · 1,300 points/);
  assert.match(html, /Next up[\s\S]*Anti-Stress Massage, 55 min[\s\S]*€16\.60 more credit/, "(1,780 − 1,448) points = €16.60");
  assert.match(html, /One day[\s\S]*Carisma Signature Massage, 85 min/);
  assert.equal(circleRewardsHTML(null, m.points), "");
  assert.equal(circleRewardsHTML([], m.points), "");
  assert.equal(readCircleRewards({ enabled: false }), null);
});

test("the credit moment: earned (member) / received (guest) / paid with points / on its way / none", () => {
  const m = readCircle(MARIA);
  const earned = creditMoment({ earnedCents: 1190, earnedPoints: 238, member: m, hasExcludedLine: false });
  assert.equal(earned.kind, "earned");
  assert.equal(earned.hero, "€72.40");
  assert.equal(earned.sentence, "You've just received €11.90 in Carisma credit, usable at Carisma Spa. You can use it already.");
  assert.equal(earned.conditions, "For one whole treatment · Comes off if this booking is cancelled");
  const notYet = creditMoment({ earnedCents: 1190, member: readCircle({ ...MARIA, affordable: false }), hasExcludedLine: false });
  assert.doesNotMatch(notYet.sentence, /use it already/, "'You can use it already' only when affordable");
  const guest = creditMoment({ earnedCents: 1545, member: null, brands: THREE_BRANDS, hasExcludedLine: false });
  assert.equal(guest.kind, "received");
  assert.equal(guest.hero, "€15.45");
  assert.equal(guest.sentence, "You've just received €15.45 in Carisma credit, usable at Carisma Spa, Aesthetics and Slimming.");
  const paid = creditMoment({ earnedCents: 0, member: m, hasExcludedLine: false, paidWithPoints: { points: 2180 } });
  assert.equal(paid.kind, "paid");
  assert.equal(paid.quiet, "Paid with points · 2,180 points · This treatment earns no points");
  const onTheWay = creditMoment({ earnedCents: 1190, earnedPoints: 238, member: m, hasExcludedLine: false, unpaid: true });
  assert.equal(onTheWay.kind, "onTheWay");
  assert.equal(onTheWay.quiet, "€11.90 · 238 points on the way when you pay");
  assert.equal(creditMoment({ earnedCents: 495, member: m, hasExcludedLine: true }).kind, "none", "an excluded line never gets a moment");
  assert.equal(creditMoment({ earnedCents: 0, member: m, hasExcludedLine: false }).kind, "none");
  assert.equal(creditMoment(null).kind, "none");
  assert.equal(
    PAY_STEP_DISCLOSURE,
    "If you cancel, the credit this booking gives you is removed. If you've already used it, your balance can go below zero. We never take it from your refund.",
  );
});

test("earn maths: floor(euros × level) points, VAT included (the server's preview is what pages print)", () => {
  assert.equal(earnPoints(10900, 1), 109);
  assert.equal(earnPoints(10900, 1.5), 163);
  assert.equal(earnPoints(10900, 1.25), 136);
  assert.equal(earnPoints(0, 1), 0);
});

test("the header panel: no loyalty (or loyalty off) is the panel it always was; live adds the Card, the track and the link", () => {
  const base = { signedIn: true, profile: { firstName: "Maria", lastName: "Borg", emailMasked: "m•••••@gmail.com" }, upcoming: [] };
  const before = accountPanelHTML(buildPanelModel(base));
  assert.equal(accountPanelHTML(buildPanelModel({ ...base, loyalty: { enabled: false } })), before);
  assert.equal(accountPanelHTML(buildPanelModel({ ...base, loyalty: null })), before);
  assert.equal(accountPanelHTML(buildPanelModel({ ...base, loyalty: MARIA.level })), before, "garbage folds to nothing");
  const live = accountPanelHTML(buildPanelModel({ ...base, loyalty: SUMMARY }));
  assert.match(live, /Level 3 · Ruby/);
  assert.match(live, /€72\.40/);
  assert.match(live, /ready to use · 1,448 points/);
  assert.match(live, /€290 more this year to reach Level 4 · Sapphire/);
  // BE-1's built summary has no threshold: the summary-only Card never invents "€0 of €0" (browser.ts adds the
  // caption from /me once the menu opens); a summary that carries it draws it at once.
  assert.doesNotMatch(live, /paid this year/);
  assert.match(accountPanelHTML(buildPanelModel({ ...base, loyalty: SUMMARY_ASKED })), /<span>€710 of €1,000 paid this year<\/span><span>Level 4 · Sapphire<\/span>/);
  // BE-i: the summary's perk rows list the Spa day only while live; BE-1's real rows carry no live block.
  assert.match(accountPanelHTML(buildPanelModel({ ...base, loyalty: SUMMARY_ASKED })), /Level 4 · Sapphire unlocks 8\.75% back and €35\.00 birthday credit/);
  assert.match(accountPanelHTML(buildPanelModel({ ...base, loyalty: SUMMARY_ASKED_LIVE })), /Level 4 · Sapphire unlocks 8\.75% back and a second free Spa day every year/);
  assert.match(live, /data-cw-jewel data-gem="ruby"/);
  assert.match(live, /data-cw-jewel data-gem="sapphire" data-p="0\.000"/, "the next stone, beads dark");
  assert.match(live, /href="\/account\/rewards#rewards">Use my credit</, "ADDENDUM KIT-1: affordable → Use my credit");
  // KIT-1: nothing affordable → "Book a visit" to the brand's booking page, never "View my credit".
  const none = accountPanelHTML(buildPanelModel({ ...base, loyalty: { ...SUMMARY, affordable: false } }), { bookHref: "/book" });
  assert.match(none, /<a class="cc-btn" href="\/book">Book a visit<\/a>/);
  assert.doesNotMatch(none + live, /View my credit/);
  // X4: the dated part sits directly under the balance.
  const dated = accountPanelHTML(buildPanelModel({ ...base, loyalty: { ...SUMMARY, datedEnds: { at: "2026-12-07", points: 400 } } }));
  assert.match(dated, /cc-bal[^>]*>€72\.40<\/p><p class="cc-dated"[^>]*>€20\.00 of it until Mon 7 Dec<\/p>/);
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
    // v2: free Spa days, early access, no deposit.
    "/api/auth/proxy/client/loyalty/perks",
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
  assert.match(live.mount.innerHTML, /€72\.40/);
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
  assert.match(live.mount.innerHTML, /data-cw-qc="carisma-circle-v2-20261117"/);
  assert.match(live.mount.innerHTML, /href="\/account\/rewards" aria-current="page" data-cw-circle-rail>/);
  assert.match(live.mount.innerHTML, /data-cw-circle="hero"/);
  assert.match(live.mount.innerHTML, /All five levels/);
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
    if (url.endsWith("/client/loyalty/me")) throw new Error("v2: the session never replays the member read");
    if (url.endsWith("/client/loyalty/summary")) {
      if (loyalty === "throw") throw new Error("ECONNRESET");
      if (typeof loyalty === "number") return body({ error: "x" }, loyalty);
      return body({ success: true, data: loyalty });
    }
    return body({}, 404);
  };
  return { calls, fetchImpl };
}

test("session: include=upcoming alone never asks for loyalty (today's panel, unchanged)", async () => {
  const b = backend(SUMMARY);
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
  const b = backend(SUMMARY);
  const out = await (await createAccountRoutes(cfg(b.fetchImpl)).session(sessionReq("upcoming,loyalty"))).json();
  assert.equal(out.loyalty.enabled, true);
  assert.equal(out.loyalty.balance.cents, 7240);
  assert.ok(b.calls.some((u) => u.endsWith("/client/loyalty/summary")), "v2 folds the summary read");
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
