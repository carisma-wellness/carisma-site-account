/**
 * ADDENDUM X11 — the words check (Carisma Circle v2, carisma-circle-v2-20261117).
 *
 * `test/fixtures/circle-v2-words.json` is ADD-V1's fixture, copied unchanged (sha256 8421daa5…, checked with
 * `gen_words.cjs --check`): for every member state of the design of record (circle-spa-rollout-2026-11-17 `kit.js`
 * CK.S on `scenario.js`), the BE-1-shaped `/client/loyalty/me` body and every sentence the design draws for it,
 * byte for byte. This suite feeds each body to the KIT'S OWN readers and builders (the ones the account pages and
 * the menu draw with) and compares the words exactly: no-break spaces (U+00A0) and the curly apostrophe included.
 * Then it runs every case again with every no-break space in the inputs turned into a plain space (BE-1 sends plain
 * spaces until BE-m): the kit must still say the design's words.
 *
 * Compared: the balance, points, reading, level, gap, a level on its way (the server's sentence), the credit moment
 * for each set of houses, the dated part, the ending-soon sentence, the action; the level track (head, caption both
 * ends, aria, the unlock list and line); what her credit buys (eyebrow, title, figure); the header chip (label,
 * figure); the Hero (level, balance, reading, next step, action, conditions for each set of houses, the earned
 * conditions); the menu Card (level, balance, reading, action); the conditions lines; and per level the label,
 * benefits, unlocks, unlock line and ladder rung.
 *
 * Deliberate differences, named (never silently skipped):
 *  - DESIGN_CHECKS: the fixture's own list of places where `kit.js`'s action breaks the design's rule; the kit says
 *    the rule there (affordable → "Use my credit", else "Book a visit"), as the fixture asks a product to.
 *  - With every perk live (the unsuffixed keys): the kit leaves early access out of the unlock and benefit lists
 *    (it reaches only offers opened in the account, never the website's offer pages or Klaviyo: RECONCILED Q5, the WEB
 *    review's M15) and says "No deposit on treatments that earn points, when you book by phone, by message or at the desk" for "No deposit to book" (BRIEF D7:
 *    online keeps its payment). With BE-i's default (no perk live) the words are identical.
 * Not drawn by the kit (another product's words: the Spa site's earn lines and pay-step rows, the thank-you page's
 * rows, letters and the app): S.gain, S.now, S.nextUp, S.first, S.earn*, S.next(*), S.act(level|earned|pending),
 * S.pending(tomorrow), track.head(tomorrow), row.*, line.*, card.next*, card.cond*, card.btn(earned),
 * hero.next(earned), S.join, and the level-up words (S.reached, S.rateNow, S.rateFromToday).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CONDITIONS_EARNED,
  TERMS_JOIN,
  actionText,
  benefitsList,
  circleChipHTML,
  circleHeroHTML,
  circleLadderHTML,
  circleOnItsWayText,
  circlePanelRowHTML,
  circleRewardsHTML,
  circleSummaryOf,
  circleTrackHTML,
  conditionsText,
  creditText,
  datedText,
  expiringText,
  gainText,
  levelSentenceText,
  memberRate,
  nextPerksOf,
  ownPerksOf,
  pointsText,
  readCircle,
  readingText,
  unlockLineText,
  unlocksList,
} from "../dist/ui/index.js";

const FIX = JSON.parse(readFileSync(new URL("./fixtures/circle-v2-words.json", import.meta.url), "utf8"));
const NB = " ";

/* ── reading the kit's HTML back as words (tags off, entities decoded, NB and ’ kept) ── */
function text(html) {
  return String(html ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
function first(html, re) {
  const m = re.exec(html);
  return m ? text(m[1]) : null;
}
function all(html, re) {
  return [...html.matchAll(re)].map((m) => text(m[1]));
}
/** Every string in a value with U+00A0 → " " (the BE-1-today run). */
function plainInputs(v) {
  if (typeof v === "string") return v.replace(/ /g, " ");
  if (Array.isArray(v)) return v.map(plainInputs);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plainInputs(x)]));
  return v;
}
function withLive(v) {
  if (Array.isArray(v)) return v.map(withLive);
  if (v && typeof v === "object") {
    const o = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, withLive(x)]));
    if (o.live && typeof o.live === "object") o.live = { spaDays: true, earlyAccess: true, noDeposit: true };
    return o;
  }
  return v;
}

/** The design's day for a case ("Sun 15 Nov: …"), else the scenario's first day (Sat 14 Nov). */
const MONTH = { Nov: "11", Dec: "12" };
function caseNow(c) {
  const m = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\d{1,2}) (Nov|Dec)\b/.exec(c.about);
  const day = m ? `2026-${MONTH[m[2]]}-${m[1].padStart(2, "0")}` : "2026-11-14";
  return Date.parse(`${day}T10:00:00+01:00`);
}

/** The deliberate differences above, applied to the design's live-perk words. */
function kitLiveWords(list) {
  return (list ?? [])
    .filter((s) => !/^Sales and offers /.test(s))
    .map((s) => (s === "No deposit to book" ? "No deposit on treatments that earn points, when you book by phone, by message or at the desk" : s));
}

const CHECKED = new Map(FIX.designChecks.flatMap((d) => d.keys.map((k) => [`${d.case}|${k}`, d.rule])));
const want = (c, id, key) => (CHECKED.has(`${id}|${key}`) ? CHECKED.get(`${id}|${key}`) : c.text[key]);

/** What the fixture's rewards are, in the API's item shape (BE-2 §6): the server's figures and `affordable`. */
function rewardItems(r) {
  if (!r) return null;
  const item = (x, affordable) =>
    x && {
      brand: { name: "Carisma Spa", slug: "carisma-spa", house: "spa" },
      serviceId: `svc-${x.name}`,
      serviceOptionId: "",
      name: x.name,
      durationMinutes: Number(/^(\d+)/.exec(x.length)?.[1] ?? 0),
      fromCents: x.priceCents,
      fromPoints: x.points,
      affordable,
      imageUrl: null,
    };
  return { enabled: true, items: [item(r.now, true), item(r.next, false), item(r.dream, false)].filter(Boolean) };
}

const TERMS = "Terms";
const HOUSES = Object.keys(FIX.houses);

function checkCase(id, c, inputs, label) {
  const msg = (k) => `${label} · ${id} · ${k}`;
  const eq = (key, actual) => {
    if (!(key in c.text)) return;
    assert.deepEqual(actual ?? null, want(c, id, key) ?? null, msg(key));
  };
  const body = { ...inputs.me, ...(inputs.levelOnItsWay ? { levelOnItsWay: inputs.levelOnItsWay } : {}) };
  const m = readCircle(body);
  assert.ok(m, msg("the /me body reads live"));
  const now = caseNow(c);

  /* the sentences */
  eq("S.balance", creditText(m.creditCents));
  eq("S.points", pointsText(m.points));
  eq("S.reading", readingText(m, memberRate(m)));
  eq("S.level", m.level.label);
  eq("S.gap", levelSentenceText(m));
  eq("S.pending", circleOnItsWayText(m) || null);
  eq("S.useBy", datedText(m.datedEnds, m.pointsPerEuro) || null);
  eq("S.expiring", expiringText(m, now) || null);
  eq("S.act(spend)", actionText(m));
  for (const h of HOUSES) {
    if (inputs.gain) eq(`S.gainLong[${h}]`, gainText(inputs.gain.cents, FIX.houses[h], m.affordable));
  }

  /* the level track: as the account draws it (unlock list), as the menu draws it (one line), and with no head */
  const own = ownPerksOf(m);
  const unlocks = unlocksList(own, nextPerksOf(m), m.pointsPerEuro, m.earnPerEuro);
  const tin = { ...m, onItsWay: m.levelOnItsWay };
  const track = circleTrackHTML(tin, { unlocks });
  const caps = all(track, /<p class="cc-track-cap"[^>]*><span>([^<]*)<\/span><span>([^<]*)<\/span>/g);
  const capM = /<p class="cc-track-cap"[^>]*><span>([^<]*)<\/span><span>([^<]*)<\/span>/.exec(track);
  eq("track.head", first(track, /<p class="cc-track-h"[^>]*>([^<]*)<\/p>/));
  eq("track.capLeft", capM ? text(capM[1]) : null);
  eq("track.capRight", capM ? text(capM[2]) : null);
  const noHead = circleTrackHTML(tin, { unlocks, head: false });
  const capN = /<p class="cc-track-cap"[^>]*><span>([^<]*)<\/span><span>([^<]*)<\/span>/.exec(noHead);
  eq("track.capRight(noHead)", capN ? text(capN[2]) : null);
  eq("track.aria", first(track, /<div class="cc-bar"[^>]*aria-label="([^"]*)"/));
  assert.ok(caps.length <= 1, msg("one caption"));
  eq("track.unlocksEyebrow", first(track, /<div class="cc-unlocks"><p class="cc-eyebrow">([^<]*)<\/p>/));
  const ul = all(track, /<li>([^<]*)<\/li>/g);
  eq("track.unlocks(noPerksLive)", ul.length ? ul : null);
  const line = m.nextLevel ? unlockLineText(m.nextLevel.label, unlocks) : "";
  const lineTrack = circleTrackHTML(tin, { compact: true, unlockLine: line });
  eq("track.line(noPerksLive)", first(lineTrack, /<p class="cc-track-line">([^<]*)<\/p>/));

  /* every perk live: the design's words, with the two deliberate differences */
  const ml = readCircle(withLive(body));
  const liveUnlocks = unlocksList(ownPerksOf(ml), nextPerksOf(ml), ml.pointsPerEuro, ml.earnPerEuro);
  if ("track.unlocks" in c.text) {
    const expect = c.text["track.unlocks"] === null ? null : kitLiveWords(c.text["track.unlocks"]);
    assert.deepEqual(liveUnlocks.length ? liveUnlocks : null, expect, msg("track.unlocks (all perks live)"));
  }
  if ("track.line" in c.text) {
    assert.equal(ml.nextLevel ? unlockLineText(ml.nextLevel.label, liveUnlocks) || null : null, c.text["track.line"], msg("track.line (all perks live)"));
  }

  /* what her credit buys */
  const rw = rewardItems(inputs.rewards);
  if (rw) {
    const html = circleRewardsHTML(
      rw.items.map((x) => ({ ...x, brandName: x.brand.name, brandSlug: x.brand.slug, house: x.brand.house, imageUrl: "" })),
      m.points,
      { pointsPerEuro: m.pointsPerEuro },
    );
    const cards = [...html.matchAll(/<li class="cc-reward[^"]*">([\s\S]*?)<\/li>/g)].map((x) => x[1]);
    const byEyebrow = Object.fromEntries(cards.map((h) => [first(h, /<span class="cc-eyebrow">([^<]*)<\/span>/), h]));
    for (const [k, eyebrow] of [["now", "Yours now"], ["next", "Next up"], ["dream", "One day"]]) {
      const h = byEyebrow[eyebrow] ?? null;
      eq(`rewards.${k}.eyebrow`, h ? eyebrow : null);
      eq(`rewards.${k}.title`, h ? first(h, /<b>([^<]*)<\/b>/) : null);
      eq(`rewards.${k}.figure`, h ? first(h, /<span data-clarity-mask="True">([^<]*)<\/span>/) : null);
    }
  }

  /* the header chip */
  const chip = circleChipHTML(circleSummaryOf(m));
  eq("chip.aria", first(chip, /<span class="cw-vh">([^<]*)<\/span>/));
  eq("chip.text", first(chip, /<span class="cc-chip__bal">([^<]*)<\/span>/));

  /* the Hero, for every set of houses, and its earned conditions */
  for (const h of HOUSES) {
    const hero = circleHeroHTML({ ...m, brands: FIX.houses[h] }, { bookHref: "/book", termsHref: "#terms" });
    if (h === HOUSES[0]) {
      eq("hero.level", first(hero, /<p class="cc-level"[^>]*>([^<]*)<\/p>/));
      eq("hero.bal", first(hero, /<p class="cc-bal"[^>]*>([^<]*)<\/p>/));
      eq("hero.read", first(hero, /<p class="cc-read"[^>]*>([^<]*)<\/p>/));
      eq("hero.next", first(hero, /<p class="cc-next"[^>]*>([^<]*)<\/p>/));
      eq("hero.btn", first(hero, /<a class="cc-btn"[^>]*>([^<]*)<\/a>/));
    }
    eq(`hero.cond[${h}]`, first(hero, /<p class="cc-cond">([\s\S]*?)<\/p>/));
  }
  const earned = circleHeroHTML(m, { bookHref: "/book", termsHref: "#terms", conditions: "earned" });
  eq("hero.cond(earned)", first(earned, /<p class="cc-cond">([\s\S]*?)<\/p>/));

  /* the menu Card (board 11's top and its ONE pill) */
  const card = circlePanelRowHTML(circleSummaryOf(m), { bookHref: "/book", termsHref: "#terms" });
  eq("card.level", first(card, /<p class="cc-level"[^>]*>([^<]*)<\/p>/));
  eq("card.bal", first(card, /<p class="cc-bal"[^>]*>([^<]*)<\/p>/));
  const read = first(card, /<p class="cc-read"[^>]*>([\s\S]*?)<\/p>/);
  assert.ok(read === null || read.endsWith(`${TERMS_JOIN}${TERMS}`), msg("card.read ends with its Terms link"));
  eq("card.read", read === null ? null : read.slice(0, -`${TERMS_JOIN}${TERMS}`.length));
  eq("card.btn", first(card, /<a class="cc-btn"[^>]*>([^<]*)<\/a>/));
}

for (const [id, c] of Object.entries(FIX.cases)) {
  if (!c.inputs.me) continue;
  test(`X11 words · ${id} (${c.about.split(":")[0]}) — the design's words, byte for byte`, () => checkCase(id, c, c.inputs, "as given"));
  test(`X11 words · ${id} — the same words when the API sends plain spaces (BE-1 today)`, () =>
    checkCase(id, c, plainInputs(c.inputs), "plain spaces"));
}

test("X11 words · the guest: no member body, nothing drawn by the account kit", () => {
  const g = FIX.cases.guest;
  assert.equal(g.inputs.me, null);
  assert.equal(readCircle(g.inputs.me), null);
  assert.equal(circleHeroHTML(readCircle(g.inputs.me)), "");
  assert.equal(circleChipHTML(null), "");
});

test("X11 words · the conditions lines, for every set of houses", () => {
  for (const h of HOUSES) {
    assert.equal(`${conditionsText(FIX.houses[h])}${TERMS_JOIN}${TERMS}`, FIX.words.text[`S.cond[${h}]`], `S.cond[${h}]`);
  }
  assert.equal(`${CONDITIONS_EARNED}${TERMS_JOIN}${TERMS}`, FIX.words.text["S.condEarned"]);
});

test("X11 words · per level: label, benefits, unlocks, the unlock line and the ladder rung", () => {
  for (const run of ["as given", "plain spaces"]) {
    const me = run === "as given" ? FIX.cases.sun.inputs.me : plainInputs(FIX.cases.sun.inputs.me);
    const m = readCircle(me);
    const live = readCircle(withLive(me));
    const ladder = circleLadderHTML(m.levels, m.level, m.pointsPerEuro, { earnPerEuro: m.earnPerEuro });
    const rungs = [...ladder.matchAll(/<span class="cc-rung__t"><b>([^<]*)<\/b><span>([^<]*)<\/span><\/span>/g)].map((x) => [text(x[1]), text(x[2])]);
    for (const [L, lw] of Object.entries(FIX.levelWords)) {
      const i = Number(L) - 1;
      const at = (k) => `${run} · Level ${L} · ${k}`;
      assert.equal(m.levels[i].label, lw.text["S.level"], at("S.level"));
      assert.deepEqual(benefitsList(m.levels[i], m.pointsPerEuro, m.earnPerEuro), lw.text["benefits(noPerksLive)"], at("benefits(noPerksLive)"));
      assert.deepEqual(benefitsList(live.levels[i], live.pointsPerEuro, live.earnPerEuro), kitLiveWords(lw.text.benefits), at("benefits (all live)"));
      const prev = i > 0 ? m.levels[i - 1] : null;
      const un = prev ? unlocksList(prev, m.levels[i], m.pointsPerEuro, m.earnPerEuro) : null;
      assert.deepEqual(un, lw.text["unlocks(noPerksLive)"], at("unlocks(noPerksLive)"));
      assert.equal(un ? unlockLineText(m.levels[i].label, un) : null, lw.text["unlockLine(noPerksLive)"], at("unlockLine(noPerksLive)"));
      const unLive = i > 0 ? unlocksList(live.levels[i - 1], live.levels[i], live.pointsPerEuro, live.earnPerEuro) : null;
      assert.deepEqual(unLive, lw.text.unlocks === null ? null : kitLiveWords(lw.text.unlocks), at("unlocks (all live)"));
      assert.equal(unLive ? unlockLineText(live.levels[i].label, unLive) : null, lw.text.unlockLine, at("unlockLine (all live)"));
      assert.deepEqual(rungs[i], [lw.text["ladder.title"], lw.text["ladder.detail"]], at("ladder rung"));
    }
  }
});

test("X11 words · the fixture is ADD-V1's, unchanged, for the design of record the kit follows", () => {
  assert.equal(FIX.fixture, "circle-v2-words");
  // 21 Nov: the vault's regeneration for the Platinum ladder (kit.js + scenario.js renamed Level 4 Diamond / Level 5
  // Platinum; the desk's fixture carries the same file). Only level names moved.
  assert.equal(FIX.designOfRecord.kit.sha256, "d351a5688ee854f7209c0e4ba77cb04b6934327b9e5ca8144543885e9fd6548a");
  assert.equal(FIX.designOfRecord.scenario.sha256, "a6a907aaeb5721c3d4e40644d6f2ed6c110e97685816845deb5afecba7db8275");
  assert.ok(FIX.counts.total >= 800);
  // Every case with a member body was compared above (the guest has none).
  assert.equal(Object.values(FIX.cases).filter((c) => c.inputs.me).length, 11);
});

test("NEGATIVE CONTROL: one plain space where the design holds a no-break space is a difference", () => {
  const c = FIX.cases.sun;
  assert.notEqual(c.text["S.level"].replace(NB, " "), c.text["S.level"]);
  assert.throws(() => assert.equal(readCircle(c.inputs.me).level.label.replace(NB, " "), c.text["S.level"]));
  assert.throws(() => assert.equal("You've just received", "You’ve just received"), "a straight apostrophe is a difference");
});
