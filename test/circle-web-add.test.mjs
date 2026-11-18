import { test } from "node:test";
import assert from "./fixtures/plain-assert.mjs";
import {
  accountPanelHTML,
  buildPanelModel,
  circleHeroHTML,
  circleMemberLineText,
  circleOverviewHTML,
  circlePanelRowHTML,
  circleSummaryOf,
  circleTrackHTML,
  circleViewHTML,
  circleWaysCardsHTML,
  circleActivityHTML,
  levelOnItsWayFrom,
  mountAccountPanel,
  mountAccountPortal,
  nbWords,
  panelRewardsSubText,
  readCircle,
  readCircleSummary,
  referralFrom,
  rebookNextFrom,
} from "../dist/index.js";
import { PORTAL_TOKENS_CSS, PORTAL_RULES_CSS } from "../dist/ui/styles/index.js";
import { MARIA, SUMMARY, STATUS, LEFT, THREE_BRANDS } from "./fixtures/circle-v2.mjs";
import { El, miniDocument } from "./fixtures/mini-dom.mjs";

/**
 * The WEB addendum pass (carisma-circle-v2-20261117, 18 Nov): the round-2 parts the WEB log left — KIT-1's account
 * rows, KIT-2's member line / saved line / money cards, X2's level on its way, KIT-6's shoulds (strict listing, the
 * --cw-circle-* tokens, jewelHost). Every figure is the API's: a field the backend does not send draws nothing.
 */
const settle = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const json = (status, data) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(data) });
const FRIDAY = "2026-11-20T14:00:00.000Z"; // Fri 20 Nov, 15:00 in Malta
const ON_ITS_WAY = {
  level: { key: "sapphire", number: 4, name: "Sapphire", label: "Level 4 · Sapphire" },
  appointmentId: "appt-fri",
  startAt: FRIDAY,
  sentence: "Your visit on Fri 20 Nov takes you to Level 4 · Sapphire",
};
const REFERRAL = {
  payInPoints: true,
  ladder: [
    { friend: 1, points: 400, cents: 2000 },
    { friend: 2, points: 600, cents: 3000 },
    { friend: 3, points: 1000, cents: 5000 },
  ],
  afterPoints: 400,
  upToPoints: 2000,
  upToCents: 10000,
  link: "https://www.carismaspa.com/r/MARIA42",
  brandId: "11111111-1111-4111-8111-111111111111",
};
const REBOOK = { appointmentId: "appt-fri", startAt: FRIDAY, points: 119, cents: 595 };

/* ── KIT-1 · the menu's rows (board 11) ─────────────────────────────────── */

const SESSION = (loyalty, upcoming = []) => ({ signedIn: true, initials: "MB", profile: { firstName: "Maria", lastName: "Borg", emailMasked: "m***@carisma.test" }, upcoming, loyalty });
const FRI_ROW = { id: "appt-fri", startTime: FRIDAY, brandName: "Carisma Spa", locationName: "Hyatt Regency", primaryServiceName: "Carisma Signature Massage" };

test("KIT-1: under her live Card the menu is board 11's — Overview, Bookings with her next visit, Credit and rewards, Details, Sign out", () => {
  const html = accountPanelHTML(buildPanelModel(SESSION(SUMMARY, [FRI_ROW])));
  assert.match(html, /data-cw-circle="panel"/, "precondition: her Card");
  assert.match(html, /data-cw-circle="menu-rows"/);
  const rows = [...html.matchAll(/<li><a href="([^"]+)"><b>([^<]+)<\/b>(?:<small[^>]*>([^<]*)<\/small>)?/g)].map((m) => [m[1], m[2], m[3] ?? ""]);
  assert.deepEqual(rows, [
    ["/account", "Overview", ""],
    ["/account/bookings", "Bookings", "Fri 20 Nov, 15:00"],
    ["/account/rewards", "Credit and rewards", ""],
    ["/account/details", "Details", ""],
  ]);
  assert.match(html, /<small data-cw-circle-levels-sub hidden><\/small>/, "the level count waits for the API (never a typed 'five')");
  assert.doesNotMatch(html, /carisma-panel__visits|View booking|My bookings/, "the next visit lives in the Bookings row (board 11)");
  assert.match(html, /data-carisma-signout>Sign out<\/button><button type="button" data-carisma-signout-all>Sign out of every Carisma site/);
  assert.equal(panelRewardsSubText(5), "Activity, ways to earn, all five levels");
  assert.equal(panelRewardsSubText(0), "");
});

test("KIT-1: off, left, under 18, or the Card kept out of the menu → today's panel, byte for byte", () => {
  const off = buildPanelModel(SESSION({ enabled: false }, [FRI_ROW]));
  const none = buildPanelModel(SESSION(undefined, [FRI_ROW]));
  assert.equal(accountPanelHTML(off), accountPanelHTML(none), "a clean enabled:false is the panel without Circle");
  assert.match(accountPanelHTML(none), /carisma-panel__visits[\s\S]*View booking[\s\S]*My account[\s\S]*My bookings[\s\S]*My details/);
  assert.doesNotMatch(accountPanelHTML(none), /menu-rows|Credit and rewards/);
  const left = accountPanelHTML(buildPanelModel(SESSION(LEFT, [FRI_ROW])));
  assert.match(left, /data-cw-circle="panel-left"[\s\S]*carisma-panel__visits/, "left: the existing rows + Rejoin");
  assert.doesNotMatch(left, /menu-rows/);
  const noMenu = accountPanelHTML(buildPanelModel(SESSION(SUMMARY, [FRI_ROW])), {}, { menu: false });
  assert.doesNotMatch(noMenu, /menu-rows|data-cw-circle="panel"/);
  assert.match(noMenu, /View booking/);
  const noRewards = accountPanelHTML(buildPanelModel(SESSION(SUMMARY, [FRI_ROW])), {}, { rewards: false });
  assert.doesNotMatch(noRewards, /Credit and rewards/, "rewards place off: no row for it");
});

function panelHarness({ loyalty = SUMMARY, upcoming = [FRI_ROW], status = STATUS } = {}) {
  const doc = miniDocument({ host: "www.carismaspa.com" });
  const mark = new El("a", { "data-carisma-account-mark": null, "data-cw-session": "in", href: "/account" });
  doc.body.appendChild(mark);
  const reads = [];
  const fetchImpl = (url) => {
    reads.push(url);
    if (url.startsWith("/api/auth/session")) return json(200, SESSION(loyalty, upcoming));
    if (url === "/api/auth/proxy/client/loyalty/me") return json(200, MARIA);
    return json(200, { enabled: true, items: [] });
  };
  let statusAsks = 0;
  const circleStatus = () => {
    statusAsks += 1;
    return Promise.resolve(status);
  };
  return { doc, mark, reads, fetchImpl, circleStatus, asks: () => statusAsks };
}
const panelOf = (h) => h.doc.getElementById("carisma-account-panel").innerHTML;

test("KIT-1: the Credit and rewards subtitle names the API's level count once the public status answers", async () => {
  const h = panelHarness();
  mountAccountPanel(h.doc, { fetchImpl: h.fetchImpl, circle: true, circleStatus: h.circleStatus });
  h.doc.click(h.mark);
  await settle(40);
  assert.match(panelOf(h), /<b>Credit and rewards<\/b><small data-cw-circle-levels-sub>Activity, ways to earn, all five levels<\/small>/);
  const three = panelHarness({ status: { ...STATUS, levels: STATUS.levels.slice(0, 3) } });
  mountAccountPanel(three.doc, { fetchImpl: three.fetchImpl, circle: true, circleStatus: three.circleStatus });
  three.doc.click(three.mark);
  await settle(40);
  assert.match(panelOf(three), /all three levels/, "the count is the API's, never typed");
  const none = panelHarness();
  mountAccountPanel(none.doc, { fetchImpl: none.fetchImpl, circle: true });
  none.doc.click(none.mark);
  await settle(40);
  assert.match(panelOf(none), /<small data-cw-circle-levels-sub hidden><\/small>/, "no status hook: no subtitle, no typed count");
  const off = panelHarness({ loyalty: { enabled: false } });
  mountAccountPanel(off.doc, { fetchImpl: off.fetchImpl, circle: true, circleStatus: off.circleStatus });
  off.doc.click(off.mark);
  await settle(40);
  assert.equal(off.asks(), 0, "Circle off for her: the status is never asked");
});

/* ── KIT-6 · strict listing (BE-g) ─────────────────────────────────────── */

test("KIT-6 circleListing 'strict': the menu Card only when every listed visit carries circleEligible === true", async () => {
  const mixed = panelHarness({ upcoming: [{ ...FRI_ROW, circleEligible: true }, { ...FRI_ROW, id: "botox", circleEligible: false }] });
  mountAccountPanel(mixed.doc, { fetchImpl: mixed.fetchImpl, circle: true, circleListing: "strict" });
  mixed.doc.click(mixed.mark);
  await settle(40);
  assert.doesNotMatch(panelOf(mixed), /data-cw-circle|data-cw-jewel/, "one visit not eligible: no Card, today's panel");
  assert.match(panelOf(mixed), /View booking/);
  const missing = panelHarness({ upcoming: [FRI_ROW] });
  mountAccountPanel(missing.doc, { fetchImpl: missing.fetchImpl, circle: true, circleListing: "strict" });
  missing.doc.click(missing.mark);
  await settle(40);
  assert.doesNotMatch(panelOf(missing), /data-cw-circle="panel"/, "a missing flag is not eligible");
  const ok = panelHarness({ upcoming: [{ ...FRI_ROW, circleEligible: true }] });
  mountAccountPanel(ok.doc, { fetchImpl: ok.fetchImpl, circle: true, circleListing: "strict" });
  ok.doc.click(ok.mark);
  await settle(40);
  assert.match(panelOf(ok), /data-cw-circle="panel"/, "every visit eligible: the Card");
  const any = panelHarness({ upcoming: [FRI_ROW] });
  mountAccountPanel(any.doc, { fetchImpl: any.fetchImpl, circle: true });
  any.doc.click(any.mark);
  await settle(40);
  assert.match(panelOf(any), /data-cw-circle="panel"/, "the default ('any') is today's rule: the Card");
});

function portalHarness({ me = MARIA, upcoming = [], status = STATUS } = {}) {
  const doc = miniDocument({ pathname: "/account" });
  const mount = new El("div", { id: "carisma-account-portal" });
  doc.body.appendChild(mount);
  const reads = [];
  const fetchImpl = (url) => {
    reads.push(url);
    if (url.startsWith("/api/auth/session")) return json(200, { signedIn: true, profile: { firstName: "Maria" } });
    if (url === "/api/auth/proxy/client/loyalty/me") return json(200, me);
    if (url.includes("/client/booking/appointments?filter=upcoming")) return json(200, { success: true, data: upcoming });
    if (url.startsWith("/api/auth/proxy/client/loyalty/")) return json(200, { enabled: true, items: [], nextCursor: null });
    return json(200, { success: true, data: [] });
  };
  return { doc, mount, reads, fetchImpl, circleStatus: () => Promise.resolve(status) };
}

test("KIT-6 strict on the Overview: no Circle block (and no member line) beside a booking the server did not mark eligible", async () => {
  const strict = portalHarness({ upcoming: [{ ...FRI_ROW, startTime: "2099-01-08T10:00:00Z", endTime: "2099-01-08T11:00:00Z" }] });
  mountAccountPortal(strict.doc, { view: "home", fetchImpl: strict.fetchImpl, navigate: () => {}, circle: true, circleListing: "strict" });
  await settle(80);
  assert.doesNotMatch(strict.mount.innerHTML, /data-cw-circle="overview"|data-cw-circle="member-line"/);
  const ok = portalHarness({ upcoming: [{ ...FRI_ROW, startTime: "2099-01-08T10:00:00Z", endTime: "2099-01-08T11:00:00Z", circleEligible: true }] });
  mountAccountPortal(ok.doc, { view: "home", fetchImpl: ok.fetchImpl, navigate: () => {}, circle: true, circleListing: "strict" });
  await settle(80);
  assert.match(ok.mount.innerHTML, /data-cw-circle="overview"/);
});

/* ── KIT-2 · the member dashboard (board 10) ───────────────────────────── */

test("KIT-2: her line under the greeting — the level, 'Member since' only from the API, her number", () => {
  const m = readCircle({ ...MARIA, member: { number: "CC 0042 1187", emailVerified: true, spendPausedUntil: null, since: "2024-03-02" } });
  assert.equal(circleMemberLineText(m), "Level 3 · Ruby · Member since 2024 · CC 0042 1187");
  const noSince = readCircle({ ...MARIA, member: { number: "CC 0042 1187", emailVerified: true, spendPausedUntil: null } });
  assert.equal(circleMemberLineText(noSince), "Level 3 · Ruby · CC 0042 1187", "BE-e absent: no 'Member since'");
  const year = readCircle({ ...MARIA, member: { number: "CC 0042 1187", emailVerified: true, spendPausedUntil: null, since: "2024" } });
  assert.equal(circleMemberLineText(year), "Level 3 · Ruby · Member since 2024 · CC 0042 1187", "a bare year reads too");
  const bare = readCircle({ ...MARIA, card: undefined, member: { number: null, emailVerified: false, spendPausedUntil: null, since: "garbage" } });
  assert.equal(circleMemberLineText(bare), "Level 3 · Ruby");
  assert.equal(circleMemberLineText(null), "");
  // The Hero's level line is the level alone (the number moved to the greeting, board 10).
  assert.match(circleHeroHTML(m), /<p class="cc-level"[^>]*>Level 3 · Ruby<\/p>/);
  assert.doesNotMatch(circleHeroHTML(m), /CC 0042 1187/);
});

test("KIT-2: the Overview fills her line under the greeting when live, and nothing while off", async () => {
  const live = portalHarness({ me: { ...MARIA, member: { number: "CC 0042 1187", emailVerified: true, spendPausedUntil: null, since: "2024-03-02" } } });
  mountAccountPortal(live.doc, { view: "home", fetchImpl: live.fetchImpl, navigate: () => {}, circle: true });
  await settle(80);
  assert.match(live.mount.innerHTML, /<header class="cw-head">[\s\S]*data-cw-circle-slot="greet"><p class="cw-lede cc-since"[^>]*data-cw-circle="member-line"><b>Level 3 · Ruby<\/b> · Member since 2024 · CC 0042 1187<\/p>/);
  const off = portalHarness({ me: { enabled: false } });
  mountAccountPortal(off.doc, { view: "home", fetchImpl: off.fetchImpl, navigate: () => {}, circle: true });
  await settle(80);
  assert.match(off.mount.innerHTML, /data-cw-circle-slot="greet" hidden><\/div>/, "off: the slot stays empty and hidden");
  const site = portalHarness();
  mountAccountPortal(site.doc, { view: "home", fetchImpl: site.fetchImpl, navigate: () => {}, circle: false });
  await settle(80);
  assert.doesNotMatch(site.mount.innerHTML, /data-cw-circle-slot/, "a site with Circle off draws no slot at all");
});

test("KIT-2: 'Saved with Carisma Circle this year' only from the server's figure", () => {
  const act = { items: [{ id: "a1", at: "2026-11-15T10:00:00Z", day: "2026-11-15", type: "spent", brand: "Carisma Spa", label: "Japanese Short & Sweet", points: -1300, cents: -6500, status: "spent", expiresAt: null }], nextCursor: null };
  const saved = readCircle({ ...MARIA, savedThisYearCents: 6500 });
  assert.match(circleActivityHTML(saved, act), /<p class="cc-saved"[^>]*><span>Saved with Carisma Circle this year<\/span><b>€65\.00<\/b><\/p>/);
  assert.doesNotMatch(circleActivityHTML(readCircle(MARIA), act), /cc-saved/, "BE-e absent: no saved line");
  assert.doesNotMatch(circleActivityHTML(readCircle({ ...MARIA, savedThisYearCents: 0 }), act), /cc-saved/, "nothing saved yet: no line");
});

test("KIT-2: the money cards — rebook from /me.rebookNext, Refer a friend only while it pays points, Spa products from the status", () => {
  const all = readCircle({ ...MARIA, brands: THREE_BRANDS, rebookNext: REBOOK, referral: REFERRAL });
  const html = circleWaysCardsHTML(all, { retailBoostPct: 50 });
  const titles = [...html.matchAll(/<p class="cc-earn-card__t">([^<]+)<\/p>/g)].map((m) => m[1]);
  assert.deepEqual(titles.slice(0, 3), ["Book your next visit before you leave", "Spa products", MARIA.actions.find((a) => a.key === "full_circle").label]);
  assert.ok(titles.indexOf("Refer a friend") > titles.indexOf("Spa products"));
  assert.match(html, /Book your next visit before you leave<\/p><p class="cc-earn-card__fig"[^>]*><b>\+€5\.95<\/b> · 119 points<\/p><p class="cc-earn-card__s"[^>]*>on Friday[’']s visit<\/p>/);
  assert.match(html, /Spa products<\/p><p class="cc-earn-card__fig"[^>]*><b>50% more points<\/b><\/p><p class="cc-earn-card__s"[^>]*>on the products you buy at Carisma Spa<\/p>/);
  assert.match(html, /class="cc-earn-card wide" data-cw-circle-way="referral"><i class="cc-earn-card__ic"><svg[^]*?<\/svg><\/i><p class="cc-earn-card__t">Refer a friend<\/p><button type="button" class="cc-earn-card__act" data-cw-circle-copy="https:\/\/www\.carismaspa\.com\/r\/MARIA42">Copy my link<\/button><p class="cc-earn-card__fig"[^>]*><b>Up to €100\.00<\/b> · 2,000 points<\/p><p class="cc-earn-card__s"[^>]*>for your first three friends<\/p>/);
  assert.match(html, /class="cc-earn-card wide" data-cw-circle-way="instagram:spa">[\s\S]*when you tap Follow, once for each Carisma brand/);
  assert.match(html, /<p class="cc-earn-card__s"[^>]*>Full Circle: 2 of 3 Carisma brands<\/p>/, "the brand bonus card counts her brands (X10: two or more on)");
  // Not sent → not drawn.
  const none = circleWaysCardsHTML(readCircle(MARIA));
  assert.doesNotMatch(none, /Book your next visit|Spa products|Refer a friend/);
  assert.equal(referralFrom({ payInPoints: false }), null, "BE-3 default: the voucher, so no Circle friends row (X8)");
  assert.equal(referralFrom({ ...REFERRAL, upToPoints: 0 }), null);
  assert.equal(rebookNextFrom({ ...REBOOK, points: 0 }), null);
  assert.equal(rebookNextFrom(null), null);
  // Spa products needs Carisma Spa switched on.
  const clinic = readCircle({ ...MARIA, brands: THREE_BRANDS.slice(1) });
  assert.doesNotMatch(circleWaysCardsHTML(clinic, { retailBoostPct: 50 }), /Spa products/);
});

test("KIT-2: the Overview's Spa products card arrives with the public status's boost; the right column per board 10", async () => {
  const h = portalHarness();
  mountAccountPortal(h.doc, { view: "home", fetchImpl: h.fetchImpl, navigate: () => {}, circle: true, circleStatus: h.circleStatus });
  await settle(80);
  assert.match(h.mount.innerHTML, /data-cw-circle-slot="ov-earn">[\s\S]*Spa products[\s\S]*50% more points/);
  const html = circleOverviewHTML(readCircle(MARIA));
  assert.match(html, /<div class="cc-dash__level"><p class="cc-eyebrow">Your next level<\/p>/);
  assert.match(html, /<span>Your Level 3 · Ruby benefits<\/span><span class="cc-gives__until">until 31 Dec 2027<\/span>/);
  assert.match(circleOverviewHTML(readCircle({ ...MARIA, level: { ...MARIA.level, key: "diamond", number: 5, name: "Diamond", label: "Level 5 · Diamond" }, nextLevel: null })), /<p class="cc-eyebrow">Your level<\/p>/);
  const noBoost = portalHarness();
  mountAccountPortal(noBoost.doc, { view: "home", fetchImpl: noBoost.fetchImpl, navigate: () => {}, circle: true });
  await settle(80);
  assert.doesNotMatch(noBoost.mount.innerHTML, /Spa products/, "no status hook: no card (never a typed 50%)");
});

/* ── X2 · a level on its way (BE-c) ────────────────────────────────────── */

test("X2: the account's track says the server's 'takes you to' sentence and '€290 to go'; a wrong level is ignored", () => {
  const m = readCircle({ ...MARIA, levelOnItsWay: ON_ITS_WAY });
  assert.equal(m.levelOnItsWay.sentence, "Your visit on Fri 20 Nov takes you to Level 4 · Sapphire");
  for (const html of [circleOverviewHTML(m), circleViewHTML({ me: m, activity: null, rewards: null })]) {
    assert.match(html, /<p class="cc-track-h"[^>]*>Your visit on Fri 20 Nov takes you to Level 4 · Sapphire<\/p>/);
    assert.match(html, /<span>€710 of €1,000 paid this year<\/span><span>€290 to go<\/span>/, "the right end says what is left");
  }
  assert.match(circleHeroHTML(m), /<p class="cc-next"[^>]*>Your visit on Fri 20 Nov takes you to Level 4 · Sapphire<\/p>/);
  // Absent (BE-2 sends nothing on the summary): the gap and the next level's name.
  const gap = circleOverviewHTML(readCircle(MARIA));
  assert.match(gap, /<p class="cc-track-h"[^>]*>€290 more this year to reach Level 4 · Sapphire<\/p>/);
  assert.match(gap, /<span>€710 of €1,000 paid this year<\/span><span>Level 4 · Sapphire<\/span>/);
  // A level on its way that is not her NEXT level, or without the server's sentence, never draws.
  assert.equal(readCircle({ ...MARIA, levelOnItsWay: { ...ON_ITS_WAY, level: { key: "diamond", number: 5, name: "Diamond", label: "Level 5 · Diamond" } } }).levelOnItsWay, null);
  assert.equal(levelOnItsWayFrom({ ...ON_ITS_WAY, sentence: "" }), null);
  assert.equal(readCircle({ ...MARIA, nextLevel: null, levelOnItsWay: ON_ITS_WAY }).levelOnItsWay, null, "at the top: nothing on its way");
  // The menu reads the summary: on its way only when the summary itself sends it.
  const menuGap = circlePanelRowHTML(readCircleSummary(SUMMARY));
  assert.doesNotMatch(menuGap, /takes you to/);
  const menuOn = circlePanelRowHTML(readCircleSummary({ ...SUMMARY, levelOnItsWay: ON_ITS_WAY }));
  assert.match(menuOn, /takes you to Level 4 · Sapphire/);
  // The pay step passes its own (this visit's) answer: the track draws what it is given, nothing else.
  assert.match(circleTrackHTML({ ...readCircle(MARIA), onItsWay: { sentence: "This visit takes you to Level 4 · Sapphire" } }, { compact: true }), /This visit takes you to/);
  assert.doesNotMatch(circleTrackHTML({ ...readCircle(MARIA), onItsWay: null }, { compact: true }), /takes you to/);
});

test("words: the API's plain spaces become the design's no-break spaces (idempotent)", () => {
  const once = nbWords("€290 more this year to reach Level 4 · Sapphire");
  assert.equal(once, "€290 more this year to reach Level 4 · Sapphire".replace(/ /g, " "));
  assert.equal(nbWords(once), once);
  assert.equal(nbWords("Our highest level, kept until 31 Dec 2027"), "Our highest level, kept until 31 Dec 2027");
  assert.equal(nbWords("1,448 points"), "1,448 points");
  assert.equal(readCircle(MARIA).level.label, "Level 3 · Ruby");
  assert.equal(circleSummaryOf(readCircle(MARIA)).level.label, "Level 3 · Ruby");
});

/* ── KIT-6 · the --cw-circle-* tokens and jewelHost ─────────────────────── */

test("KIT-6 tokens: every cc- colour and font is a --cw-circle-* token, declared on .cc with the Spa value as fallback", () => {
  const names = ["ground-a", "ground-b", "btn", "btn-ink", "link", "ink", "ink-soft", "muted", "hair", "display-font", "label-font"];
  const block = /:where\(\.cc\) \{([\s\S]*?)\}/.exec(PORTAL_TOKENS_CSS)?.[1] ?? "";
  for (const n of names) assert.match(block, new RegExp(`--cw-circle-${n}: var\\(--cw-account-[a-z-]+, [^;]+\\);`), n);
  assert.match(block, /--cw-circle-btn: var\(--cw-account-circle-btn, #1f1c19\)/);
  assert.match(block, /--cw-circle-display-font: var\(--cw-account-display-font, "Trajan Pro", Georgia, serif\)/);
  // The parts read them, with the account token as their own fallback (a part outside any .cc draws as before).
  assert.match(PORTAL_RULES_CSS, /\.cc-btn \{[^}]*background: var\(--cw-circle-btn, var\(--cw-account-circle-btn\)\)/);
  assert.match(PORTAL_RULES_CSS, /\.cc-bal \{[^}]*font-family: var\(--cw-circle-display-font, var\(--cw-account-display-font\)\)/);
  assert.match(PORTAL_RULES_CSS, /\.cc-eyebrow \{[^}]*color: var\(--cw-circle-muted, var\(--cw-account-muted\)\)/);
  assert.doesNotMatch(PORTAL_RULES_CSS.replace(/\/\*[\s\S]*?\*\//g, ""), /var\(--cw-account-circle-btn\)\s*;/, "no part reads the account token alone any more");
});

test("KIT-6 jewelHost: the kit hydrates its slots through the host and releases them before it redraws", async () => {
  const calls = [];
  const jewelHost = { hydrate: (root) => calls.push(["hydrate", root]), release: (root) => calls.push(["release", root]) };
  const h = panelHarness();
  mountAccountPanel(h.doc, { fetchImpl: h.fetchImpl, circle: true, jewelHost });
  h.doc.click(h.mark);
  await settle(40);
  assert.equal(calls.filter((c) => c[0] === "hydrate").length, 1, "her Card's slots were handed to the host");
  // Close and open again: the first set is released before the panel's HTML is replaced.
  h.doc.click(h.mark);
  h.doc.click(h.mark);
  await settle(40);
  assert.ok(calls.some((c) => c[0] === "release"), "released before the redraw");
  // Without a host or a loader nothing is called (the flat marks stay).
  const plain = panelHarness();
  mountAccountPanel(plain.doc, { fetchImpl: plain.fetchImpl, circle: true });
  plain.doc.click(plain.mark);
  await settle(40);
  const { jewelHost: real } = await import("../dist/jewel/index.js");
  assert.equal(typeof real.hydrate, "function");
  assert.equal(typeof real.release, "function");
  const root = {};
  real.hydrate(root); // no DOM here: hydrates nothing, never throws
  real.release(root);
  real.release(root);
});
