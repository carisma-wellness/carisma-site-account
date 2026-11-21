import { test } from "node:test";
import strict from "node:assert/strict";
import assert from "./fixtures/plain-assert.mjs";
import { readFileSync } from "node:fs";
import {
  circleHeroHTML,
  circleOverviewHTML,
  circlePanelRowHTML,
  circleSummaryOf,
  circleTrackHTML,
  circleViewHTML,
  circleWaysCardsHTML,
  creditMoment,
  firstRewardGapCents,
  firstRewardText,
  liftPct,
  readCircle,
  readCircleActivity,
  readCirclePerks,
  readCircleRewards,
  readCircleStatus,
  readCircleSummary,
  readPointsBookings,
  signInLineText,
  spendable,
  underBalanceText,
  ON_HOLD_TEXT,
} from "../dist/index.js";
import { MARIA, SUMMARY_ASKED, STATUS, REWARDS } from "./fixtures/circle-v2.mjs";

/**
 * WEB-3 (Circle v2 UI/UX gap build, 19 Nov; audit rows W-1…W-6, W-13, W-16, W-20). Every new part reads a field BE-4
 * sends (local branch feat/circle-v2-be4-2154-784e, not on staging yet) and draws NOTHING without it; the W-20 block
 * parses the REAL staging answers recorded on 19 Nov (test/fixtures/circle-staging-2026-11-19.json).
 */
const NB = " ";
const STAGING = JSON.parse(readFileSync(new URL("./fixtures/circle-staging-2026-11-19.json", import.meta.url), "utf8")).doors;
const body = (door) => STAGING[door].body;

/** 23 Nov 2026 12:00 Malta: 14 days before Mon 7 Dec (inside the last notice window). */
const NOV23 = Date.parse("2026-11-23T11:00:00Z");
/** 1 Nov 2026: 36 days before (outside it). */
const NOV1 = Date.parse("2026-11-01T11:00:00Z");
const BIRTHDAY = { pointsExpireKind: "birthday", datedEnds: { at: "2026-12-07", points: 400 }, pointsExpireAt: "2026-12-07" };

/** `GET /client/loyalty/summary` as BE-4 builds it (loyalty.v2.controller.ts getMyLoyaltySummary @ 30988bdaa). */
const SUMMARY_BE4 = {
  ...SUMMARY_ASKED,
  ...BIRTHDAY,
  heldUntil: "2027-12-31",
  rules: { earnPerEuro: 1, pointsPerEuro: 20 },
  levelOnItsWay: null,
  pendingSpendCents: 0,
  rebookNext: null,
  onHold: false,
};

/* ── W-20: the real staging doors parse ─────────────────────────────────── */

test("W-20 /me (staging, BE-2): parses live; BE-4 fields absent → onHold false, hasPaidWithPoints/pending/rebook null", () => {
  strict.equal(STAGING.me.status, 200);
  const m = readCircle(body("me"));
  strict.ok(m, "the real /me reads live");
  strict.equal(m.level.key, "pearl");
  strict.equal(m.level.number, 1);
  strict.equal(m.creditCents, 500);
  strict.equal(m.affordable, false);
  strict.equal(m.onHold, false);
  strict.equal(m.hasPaidWithPoints, null);
  strict.equal(m.pendingSpendCents, null);
  strict.equal(m.rebookNext, null);
  strict.equal(m.endingSoonDays, null);
  // No hatch, no hold sentence, no first-reward words without BE-4's fields.
  const hero = circleHeroHTML(m, { bookHref: "/book", now: NOV23 });
  strict.doesNotMatch(hero, /cc-bar__lift|data-cw-circle="on-hold"|first reward/);
});

test("W-20 /summary (staging, BE-2): NO datedEnds / heldUntil / pointsExpireKind on the real door (W-3) → no dated line, no crash", () => {
  const raw = body("summary").data;
  for (const k of ["datedEnds", "heldUntil", "pointsExpireKind", "onHold", "levelOnItsWay", "pendingSpendCents"]) strict.ok(!(k in raw), `staging summary has no ${k}`);
  const s = readCircleSummary(body("summary"));
  strict.ok(s);
  strict.equal(s.datedEnds, null);
  strict.equal(s.heldUntil, "");
  strict.equal(s.pointsExpireKind, "");
  strict.equal(s.onHold, false);
  strict.equal(s.pendingSpendCents, null);
  const card = circlePanelRowHTML(s, { now: NOV23 });
  strict.doesNotMatch(card, /cc-dated|cc-bar__lift|on-hold/);
  assert.match(card, />Book a visit</);
});

test("W-20 perks / rewards / points-bookings / activity / public status / earn preview (staging) parse", () => {
  const perks = readCirclePerks(body("perks"));
  strict.ok(perks, "perks read");
  const rewards = readCircleRewards(body("rewards"));
  strict.ok(rewards && rewards.length >= 1, "featured read");
  strict.ok(rewards.every((r) => r.fromPoints > 0 && r.fromCents > 0 && r.affordable === false));
  strict.deepEqual(readPointsBookings(body("points-bookings")), []);
  const act = readCircleActivity(body("activity"), 20);
  strict.ok(act && act.items.length >= 1);
  strict.ok(act.items.every((i) => i.status && i.label && Number.isFinite(i.cents)));
  // Pilot mode: the public status is off for everyone (by design), so every signed-out part draws nothing.
  strict.equal(readCircleStatus(body("public-status")), null);
  strict.equal(signInLineText(readCircleStatus(body("public-status"))), null);
  const prev = body("earn-preview").data;
  strict.equal(prev.enabled, true);
  strict.ok(prev.points > 0 && prev.cents > 0);
  strict.ok(!("levelAfterVisit" in prev), "staging (BE-2) sends no levelAfterVisit: the pay step keeps the gap");
});

test("W-1 on the REAL staging member: €5.00, cheapest featured €25.00 → €20.00 gap only once hasPaidWithPoints:false is sent", () => {
  const rewards = readCircleRewards(body("rewards"));
  const m = readCircle(body("me"));
  strict.equal(firstRewardGapCents(m, rewards), 0, "absent hasPaidWithPoints: never a guess about her history");
  const be4 = readCircle({ ...body("me").data, hasPaidWithPoints: false });
  strict.equal(firstRewardGapCents(be4, rewards), 2000);
  assert.equal(firstRewardText(2000), "€20.00 more credit for your first reward");
});

/* ── W-1: short of a first reward ───────────────────────────────────────── */

test("W-1 firstRewardGapCents: only when she never paid with points, cannot afford one, and a featured read exists", () => {
  const items = readCircleRewards(REWARDS);
  const small = { hasPaidWithPoints: false, affordable: false, belowZero: false, creditCents: 325 };
  strict.equal(firstRewardGapCents(small, [{ fromCents: 1000 }, { fromCents: 2500 }]), 675);
  strict.equal(firstRewardGapCents({ ...small, hasPaidWithPoints: true }, items), 0);
  strict.equal(firstRewardGapCents({ ...small, hasPaidWithPoints: null }, items), 0);
  strict.equal(firstRewardGapCents({ ...small, affordable: true }, items), 0);
  strict.equal(firstRewardGapCents({ ...small, belowZero: true }, items), 0);
  strict.equal(firstRewardGapCents(small, null), 0);
  strict.equal(firstRewardGapCents(small, []), 0);
  strict.equal(firstRewardText(675), "€6.75 more credit for your first reward");
  strict.equal(firstRewardText(0), "");
});

test("W-1 creditMoment: a member short of her first reward is ONE quiet line (board 02), never the panel", () => {
  const m = readCircle({ ...MARIA, credit: { points: 65, cents: 325, display: "€3.25 · 65 points" }, affordable: false, hasPaidWithPoints: false });
  const first = creditMoment({ earnedCents: 325, earnedPoints: 65, member: m, hasExcludedLine: false, firstRewardGapCents: 675 });
  strict.equal(first.kind, "first");
  strict.equal(first.quiet, `€3.25 added to your Carisma credit${NB}· €6.75 more credit for your first reward`);
  strict.equal(first.hero, "");
  strict.equal(first.sentence, "");
  // Without the gap: the earned panel as before (control).
  strict.equal(creditMoment({ earnedCents: 325, earnedPoints: 65, member: m, hasExcludedLine: false }).kind, "earned");
  // A guest never gets the member's first-reward line (no balance on a guest page).
  strict.equal(creditMoment({ earnedCents: 325, earnedPoints: 65, member: null, hasExcludedLine: false, firstRewardGapCents: 675 }).kind, "received");
  // A line paid with points keeps its own quiet line.
  strict.equal(
    creditMoment({ earnedCents: 0, member: m, hasExcludedLine: false, paidWithPoints: { points: 500 }, firstRewardGapCents: 675 }).kind,
    "paid",
  );
});

/* ── W-2: the credit-ending sentence ────────────────────────────────────── */

test("W-2 underBalanceText: X5 inside the last notice window, the X4 dated part outside it; endingSoonDays from the API wins", () => {
  const m = { ...BIRTHDAY, pointsPerEuro: 20 };
  strict.deepEqual(underBalanceText(m, NOV23), {
    text: `Your €20.00 birthday credit ends Mon${NB}7${NB}Dec. Use it on a treatment before then.`,
    ending: true,
  });
  strict.deepEqual(underBalanceText(m, NOV1), { text: `€20.00 of it until Mon${NB}7${NB}Dec`, ending: false });
  // BE-4's rules.endingSoonDays: a 40-day window takes the 1 Nov reading into the ending-soon state.
  strict.equal(underBalanceText({ ...m, endingSoonDays: 40 }, NOV1).ending, true);
  // A balance lapse is never the birthday sentence.
  strict.equal(underBalanceText({ ...m, pointsExpireKind: "balance" }, NOV23).ending, false);
  strict.deepEqual(underBalanceText({ pointsExpireKind: "", datedEnds: null, pointsPerEuro: 20 }, NOV23), { text: "", ending: false });
});

test("W-2 Hero + menu Card: the sentence replaces the dated line in its window; the next step and the button stay the design's", () => {
  const m = readCircle({ ...MARIA, ...BIRTHDAY });
  const inWin = circleHeroHTML(m, { now: NOV23, bookHref: "/book" });
  strict.match(inWin, /<p class="cc-dated cc-ending"[^>]*>Your €20\.00 birthday credit ends Mon.7.Dec\. Use it on a treatment before then\.<\/p>/);
  strict.doesNotMatch(inWin, /of it until/, "never the same figure twice");
  strict.match(inWin, /<p class="cc-next"[^>]*>€290 more this year to reach Level.4.· Diamond<\/p>/, "hero.next = the gap (CK.hero)");
  strict.match(inWin, />Use my credit<\/a>/, "hero.btn = Use my credit (CK.hero, the words fixture)");
  const outWin = circleHeroHTML(m, { now: NOV1, bookHref: "/book" });
  strict.match(outWin, /<p class="cc-dated"[^>]*>€20\.00 of it until Mon.7.Dec<\/p>/);
  strict.doesNotMatch(outWin, /birthday credit ends/);
  // The menu Card reads the same fields from BE-4's summary (W-3).
  const s = readCircleSummary(SUMMARY_BE4);
  strict.match(circlePanelRowHTML(s, { now: NOV23 }), /cc-dated cc-ending[^>]*>Your €20\.00 birthday credit ends Mon.7.Dec\./);
  strict.match(circlePanelRowHTML(s, { now: NOV1 }), /<p class="cc-dated"[^>]*>€20\.00 of it until Mon.7.Dec<\/p>/);
});

/* ── W-3: the summary door's shape ──────────────────────────────────────── */

test("W-3 readCircleSummary reads BE-4's datedEnds / heldUntil (Malta days) / pointsExpireKind / rules", () => {
  const s = readCircleSummary(SUMMARY_BE4);
  strict.deepEqual(s.datedEnds, { at: "2026-12-07", points: 400 });
  strict.equal(s.heldUntil, "2027-12-31");
  strict.equal(s.pointsExpireKind, "birthday");
  strict.equal(s.pointsPerEuro, 20);
  strict.equal(readCircleSummary({ ...SUMMARY_BE4, pointsExpireKind: "garbage" }).pointsExpireKind, "");
  // /me → summary keeps the same fields (the account's own menu).
  const fromMe = circleSummaryOf(readCircle({ ...MARIA, ...BIRTHDAY, onHold: true, pendingSpendCents: 9000 }));
  strict.equal(fromMe.pointsExpireKind, "birthday");
  strict.equal(fromMe.onHold, true);
  strict.equal(fromMe.pendingSpendCents, 9000);
});

/* ── W-4: the level on its way + the hatched end ────────────────────────── */

const SAT_WAY = {
  level: { key: "sapphire", number: 4, name: "Diamond", label: "Level 4 · Diamond" },
  appointmentId: "appt-sat",
  startAt: "2026-11-21T09:00:00.000Z",
  sentence: "Saturday’s visit takes you to Level 4 · Diamond",
  pendingSpendCents: 31500,
};

test("W-4 menu: the summary's levelOnItsWay is the track head (BE-4 sends it there) + '€290 to go' + a hatch to the next stone", () => {
  const s = readCircleSummary({ ...SUMMARY_BE4, levelOnItsWay: SAT_WAY, pendingSpendCents: 31500 });
  strict.equal(s.levelOnItsWay.sentence, `Saturday’s visit takes you to Level${NB}4${NB}· Diamond`);
  const card = circlePanelRowHTML(s, { now: NOV1 });
  strict.match(card, /<p class="cc-track-h"[^>]*>Saturday’s visit takes you to Level.4.· Diamond<\/p>/);
  strict.match(card, /<span>€290 to go<\/span>/);
  // 4200 bp done → the hatch runs from 42% to the end (the visit crosses).
  strict.match(card, /<u class="cc-bar__lift" aria-hidden="true" style="left:42%;width:58%"><\/u>/);
  // A level on its way that is not her NEXT level never draws (stale answer).
  const stale = readCircleSummary({ ...SUMMARY_BE4, levelOnItsWay: { ...SAT_WAY, level: { key: "diamond", number: 5, name: "Platinum", label: "Level 5 · Platinum" } } });
  strict.equal(stale.levelOnItsWay, null);
});

test("W-4 liftPct: booked-not-paid spend from the API only, placed with her level's threshold; none without it", () => {
  // Ruby (from €500) → Diamond (€1,000), €710 paid this year (42%), €90 booked → the bar would reach 80%: 18% hatched.
  const t = {
    level: { key: "ruby", label: "Level 3 · Ruby" },
    nextLevel: { key: "sapphire", label: "Level 4 · Diamond", thresholdCents: 100000 },
    progressBp: 4200,
    toNextLevelCents: 29000,
    levelSentence: "",
    spendThisYearCents: 71000,
    levels: [{ key: "ruby", thresholdCents: 50000 }, { key: "sapphire", thresholdCents: 100000 }],
  };
  strict.equal(liftPct({ ...t, pendingSpendCents: 9000 }, 42), 18);
  strict.equal(liftPct({ ...t, pendingSpendCents: 900000 }, 42), 58, "never past the next stone");
  strict.equal(liftPct({ ...t, pendingSpendCents: 0 }, 42), 0);
  strict.equal(liftPct({ ...t, pendingSpendCents: null }, 42), 0);
  strict.equal(liftPct(t, 42), 0, "absent: no hatch, never local maths from her bookings");
  strict.equal(liftPct({ ...t, levels: undefined, pendingSpendCents: 9000 }, 42), 0, "no level table (the summary): no partial hatch");
  strict.equal(liftPct({ ...t, nextLevel: null, pendingSpendCents: 9000 }, 100), 0, "Level 5: no next stone, no hatch");
  const html = circleTrackHTML({ ...t, pendingSpendCents: 9000 });
  strict.match(html, /style="left:42%;width:18%"/);
  strict.match(circleOverviewHTML(readCircle({ ...MARIA, pendingSpendCents: 9000 }), { now: NOV1 }), /cc-bar__lift[^>]*width:18%/);
  strict.doesNotMatch(circleOverviewHTML(readCircle(MARIA), { now: NOV1 }), /cc-bar__lift/);
});

test("W-4 liftPct (review WEB-3 major #2): a level held over from last year, spend this year below its own threshold", () => {
  // Holds Ruby (from €500) from last year; €100 paid this year → the bar shows 0 (the backend clamps progressBp).
  const carried = {
    level: { key: "ruby", label: "Level 3 · Ruby" },
    nextLevel: { key: "sapphire", label: "Level 4 · Diamond", thresholdCents: 100000 },
    progressBp: 0,
    toNextLevelCents: 90000,
    levelSentence: "",
    spendThisYearCents: 10000,
    levels: [{ key: "ruby", thresholdCents: 50000 }],
  };
  strict.equal(liftPct({ ...carried, pendingSpendCents: 20000 }, 0), 0, "€300 after paying is still below Ruby's €500: the bar does not move");
  strict.equal(liftPct({ ...carried, pendingSpendCents: 50000 }, 0), 20, "€600 after paying: the bar moves to 20% (€100 of the €500 span)");
});

/* ── W-5: a review hold ─────────────────────────────────────────────────── */

test("W-5 onHold: the hold sentence under the balance on menu, Hero and Credit and rewards; never 'ready to use' or 'Use my credit'", () => {
  const held = readCircle({ ...MARIA, onHold: true });
  strict.equal(held.onHold, true);
  strict.equal(readCircle({ ...MARIA, member: { ...MARIA.member, onHold: true } }).onHold, true, "member.onHold too");
  strict.equal(spendable(held), false);
  const hero = circleHeroHTML(held, { bookHref: "/book", now: NOV1 });
  strict.match(hero, new RegExp(`data-cw-circle="on-hold">${ON_HOLD_TEXT}</p>`));
  strict.doesNotMatch(hero, /ready to use|Use my credit/);
  strict.match(hero, /href="\/book">Book a visit<\/a>/);
  const menu = circlePanelRowHTML(readCircleSummary({ ...SUMMARY_BE4, onHold: true }), { bookHref: "/book", now: NOV1 });
  strict.match(menu, /data-cw-circle="on-hold">Paying with points is on hold while we review your account<\/p>/);
  strict.doesNotMatch(menu, /ready to use|Use my credit/);
  const view = circleViewHTML({ me: held, activity: null, rewards: null, bookHref: "/book", now: NOV1 });
  strict.match(view, /data-cw-circle="on-hold"/);
  // Review WEB-3 major #3: the thank-you sentence never says "You can use it already." while on hold.
  const gainHeld = creditMoment({ earnedCents: 1190, earnedPoints: 238, member: held, hasExcludedLine: false });
  strict.equal(gainHeld.kind, "earned");
  strict.doesNotMatch(gainHeld.sentence, /use it already/);
  strict.match(creditMoment({ earnedCents: 1190, earnedPoints: 238, member: readCircle(MARIA), hasExcludedLine: false }).sentence, /You can use it already\./);
  // Minor #9: the menu builder itself leaves out "Yours now" while on hold (not only the host's late fill).
  const items = readCircleRewards(REWARDS);
  strict.doesNotMatch(circlePanelRowHTML(readCircleSummary({ ...SUMMARY_BE4, onHold: true }), { rewards: items, now: NOV1 }), /Yours now/);
  strict.match(circlePanelRowHTML(readCircleSummary(SUMMARY_BE4), { rewards: items, now: NOV1 }), /Yours now/);
  // Control: no hold → the reading and the action are the affordable ones.
  const free = circleHeroHTML(readCircle(MARIA), { bookHref: "/book", now: NOV1 });
  strict.doesNotMatch(free, /on-hold/);
  strict.match(free, /ready to use/);
  strict.match(free, />Use my credit<\/a>/);
});

/* ── W-6: the rebook card from BE-4's shape ─────────────────────────────── */

test("W-6 /me.rebookNext ({appointmentId, startAt, points, cents}, BE-4) draws the first 'More ways to earn' card", () => {
  const m = readCircle({ ...MARIA, rebookNext: { appointmentId: "a1", startAt: "2026-11-20T14:00:00.000Z", points: 119, cents: 595 } });
  const html = circleWaysCardsHTML(m);
  strict.match(html, /data-cw-circle-way="rebook"[\s\S]*Book your next visit before you leave[\s\S]*<b>\+€5\.95<\/b>.·.119.points[\s\S]*on Friday’s visit/);
  strict.equal(readCircleSummary({ ...SUMMARY_BE4, rebookNext: { appointmentId: "a1", startAt: "2026-11-20T14:00:00.000Z", points: 119, cents: 595 } }).rebookNext.points, 119);
  strict.doesNotMatch(circleWaysCardsHTML(readCircle({ ...MARIA, rebookNext: null })), /data-cw-circle-way="rebook"/);
});

/* ── W-13: the sign-in line, euro first ─────────────────────────────────── */

test("W-13 sign-in line: '+€2.50 · 50 points when you sign in with your email, once' at the status's own rate", () => {
  const line = signInLineText(readCircleStatus(STATUS));
  strict.equal(line.bonus, `+€2.50${NB}·${NB}50${NB}points when you sign in with your email, once`);
  // A different rate from the API moves the euro, never the typed 5 cents.
  const ten = signInLineText(readCircleStatus({ ...STATUS, rules: { ...STATUS.rules, pointsPerEuro: 10 } }));
  strict.equal(ten.bonus, `+€5.00${NB}·${NB}50${NB}points when you sign in with your email, once`);
  strict.equal(signInLineText(readCircleStatus({ ...STATUS, earning: { ...STATUS.earning, actions: [] } })).bonus, "");
});

/* ── W-16: Credit and rewards = the Overview's right column + the cards ── */

test("W-16 Credit and rewards: 'Your next level', the track, 'Your Level 3 · Ruby benefits', the More-ways cards, counsel's line", () => {
  const m = readCircle(MARIA);
  const view = circleViewHTML({ me: m, activity: null, rewards: null, now: NOV1 });
  strict.match(view, /data-cw-circle="your-level"><p class="cc-eyebrow">Your next level<\/p>/);
  strict.match(view, /<span>Your Level.3.· Ruby benefits<\/span><span class="cc-gives__until">until.31.Dec.2027<\/span>/);
  strict.match(view, /href="#levels">See all five levels<\/a>/, "the ladder is on this page");
  strict.match(view, /data-cw-circle-slot="rw-earn"><section [^>]*data-cw-circle="earn-cards"/);
  strict.match(view, /Every €1 you pay on eligible treatments at Carisma Spa earns credit too\./);
  strict.doesNotMatch(view, /data-cw-circle="earn"[ >]/, "the old list is gone from this page");
  // One track per block: the Hero says no next step of its own here.
  strict.equal((view.match(/class="cc cc-track/g) || []).length, 1);
  // Level 5: "Your level", no unlock list.
  const top = readCircle({ ...MARIA, level: { key: "diamond", number: 5, name: "Platinum", label: "Level 5 · Platinum", heldUntil: "2027-12-31" }, nextLevel: null, nextLevelPerks: null, levelSentence: "" });
  strict.match(circleViewHTML({ me: top, activity: null, rewards: null, now: NOV1 }), /<p class="cc-eyebrow">Your level<\/p>/);
  // The Overview's own panel is unchanged by the extraction.
  strict.match(circleOverviewHTML(m, { now: NOV1 }), /<div class="cc-dash__level"><p class="cc-eyebrow">Your next level<\/p>[\s\S]*href="\/account\/rewards#levels">See all five levels/);
});
