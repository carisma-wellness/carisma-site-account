/**
 * Carisma Circle v2 — the model, the readers and the words (carisma-circle-v2-20261117).
 *
 * Pure: every reader turns ONE backend answer into a model or `null`, and every
 * sentence is built from the answer. Nothing here is a programme figure typed
 * by hand (BRIEF §1.6): thresholds, multipliers, birthday credit, perks, action
 * points, the brands a member can use their points at and the minimum age all
 * come from the API (BE-1 §9, BE-2 §6). Shapes:
 *  - `GET /client/loyalty/me`       → `readCircle` / `readCircleState`
 *  - `GET /client/loyalty/summary`  → `readCircleSummary` (the nav balance; the session folds it)
 *  - `GET /public/loyalty/status`   → `readCircleStatus` (signed-out surfaces)
 *
 * THE ONE RULE (unchanged since v1): nothing renders unless the server said
 * `enabled: true`. Off, a 404, a 5xx, a timeout, an envelope around any of
 * those, a v1 answer (a level key that is not a gem) or anything else we do not
 * understand reads as `null`, and every builder draws "" for `null`.
 *
 * Words (design system v1 + the Spa rollout's ROUND 2; surfaces R5):
 *  - Euro first, then points ("€72.40 · 1,448 points"); credit two decimals.
 *  - The level is always "Level N · Name", from the API's `label`.
 *  - "ready to use" only when the server's `affordable` is true (BE-2 R2.9).
 *  - Brands are named from `brands[]` (R5.2), never "house".
 *  - Points pay ONE whole treatment at its full price (no part of a bill, no minimum).
 *  - Carisma Medical never shows any of it (`circleAllowedOn`).
 *  - Every personal figure carries `data-clarity-mask="True"` where it is drawn.
 */
import { escapeHtml } from "./html.js";
import { eur } from "./money.js";
import { unwrapEnvelope } from "./appointments.js";
import { asGemKey } from "./circleMark.js";
/** The v2 QC marker: present in the built kit, and in every v2 Circle node's `data-cw-qc`. */
export const CIRCLE_V2_QC = "carisma-circle-v2-20261117";
/** Kept for the attribute name only; v2 nodes carry `CIRCLE_V2_QC`. */
export const CIRCLE_QC = CIRCLE_V2_QC;
export const CIRCLE_HREF = "/account/rewards";
/**
 * The Carisma Circle terms, served by each Circle site at this path (a 308 to
 * the brand's `/terms-conditions#carisma-circle`). Every "Terms" beside a points
 * sentence links here. The terms text itself is not this kit's: it stays the
 * public v1.2 until a Maltese advocate approves v2 (BRIEF §1.12).
 */
export const CIRCLE_TERMS_HREF = "/carisma-circle/terms";
/** The fallback only: 20 points = €1, so a point is 5 cents. The API's `rules.pointsPerEuro` wins. */
export const CENTS_PER_POINT = 5;
/** Counsel's wording (terms v1.0 §3–§4, surface-consistency row 1), word for word: what never earns. */
export const PROMISE_QUALIFIER = "Medical treatments, consultations with a doctor, prescription-only medicines, fees and tips don't earn credit. A gift card someone bought earns for the person who uses it.";
/** Under every Ways to earn (surfaces §0): money earns; a public review, rating, post, tag or share never does. */
export const REVIEWS_FOOTNOTE = "We never give points for public reviews, ratings, posts, tags or shares.";
/** v1 name kept for sites that import it; the words are v2's. */
export const EARN_TERMS_LINE = REVIEWS_FOOTNOTE;
/** R5.4: a review hold (BE-3 `ON_HOLD`). */
export const ON_HOLD_TEXT = "Paying with points is on hold while we review your account";
/**
 * The pay-step disclosure. Counsel's wording (surface-consistency row 6; terms §12–§13: spent credit is never
 * taken from a refund, the balance goes below zero instead), word for word; still true in v2.
 */
export const PAY_STEP_DISCLOSURE = "If you cancel, the credit this booking gives you is removed. If you've already used it, your balance can go below zero. We never take it from your refund.";
const MALTA = "Europe/Malta";
export const M = 'data-clarity-mask="True"';
/* ── No-break spaces (ADDENDUM X8 / X11: the design's words, byte for byte) ── */
/**
 * The no-break space the design of record writes (`kit.js` NB): "Level 3 · Ruby" never breaks before its number,
 * "1,448 points" never leaves its figure, "Mon 7 Dec" stays one piece, " · Terms" never starts a line.
 */
export const NB = " ";
/**
 * The design's no-break rules applied to a sentence the API wrote (BE-1 sends plain spaces until BE-m): idempotent,
 * so a sentence that already carries them comes back unchanged.
 *  - "Level 4 · Sapphire" → "Level 4 · Sapphire" (it breaks only before the gem name);
 *  - "Fri 20 Nov" → "Fri 20 Nov"; "kept until 31 Dec 2027" → "kept until 31 Dec 2027";
 *  - "1,448 points" → "1,448 points".
 */
export function nbWords(s) {
    if (!s)
        return s;
    return s
        .replace(/\bLevel[  ]+(\d+)[  ]+·[  ]+/g, `Level${NB}$1${NB}· `)
        .replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[  ]+(\d{1,2})[  ]+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, `$1${NB}$2${NB}$3`)
        .replace(/\bkept until[  ]+(\d{1,2})[  ]+([A-Z][a-z]{2})[  ]+(\d{4})\b/g, `kept until${NB}$1${NB}$2${NB}$3`)
        .replace(/(\d)[  ]+(points?)\b/g, `$1${NB}$2`);
}
/** A short Malta day with its no-break spaces: "Mon 7 Dec" → "Mon 7 Dec" (any day text: spaces become NB). */
function nbDay(day) {
    return day.replace(/ /g, NB);
}
/** Nothing switched on: what an answer with no `live` block means (BE-1 today). */
export const PERKS_NOT_LIVE = Object.freeze({ spaDays: false, earlyAccess: false, noDeposit: false });
/* ── Reading the wire ──────────────────────────────────────────────────── */
export function obj(v) {
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
}
export function int(v, fallback = 0) {
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
    return Number.isFinite(n) ? Math.round(n) : fallback;
}
export function num(v, fallback = 0) {
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
    return Number.isFinite(n) ? n : fallback;
}
export function str(v) {
    return typeof v === "string" ? v : "";
}
function isoOrEmpty(v) {
    const s = str(v);
    return s && Number.isFinite(Date.parse(s)) ? s : "";
}
/**
 * The sites that may show the Circle: Carisma Spa, Carisma Aesthetics and Carisma Slimming ONLY (ADDENDUM KIT-6:
 * an allow-list, never "anything but Medical"). An unknown site ("" — localhost, an App Runner host), Carisma Hair
 * Clinic, Pulse and Carisma Medical are all false, so a host must name its brand (`siteBrand`) to show it.
 */
export function circleAllowedOn(siteBrand = "") {
    const s = String(siteBrand || "")
        .toLowerCase()
        .replace(/[^a-z]+/g, " ")
        .trim();
    if (!s || /\b(medical|hair|pulse)\b/.test(s))
        return false;
    return /^carisma (spa|aesthetics|slimming)\b/.test(s);
}
/** The three brands that join (the API's `house`); a brand row is one of them, never Carisma Medical. */
const CIRCLE_HOUSES = new Set(["spa", "aesthetics", "slimming"]);
/** A brand row from the API that may be named to a member: a Circle house, else (no house sent) an allowed name. */
function circleBrandRow(b) {
    const house = str(b.house);
    const name = str(b.name);
    if (/medical/i.test(name) || house === "medical")
        return false;
    return house ? CIRCLE_HOUSES.has(house) : circleAllowedOn(name);
}
/** A level from the wire, or null (no gem key = a v1 or unknown level: never guessed). */
export function levelFrom(raw) {
    const o = obj(raw);
    if (!o)
        return null;
    const key = asGemKey(o.key);
    const number = int(o.number);
    const name = str(o.name).trim();
    if (!key || number < 1 || !name)
        return null;
    // The design's label: "Level 3 · Ruby" (it breaks only before the gem name), from the API's words.
    const label = nbWords(str(o.label).trim() || `Level ${number} · ${name}`);
    return { key, number, name, label };
}
/**
 * ADDENDUM BE-c: `{level, appointmentId, startAt, sentence}` → the model, or null for anything less (the sentence
 * is the server's own, so without one nothing is drawn; never a sentence the kit makes up).
 */
export function levelOnItsWayFrom(raw) {
    const o = obj(raw);
    if (!o)
        return null;
    const level = levelFrom(o.level);
    const sentence = nbWords(str(o.sentence).trim());
    if (!level || !sentence)
        return null;
    return { level, appointmentId: str(o.appointmentId), startAt: isoOrEmpty(o.startAt), sentence };
}
/** ADDENDUM BE-j: `/me.referral` → the ladder, only while `payInPoints` is literally true and it carries a top. */
export function referralFrom(raw) {
    const o = obj(raw);
    if (!o || o.payInPoints !== true)
        return null;
    const ladder = (Array.isArray(o.ladder) ? o.ladder : [])
        .map(obj)
        .filter((s) => Boolean(s))
        .map((s) => ({ friend: Math.max(0, int(s.friend)), points: Math.max(0, int(s.points)), cents: Math.max(0, int(s.cents)) }))
        .filter((s) => s.friend > 0 && s.points > 0);
    const upToPoints = Math.max(0, int(o.upToPoints));
    const upToCents = Math.max(0, int(o.upToCents));
    if (!ladder.length || !upToPoints || !upToCents)
        return null;
    const link = str(o.link);
    return { ladder, upToPoints, upToCents, link: /^https:\/\//i.test(link) ? link : "" };
}
/** ADDENDUM BE-k: `/me.rebookNext` → the figure, or null (the server's own figure only). */
export function rebookNextFrom(raw) {
    const o = obj(raw);
    if (!o)
        return null;
    const points = Math.max(0, int(o.points));
    const cents = Math.max(0, int(o.cents));
    const startAt = isoOrEmpty(o.startAt);
    return points > 0 && cents > 0 && startAt ? { appointmentId: str(o.appointmentId), startAt, points, cents } : null;
}
/**
 * A place's own `live` block (`{spaDays, earlyAccess, noDeposit}`), else its `perks.live` (a `levels[]` step may
 * nest it), or null when the place sent none. Only a literal `true` switches a perk on.
 */
export function perksLiveFrom(raw) {
    const o = obj(raw);
    if (!o)
        return null;
    const live = obj(o.live) ?? obj(obj(o.perks)?.live);
    if (!live)
        return null;
    return { spaDays: live.spaDays === true, earlyAccess: live.earlyAccess === true, noDeposit: live.noDeposit === true };
}
/**
 * One perk set. `fallbackLive` is her own `/me.perks.live` for a place that sent no `live` block (the switches are
 * one setting each, so they hold for every level); with no fallback either, nothing is live.
 */
function perksFrom(raw, fallbackLive = null) {
    const o = obj(raw);
    if (!o)
        return null;
    return {
        multiplier: num(o.multiplier, 0),
        birthdayCreditCents: Math.max(0, int(o.birthdayCreditCents)),
        freeSpaDaysPerYear: Math.max(0, int(o.freeSpaDaysPerYear)),
        earlyAccessHours: Math.max(0, int(o.earlyAccessHours)),
        noDeposit: o.noDeposit === true,
        live: { ...(perksLiveFrom(o) ?? fallbackLive ?? PERKS_NOT_LIVE) },
    };
}
function levelRulesFrom(raw, fallbackLive = null) {
    if (!Array.isArray(raw))
        return [];
    const out = [];
    for (const r of raw) {
        const l = levelFrom(r);
        const p = perksFrom(r, fallbackLive);
        const o = obj(r);
        if (!l || !p || !o)
            continue;
        out.push({ ...l, ...p, thresholdCents: Math.max(0, int(o.thresholdCents)) });
    }
    return out.sort((a, b) => a.number - b.number);
}
/** The switched-on brands, never Carisma Medical (it never joins; this holds if a stray row ever arrived). */
export function brandsFrom(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw
        .map(obj)
        .filter((b) => Boolean(b && str(b.name)))
        .filter(circleBrandRow)
        .map((b) => ({ house: str(b.house), brandId: str(b.brandId), name: str(b.name) }));
}
function nextLevelFrom(raw, current) {
    const l = levelFrom(raw);
    const o = obj(raw);
    if (!l || !o || l.number <= current.number)
        return null;
    return { ...l, thresholdCents: Math.max(0, int(o.thresholdCents)) };
}
function pointsPerEuroFrom(o) {
    const r = obj(o.rules);
    const v = r ? int(r.pointsPerEuro) : 0;
    return v > 0 ? v : 100 / CENTS_PER_POINT;
}
/** Points per €1 paid before the level multiplier (`rules.earnPerEuro`, BRIEF §9 asks BE-1 to send it); 1 when absent. */
function earnPerEuroFrom(o) {
    const r = obj(o.rules);
    const v = r ? num(r.earnPerEuro, 0) : 0;
    return v > 0 ? v : 1;
}
/** BE-4 `pendingSpendCents` (top level, else inside `levelOnItsWay`): a whole number of cents ≥ 0, or null. */
function pendingSpendFrom(o) {
    const v = typeof o.pendingSpendCents === "number" ? o.pendingSpendCents : obj(o.levelOnItsWay)?.pendingSpendCents;
    return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
}
/** BE-4 `rules.endingSoonDays` (A-12), a positive whole number of days, or null. */
function endingSoonDaysFrom(o) {
    const v = obj(o.rules)?.endingSoonDays;
    return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : null;
}
function centsOf(rawCents, points, pointsPerEuro) {
    return int(rawCents, Math.round((points * 100) / pointsPerEuro));
}
function datedFrom(raw) {
    const o = obj(raw);
    if (!o)
        return null;
    const at = isoOrEmpty(o.at);
    const points = int(o.points);
    return at && points > 0 ? { at, points } : null;
}
/**
 * ADDENDUM X10: the second-brand and Full Circle rows only when two or more houses are switched on (a Spa-only
 * programme names no other brand and offers no purchase there). The first-brand bonus stays.
 */
const MULTI_BRAND_KEYS = new Set(["second_house", "full_circle"]);
function actionsFrom(raw, pointsPerEuro, housesOn = 3) {
    if (!Array.isArray(raw))
        return [];
    const out = [];
    for (const a of raw.map(obj)) {
        if (!a || !str(a.key) || !str(a.label))
            continue;
        const key = str(a.key);
        if (MULTI_BRAND_KEYS.has(key) && housesOn < 2)
            continue;
        const url = str(a.url);
        // An Instagram row exists only with its brand's own https profile (BE-1 R1.21: the item is omitted when null).
        if (key === "instagram" && !/^https:\/\//i.test(url))
            continue;
        if (str(a.house) === "medical")
            continue;
        const points = Math.max(0, int(a.points));
        out.push({
            id: str(a.id) || key,
            key,
            house: str(a.house),
            brandId: str(a.brandId),
            label: str(a.label),
            points,
            cents: Math.round((points * 100) / pointsPerEuro),
            done: a.done === true,
            url,
        });
    }
    return out;
}
/**
 * `/client/loyalty/me` (v2) → the model, or null when the programme is not
 * live for this member: `enabled` anything but `true`, left, minor, no credit
 * block, a level whose key is not a gem (a v1 answer), a non-object body.
 */
export function readCircle(body) {
    const o = obj(unwrapEnvelope(body));
    if (!o || o.enabled !== true || o.left === true || o.minor === true)
        return null;
    const credit = obj(o.credit);
    const level = levelFrom(o.level);
    if (!credit || !level)
        return null;
    const pointsPerEuro = pointsPerEuroFrom(o);
    const points = int(credit.points);
    const creditCents = centsOf(credit.cents, points, pointsPerEuro);
    const nextLevel = nextLevelFrom(o.nextLevel, level);
    const pending = obj(o.pending);
    const pendingPoints = pending ? Math.max(0, int(pending.points)) : 0;
    const awaiting = obj(o.awaitingEmail);
    const awaitingPoints = awaiting ? Math.max(0, int(awaiting.points)) : 0;
    const pass = obj(o.passport) ?? {};
    const passport = { spa: pass.spa === true, aesthetics: pass.aesthetics === true, slimming: pass.slimming === true, count: 0 };
    passport.count = [passport.spa, passport.aesthetics, passport.slimming].filter(Boolean).length;
    const brands = brandsFrom(o.brands);
    const sent = Array.isArray(o.actions) ? o.actions.length : 0;
    // X10: with fewer than two houses on, the second-brand and Full Circle rows are dropped (brands unknown = keep).
    const actions = actionsFrom(o.actions, pointsPerEuro, Array.isArray(o.brands) ? brands.length : 3);
    // The server's "3 of 6 done" counts every row it sent; when a row was dropped here, count what is drawn.
    const summary = actions.length === actionsFrom(o.actions, pointsPerEuro).length || !sent ? obj(o.actionsSummary) : null;
    const member = obj(o.member) ?? {};
    const card = obj(o.card) ?? {};
    const kind = str(o.pointsExpireKind);
    const exp = obj(o.expiring);
    const minAge = int(o.minAge);
    /* BE-i: her own `/me.perks.live` holds for every level that sent no `live` block of its own. */
    const ownLive = perksLiveFrom(o.perks);
    return {
        points,
        creditCents,
        display: str(credit.display).trim() || `${creditText(creditCents)} · ${pointsText(points)}`,
        affordable: o.affordable === true && points > 0,
        belowZero: points < 0,
        level,
        nextLevel,
        levelSentence: nbWords(str(o.levelSentence).trim()),
        progressBp: nextLevel ? Math.max(0, Math.min(10000, int(o.progressBp))) : 10000,
        spendThisYearCents: Math.max(0, int(o.spendThisYearCents)),
        toNextLevelCents: nextLevel ? Math.max(0, int(o.toNextLevelCents)) : 0,
        heldUntil: str(obj(o.level)?.heldUntil),
        levels: levelRulesFrom(o.levels, ownLive),
        perks: perksFrom(o.perks),
        nextLevelPerks: nextLevel ? perksFrom(o.nextLevelPerks, ownLive) : null,
        brands,
        minAge: minAge > 0 ? minAge : null,
        brandBonusMinCents: Math.max(0, int(o.brandBonusMinCents)),
        pointsPerEuro,
        earnPerEuro: earnPerEuroFrom(o),
        pendingPoints,
        pendingCents: pending ? centsOf(pending.cents, pendingPoints, pointsPerEuro) : 0,
        awaitingEmail: awaiting && awaitingPoints > 0 ? { points: awaitingPoints, cents: centsOf(awaiting.cents, awaitingPoints, pointsPerEuro) } : null,
        pointsExpireAt: str(o.pointsExpireAt) || str(exp?.date),
        pointsExpireKind: kind === "balance" || kind === "birthday" ? kind : "",
        balanceLapse: datedFrom(o.balanceLapse),
        datedEnds: datedFrom(o.datedEnds),
        passport,
        fullCircleAt: str(o.fullCircleAt),
        actions,
        actionsDone: summary ? Math.max(0, int(summary.done)) : actions.filter((a) => a.done).length,
        actionsOf: summary ? Math.max(0, int(summary.of)) : actions.length,
        actionsLeftPoints: summary
            ? Math.max(0, int(summary.leftPoints))
            : actions.filter((a) => !a.done).reduce((s, a) => s + a.points, 0),
        member: {
            number: str(member.number) || str(card.memberNumber),
            emailVerified: member.emailVerified === true,
            spendPausedUntil: isoOrEmpty(member.spendPausedUntil),
            // BE-2 sends the Malta day (YYYY-MM-DD); a bare year is read too. Anything else: not sent.
            since: /^\d{4}(?:-\d{2}-\d{2})?$/.test(str(member.since)) ? str(member.since) : "",
        },
        // A level on its way is about the NEXT level only (a stale or wrong level never draws).
        levelOnItsWay: (() => {
            const w = nextLevel ? levelOnItsWayFrom(o.levelOnItsWay) : null;
            return w && w.level.key === nextLevel?.key ? w : null;
        })(),
        savedThisYearCents: typeof o.savedThisYearCents === "number" && o.savedThisYearCents >= 0 ? Math.round(o.savedThisYearCents) : null,
        referral: referralFrom(o.referral),
        rebookNext: rebookNextFrom(o.rebookNext),
        onHold: o.onHold === true || obj(o.member)?.onHold === true,
        hasPaidWithPoints: typeof o.hasPaidWithPoints === "boolean" ? o.hasPaidWithPoints : null,
        pendingSpendCents: pendingSpendFrom(o),
        endingSoonDays: endingSoonDaysFrom(o),
    };
}
/** `/client/loyalty/me` → the left state, or null. Only a clean `enabled: true` + `left: true`. */
export function readCircleLeft(body) {
    const o = obj(unwrapEnvelope(body));
    if (!o || o.enabled !== true || o.left !== true)
        return null;
    return { leftAt: isoOrEmpty(o.leftAt) };
}
function minorFrom(body) {
    const o = obj(unwrapEnvelope(body));
    if (!o || o.enabled !== true || o.minor !== true)
        return null;
    const minAge = int(o.minAge);
    return { minAge: minAge > 0 ? minAge : null };
}
/** One read, four outcomes: live, left, minor (R5.4: one line only), or null (draw nothing). */
export function readCircleState(body) {
    const left = readCircleLeft(body);
    if (left)
        return { kind: "left", left };
    const minor = minorFrom(body);
    if (minor)
        return { kind: "minor", minAge: minor.minAge };
    const model = readCircle(body);
    return model ? { kind: "live", model } : null;
}
/** `/client/loyalty/summary` (or the session's folded `loyalty`) → the nav balance, or null. */
export function readCircleSummary(body) {
    const o = obj(unwrapEnvelope(body));
    if (!o || o.enabled !== true || o.left === true || o.minor === true)
        return null;
    const level = levelFrom(o.level);
    const bal = obj(o.balance) ?? obj(o.credit);
    if (!level || !bal)
        return null;
    const pointsPerEuro = pointsPerEuroFrom(o);
    const points = int(bal.points);
    const creditCents = centsOf(bal.cents, points, pointsPerEuro);
    const nextLevel = nextLevelFrom(o.nextLevel, level);
    return {
        level,
        nextLevel,
        points,
        creditCents,
        display: str(bal.display).trim() || `${creditText(creditCents)} · ${pointsText(points)}`,
        affordable: o.affordable === true && points > 0,
        belowZero: points < 0,
        toNextLevelCents: nextLevel ? Math.max(0, int(o.toNextLevelCents)) : 0,
        progressBp: nextLevel ? Math.max(0, Math.min(10000, int(o.progressBp))) : 10000,
        levelSentence: nbWords(str(o.levelSentence).trim()),
        pointsExpireAt: str(o.pointsExpireAt),
        memberNumber: str(o.memberNumber),
        spendPausedUntil: isoOrEmpty(o.spendPausedUntil),
        pointsPerEuro,
        earnPerEuro: earnPerEuroFrom(o),
        datedEnds: datedFrom(o.datedEnds),
        heldUntil: str(o.heldUntil) || str(obj(o.level)?.heldUntil),
        spendThisYearCents: typeof o.spendThisYearCents === "number" && o.spendThisYearCents >= 0 ? Math.round(o.spendThisYearCents) : null,
        perks: perksFrom(o.perks),
        nextLevelPerks: nextLevel ? perksFrom(o.nextLevelPerks, perksLiveFrom(o.perks)) : null,
        levelOnItsWay: (() => {
            const w = nextLevel ? levelOnItsWayFrom(o.levelOnItsWay) : null;
            return w && w.level.key === nextLevel?.key ? w : null;
        })(),
        pointsExpireKind: str(o.pointsExpireKind) === "balance" || str(o.pointsExpireKind) === "birthday" ? str(o.pointsExpireKind) : "",
        onHold: o.onHold === true,
        pendingSpendCents: pendingSpendFrom(o),
        rebookNext: rebookNextFrom(o.rebookNext),
        endingSoonDays: endingSoonDaysFrom(o),
    };
}
export function readCircleSummaryState(body) {
    const left = readCircleLeft(body);
    if (left)
        return { kind: "left", left };
    const minor = minorFrom(body);
    if (minor)
        return { kind: "minor", minAge: minor.minAge };
    const summary = readCircleSummary(body);
    return summary ? { kind: "live", summary } : null;
}
/** A member model is a summary too (the account page has the full read; the menu needs only these). */
export function summaryOf(m) {
    return {
        level: m.level,
        nextLevel: m.nextLevel,
        points: m.points,
        creditCents: m.creditCents,
        display: m.display,
        affordable: m.affordable,
        belowZero: m.belowZero,
        toNextLevelCents: m.toNextLevelCents,
        progressBp: m.progressBp,
        levelSentence: m.levelSentence,
        pointsExpireAt: m.pointsExpireAt,
        memberNumber: m.member.number,
        spendPausedUntil: m.member.spendPausedUntil,
        pointsPerEuro: m.pointsPerEuro,
        earnPerEuro: m.earnPerEuro,
        datedEnds: m.datedEnds,
        heldUntil: m.heldUntil,
        spendThisYearCents: m.spendThisYearCents,
        perks: m.perks,
        nextLevelPerks: m.nextLevelPerks,
        levelOnItsWay: m.levelOnItsWay,
        pointsExpireKind: m.pointsExpireKind,
        onHold: m.onHold,
        pendingSpendCents: m.pendingSpendCents,
        rebookNext: m.rebookNext,
        endingSoonDays: m.endingSoonDays,
    };
}
/** `GET /public/loyalty/status` v2 → what a signed-out page may say, or null (off, v1, garbage). */
export function readCircleStatus(body) {
    const o = obj(unwrapEnvelope(body));
    if (!o || o.enabled !== true)
        return null;
    const levels = levelRulesFrom(o.levels);
    if (!levels.length)
        return null;
    const rules = obj(o.rules) ?? {};
    const earning = obj(o.earning) ?? {};
    const expiry = obj(o.expiry) ?? {};
    const pointsPerEuro = int(rules.pointsPerEuro) > 0 ? int(rules.pointsPerEuro) : 100 / CENTS_PER_POINT;
    const actions = (Array.isArray(earning.actions) ? earning.actions : [])
        .map(obj)
        .filter((a) => Boolean(a && str(a.key)))
        .map((a) => ({
        key: str(a.key),
        points: Math.max(0, int(a.points)),
        perBrand: a.perBrand === true,
        brands: (Array.isArray(a.brands) ? a.brands : [])
            .map(obj)
            .filter((b) => Boolean(b && /^https:\/\//i.test(str(b.url)) && str(b.house) !== "medical"))
            .map((b) => ({ house: str(b.house), brandId: str(b.brandId), url: str(b.url) })),
    }));
    const minAge = int(o.minAge);
    return {
        levels,
        pointsPerEuro,
        earnPerEuro: int(rules.earnPerEuro, 1),
        retailBoostPct: Math.max(0, int(earning.retailBoostPct)),
        rebookSharePct: Math.max(0, int(earning.rebookSharePct)),
        brandBonusPoints: (Array.isArray(earning.brandBonusPoints) ? earning.brandBonusPoints : []).map((n) => int(n)).filter((n) => n > 0),
        brandBonusMinCents: Math.max(0, int(earning.brandBonusMinCents)),
        actions,
        expiry: {
            inactiveMonths: Math.max(0, int(expiry.inactiveMonths)),
            noticeDaysBefore: (Array.isArray(expiry.noticeDaysBefore) ? expiry.noticeDaysBefore : []).map((n) => int(n)).filter((n) => n > 0),
            birthdayUseByDays: Math.max(0, int(expiry.birthdayUseByDays)),
        },
        brands: brandsFrom(o.brands),
        minAge: minAge > 0 ? minAge : null,
    };
}
/* ── Money and dates ───────────────────────────────────────────────────── */
/** "€62.00" — credit is always two decimals; below zero "−€3.50". */
export function creditText(cents) {
    const c = Number.isFinite(cents) ? cents : 0;
    return c < 0 ? `−${eur(Math.abs(c) / 100)}` : eur(c / 100);
}
/** "1,240 points" / "1 point" — the figure and its word never part (a no-break space, the design's `CK.S.points`). */
export function pointsText(points) {
    const n = Math.round(Number.isFinite(points) ? points : 0);
    return `${n.toLocaleString("en-GB")}${NB}point${Math.abs(n) === 1 ? "" : "s"}`;
}
/** One figure, euro first: "€65.00 · 1,300 points", never broken inside (the design's reward and earn figures). */
export function creditPointsText(cents, points) {
    return `${creditText(cents)}${NB}·${NB}${pointsText(points)}`;
}
/** "€40" — level-spend euros are whole and rounded UP (never undersell a gap). */
export function wholeEuroUp(cents) {
    const whole = Math.ceil(Math.max(0, cents) / 100);
    return `€${whole.toLocaleString("en-GB")}`;
}
/** "€960" — paid this year, whole euros rounded DOWN (never oversell progress). */
export function wholeEuroDown(cents) {
    const whole = Math.floor(Math.max(0, cents) / 100);
    return `€${whole.toLocaleString("en-GB")}`;
}
/** Points → their euro value at the programme's rate: "€21.00". */
export function pointsEuroText(points, pointsPerEuro) {
    const ppe = pointsPerEuro > 0 ? pointsPerEuro : 100 / CENTS_PER_POINT;
    return creditText(Math.round((points * 100) / ppe));
}
/**
 * "7.5%" — what a level gives back: points per €1 (`earnPerEuro`, 1 when the API does not say) × the level
 * multiplier × (100 / points per euro) percent of every euro paid.
 */
export function rateText(multiplier, pointsPerEuro, earnPerEuro = 1) {
    const per = earnPerEuro > 0 ? earnPerEuro : 1;
    if (!(multiplier > 0) || !(pointsPerEuro > 0))
        return "";
    const pct = Math.round(((per * multiplier * 100) / pointsPerEuro) * 100) / 100;
    return `${pct.toLocaleString("en-GB", { maximumFractionDigits: 2 })}%`;
}
function fmt(iso, o) {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms))
        return "";
    try {
        return new Intl.DateTimeFormat("en-GB", { timeZone: MALTA, ...o }).format(new Date(ms));
    }
    catch {
        return "";
    }
}
/** A calendar day (YYYY-MM-DD) or an instant → "7 Dec" in Malta. Days are read as Malta days, never shifted. */
export function maltaDayShort(iso) {
    const day = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso;
    return fmt(day, { day: "numeric", month: "short" });
}
/** "31 Dec 2027". */
export function maltaDayLong(iso) {
    const day = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso;
    return fmt(day, { day: "numeric", month: "short", year: "numeric" });
}
/** "Mon 7 Dec" in Malta (a calendar day is read as that Malta day). */
export function maltaDayWeek(iso) {
    const day = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso;
    return fmt(day, { weekday: "short", day: "numeric", month: "short" });
}
/** "five" for 5 (the level count printed in words, from `levels.length`); digits past ten. */
export function countWord(n) {
    const w = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n];
    return w ?? String(n);
}
/** "Thu 19 Nov, 20:15" in Malta. */
export function maltaWhen(iso) {
    const d = fmt(iso, { weekday: "short", day: "numeric", month: "short" });
    const t = fmt(iso, { hour: "2-digit", minute: "2-digit", hour12: false });
    return d && t ? `${d}, ${t}` : d;
}
/* ── The words ─────────────────────────────────────────────────────────── */
/**
 * R5.2 — the brands a member can use their points at, from `brands[]`:
 * one → "Carisma Spa"; two → "Carisma Spa and Carisma Aesthetics";
 * three → "Carisma Spa, Aesthetics and Slimming". "" when none is known.
 */
export function brandsLine(brands) {
    const names = brands.map((b) => b.name.trim()).filter(Boolean);
    if (names.length <= 1)
        return names[0] ?? "";
    if (names.length === 2)
        return `${names[0]} and ${names[1]}`;
    const short = (n) => n.replace(/^Carisma\s+/i, "");
    return `${names[0]}, ${names.slice(1, -1).map(short).join(", ")} and ${short(names[names.length - 1])}`;
}
/**
 * "For one whole treatment at Carisma Spa" (the conditions line, without its Terms link). In this line each brand's
 * full name keeps "Carisma" and its word together ("Carisma Spa, Aesthetics and Slimming"), as `CK.S.cond`.
 */
export function conditionsText(brands) {
    const line = brandsLine(brands).replace(/\bCarisma /g, `Carisma${NB}`);
    return line ? `For one whole treatment at ${line}` : "For one whole treatment";
}
/** On an earned moment: "For one whole treatment · Comes off if this booking is cancelled" (`CK.S.condEarned`). */
export const CONDITIONS_EARNED = `For one whole treatment${NB}·${NB}Comes off if this booking is cancelled`;
/** The joiner before a sentence's Terms link: " · " held to the words around it (`CK.S`'s NB·NB). */
export const TERMS_JOIN = `${NB}·${NB}`;
/** "Terms" as a link, or "" when the site has no terms page to point at. */
export function termsLinkHTML(href, label = "Terms") {
    return href ? `<a class="cw-link cc-link" href="${escapeHtml(href)}" data-cw-circle-terms>${escapeHtml(label)}</a>` : "";
}
/** A sentence with " · Terms" at its end (escaped). */
export function withTermsHTML(text, termsHref) {
    const t = termsLinkHTML(termsHref);
    return escapeHtml(text) + (t ? `${TERMS_JOIN}${t}` : "");
}
/**
 * R5.4: the reading under the balance. Below zero / nothing yet / ready to use / just the points. A review hold
 * (BE-4 `onHold`, W-5) never reads "ready to use": the hold sentence says why.
 */
export function readingText(m, rate = "") {
    if (m.belowZero)
        return `${pointsText(Math.abs(m.points))} come off your next points — never charged`;
    if (m.points === 0)
        return rate ? `${rate} back from your first visit` : "Every €1 you pay earns points";
    return m.affordable && m.onHold !== true ? `ready to use · ${pointsText(m.points)}` : pointsText(m.points);
}
/** The rate a member's level gives (from her perks), e.g. "7.5%". "" when not known. */
export function memberRate(m) {
    const mult = m.perks?.multiplier || m.levels.find((l) => l.key === m.level.key)?.multiplier || 0;
    return rateText(mult, m.pointsPerEuro, m.earnPerEuro);
}
/** The level sentence: the API's words, or at the top level "Our highest level, kept until 31 Dec 2027". */
export function levelSentenceText(m) {
    if (m.levelSentence)
        return nbWords(m.levelSentence);
    if (!m.nextLevel && m.heldUntil) {
        const d = maltaDayLong(m.heldUntil);
        return d ? `Our highest level, kept until${NB}${nbDay(d)}` : "";
    }
    return "";
}
/**
 * ADDENDUM X4: the dated part of her balance, directly under the balance it describes: "€20.00 of it until
 * Mon 7 Dec". "" when nothing in the balance is dated.
 */
export function datedText(d, pointsPerEuro) {
    if (!d || !(d.points > 0))
        return "";
    const day = maltaDayWeek(d.at);
    return day ? `${pointsEuroText(d.points, pointsPerEuro)} of it until ${nbDay(day)}` : "";
}
/**
 * When the ending-soon sentence takes over from the dated part: inside the LAST expiry notice before the day (the
 * programme sends them at 60 and 14 days, BE-1 `expiry.noticeDaysBefore`). The design draws it a week before
 * (Mon 30 Nov for a lot ending Mon 7 Dec) and the dated part 17 to 23 days before; a 14-day window agrees with every
 * state it draws, a 60-day one does not (ADD-V1 README "Expiry"). The public status sends the notice days
 * (`expiry.noticeDaysBefore`): a caller that has them passes the smallest; this is the fallback only.
 */
export const ENDING_SOON_DAYS = 14;
/**
 * ADDENDUM X5 (the rollout's `CK.S.expiring`): "Your €20.00 birthday credit ends Mon 7 Dec. Use it on a treatment
 * before then." — only while her birthday credit is the part that ends first AND it ends within `withinDays` Malta
 * days of `now`; "" otherwise (then the dated part under the balance says it, X4).
 */
export function expiringText(m, now = Date.now(), withinDays = ENDING_SOON_DAYS) {
    if (m.pointsExpireKind !== "birthday" || !m.datedEnds || !(m.datedEnds.points > 0))
        return "";
    const left = maltaDaysUntil(m.datedEnds.at, now);
    if (left === null || left < 0 || left > Math.max(0, withinDays))
        return "";
    const day = maltaDayWeek(m.datedEnds.at);
    return day
        ? `Your ${pointsEuroText(m.datedEnds.points, m.pointsPerEuro)} birthday credit ends ${nbDay(day)}. Use it on a treatment before then.`
        : "";
}
/** Whole Malta calendar days from `now` to a day (YYYY-MM-DD) or an instant; null when unreadable. */
export function maltaDaysUntil(iso, now = Date.now()) {
    const ymd = (ms) => {
        try {
            return new Intl.DateTimeFormat("en-CA", { timeZone: MALTA, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
        }
        catch {
            return "";
        }
    };
    const target = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : Number.isFinite(Date.parse(iso)) ? ymd(Date.parse(iso)) : "";
    const today = Number.isFinite(now) ? ymd(now) : "";
    if (!target || !today)
        return null;
    return Math.round((Date.parse(`${target}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
}
/** R5.4 + R1.14: the line under the balance that says what ends first. "" when nothing is close. */
export function endsText(m) {
    // Her birthday credit ending is the NEXT STEP (expiringText) and the dated part sits under the balance
    // (datedText): never the same figure twice.
    if (m.pointsExpireKind === "birthday")
        return "";
    if (m.balanceLapse && m.points > 0) {
        // A balance lapses up to 12 months out: the date always carries its year.
        const d = maltaDayLong(m.balanceLapse.at);
        return d ? `${pointsText(m.balanceLapse.points)} end on ${d} unless you visit or use points` : "";
    }
    return "";
}
/** "Paying with points is paused until Thu 19 Nov, 20:15" (an email change pauses spending 48 h). */
export function pausedText(untilIso) {
    const w = maltaWhen(untilIso);
    return w ? `Paying with points is paused until ${w}` : "";
}
/** R5.4 under-18: one line, nothing else. */
export function minorText(minAge) {
    return minAge ? `Carisma Circle starts at ${minAge}` : "Carisma Circle is for adults";
}
/** R5.5: "Carisma Circle is for people aged 18 and over" (+ Terms where drawn). */
export function ageLineText(minAge) {
    return minAge ? `Carisma Circle is for people aged ${minAge} and over` : "";
}
/** The CEO's sentence for an earned moment (R5.2, R5.4; `CK.S.gainLong`, the curly apostrophe included). */
export function gainText(earnedCents, brands, affordable) {
    const line = brandsLine(brands);
    return (`You’ve just received ${creditText(earnedCents)} in Carisma credit${line ? `, usable at ${line}` : ""}.` +
        (affordable ? " You can use it already." : ""));
}
/** "€11.90 · 238 points on the way when you pay". */
export function onTheWayText(cents, points) {
    return `${creditText(cents)} · ${pointsText(points)} on the way when you pay`;
}
/** "Paid with points · 2,180 points". */
export function paidWithPointsText(points) {
    return `Paid with points · ${pointsText(points)}`;
}
/** "Earns €5.45 · 109 points" — the server's earn figure for a treatment (public earn, Level 1 for a guest). */
export function earnsText(cents, points) {
    if (!(points > 0))
        return "";
    return `Earns ${creditText(cents)} · ${pointsText(points)}`;
}
/**
 * Her balance pays for a featured treatment AND she may spend it now: the server's `affordable`, not below zero, and
 * no review hold (BE-4 `onHold`, W-5). While on hold nothing says "ready to use" or "Use my credit".
 */
export function spendable(m) {
    return m.affordable && !m.belowZero && m.onHold !== true;
}
/** The ONE action under a Card or Hero. */
export function actionText(m) {
    return spendable(m) ? "Use my credit" : "Book a visit";
}
/**
 * W-1 (board 02 "Short of her first reward"; `CK.S.first`): what she still needs for her FIRST reward, in cents —
 * the cheapest featured treatment's price less her balance — or 0 when the state does not apply: the API has not
 * said she never paid with points (`hasPaidWithPoints` must be literally false), her balance already pays for one
 * (`affordable`), she is below zero, or there is no featured read.
 */
export function firstRewardGapCents(m, rewards) {
    if (m.hasPaidWithPoints !== false || m.affordable || m.belowZero || !rewards || !rewards.length)
        return 0;
    const cheapest = Math.min(...rewards.map((r) => r.fromCents).filter((c) => c > 0));
    if (!Number.isFinite(cheapest))
        return 0;
    return Math.max(0, cheapest - Math.max(0, m.creditCents));
}
/** "€6.75 more credit for your first reward" (`CK.S.first`); "" for a gap of 0. */
export function firstRewardText(gapCents) {
    return gapCents > 0 ? `${creditText(gapCents)} more credit for your first reward` : "";
}
/**
 * Beside every Rejoin: counsel's sentence (surface-consistency row 8, terms §13) with the retired level name
 * replaced by the API's first-level label ("Level 1 · Pearl", R5.1); without one, "the first level".
 */
export function rejoinNoteText(firstLevelLabel = "") {
    return (`If you rejoin, you start again at ${firstLevelLabel || "the first level"} with no credit. ` +
        "The credit you gave up when you left does not come back. If your balance was below zero when you left, that comes back too, unless it has been written off.");
}
/**
 * The sign-in dialog's line (R5.2, R5.5), live only: "Your Carisma account
 * collects Carisma credit at Carisma Spa." + "+€2.50 · 50 points when you sign
 * in with your email, once" (from the status's `verified_email` action). "" when off.
 */
export function signInLineText(status) {
    if (!status)
        return null;
    const line = brandsLine(status.brands);
    if (!line)
        return null;
    const email = status.actions.find((a) => a.key === "verified_email" && a.points > 0);
    return {
        line: `Your Carisma account collects Carisma credit at ${line}.`,
        // R5.2 vocabulary: the euro first, then the points, "once" (W-13): "+€2.50 · 50 points when you sign in with
        // your email, once"; the euro at the status's own rate (`rules.pointsPerEuro`).
        bonus: email
            ? `+${creditPointsText(Math.round((email.points * 100) / (status.pointsPerEuro > 0 ? status.pointsPerEuro : 100 / CENTS_PER_POINT)), email.points)} when you sign in with your email, once`
            : "",
        age: ageLineText(status.minAge),
    };
}
//# sourceMappingURL=circleCore.js.map