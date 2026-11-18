import { test } from "node:test";
import assert from "./fixtures/plain-assert.mjs";
import {
  jewelSlotHTML,
  createAccountRoutes,
  seal,
  isAllowed,
  mountAccountPanel,
  mountAccountPortal,
  circleRewardsHTML,
  circleNowRowHTML,
  readCircleRewards,
  circleWalletPlatform,
  readCircleWalletAvailability,
  circleCardBlockHTML,
  circleLadderHTML,
  readCircleStatus,
  readCircle,
  earnPoints,
  rejoinNoteText,
  CIRCLE_CARD_LINE,
} from "../dist/index.js";
import { frameStep, motionReduced } from "../dist/jewel/index.js";
import { MARIA, MARIA_LIVE, SUMMARY, SUMMARY_ASKED, REWARDS, LEVELS, STATUS, LEFT } from "./fixtures/circle-v2.mjs";
import { El, miniDocument } from "./fixtures/mini-dom.mjs";

/**
 * The WEB fix (carisma-circle-v2-20261117, review of 18 Nov): one test per kit-side defect the review found.
 */
const settle = (ms = 30) => new Promise((r) => setTimeout(r, ms));

/* ── The signed-in guest door (critical: pay with points could never book) ── */

const RP = "carisma-spa";
const SECRET = "primary-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const API = "http://backend.local/api/v1";
const NOW_S = 1_700_000_000;
const sessionCookie = () => seal({ v: 1, sid: "s", uid: "u", at: "MEMBER-ACCESS", atExp: NOW_S + 99999, rt: "R", initials: "MB", iat: NOW_S }, SECRET, RP);
function routes(fetchImpl, extra = {}) {
  return createAccountRoutes({
    rpId: RP, clientId: RP, clientSecret: "cs", identityOrigin: "http://account.localtest.me:3000",
    carismasoftApiUrl: API, sessionSecret: SECRET, allowedOrigins: ["https://www.carismaspa.com"],
    cookieSecure: false, fetchImpl, now: () => NOW_S * 1000, ...extra,
  });
}
function bookingReq(headers = {}, withCookie = true) {
  const h = new Headers({ origin: "https://www.carismaspa.com", "content-type": "application/json", ...headers });
  if (withCookie) h.set("cookie", `cw_session=${sessionCookie()}`);
  return new Request("https://www.carismaspa.com/api/auth/proxy/client/booking/guest/checkout", {
    method: "POST",
    headers: h,
    body: JSON.stringify({ brandId: "b", promoCode: "CPAB12CD34", guest: { email: "maria@example.test" } }),
  });
}

test("a points booking reaches the guest door WITH the member's bearer, her browser and her proven address", async () => {
  const seen = [];
  const r = routes(async (url, init) => {
    seen.push({ url, headers: init.headers, body: init.body });
    return new Response(JSON.stringify({ success: true, data: { appointments: [] } }), { status: 201, headers: { "content-type": "application/json" } });
  });
  const res = await r.proxy(bookingReq({ "user-agent": "Mozilla/5.0 (iPhone) Safari/605.1", "cloudfront-viewer-address": "203.0.113.7:443", "x-forwarded-for": "6.6.6.6, 198.51.100.2" }));
  assert.equal(res.status, 201, "the door's own status, verbatim");
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, `${API}/client/booking/guest/checkout`);
  assert.equal(seen[0].headers.authorization, "Bearer MEMBER-ACCESS", "the owner-locked code needs her bearer (BE-2 R2.16)");
  assert.equal(seen[0].headers["x-client-user-agent"], "Mozilla/5.0 (iPhone) Safari/605.1", "the visitor's browser for the booking's ad events");
  assert.equal(seen[0].headers["x-client-ip"], "203.0.113.7", "CloudFront's viewer address, never the leftmost XFF entry");
  assert.equal(seen[0].headers["x-forwarded-for"], "203.0.113.7", "per-shopper limits");
  assert.equal(JSON.parse(seen[0].body).promoCode, "CPAB12CD34", "the body is the guest door's, untouched");
  // No proven address: nothing is invented (127.0.0.1 is the kit's "unknown").
  const bare = [];
  await routes(async (url, init) => { bare.push(init.headers); return new Response("{}", { status: 201 }); }).proxy(bookingReq({}));
  assert.equal("x-client-ip" in bare[0], false);
  assert.equal("x-forwarded-for" in bare[0], false);
  // A host hook wins over the edge rule.
  const hooked = [];
  await routes(async (url, init) => { hooked.push(init.headers); return new Response("{}", { status: 201 }); }, { visitorIp: () => "192.0.2.10" }).proxy(bookingReq({}));
  assert.equal(hooked[0]["x-client-ip"], "192.0.2.10");
  // Signed out: 401 and the backend never sees it (the site reads it as "sign in to pay with points").
  let called = 0;
  const out = await routes(async () => { called++; return new Response("{}"); }).proxy(bookingReq({}, false));
  assert.equal(out.status, 401);
  assert.equal(called, 0);
  // Only the checkout POST: the guest token's own doors never ride the member's bearer.
  for (const [m, p] of [["POST", "/client/booking/guest/abandon"], ["GET", "/client/booking/guest/session"], ["GET", "/client/booking/guest/checkout"]]) {
    assert.equal(isAllowed(m, p), false, `${m} ${p}`);
  }
  // Every other door forwards no visitor header (unchanged).
  const other = [];
  await routes(async (url, init) => { other.push(init.headers); return new Response("{}", { status: 200 }); }).proxy(
    new Request("https://www.carismaspa.com/api/auth/proxy/client/loyalty/redeem", { method: "POST", headers: { origin: "https://www.carismaspa.com", cookie: `cw_session=${sessionCookie()}`, "cloudfront-viewer-address": "203.0.113.7:1", "user-agent": "Mozilla/5.0" }, body: "{}" }),
  );
  assert.equal("x-client-ip" in other[0], false);
  assert.equal("x-client-user-agent" in other[0], false);
});

test("the member earn preview and the Circle Wallet card are exact doors; their siblings stay refused", () => {
  assert.equal(isAllowed("POST", "/client/loyalty/earn/preview"), true);
  assert.equal(isAllowed("GET", "/client/loyalty/earn/preview"), false);
  assert.equal(isAllowed("GET", "/public/loyalty/earn"), false);
  assert.equal(isAllowed("GET", "/client/wallet/circle/apple"), true);
  assert.equal(isAllowed("GET", "/client/wallet/circle/google"), true);
  for (const p of ["/client/wallet/circle/samsung", "/client/wallet/circle", "/client/wallet/circle/apple/x"]) assert.equal(isAllowed("GET", p), false, p);
  assert.equal(isAllowed("POST", "/client/wallet/circle/apple"), false);
});

/* ── Reduced motion: ONE still frame (surfaces §3.3, §7.2) ── */

test("reduced motion: the loop draws a still jewel exactly once per change, never on every frame", () => {
  const prev = globalThis.window;
  try {
    globalThis.window = { matchMedia: (q) => ({ matches: q.includes("prefers-reduced-motion") }) };
    assert.equal(motionReduced(), true, "the engine reads the OS setting");
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    assert.equal(motionReduced(), false);
  } finally {
    globalThis.window = prev;
  }
  const still = { alive: true, near: true, visible: true, still: true, stillDue: true };
  let draws = 0;
  let again = false;
  for (let i = 0; i < 10; i++) {
    const s = frameStep(still);
    if (s.draw) draws++;
    again = again || s.again;
  }
  assert.equal(draws, 1, "one exact frame");
  assert.equal(again, false, "the loop never keeps running for a still jewel");
  still.stillDue = true; // update(), a resize, back on screen
  assert.equal([0, 1, 2].map(() => frameStep(still).draw).filter(Boolean).length, 1);
  const moving = { alive: true, near: true, visible: true, still: false, stillDue: false };
  assert.deepEqual([0, 1, 2].map(() => frameStep(moving)), [{ draw: true, again: true }, { draw: true, again: true }, { draw: true, again: true }]);
  assert.deepEqual(frameStep({ ...moving, visible: false }), { draw: false, again: false }, "off screen: nothing");
});

/* ── Photos for what her credit buys (ADDENDUM X3 / KIT-3) ── */

test("reward cards: the site's art, then the host photo, then the API's https imageUrl; none → words only", () => {
  const items = readCircleRewards({
    ...REWARDS,
    items: REWARDS.items.map((r, i) => ({ ...r, imageUrl: i === 1 ? "https://cdn.example/jss.webp" : i === 2 ? "http://cdn.example/plain.webp" : undefined })),
  });
  assert.equal(items[1].imageUrl, "https://cdn.example/jss.webp");
  assert.equal(items[2].imageUrl, "", "a non-https image is dropped");
  const api = circleRewardsHTML(items, 1448);
  assert.match(api, /<li class="cc-reward on has-photo"><div class="cc-reward__in"><img src="https:\/\/cdn\.example\/jss\.webp"/, "Yours now with the API's photo");
  const hosted = circleRewardsHTML(items, 1448, { photo: (r) => (r.serviceId === items[1].serviceId ? { src: "/img/jss.webp", alt: "Japanese Short & Sweet" } : null) });
  assert.match(hosted, /<img src="\/img\/jss\.webp" alt="Japanese Short &amp; Sweet"/, "the host's own library wins over the API's");
  const thrown = circleRewardsHTML(items, 1448, { photo: () => { throw new Error("x"); } });
  assert.match(thrown, /https:\/\/cdn\.example\/jss\.webp/, "a throwing callback costs only its photo");
  assert.match(circleNowRowHTML(items, undefined, () => ({ src: "/img/now.webp" })), /<img src="\/img\/now\.webp"/);
  const plain = circleRewardsHTML(readCircleRewards(REWARDS), 1448);
  assert.doesNotMatch(plain, /<img/, "no photo anywhere → a text card, never a stock image");
});

/* ── "Your card" (ADDENDUM X9 / KIT-4) ── */

test("Your card: Apple on an iPhone or iPad in Safari, Google on Android Chrome, never a desktop browser", () => {
  const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
  const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15";
  const ANDROID = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
  assert.equal(circleWalletPlatform(IPHONE), "apple");
  assert.equal(circleWalletPlatform(IPAD, 5), "apple", "iPadOS reports a Mac with touch");
  assert.equal(circleWalletPlatform(IPAD, 0), null, "a real Mac");
  assert.equal(circleWalletPlatform(ANDROID), "google");
  assert.equal(circleWalletPlatform(IPHONE.replace("Version/18.1 Mobile/15E148 Safari/604.1", "CriOS/131.0 Mobile/15E148 Safari/604.1")), null, "Chrome on iOS");
  assert.equal(circleWalletPlatform(ANDROID.replace("Chrome/131.0.0.0 Mobile Safari", "SamsungBrowser/26.0 Chrome/122.0 Mobile Safari")), null);
  assert.equal(circleWalletPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36"), null);
  assert.deepEqual(readCircleWalletAvailability({ success: true, data: { apple: true, google: true } }), { apple: false, google: false }, "the old shape is no");
  assert.deepEqual(readCircleWalletAvailability({ success: true, data: { apple: false, google: false, circle: { apple: true, google: false } } }), { apple: true, google: false });
  assert.deepEqual(readCircleWalletAvailability(null), { apple: false, google: false });
  const html = circleCardBlockHTML("apple");
  assert.match(html, /<h2 class="cw-section__title" id="cw-circle-card-title">Your card<\/h2>/);
  assert.match(html, /data-cw-circle-wallet="apple">Add to Apple Wallet</);
  assert.ok(html.includes(CIRCLE_CARD_LINE));
  assert.equal(CIRCLE_CARD_LINE, "Your card shows the desk who you are. Paying with points at the desk needs the code in the Carisma app.");
});

function portalHarness({ view = "home", path = "/account", me = MARIA, availability = null } = {}) {
  const doc = miniDocument({ pathname: path });
  const mount = new El("div", { id: "carisma-account-portal" });
  doc.body.appendChild(mount);
  const reads = [];
  const navs = [];
  const json = (status, data) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(data) });
  const fetchImpl = (url) => {
    reads.push(url);
    if (url.startsWith("/api/auth/session")) return json(200, { signedIn: true, profile: { firstName: "Maria" } });
    if (url === "/api/auth/proxy/client/loyalty/me") return json(200, me);
    if (url === "/api/auth/proxy/client/loyalty/rewards") return json(200, REWARDS);
    if (url === "/api/auth/proxy/client/wallet/availability") return json(200, availability ?? { success: true, data: { apple: false, google: false } });
    if (url === "/api/auth/proxy/client/wallet/circle/apple") return json(200, { success: true, data: { url: "https://wallet.example/circle.pkpass", expiresAt: "x" } });
    if (url.startsWith("/api/auth/proxy/client/loyalty/")) return json(200, { enabled: true, items: [], nextCursor: null });
    return json(200, { success: true, data: [] });
  };
  return { doc, mount, reads, navs, fetchImpl, navigate: (u) => navs.push(u) };
}

function fakeJewels() {
  const mounted = [];
  const disposed = [];
  const loader = async () => ({
    hydrateJewels(root) {
      mounted.push(root);
      return () => disposed.push(root);
    },
  });
  return { mounted, disposed, loader };
}

test("account portal: every live jewel it drew is freed on unmount, and a late read mounts none (no leak)", async () => {
  const j = fakeJewels();
  const h = portalHarness();
  const unmount = mountAccountPortal(h.doc, { view: "home", fetchImpl: h.fetchImpl, navigate: h.navigate, circle: true, circleJewel: j.loader });
  assert.equal(typeof unmount, "function", "React's effect gets a cleanup");
  await settle();
  assert.match(h.mount.innerHTML, /data-cw-circle="overview"/, "precondition: the overview drew");
  assert.equal(j.mounted.length, 1, "the overview's jewels were hydrated");
  unmount();
  assert.equal(j.disposed.length, 1, "the overview's jewels are filed under the portal mount, so the unmount frees them");
  // A mount that is unmounted before its reads answer never hydrates.
  const late = fakeJewels();
  const h2 = portalHarness();
  const un2 = mountAccountPortal(h2.doc, { view: "home", fetchImpl: h2.fetchImpl, navigate: h2.navigate, circle: true, circleJewel: late.loader });
  un2();
  await settle();
  assert.equal(late.mounted.length, 0, "a dead mount never holds a jewel");
});

test("Credit & rewards: 'Your card' only with circleWallet, a phone Wallet and circle.<platform>; the tap opens the pass", async () => {
  const nav = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const setUA = (userAgent) => Object.defineProperty(globalThis, "navigator", { value: { userAgent, maxTouchPoints: 0 }, configurable: true, writable: true });
  const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
  const on = { success: true, data: { apple: false, google: false, circle: { apple: true, google: false } } };
  try {
    setUA(IPHONE);
    const h = portalHarness({ view: "rewards", path: "/account/rewards", availability: on });
    mountAccountPortal(h.doc, { view: "rewards", fetchImpl: h.fetchImpl, navigate: h.navigate, circle: true, circleWallet: true });
    await settle();
    const slot = h.mount.querySelector('[data-cw-circle-slot="your-card"]');
    assert.ok(slot, "precondition: the page drew its slot");
    assert.equal(slot.getAttribute("id"), "your-card", "the letters link #your-card");
    assert.match(slot.innerHTML, /Add to Apple Wallet/);
    assert.equal(slot.hasAttribute("hidden"), false);
    h.mount.dispatch("click", { target: slot.querySelector("[data-cw-circle-wallet]"), preventDefault() {}, stopPropagation() {} });
    await settle();
    assert.deepEqual(h.navs, ["https://wallet.example/circle.pkpass"]);
    // The host switch off (default): not even the availability read.
    const off = portalHarness({ view: "rewards", path: "/account/rewards", availability: on });
    mountAccountPortal(off.doc, { view: "rewards", fetchImpl: off.fetchImpl, navigate: off.navigate, circle: true });
    await settle();
    assert.equal(off.reads.some((u) => u.includes("/wallet/")), false);
    assert.equal(off.mount.querySelector('[data-cw-circle-slot="your-card"]').innerHTML, "");
    // A desktop browser: nothing, and no read.
    setUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36");
    const desk = portalHarness({ view: "rewards", path: "/account/rewards", availability: on });
    mountAccountPortal(desk.doc, { view: "rewards", fetchImpl: desk.fetchImpl, navigate: desk.navigate, circle: true, circleWallet: true });
    await settle();
    assert.equal(desk.mount.querySelector('[data-cw-circle-slot="your-card"]').innerHTML, "");
    assert.equal(desk.reads.some((u) => u.includes("/wallet/")), false);
    // circle.apple false (or the old shape): the slot stays empty and hidden.
    setUA(IPHONE);
    const no = portalHarness({ view: "rewards", path: "/account/rewards", availability: { success: true, data: { apple: true, google: true } } });
    mountAccountPortal(no.doc, { view: "rewards", fetchImpl: no.fetchImpl, navigate: no.navigate, circle: true, circleWallet: true });
    await settle();
    const s3 = no.mount.querySelector('[data-cw-circle-slot="your-card"]');
    assert.equal(s3.innerHTML, "");
    assert.equal(s3.hasAttribute("hidden"), true);
  } finally {
    if (nav) Object.defineProperty(globalThis, "navigator", nav);
    else delete globalThis.navigator;
  }
});

test("Credit & rewards: the free Spa day's 'Book it', the posters and the photos reach the page (they never did)", async () => {
  // The Spa days are live (BE-i); BE-1's real shape (no live block) is the next test's.
  const h = portalHarness({ view: "rewards", path: "/account/rewards", me: MARIA_LIVE });
  const perks = { enabled: true, year: 2026, level: { key: "ruby", number: 3, name: "Ruby" }, spaDays: { entitlement: 1, used: 0, left: 1, serviceIds: ["x"], resetsOn: "2027-01-01" }, noDeposit: { active: false }, earlyAccess: { hours: 48, upcoming: [] } };
  const fetchImpl = (url) => (url === "/api/auth/proxy/client/loyalty/perks" ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(perks) }) : h.fetchImpl(url));
  mountAccountPortal(h.doc, {
    view: "rewards",
    fetchImpl,
    navigate: h.navigate,
    circle: true,
    circleSpaDayHref: "/spa-day",
    circlePoster: (gem, kind) => `/circle/jewel/v1/${gem}-${kind}.webp`,
    circleRewardPhoto: () => ({ src: "/img/reward.webp", alt: "" }),
  });
  await settle();
  assert.match(h.mount.innerHTML, /1 free Spa day this year · 1 left<\/span><a class="cw-link cc-link" href="\/spa-day">Book it<\/a>/);
  assert.match(h.mount.innerHTML, /src="\/circle\/jewel\/v1\/ruby-full\.webp"/, "the Hero's poster");
  assert.match(h.mount.innerHTML, /<img src="\/img\/reward\.webp"/);
});

test("the rejoin sentence names the API's first level once the host hands it over (R5.1), else 'the first level'", async () => {
  assert.match(rejoinNoteText("Level 1 · Pearl"), /^If you rejoin, you start again at Level 1 · Pearl with no credit\./);
  const h = portalHarness({ view: "rewards", path: "/account/rewards", me: LEFT });
  mountAccountPortal(h.doc, { view: "rewards", fetchImpl: h.fetchImpl, navigate: h.navigate, circle: true, circleFirstLevel: async () => "Level 1 · Pearl" });
  await settle();
  const notes = h.mount.querySelectorAll("[data-cw-circle-rejoin-note]");
  assert.ok(notes.length >= 1, "precondition: the left page drew its note");
  for (const n of notes) assert.match(n.innerHTML, /start again at Level 1 · Pearl with no credit/);
  assert.doesNotMatch(h.mount.innerHTML, /€\s?\d/, "a member who left still sees no figure");
  const bare = portalHarness({ view: "rewards", path: "/account/rewards", me: LEFT });
  mountAccountPortal(bare.doc, { view: "rewards", fetchImpl: bare.fetchImpl, navigate: bare.navigate, circle: true });
  await settle();
  assert.match(bare.mount.innerHTML, /start again at the first level with no credit/);
});

/* ── The menu Card on BE-1's real summary (minor: the caption was lost) ── */

function panelHarness(loyalty, me = MARIA) {
  const doc = miniDocument();
  const mark = new El("a", { "data-carisma-account-mark": null, "data-cw-session": "in", href: "/account" });
  doc.body.appendChild(mark);
  const reads = [];
  const json = (data, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data) });
  const fetchImpl = (url) => {
    reads.push(url);
    if (url.startsWith("/api/auth/session")) {
      return json({ signedIn: true, initials: "MB", profile: { firstName: "Maria", lastName: "Borg", emailMasked: "m•••@gmail.com" }, upcoming: [], loyalty });
    }
    if (url === "/api/auth/proxy/client/loyalty/me") return json(me);
    if (url === "/api/auth/proxy/client/loyalty/rewards") return json(REWARDS);
    return json({}, 404);
  };
  return { doc, mark, reads, fetchImpl };
}

test("menu Card on BE-1's real summary: the caption and the unlock line come from ONE /me read after it opens", async () => {
  const h = panelHarness(SUMMARY, MARIA_LIVE);
  mountAccountPanel(h.doc, { fetchImpl: h.fetchImpl, circle: true, bookHref: "/book" });
  h.doc.click(h.mark);
  await settle(40);
  const panel = h.doc.getElementById("carisma-account-panel");
  assert.ok(panel, "precondition: the panel opened");
  const html = panel.innerHTML;
  assert.match(html, /<div class="cc-track-row"[\s\S]*?<\/div><p class="cc-track-cap" data-clarity-mask="True"><span>€710 of €1,000 paid this year<\/span><span>Level 4 · Sapphire<\/span><\/p>/, "the caption, from /me");
  assert.match(html, /<p class="cc-track-line">Level 4 · Sapphire unlocks 8\.75% back and a second free Spa day every year<\/p>/, "Spa days live");
  // BE-1's real /me (no live block): the line names the rate and the birthday credit only (X2 / BE-i).
  const real = panelHarness(SUMMARY);
  mountAccountPanel(real.doc, { fetchImpl: real.fetchImpl, circle: true, bookHref: "/book" });
  real.doc.click(real.mark);
  await settle(40);
  assert.match(real.doc.getElementById("carisma-account-panel").innerHTML, /<p class="cc-track-line">Level 4 · Sapphire unlocks 8\.75% back and €35\.00 birthday credit<\/p>/);
  assert.match(html, /cc-now/, "the Yours now row");
  assert.equal(h.reads.filter((u) => u === "/api/auth/proxy/client/loyalty/me").length, 1);
  // Once the summary carries the threshold and both perk rows, the menu draws them at once and never reads /me.
  const asked = panelHarness(SUMMARY_ASKED);
  mountAccountPanel(asked.doc, { fetchImpl: asked.fetchImpl, circle: true });
  asked.doc.click(asked.mark);
  await settle(40);
  const a = asked.doc.getElementById("carisma-account-panel").innerHTML;
  assert.match(a, /€710 of €1,000 paid this year/);
  assert.match(a, /Level 4 · Sapphire unlocks 8\.75% back/);
  assert.equal(asked.reads.includes("/api/auth/proxy/client/loyalty/me"), false, "no full ledger read behind the menu");
  assert.equal((a.match(/cc-track-cap/g) || []).length, 1, "one caption");
});

test("menu Card for a member who left: the rejoin sentence names the first level, no figure", async () => {
  const h = panelHarness(LEFT);
  mountAccountPanel(h.doc, { fetchImpl: h.fetchImpl, circle: true, circleFirstLevel: async () => "Level 1 · Pearl" });
  h.doc.click(h.mark);
  await settle(40);
  const html = h.doc.getElementById("carisma-account-panel").innerHTML;
  assert.match(html, /start again at Level 1 · Pearl with no credit/);
  assert.doesNotMatch(html, /€\s?\d/);
});

/* ── No typed rate (minor: 1 point per €1 and the level count were typed) ── */

test("earnPerEuro and the level count come from the API", () => {
  assert.equal(earnPoints(10000, 1.5), 150);
  assert.equal(earnPoints(10000, 1.5, 2), 300, "rules.earnPerEuro × the level multiplier");
  const four = readCircleStatus({ ...STATUS, levels: LEVELS.slice(0, 4) }).levels;
  assert.match(circleLadderHTML(four, readCircle(MARIA).level, 20), /aria-label="The four levels"/);
  const page = readCircle({ ...MARIA, levels: LEVELS.slice(0, 4) });
  assert.ok(page.levels.length === 4);
});

test("a Diamond short of the top level (the next stone, beads dark) never shows the all-gold Diamond still", () => {
  const poster = (gem, kind) => `/circle/jewel/v1/${gem}-${kind}.webp`;
  const next = jewelSlotHTML({ gem: "diamond", progress: 0, height: 44, kind: "small", poster: poster("diamond", "small") });
  assert.doesNotMatch(next, /<img/, "no poster: the flat mark with its empty ring");
  assert.match(next, /cc-jw__mark/);
  const top = jewelSlotHTML({ gem: "diamond", progress: 1, height: 44, kind: "small", poster: poster("diamond", "small") });
  assert.match(top, /<img class="cc-jw__poster" src="\/circle\/jewel\/v1\/diamond-small\.webp"/, "her own Level 5 jewel: every bead gold, the still is right");
  const sapphire = jewelSlotHTML({ gem: "sapphire", progress: 0, height: 44, kind: "small", poster: poster("sapphire", "small") });
  assert.match(sapphire, /sapphire-small\.webp/, "every other stone keeps its dark-beaded still");
  const icon = jewelSlotHTML({ gem: "diamond", progress: 0, height: 56, kind: "icon", poster: poster("diamond", "icon") });
  assert.match(icon, /diamond-icon\.webp/, "an icon is every bead gold by definition");
});
