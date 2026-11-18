import { test } from "node:test";
import assert from "./fixtures/plain-assert.mjs";
import { readFileSync, readdirSync } from "node:fs";
import {
  CIRCLE_V2_QC,
  readCircle,
  readCircleState,
  readCircleSummary,
  readCircleSummaryState,
  readCircleStatus,
  readCirclePerks,
  readCircleRewards,
  readingText,
  endsText,
  expiringText,
  datedText,
  memberRate,
  pausedText,
  minorText,
  ageLineText,
  brandsLine,
  conditionsText,
  rateText,
  levelSentenceText,
  actionText,
  signInLineText,
  circleTrackHTML,
  paidLineText,
  unlocksList,
  unlockLineText,
  benefitsList,
  nextPerksOf,
  ownPerksOf,
  circleLadderHTML,
  circlePerksHTML,
  nextRewardText,
  circleHeroHTML,
  circlePanelStateHTML,
  circleOverviewMinorHTML,
  circleMinorViewHTML,
  circleOverviewHTML,
  circleViewHTML,
  bodyFor,
} from "../dist/index.js";
import { MARIA, MARIA_LIVE, LIVE_ALL, LEVELS_LIVE, SUMMARY, SUMMARY_ASKED, STATUS, PERKS, REWARDS, LEVELS, SPA_ONLY, THREE_BRANDS, LEFT, MINOR } from "./fixtures/circle-v2.mjs";

/**
 * Circle v2 (carisma-circle-v2-20261117): the kit reads the BE-1 / BE-2 answers
 * and every figure it prints comes from them. Level 1 = Pearl (BRIEF ERRATA);
 * the stone is the level KEY, never its number.
 */

test("the BE-1 / BE-2 sample answers parse; garbage and off read as null", () => {
  const m = readCircle(MARIA);
  assert.equal(m.level.key, "ruby");
  assert.equal(m.nextLevel.key, "sapphire");
  assert.equal(m.progressBp, 4200);
  assert.equal(m.levels.length, 5);
  assert.equal(m.member.number, "CC 1234 5678");
  assert.equal(m.minAge, 18);
  assert.equal(m.pointsPerEuro, 20);
  assert.deepEqual(m.brands, SPA_ONLY);
  const s = readCircleSummary(SUMMARY);
  assert.equal(s.creditCents, 7240);
  assert.equal(s.display, "€72.40 · 1,448 points");
  // BE-1's built summary sends no threshold (0 = unknown, never a figure); once the ask lands it is read.
  assert.equal(s.nextLevel.thresholdCents, 0);
  assert.equal(readCircleSummary(SUMMARY_ASKED).nextLevel.thresholdCents, 100000);
  const st = readCircleStatus(STATUS);
  assert.equal(st.levels[0].key, "pearl");
  assert.equal(st.levels[0].label, "Level 1 · Pearl");
  assert.equal(st.minAge, 18);
  assert.equal(st.actions.find((a) => a.key === "instagram").brands[0].url, "https://www.instagram.com/carismaspa/");
  assert.equal(readCirclePerks(PERKS).spaDays.left, 1);
  assert.equal(readCircleRewards(REWARDS).length, 4);
  for (const bad of [null, "x", [], { enabled: false }, { success: true, data: { enabled: false } }, { error: "not_found" }, { enabled: "true" }]) {
    assert.equal(readCircle(bad), null, JSON.stringify(bad));
    assert.equal(readCircleSummary(bad), null, JSON.stringify(bad));
    assert.equal(readCircleStatus(bad), null, JSON.stringify(bad));
    assert.equal(readCirclePerks(bad), null, JSON.stringify(bad));
    assert.equal(readCircleRewards(bad), null, JSON.stringify(bad));
  }
  assert.equal(readCircleStatus({ enabled: true, levels: [] }), null, "a status with no levels has nothing to show");
});

test("v1 keys never pick a stone; the stone is the key whatever the number says", () => {
  for (const key of ["first_light", "sunrise", "golden_hour", "moonlight", "starlight", "gold", ""]) {
    assert.equal(readCircle({ ...MARIA, level: { ...MARIA.level, key } }), null, key);
    assert.equal(readCircleSummary({ ...SUMMARY, level: { ...SUMMARY.level, key } }), null, key);
  }
  assert.equal(readCircle({ ...MARIA, level: { numeral: "III", name: "Ruby" } }), null, "a numeral alone is never a level");
  // A config that renumbers the levels keeps every stone on its key.
  const renumbered = readCircle({ ...MARIA, level: { key: "pearl", number: 2, name: "Pearl", label: "Level 2 · Pearl" }, nextLevel: null });
  assert.equal(renumbered.level.key, "pearl");
  assert.match(circleHeroHTML(renumbered), /data-gem="pearl"/);
  assert.equal(readCircle({ ...MARIA, level: { key: "ruby", number: 3, name: "Ruby" } }).level.label, "Level 3 · Ruby", "label built from number + name only when absent");
});

test("levelSentence passes through; at the top level the kept-until sentence is Malta's date", () => {
  const m = readCircle(MARIA);
  assert.equal(levelSentenceText(m), "€290 more this year to reach Level 4 · Sapphire");
  const top = readCircle({ ...MARIA, level: { ...LEVELS[4], heldUntil: "2027-12-31" }, nextLevel: null, levelSentence: "" });
  assert.equal(top.progressBp, 10000);
  assert.equal(levelSentenceText(top), "Our highest level, kept until 31 Dec 2027");
});

test("R5.4 states: below zero, under 18, paused, birthday credit ending, ready only when affordable", () => {
  const below = readCircle({ ...MARIA, credit: { points: -70, cents: -350, display: "−€3.50 · −70 points" }, affordable: true });
  assert.equal(below.belowZero, true);
  assert.equal(below.affordable, false, "a negative balance is never affordable");
  assert.equal(readingText(below), "70 points come off your next points — never charged");
  assert.equal(actionText(below), "Book a visit");
  assert.doesNotMatch(circleHeroHTML(below), /ready to use|Use my credit/);
  // Under 18: one line, nothing else, on the menu, the overview and the page.
  const minor = readCircleState(MINOR);
  assert.deepEqual(minor, { kind: "minor", minAge: 18 });
  assert.equal(readCircle(MINOR), null);
  assert.equal(minorText(18), "Carisma Circle starts at 18");
  for (const html of [circlePanelStateHTML(readCircleSummaryState(MINOR)), circleOverviewMinorHTML(minor), circleMinorViewHTML(minor), bodyFor("rewards", [MINOR])]) {
    assert.match(html, /Carisma Circle starts at 18/);
    assert.doesNotMatch(html, /€|points|Level \d|data-cw-jewel/);
  }
  // An email change pauses spending (Malta time).
  assert.equal(pausedText("2026-11-19T19:15:00Z"), "Paying with points is paused until Thu 19 Nov, 20:15");
  const paused = readCircle({ ...MARIA, member: { ...MARIA.member, spendPausedUntil: "2026-11-19T19:15:00Z" } });
  assert.match(circleHeroHTML(paused), /Paying with points is paused until Thu 19 Nov, 20:15/);
  // Birthday credit ending (ADDENDUM X4 + X5): the dated part under the balance; the ending-soon sentence only inside
  // the last notice window (14 days: Mon 30 Nov for Mon 7 Dec, never 22 days out). The Hero's ONE next step is the
  // level sentence (`CK.hero`), so the same figure never shows twice there.
  const bday = readCircle({ ...MARIA, pointsExpireKind: "birthday", datedEnds: { at: "2026-12-07", points: 400 } });
  assert.equal(endsText(bday), "", "no second line with the same figure");
  const nov30 = Date.parse("2026-11-30T10:00:00Z");
  const nov15 = Date.parse("2026-11-15T10:00:00Z");
  assert.equal(expiringText(bday, nov30), "Your €20.00 birthday credit ends Mon 7 Dec. Use it on a treatment before then.");
  assert.equal(expiringText(bday, nov15), "", "22 days out: the dated part says it, not the ending-soon sentence");
  assert.equal(expiringText(bday, Date.parse("2026-12-08T10:00:00Z")), "", "a day past the end: nothing");
  assert.equal(datedText(bday.datedEnds, bday.pointsPerEuro), "€20.00 of it until Mon 7 Dec");
  const bh = circleHeroHTML(bday);
  assert.match(bh, /cc-bal[^>]*>€72\.40<\/p><p class="cc-dated"[^>]*>€20\.00 of it until Mon 7 Dec<\/p><p class="cc-read"/, "X4: directly under the balance");
  assert.match(bh, /cc-next[^>]*>€290 more this year to reach Level 4 · Sapphire</, "the Hero's next step is the level's (board 10)");
  assert.equal((bh.match(/€20\.00/g) || []).length, 1, "the dated line only");
  // Left: never a figure.
  assert.equal(readCircleState(LEFT).kind, "left");
  assert.doesNotMatch(circlePanelStateHTML(readCircleSummaryState(LEFT)), /€|points/);
});

test("R5.2 brands from the API: one, two, three; a Spa-only config names no other brand", () => {
  assert.equal(brandsLine(SPA_ONLY), "Carisma Spa");
  assert.equal(brandsLine(THREE_BRANDS.slice(0, 2)), "Carisma Spa and Carisma Aesthetics");
  assert.equal(brandsLine(THREE_BRANDS), "Carisma Spa, Aesthetics and Slimming");
  assert.equal(brandsLine([]), "");
  assert.equal(conditionsText(SPA_ONLY), "For one whole treatment at Carisma Spa");
  const spaOnly = [circleOverviewHTML(readCircle(MARIA)), circleViewHTML({ me: readCircle(MARIA), activity: null, rewards: readCircleRewards(REWARDS), perks: readCirclePerks(PERKS) })].join("");
  assert.doesNotMatch(spaOnly, /Aesthetics|Slimming/);
  // Carisma Medical never joins, even if a stray row arrived.
  const withMed = readCircle({ ...MARIA, brands: [...SPA_ONLY, { house: "medical", brandId: "m", name: "Carisma Medical" }] });
  assert.deepEqual(withMed.brands, SPA_ONLY);
  assert.equal(R5_5(), "Carisma Circle is for people aged 18 and over");
  function R5_5() {
    return ageLineText(readCircleStatus(STATUS).minAge);
  }
});

test("the level track: her stone, the bar, the next stone; the caption; what the next level unlocks", () => {
  const m = readCircle(MARIA);
  assert.equal(paidLineText(m), "€710 of €1,000 paid this year");
  // BE-1's built summary sends no threshold: the caption is NOT invented (the menu fills it from /me).
  assert.equal(paidLineText(readCircleSummary(SUMMARY)), "", "no threshold on BE-1's summary → no caption, never €0 of €0");
  assert.equal(paidLineText(readCircleSummary(SUMMARY_ASKED)), "€710 of €1,000 paid this year", "once BE-1 sends it");
  // BE-1's real /me: perk VALUES from Ruby up, no `live` block → no perk is listed (ADDENDUM X2 / BE-i).
  const unlocks = unlocksList(ownPerksOf(m), nextPerksOf(m), m.pointsPerEuro);
  assert.deepEqual(unlocks, ["8.75% back in Carisma credit, up from 7.5%", "€35.00 birthday credit, up from €20.00"]);
  assert.equal(unlockLineText(m.nextLevel.label, unlocks), "Level 4 · Sapphire unlocks 8.75% back and €35.00 birthday credit");
  // Once BE-2 marks the Spa days live, the second free Spa day is listed.
  const ml = readCircle(MARIA_LIVE);
  const liveUnlocks = unlocksList(ownPerksOf(ml), nextPerksOf(ml), ml.pointsPerEuro);
  assert.deepEqual(liveUnlocks, ["8.75% back in Carisma credit, up from 7.5%", "A second free Spa day every year", "€35.00 birthday credit, up from €20.00"]);
  assert.equal(unlockLineText(ml.nextLevel.label, liveUnlocks), "Level 4 · Sapphire unlocks 8.75% back and a second free Spa day every year");
  const html = circleTrackHTML(m, { unlocks });
  assert.match(html, /data-gem="ruby" data-p="0\.420"[\s\S]*cc-bar[\s\S]*aria-valuenow="42"[\s\S]*data-gem="sapphire" data-p="0\.000"/);
  assert.match(html, /<span>€710 of €1,000 paid this year<\/span><span>Level 4 · Sapphire<\/span>/);
  assert.match(html, /Level 4 · Sapphire unlocks<\/p><ul><li>8\.75% back/);
  // Top level: the bar runs to the edge, no next stone, no caption.
  const top = readCircle({ ...MARIA, level: { ...LEVELS[4], heldUntil: "2027-12-31" }, nextLevel: null, levelSentence: "" });
  const topHtml = circleTrackHTML(top, { unlocks: unlocksList(ownPerksOf(top), nextPerksOf(top), 20) });
  assert.equal((topHtml.match(/data-cw-jewel/g) || []).length, 1);
  assert.match(topHtml, /aria-valuenow="100"/);
  assert.doesNotMatch(topHtml, /paid this year|unlocks/);
  // From the levels table when nextLevelPerks is absent; from her level's row when perks is absent.
  const noPerks = readCircle({ ...MARIA, perks: undefined, nextLevelPerks: undefined });
  assert.deepEqual(unlocksList(ownPerksOf(noPerks), nextPerksOf(noPerks), 20), unlocks);
  // The table's own `live` (a levels[] step) counts too; so does `step.perks.live`.
  const tableLive = readCircle({ ...MARIA, perks: undefined, nextLevelPerks: undefined, levels: LEVELS_LIVE });
  assert.deepEqual(unlocksList(ownPerksOf(tableLive), nextPerksOf(tableLive), 20), liveUnlocks);
  const nested = readCircle({ ...MARIA, perks: undefined, nextLevelPerks: undefined, levels: LEVELS.map((l) => ({ ...l, perks: { live: LIVE_ALL } })) });
  assert.deepEqual(unlocksList(ownPerksOf(nested), nextPerksOf(nested), 20), liveUnlocks);
  // Early access is left out of both lists until the CEO and the advocate word it (RECONCILED Q5, R5.7).
  assert.deepEqual(benefitsList(ownPerksOf(m), 20), ["7.5% back in Carisma credit", "€20.00 birthday credit"], "not live: rate + birthday only");
  assert.deepEqual(benefitsList(ownPerksOf(ml), 20), ["7.5% back in Carisma credit", "€20.00 birthday credit", "A free Spa day every year", "No deposit when you book by phone or at the desk"]);
  assert.deepEqual(
    unlocksList({ ...ownPerksOf(ml), earlyAccessHours: 0 }, { ...nextPerksOf(ml), earlyAccessHours: 72 }, 20).filter((u) => /early|hours/i.test(u)),
    [],
    "a bigger early-access window never reaches the unlock list",
  );
  // rules.earnPerEuro (BRIEF §9): the share back follows it, never a typed 1 point per €1.
  assert.equal(rateText(1.5, 20, 2), "15%");
  assert.equal(memberRate(readCircle({ ...MARIA, rules: { ...MARIA.rules, earnPerEuro: 2 } })), "15%");
  assert.equal(rateText(1.25, 20), "6.25%");
  assert.equal(rateText(2, 20), "10%");
});

test("the ladder: all five levels from the API's table, hers marked, every stone gold", () => {
  const html = circleLadderHTML(LEVELS.map((l) => readCircleStatus({ ...STATUS, levels: [l] }).levels[0]), readCircle(MARIA).level, 20);
  for (const l of LEVELS) assert.match(html, new RegExp(l.label));
  assert.match(html, /Level 1 · Pearl<\/b><span>When you join · 5% back/);
  assert.match(html, /Level 2 · Rose<\/b><span>€150 paid in a calendar year · 6\.25% back/);
  assert.match(html, /Level 5 · Diamond<\/b><span>€2,500 paid in a calendar year · 10% back/);
  assert.equal((html.match(/aria-current="step"/g) || []).length, 1);
  assert.equal((html.match(/data-k="icon"/g) || []).length, 5);
  assert.equal(circleLadderHTML([], null, 20), "");
});

test("perks: Spa days and no deposit from the read; early access ONLY with something upcoming (R5.7)", () => {
  const p = readCirclePerks(PERKS);
  // ADDENDUM X2 / BE-i: nothing switched on (her /me sent no live block) → no perk row at all.
  assert.equal(circlePerksHTML(p, { spaDayHref: "/spa-day" }), "", "not live → nothing");
  assert.equal(circlePerksHTML(p, { spaDayHref: "/spa-day", live: { spaDays: false, earlyAccess: false, noDeposit: false } }), "");
  const html = circlePerksHTML(p, { spaDayHref: "/spa-day", live: LIVE_ALL });
  assert.match(html, /1 free Spa day this year · 1 left/);
  assert.match(html, /href="\/spa-day">Book it/);
  assert.match(html, /No deposit when you book by phone or at the desk/);
  assert.doesNotMatch(html, /hours before everyone/, "no upcoming item → no early-access line");
  const soon = readCirclePerks({ ...PERKS, earlyAccess: { hours: 48, upcoming: [{ kind: "coupon", id: "c1", name: "Black Friday at Carisma Spa", brand: { slug: "carisma-spa" }, opensAt: "2026-11-27T08:00:00Z", opensAtForYou: "2026-11-25T08:00:00Z" }] } });
  assert.match(circlePerksHTML(soon, { live: LIVE_ALL }), /You see sales 48 hours before everyone[\s\S]*Black Friday at Carisma Spa · opens for you Wed 25 Nov, 09:00/);
  // One switch at a time: only the Spa days live → the Spa day row alone.
  const onlySpa = circlePerksHTML(soon, { spaDayHref: "/spa-day", live: { spaDays: true } });
  assert.match(onlySpa, /1 free Spa day this year/);
  assert.doesNotMatch(onlySpa, /hours before everyone|No deposit/);
  assert.equal(circlePerksHTML(readCirclePerks({ ...PERKS, spaDays: { entitlement: 0 }, noDeposit: { active: false } }), { live: LIVE_ALL }), "", "nothing worth a line → nothing");
  assert.equal(circlePerksHTML(null), "");
});

test("how close the next reward is (the pay step's row, R5.3)", () => {
  assert.equal(nextRewardText(readCircleRewards(REWARDS), 1448, 20), "€16.60 more and your points pay for Anti-Stress Massage, 55 min");
  assert.equal(nextRewardText(null, 1448, 20), "");
});

test("the sign-in line (R5.2, R5.5): brands and the email bonus from the status, the age line", () => {
  const line = signInLineText(readCircleStatus(STATUS));
  assert.deepEqual(line, {
    line: "Your Carisma account collects Carisma credit at Carisma Spa.",
    bonus: "+50 points when you sign in with your email",
    age: "Carisma Circle is for people aged 18 and over",
  });
  assert.equal(signInLineText(null), null);
});

test("no typed programme figure survives in the built kit; the v2 marker ships", () => {
  const dir = new URL("../dist/ui/", import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith(".js"));
  const all = files.map((f) => readFileSync(new URL(f, dir), "utf8")).join("\n");
  for (const typed of [/thresholdEur/, /\b1[,]?250\b/, /\b3[,]?000\b/, /First Light|Golden Hour|Moonlight|Starlight/, /DEFAULT_MIN_REDEEM_POINTS|DEFAULT_MAX_SHARE_PCT|GAP_NUDGE_MAX_CENTS|SHOP_FOOT/, /up to half/i]) {
    assert.doesNotMatch(all, typed, String(typed));
  }
  assert.equal(CIRCLE_V2_QC, "carisma-circle-v2-20261117");
  assert.match(readFileSync(new URL("circleCore.js", dir), "utf8"), /carisma-circle-v2-20261117/);
});
