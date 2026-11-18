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
import { asGemKey, type CircleGemKey } from "./circleMark.js";

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
export const PROMISE_QUALIFIER =
  "Medical treatments, consultations with a doctor, prescription-only medicines, fees and tips don't earn credit. A gift card someone bought earns for the person who uses it.";
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
export const PAY_STEP_DISCLOSURE =
  "If you cancel, the credit this booking gives you is removed. If you've already used it, your balance can go below zero. We never take it from your refund.";

const MALTA = "Europe/Malta";
export const M = 'data-clarity-mask="True"';

/* ── Types ─────────────────────────────────────────────────────────────── */

export interface CircleLevelView {
  /** The stone: the API's `level.key`. */
  key: CircleGemKey;
  number: number;
  name: string;
  /** "Level 3 · Ruby" — the API's label (built from number + name only when absent). */
  label: string;
}

/**
 * Which level perks are switched ON (ADDENDUM X2 / BE-i: `perks.live {spaDays, earlyAccess, noDeposit}`, each
 * default false, one setting each). The perk VALUES above are sent whether or not a perk is live (BE-1 always
 * sends Ruby's free Spa day and no deposit), so a surface lists a Spa day, early access or no deposit ONLY while
 * its flag here is true. The rate and the birthday credit are not perks: they always show.
 */
export interface CirclePerksLive {
  spaDays: boolean;
  earlyAccess: boolean;
  noDeposit: boolean;
}

/** Nothing switched on: what an answer with no `live` block means (BE-1 today). */
export const PERKS_NOT_LIVE: Readonly<CirclePerksLive> = Object.freeze({ spaDays: false, earlyAccess: false, noDeposit: false });

export interface CirclePerkSet {
  multiplier: number;
  birthdayCreditCents: number;
  freeSpaDaysPerYear: number;
  earlyAccessHours: number;
  noDeposit: boolean;
  /** Which of the three perks are switched on (only a literal `true` from the API counts). */
  live: CirclePerksLive;
}

export interface CircleLevelRule extends CircleLevelView, CirclePerkSet {
  thresholdCents: number;
}

export interface CircleBrand {
  house: string;
  brandId: string;
  name: string;
}

export interface CircleAction {
  id: string;
  key: string;
  /** For a per-brand action (Instagram): the brand's house and id. */
  house: string;
  brandId: string;
  label: string;
  points: number;
  cents: number;
  done: boolean;
  /** Instagram: the brand's own profile. Without it the server sends no row (BE-1 R1.21). */
  url: string;
}

export interface CircleMember {
  /** "CC 1234 5678" — display only, never an authenticator (R1.25). */
  number: string;
  emailVerified: boolean;
  /** ISO instant while an email change pauses spending (48 h), else "". */
  spendPausedUntil: string;
}

export interface CircleModel {
  /** May be below zero (a refund of points already spent): never charged, recovered from future points. */
  points: number;
  creditCents: number;
  /** The API's balance face, "€72.40 · 1,448 points". */
  display: string;
  /** The server's own "this balance pays for a featured treatment" (BE-2); false when not sent. */
  affordable: boolean;
  belowZero: boolean;
  level: CircleLevelView;
  nextLevel: (CircleLevelView & { thresholdCents: number }) | null;
  levelSentence: string;
  /** 0..10000 of the way to the next level. */
  progressBp: number;
  spendThisYearCents: number;
  toNextLevelCents: number;
  heldUntil: string;
  levels: CircleLevelRule[];
  perks: CirclePerkSet | null;
  nextLevelPerks: CirclePerkSet | null;
  brands: CircleBrand[];
  minAge: number | null;
  brandBonusMinCents: number;
  pointsPerEuro: number;
  /** Points per €1 paid at Level 1 (the API's `rules.earnPerEuro`; 1 only as the fallback). */
  earnPerEuro: number;
  /** Booked, not yet paid. */
  pendingPoints: number;
  pendingCents: number;
  /** Points waiting for an email on the account (they land when one is added). */
  awaitingEmail: { points: number; cents: number } | null;
  pointsExpireAt: string;
  pointsExpireKind: "balance" | "birthday" | "";
  balanceLapse: { at: string; points: number } | null;
  datedEnds: { at: string; points: number } | null;
  passport: { spa: boolean; aesthetics: boolean; slimming: boolean; count: number };
  fullCircleAt: string;
  actions: CircleAction[];
  actionsDone: number;
  actionsOf: number;
  actionsLeftPoints: number;
  member: CircleMember;
}

export interface CircleLeftModel {
  /** ISO instant, or "" when the server did not say. */
  leftAt: string;
}

/** What the member read says: live, left, under the minimum age, or nothing to show (null). */
export type CircleState =
  | { kind: "live"; model: CircleModel }
  | { kind: "left"; left: CircleLeftModel }
  | { kind: "minor"; minAge: number | null };

/** The nav balance (`/client/loyalty/summary`): the read-model row, no ledger replay. */
export interface CircleSummary {
  level: CircleLevelView;
  nextLevel: (CircleLevelView & { thresholdCents: number }) | null;
  points: number;
  creditCents: number;
  display: string;
  affordable: boolean;
  belowZero: boolean;
  toNextLevelCents: number;
  progressBp: number;
  levelSentence: string;
  pointsExpireAt: string;
  memberNumber: string;
  spendPausedUntil: string;
  pointsPerEuro: number;
  /** Points per €1 paid before the multiplier (`rules.earnPerEuro` when the summary sends it; 1 only as the fallback). */
  earnPerEuro: number;
  /** "€20.00 of it until Mon 7 Dec": the soonest dated part of the balance (BE-1 R1.14), or null. */
  datedEnds: { at: string; points: number } | null;
  /** The last day she keeps her level (YYYY-MM-DD), or "". */
  heldUntil: string;
  /**
   * Paid this year, and the two perk rows, only when the summary sends them (BE-1's built summary does
   * not yet: BRIEF §9 ask). Without them the menu reads `/me` once for the unlock line and the caption.
   */
  spendThisYearCents: number | null;
  perks: CirclePerkSet | null;
  nextLevelPerks: CirclePerkSet | null;
}

export type CircleSummaryState =
  | { kind: "live"; summary: CircleSummary }
  | { kind: "left"; left: CircleLeftModel }
  | { kind: "minor"; minAge: number | null };

/** `GET /public/loyalty/status` v2: what a signed-out visitor may be told. */
export interface CircleStatus {
  levels: CircleLevelRule[];
  pointsPerEuro: number;
  earnPerEuro: number;
  retailBoostPct: number;
  rebookSharePct: number;
  brandBonusPoints: number[];
  brandBonusMinCents: number;
  actions: Array<{ key: string; points: number; perBrand: boolean; brands: Array<{ house: string; brandId: string; url: string }> }>;
  expiry: { inactiveMonths: number; noticeDaysBefore: number[]; birthdayUseByDays: number };
  brands: CircleBrand[];
  minAge: number | null;
}

/* ── Reading the wire ──────────────────────────────────────────────────── */

export function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
export function int(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.round(n) : fallback;
}
export function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}
export function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function isoOrEmpty(v: unknown): string {
  const s = str(v);
  return s && Number.isFinite(Date.parse(s)) ? s : "";
}

/**
 * The sites that may show the Circle: Carisma Spa, Carisma Aesthetics and Carisma Slimming ONLY (ADDENDUM KIT-6:
 * an allow-list, never "anything but Medical"). An unknown site ("" — localhost, an App Runner host), Carisma Hair
 * Clinic, Pulse and Carisma Medical are all false, so a host must name its brand (`siteBrand`) to show it.
 */
export function circleAllowedOn(siteBrand = ""): boolean {
  const s = String(siteBrand || "")
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim();
  if (!s || /\b(medical|hair|pulse)\b/.test(s)) return false;
  return /^carisma (spa|aesthetics|slimming)\b/.test(s);
}

/** The three brands that join (the API's `house`); a brand row is one of them, never Carisma Medical. */
const CIRCLE_HOUSES = new Set(["spa", "aesthetics", "slimming"]);

/** A brand row from the API that may be named to a member: a Circle house, else (no house sent) an allowed name. */
function circleBrandRow(b: Record<string, unknown>): boolean {
  const house = str(b.house);
  const name = str(b.name);
  if (/medical/i.test(name) || house === "medical") return false;
  return house ? CIRCLE_HOUSES.has(house) : circleAllowedOn(name);
}

/** A level from the wire, or null (no gem key = a v1 or unknown level: never guessed). */
export function levelFrom(raw: unknown): CircleLevelView | null {
  const o = obj(raw);
  if (!o) return null;
  const key = asGemKey(o.key);
  const number = int(o.number);
  const name = str(o.name).trim();
  if (!key || number < 1 || !name) return null;
  const label = str(o.label).trim() || `Level ${number} · ${name}`;
  return { key, number, name, label };
}

/**
 * A place's own `live` block (`{spaDays, earlyAccess, noDeposit}`), else its `perks.live` (a `levels[]` step may
 * nest it), or null when the place sent none. Only a literal `true` switches a perk on.
 */
export function perksLiveFrom(raw: unknown): CirclePerksLive | null {
  const o = obj(raw);
  if (!o) return null;
  const live = obj(o.live) ?? obj(obj(o.perks)?.live);
  if (!live) return null;
  return { spaDays: live.spaDays === true, earlyAccess: live.earlyAccess === true, noDeposit: live.noDeposit === true };
}

/**
 * One perk set. `fallbackLive` is her own `/me.perks.live` for a place that sent no `live` block (the switches are
 * one setting each, so they hold for every level); with no fallback either, nothing is live.
 */
function perksFrom(raw: unknown, fallbackLive: CirclePerksLive | null = null): CirclePerkSet | null {
  const o = obj(raw);
  if (!o) return null;
  return {
    multiplier: num(o.multiplier, 0),
    birthdayCreditCents: Math.max(0, int(o.birthdayCreditCents)),
    freeSpaDaysPerYear: Math.max(0, int(o.freeSpaDaysPerYear)),
    earlyAccessHours: Math.max(0, int(o.earlyAccessHours)),
    noDeposit: o.noDeposit === true,
    live: { ...(perksLiveFrom(o) ?? fallbackLive ?? PERKS_NOT_LIVE) },
  };
}

function levelRulesFrom(raw: unknown, fallbackLive: CirclePerksLive | null = null): CircleLevelRule[] {
  if (!Array.isArray(raw)) return [];
  const out: CircleLevelRule[] = [];
  for (const r of raw) {
    const l = levelFrom(r);
    const p = perksFrom(r, fallbackLive);
    const o = obj(r);
    if (!l || !p || !o) continue;
    out.push({ ...l, ...p, thresholdCents: Math.max(0, int(o.thresholdCents)) });
  }
  return out.sort((a, b) => a.number - b.number);
}

/** The switched-on brands, never Carisma Medical (it never joins; this holds if a stray row ever arrived). */
export function brandsFrom(raw: unknown): CircleBrand[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(obj)
    .filter((b): b is Record<string, unknown> => Boolean(b && str(b.name)))
    .filter(circleBrandRow)
    .map((b) => ({ house: str(b.house), brandId: str(b.brandId), name: str(b.name) }));
}

function nextLevelFrom(raw: unknown, current: CircleLevelView): (CircleLevelView & { thresholdCents: number }) | null {
  const l = levelFrom(raw);
  const o = obj(raw);
  if (!l || !o || l.number <= current.number) return null;
  return { ...l, thresholdCents: Math.max(0, int(o.thresholdCents)) };
}

function pointsPerEuroFrom(o: Record<string, unknown>): number {
  const r = obj(o.rules);
  const v = r ? int(r.pointsPerEuro) : 0;
  return v > 0 ? v : 100 / CENTS_PER_POINT;
}

/** Points per €1 paid before the level multiplier (`rules.earnPerEuro`, BRIEF §9 asks BE-1 to send it); 1 when absent. */
function earnPerEuroFrom(o: Record<string, unknown>): number {
  const r = obj(o.rules);
  const v = r ? num(r.earnPerEuro, 0) : 0;
  return v > 0 ? v : 1;
}

function centsOf(rawCents: unknown, points: number, pointsPerEuro: number): number {
  return int(rawCents, Math.round((points * 100) / pointsPerEuro));
}

function datedFrom(raw: unknown): { at: string; points: number } | null {
  const o = obj(raw);
  if (!o) return null;
  const at = isoOrEmpty(o.at);
  const points = int(o.points);
  return at && points > 0 ? { at, points } : null;
}

/**
 * ADDENDUM X10: the second-brand and Full Circle rows only when two or more houses are switched on (a Spa-only
 * programme names no other brand and offers no purchase there). The first-brand bonus stays.
 */
const MULTI_BRAND_KEYS = new Set(["second_house", "full_circle"]);

function actionsFrom(raw: unknown, pointsPerEuro: number, housesOn = 3): CircleAction[] {
  if (!Array.isArray(raw)) return [];
  const out: CircleAction[] = [];
  for (const a of raw.map(obj)) {
    if (!a || !str(a.key) || !str(a.label)) continue;
    const key = str(a.key);
    if (MULTI_BRAND_KEYS.has(key) && housesOn < 2) continue;
    const url = str(a.url);
    // An Instagram row exists only with its brand's own https profile (BE-1 R1.21: the item is omitted when null).
    if (key === "instagram" && !/^https:\/\//i.test(url)) continue;
    if (str(a.house) === "medical") continue;
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
export function readCircle(body: unknown): CircleModel | null {
  const o = obj(unwrapEnvelope(body));
  if (!o || o.enabled !== true || o.left === true || o.minor === true) return null;
  const credit = obj(o.credit);
  const level = levelFrom(o.level);
  if (!credit || !level) return null;
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
    levelSentence: str(o.levelSentence).trim(),
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
    },
  };
}

/** `/client/loyalty/me` → the left state, or null. Only a clean `enabled: true` + `left: true`. */
export function readCircleLeft(body: unknown): CircleLeftModel | null {
  const o = obj(unwrapEnvelope(body));
  if (!o || o.enabled !== true || o.left !== true) return null;
  return { leftAt: isoOrEmpty(o.leftAt) };
}

function minorFrom(body: unknown): { minAge: number | null } | null {
  const o = obj(unwrapEnvelope(body));
  if (!o || o.enabled !== true || o.minor !== true) return null;
  const minAge = int(o.minAge);
  return { minAge: minAge > 0 ? minAge : null };
}

/** One read, four outcomes: live, left, minor (R5.4: one line only), or null (draw nothing). */
export function readCircleState(body: unknown): CircleState | null {
  const left = readCircleLeft(body);
  if (left) return { kind: "left", left };
  const minor = minorFrom(body);
  if (minor) return { kind: "minor", minAge: minor.minAge };
  const model = readCircle(body);
  return model ? { kind: "live", model } : null;
}

/** `/client/loyalty/summary` (or the session's folded `loyalty`) → the nav balance, or null. */
export function readCircleSummary(body: unknown): CircleSummary | null {
  const o = obj(unwrapEnvelope(body));
  if (!o || o.enabled !== true || o.left === true || o.minor === true) return null;
  const level = levelFrom(o.level);
  const bal = obj(o.balance) ?? obj(o.credit);
  if (!level || !bal) return null;
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
    levelSentence: str(o.levelSentence).trim(),
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
  };
}

export function readCircleSummaryState(body: unknown): CircleSummaryState | null {
  const left = readCircleLeft(body);
  if (left) return { kind: "left", left };
  const minor = minorFrom(body);
  if (minor) return { kind: "minor", minAge: minor.minAge };
  const summary = readCircleSummary(body);
  return summary ? { kind: "live", summary } : null;
}

/** A member model is a summary too (the account page has the full read; the menu needs only these). */
export function summaryOf(m: CircleModel): CircleSummary {
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
  };
}

/** `GET /public/loyalty/status` v2 → what a signed-out page may say, or null (off, v1, garbage). */
export function readCircleStatus(body: unknown): CircleStatus | null {
  const o = obj(unwrapEnvelope(body));
  if (!o || o.enabled !== true) return null;
  const levels = levelRulesFrom(o.levels);
  if (!levels.length) return null;
  const rules = obj(o.rules) ?? {};
  const earning = obj(o.earning) ?? {};
  const expiry = obj(o.expiry) ?? {};
  const pointsPerEuro = int(rules.pointsPerEuro) > 0 ? int(rules.pointsPerEuro) : 100 / CENTS_PER_POINT;
  const actions = (Array.isArray(earning.actions) ? earning.actions : [])
    .map(obj)
    .filter((a): a is Record<string, unknown> => Boolean(a && str(a.key)))
    .map((a) => ({
      key: str(a.key),
      points: Math.max(0, int(a.points)),
      perBrand: a.perBrand === true,
      brands: (Array.isArray(a.brands) ? a.brands : [])
        .map(obj)
        .filter((b): b is Record<string, unknown> => Boolean(b && /^https:\/\//i.test(str(b.url)) && str(b.house) !== "medical"))
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
export function creditText(cents: number): string {
  const c = Number.isFinite(cents) ? cents : 0;
  return c < 0 ? `−${eur(Math.abs(c) / 100)}` : eur(c / 100);
}

/** "1,240 points" / "1 point". */
export function pointsText(points: number): string {
  const n = Math.round(Number.isFinite(points) ? points : 0);
  return `${n.toLocaleString("en-GB")} point${Math.abs(n) === 1 ? "" : "s"}`;
}

/** "€40" — level-spend euros are whole and rounded UP (never undersell a gap). */
export function wholeEuroUp(cents: number): string {
  const whole = Math.ceil(Math.max(0, cents) / 100);
  return `€${whole.toLocaleString("en-GB")}`;
}

/** "€960" — paid this year, whole euros rounded DOWN (never oversell progress). */
export function wholeEuroDown(cents: number): string {
  const whole = Math.floor(Math.max(0, cents) / 100);
  return `€${whole.toLocaleString("en-GB")}`;
}

/** Points → their euro value at the programme's rate: "€21.00". */
export function pointsEuroText(points: number, pointsPerEuro: number): string {
  const ppe = pointsPerEuro > 0 ? pointsPerEuro : 100 / CENTS_PER_POINT;
  return creditText(Math.round((points * 100) / ppe));
}

/**
 * "7.5%" — what a level gives back: points per €1 (`earnPerEuro`, 1 when the API does not say) × the level
 * multiplier × (100 / points per euro) percent of every euro paid.
 */
export function rateText(multiplier: number, pointsPerEuro: number, earnPerEuro = 1): string {
  const per = earnPerEuro > 0 ? earnPerEuro : 1;
  if (!(multiplier > 0) || !(pointsPerEuro > 0)) return "";
  const pct = Math.round(((per * multiplier * 100) / pointsPerEuro) * 100) / 100;
  return `${pct.toLocaleString("en-GB", { maximumFractionDigits: 2 })}%`;
}

function fmt(iso: string, o: Intl.DateTimeFormatOptions): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: MALTA, ...o }).format(new Date(ms));
  } catch {
    return "";
  }
}

/** A calendar day (YYYY-MM-DD) or an instant → "7 Dec" in Malta. Days are read as Malta days, never shifted. */
export function maltaDayShort(iso: string): string {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso;
  return fmt(day, { day: "numeric", month: "short" });
}

/** "31 Dec 2027". */
export function maltaDayLong(iso: string): string {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso;
  return fmt(day, { day: "numeric", month: "short", year: "numeric" });
}

/** "Mon 7 Dec" in Malta (a calendar day is read as that Malta day). */
export function maltaDayWeek(iso: string): string {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso;
  return fmt(day, { weekday: "short", day: "numeric", month: "short" });
}

/** "five" for 5 (the level count printed in words, from `levels.length`); digits past ten. */
export function countWord(n: number): string {
  const w = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n];
  return w ?? String(n);
}

/** "Thu 19 Nov, 20:15" in Malta. */
export function maltaWhen(iso: string): string {
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
export function brandsLine(brands: ReadonlyArray<{ name: string }>): string {
  const names = brands.map((b) => b.name.trim()).filter(Boolean);
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  const short = (n: string) => n.replace(/^Carisma\s+/i, "");
  return `${names[0]}, ${names.slice(1, -1).map(short).join(", ")} and ${short(names[names.length - 1])}`;
}

/** "For one whole treatment at Carisma Spa" (the conditions line, without its Terms link). */
export function conditionsText(brands: ReadonlyArray<{ name: string }>): string {
  const line = brandsLine(brands);
  return line ? `For one whole treatment at ${line}` : "For one whole treatment";
}

/** On an earned moment: "For one whole treatment · Comes off if this booking is cancelled". */
export const CONDITIONS_EARNED = "For one whole treatment · Comes off if this booking is cancelled";

/** "Terms" as a link, or "" when the site has no terms page to point at. */
export function termsLinkHTML(href: string | null | undefined, label = "Terms"): string {
  return href ? `<a class="cw-link cc-link" href="${escapeHtml(href)}" data-cw-circle-terms>${escapeHtml(label)}</a>` : "";
}

/** A sentence with " · Terms" at its end (escaped). */
export function withTermsHTML(text: string, termsHref: string | null | undefined): string {
  const t = termsLinkHTML(termsHref);
  return escapeHtml(text) + (t ? ` · ${t}` : "");
}

/** R5.4: the reading under the balance. Below zero / nothing yet / ready to use / just the points. */
export function readingText(m: { points: number; affordable: boolean; belowZero: boolean }, rate = ""): string {
  if (m.belowZero) return `${pointsText(Math.abs(m.points))} come off your next points — never charged`;
  if (m.points === 0) return rate ? `${rate} back from your first visit` : "Every €1 you pay earns points";
  return m.affordable ? `ready to use · ${pointsText(m.points)}` : pointsText(m.points);
}

/** The rate a member's level gives (from her perks), e.g. "7.5%". "" when not known. */
export function memberRate(m: CircleModel): string {
  const mult = m.perks?.multiplier || m.levels.find((l) => l.key === m.level.key)?.multiplier || 0;
  return rateText(mult, m.pointsPerEuro, m.earnPerEuro);
}

/** The level sentence: the API's words, or at the top level "Our highest level, kept until 31 Dec 2027". */
export function levelSentenceText(m: { levelSentence: string; nextLevel: unknown; heldUntil?: string }): string {
  if (m.levelSentence) return m.levelSentence;
  if (!m.nextLevel && m.heldUntil) {
    const d = maltaDayLong(m.heldUntil);
    return d ? `Our highest level, kept until ${d}` : "";
  }
  return "";
}

/**
 * ADDENDUM X4: the dated part of her balance, directly under the balance it describes: "€20.00 of it until
 * Mon 7 Dec". "" when nothing in the balance is dated.
 */
export function datedText(d: { at: string; points: number } | null | undefined, pointsPerEuro: number): string {
  if (!d || !(d.points > 0)) return "";
  const day = maltaDayWeek(d.at);
  return day ? `${pointsEuroText(d.points, pointsPerEuro)} of it until ${day}` : "";
}

/**
 * ADDENDUM X5 (the rollout's `CK.S.expiring`), the next step while her birthday credit is the part that ends
 * first: "Your €20.00 birthday credit ends Mon 7 Dec. Use it on a treatment before then." "" otherwise.
 */
export function expiringText(m: { pointsExpireKind: string; datedEnds: { at: string; points: number } | null; pointsPerEuro: number }): string {
  if (m.pointsExpireKind !== "birthday" || !m.datedEnds || !(m.datedEnds.points > 0)) return "";
  const day = maltaDayWeek(m.datedEnds.at);
  return day ? `Your ${pointsEuroText(m.datedEnds.points, m.pointsPerEuro)} birthday credit ends ${day}. Use it on a treatment before then.` : "";
}

/** R5.4 + R1.14: the line under the balance that says what ends first. "" when nothing is close. */
export function endsText(m: CircleModel): string {
  // Her birthday credit ending is the NEXT STEP (expiringText) and the dated part sits under the balance
  // (datedText): never the same figure twice.
  if (m.pointsExpireKind === "birthday") return "";
  if (m.balanceLapse && m.points > 0) {
    // A balance lapses up to 12 months out: the date always carries its year.
    const d = maltaDayLong(m.balanceLapse.at);
    return d ? `${pointsText(m.balanceLapse.points)} end on ${d} unless you visit or use points` : "";
  }
  return "";
}

/** "Paying with points is paused until Thu 19 Nov, 20:15" (an email change pauses spending 48 h). */
export function pausedText(untilIso: string): string {
  const w = maltaWhen(untilIso);
  return w ? `Paying with points is paused until ${w}` : "";
}

/** R5.4 under-18: one line, nothing else. */
export function minorText(minAge: number | null): string {
  return minAge ? `Carisma Circle starts at ${minAge}` : "Carisma Circle is for adults";
}

/** R5.5: "Carisma Circle is for people aged 18 and over" (+ Terms where drawn). */
export function ageLineText(minAge: number | null): string {
  return minAge ? `Carisma Circle is for people aged ${minAge} and over` : "";
}

/** The CEO's sentence for an earned moment (R5.2, R5.4). */
export function gainText(earnedCents: number, brands: ReadonlyArray<{ name: string }>, affordable: boolean): string {
  const line = brandsLine(brands);
  return (
    `You've just received ${creditText(earnedCents)} in Carisma credit${line ? `, usable at ${line}` : ""}.` +
    (affordable ? " You can use it already." : "")
  );
}

/** "€11.90 · 238 points on the way when you pay". */
export function onTheWayText(cents: number, points: number): string {
  return `${creditText(cents)} · ${pointsText(points)} on the way when you pay`;
}

/** "Paid with points · 2,180 points". */
export function paidWithPointsText(points: number): string {
  return `Paid with points · ${pointsText(points)}`;
}

/** "Earns €5.45 · 109 points" — the server's earn figure for a treatment (public earn, Level 1 for a guest). */
export function earnsText(cents: number, points: number): string {
  if (!(points > 0)) return "";
  return `Earns ${creditText(cents)} · ${pointsText(points)}`;
}

/** The ONE action under a Card or Hero. */
export function actionText(m: { affordable: boolean; belowZero: boolean; points: number }): string {
  return m.affordable && !m.belowZero ? "Use my credit" : "Book a visit";
}

/**
 * Beside every Rejoin: counsel's sentence (surface-consistency row 8, terms §13) with the retired level name
 * replaced by the API's first-level label ("Level 1 · Pearl", R5.1); without one, "the first level".
 */
export function rejoinNoteText(firstLevelLabel = ""): string {
  return (
    `If you rejoin, you start again at ${firstLevelLabel || "the first level"} with no credit. ` +
    "The credit you gave up when you left does not come back. If your balance was below zero when you left, that comes back too, unless it has been written off."
  );
}

/**
 * The sign-in dialog's line (R5.2, R5.5), live only: "Your Carisma account
 * collects Carisma credit at Carisma Spa." + "+50 points when you sign in with
 * your email" (from the status's `verified_email` action). "" when off.
 */
export function signInLineText(status: CircleStatus | null): { line: string; bonus: string; age: string } | null {
  if (!status) return null;
  const line = brandsLine(status.brands);
  if (!line) return null;
  const email = status.actions.find((a) => a.key === "verified_email" && a.points > 0);
  return {
    line: `Your Carisma account collects Carisma credit at ${line}.`,
    bonus: email ? `+${email.points.toLocaleString("en-GB")} points when you sign in with your email` : "",
    age: ageLineText(status.minAge),
  };
}
