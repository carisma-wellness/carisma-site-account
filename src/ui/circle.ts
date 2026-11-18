/**
 * Carisma Circle v2 — the cross-brand loyalty programme, as the account area
 * and the account menu show it (carisma-circle-v2-20261117).
 *
 * Pure: models from `circleCore.ts`, HTML strings here; browser.ts only fetches
 * and drops the strings in. Every surface follows the design system's order:
 * jewel, level, balance, reading, ONE next step, ONE action, conditions; the
 * level track (R5.3) shows how far the next level is and what it unlocks.
 *
 * THE ONE RULE: nothing renders unless the server said `enabled: true` — every
 * builder returns "" for null. A jewel is a SLOT here (`data-cw-jewel` + its
 * flat mark): it turns live only when the site gave the kit a jewel loader and
 * the slot comes near the viewport.
 */
import { escapeHtml } from "./html.js";
import { circleMarkSVG, jewelSlotHTML, type CircleGemKey } from "./circleMark.js";
import {
  CENTS_PER_POINT,
  CIRCLE_HREF,
  CIRCLE_TERMS_HREF,
  CIRCLE_V2_QC,
  CONDITIONS_EARNED,
  M,
  NB,
  PROMISE_QUALIFIER,
  actionText,
  ageLineText,
  conditionsText,
  countWord,
  creditText,
  datedText,
  endsText,
  expiringText,
  gainText,
  int,
  levelSentenceText,
  maltaDayLong,
  memberRate,
  minorText,
  nbWords,
  obj,
  onTheWayText,
  pausedText,
  pointsText,
  rateText,
  readCircleLeft,
  readingText,
  rejoinNoteText,
  str,
  summaryOf,
  termsLinkHTML,
  withTermsHTML,
  type CircleBrand,
  type CircleLeftModel,
  type CircleLevelRule,
  type CircleLevelView,
  type CircleModel,
  type CircleSummary,
  type CircleSummaryState,
} from "./circleCore.js";
import { benefitsList, circleTrackHTML, nextPerksOf, ownPerksOf, unlockLineText, unlocksList } from "./circleTrack.js";
import { circleWaysCardsHTML, circleWaysHTML } from "./circleWays.js";
import { circlePerksHTML, type CirclePerks } from "./circlePerks.js";
import { circleNowRowHTML, circleRewardsHTML, type CircleReward, type CircleRewardArt, type CircleRewardPhoto } from "./circleFeatured.js";
import { unwrapEnvelope } from "./appointments.js";

export * from "./circleCore.js";
export { asGemKey, circleMarkSVG, jewelSlotHTML, progressFraction, CIRCLE_GEM_KEYS, type CircleGemKey } from "./circleMark.js";
export {
  benefitsList,
  circleTrackHTML,
  nextPerksOf,
  ownPerksOf,
  paidLineText,
  unlockLineText,
  unlocksList,
  type TrackInput,
  type TrackOptions,
} from "./circleTrack.js";
export { actionValueText, circleWaysCardsHTML, circleWaysHTML, instagramLinkHTML, waysSummaryText } from "./circleWays.js";
export { circlePerksHTML, readCirclePerks, spaDaysText, type CirclePerks, type CirclePerkUpcoming } from "./circlePerks.js";
export {
  circleNowRowHTML,
  circleRewardsHTML,
  REWARDS_FOOT,
  nextRewardText,
  readCircleRewards,
  rewardGroups,
  rewardPriceText,
  rewardTitle,
  type CircleReward,
  type CircleRewardArt,
  type CircleRewardPhoto,
} from "./circleFeatured.js";

/** Same literal as panel.ts ACCOUNT_DETAILS_HREF (not imported: panel.ts imports this module). */
export const REJOIN_LABEL = "Rejoin Carisma Circle";
/**
 * The rejoin sentence WITHOUT a level name ("the first level"), for a site that cannot read the public status.
 * Every left state draws `rejoinNoteText(firstLevelLabel)` instead, inside `[data-cw-circle-rejoin-note]`, and
 * the browser puts the API's first-level label in ("Level 1 · Pearl", R5.1) as soon as the host hands it over.
 */
export const REJOIN_NOTE = rejoinNoteText();

/** The rejoin sentence for one left state, marked so browser.ts can name the API's first level in it. */
function rejoinNoteHTML(tag: "span" | "p", cls: string, firstLevelLabel?: string): string {
  return `<${tag} class="${cls}" data-cw-circle-rejoin-note>${escapeHtml(rejoinNoteText(firstLevelLabel ?? ""))}</${tag}>`;
}

const ARROW =
  '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
  'stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>';
const COIN =
  '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" ' +
  'stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"></circle><circle cx="12" cy="12" r="4.5"></circle></svg>';

/** What a site may hand the Circle builders. */
export interface CircleExtras {
  /** Where every "Terms" points (default CIRCLE_TERMS_HREF; null = no link). */
  termsHref?: string | null;
  /** Photos and booking links per featured service id. */
  art?: CircleRewardArt;
  /** Poster stills for the jewel slots (`/circle/jewel/v1/<gem>-<kind>.webp`). */
  poster?: ((gem: string, kind: "small" | "full" | "icon") => string) | null;
  /** Where "Book a visit" / "Book it" go on this brand. */
  bookHref?: string;
  spaDayHref?: string | null;
  /** ADDENDUM X3/KIT-3: the site's own photo for a featured service (then the API's `imageUrl`). */
  photo?: CircleRewardPhoto;
  /** The API's first-level label ("Level 1 · Pearl") for the rejoin sentence; "" = "the first level". */
  firstLevelLabel?: string;
  /**
   * ADDENDUM KIT-6: the WhatsApp row of "Offers and reminders" (default true). Carisma Slimming passes false: its
   * WhatsApp number is locked by Meta, so its Credit & rewards page carries no WhatsApp switch.
   */
  whatsappPref?: boolean;
}

function terms(x: CircleExtras | undefined): string | null {
  return x?.termsHref === undefined ? CIRCLE_TERMS_HREF : x.termsHref;
}

function slot(gem: CircleGemKey, progress: number, height: number, kind: "small" | "full" | "icon", x?: CircleExtras): string {
  return jewelSlotHTML({ gem, progress, height, kind, poster: x?.poster ? x.poster(gem, kind) : undefined });
}

/* ── The header chip (Chip size: under 40 px = the flat mark) ─────────── */

/**
 * The header chip for a signed-in member: the flat mark and the balance in
 * euros ("€72.40"). The live jewel opens in the account menu, so three.js never
 * loads on a page just because the header is there (surfaces §9 Q2 default).
 */
export function circleChipHTML(s: CircleSummary | null): string {
  if (!s) return "";
  // R5.4: below zero is never a figure in the header ("−€3.50" there reads as money owed): the mark alone.
  return (
    `<span class="cc cc-chip" data-cw-qc="${CIRCLE_V2_QC}" data-cw-circle="chip" ${M}>` +
    `<span class="cc-chip__mark">${circleMarkSVG(s.level.key, s.progressBp / 10000, 24)}</span>` +
    (s.belowZero ? "" : `<span class="cc-chip__bal">${escapeHtml(creditText(s.creditCents))}</span>`) +
    `<span class="cw-vh">${escapeHtml(circleChipLabel(s))}</span>` +
    `</span>`
  );
}

/** The chip's spoken label (`CK.chip`'s aria): "Carisma credit €84.30, Level 3 · Ruby" (no figure below zero). */
export function circleChipLabel(s: Pick<CircleSummary, "belowZero" | "creditCents" | "level">): string {
  return s.belowZero ? `Carisma credit, ${s.level.label}` : `Carisma credit ${creditText(s.creditCents)}, ${s.level.label}`;
}

/* ── The account menu Card (board 11) ──────────────────────────────────── */

export interface PanelCircleExtras extends CircleExtras {
  /** "Level 4 · Sapphire unlocks …" (from the member read, filled after the menu opens). */
  unlockLine?: string;
  /** The featured read, for the "Yours now" row. */
  rewards?: CircleReward[] | null;
}

/**
 * The menu's Circle block: her jewel beside level, balance and reading; the
 * compact level track with the one-line unlock; what her points buy now (with
 * its photo); ONE button. "" for null. Left / minor states have their own
 * builders below.
 */
export function circlePanelRowHTML(s: CircleSummary | null, x: PanelCircleExtras = {}): string {
  if (!s) return "";
  // A new member's reading names her level's rate ("5% back from your first visit"), from the summary's own perks.
  const read = readingText(s, s.perks ? rateText(s.perks.multiplier, s.pointsPerEuro, s.earnPerEuro) : "");
  const paused = s.spendPausedUntil ? pausedText(s.spendPausedUntil) : "";
  const dated = datedText(s.datedEnds, s.pointsPerEuro);
  // The unlock line straight from the summary when it carries both perk rows (BRIEF §9 ask of BE-1); else the
  // host fills it after the menu opens (browser.ts reads /me once).
  const unlockLine =
    x.unlockLine ||
    (s.nextLevel && s.nextLevelPerks
      ? unlockLineText(s.nextLevel.label, unlocksList(s.perks, s.nextLevelPerks, s.pointsPerEuro, s.earnPerEuro))
      : "");
  const track = circleTrackHTML(
    {
      level: s.level,
      nextLevel: s.nextLevel,
      progressBp: s.progressBp,
      toNextLevelCents: s.toNextLevelCents,
      levelSentence: s.levelSentence,
      heldUntil: s.heldUntil,
      spendThisYearCents: s.spendThisYearCents,
      // X2 / BE-c: only when the summary itself sends it (BE-2 sends it on /me only, so today the menu draws the gap).
      onItsWay: s.levelOnItsWay,
    },
    { compact: true, unlockLine, poster: x.poster },
  );
  // ADDENDUM KIT-1: ONE ink pill — "Use my credit" when the server says her balance pays for a featured
  // treatment, else "Book a visit" (never "View my credit"); the rows below the Card reach Credit & rewards.
  const use = s.affordable && !s.belowZero;
  const act = use
    ? `<a class="cc-btn" href="${CIRCLE_HREF}#rewards">Use my credit</a>`
    : `<a class="cc-btn" href="${escapeHtml(x.bookHref || CIRCLE_HREF)}">Book a visit</a>`;
  return (
    `<div class="carisma-panel__circle cc cc-menu" data-cw-qc="${CIRCLE_V2_QC}" data-cw-circle="panel" data-cw-jewel-hover>` +
    `<div class="cc-menu__top">` +
    `<div class="cc-plate">${slot(s.level.key, s.progressBp / 10000, 96, "small", x)}</div>` +
    `<div class="cc-menu__fig">` +
    `<p class="cc-level" ${M}>${escapeHtml(s.level.label)}</p>` +
    `<p class="cc-bal" ${M}>${escapeHtml(creditText(s.creditCents))}</p>` +
    (dated ? `<p class="cc-dated" ${M}>${escapeHtml(dated)}</p>` : "") +
    `<p class="cc-read" ${M}>${withTermsHTML(read, terms(x))}</p>` +
    (paused ? `<p class="cc-note" ${M}>${escapeHtml(paused)}</p>` : "") +
    `</div></div>` +
    `<div class="cc-menu__sec">${track}</div>` +
    `<div class="cw-circle-slot" data-cw-circle-slot="menu-now">${circleNowRowHTML(x.rewards ?? null, x.art, x.photo)}</div>` +
    `<div class="cc-menu__act">${act}</div>` +
    `</div>`
  );
}

/** The menu block for a member who left: the date and Rejoin, nothing else. "" when null. */
export function circlePanelLeftHTML(l: CircleLeftModel | null, firstLevelLabel = ""): string {
  if (!l) return "";
  return (
    `<div class="carisma-panel__circle carisma-panel__circle--left" data-cw-qc="${CIRCLE_V2_QC}" data-cw-circle="panel-left">` +
    `<span class="carisma-panel__circle-label">Carisma Circle</span>` +
    `<span class="carisma-panel__circle-left" ${M}>${escapeHtml(leftText(l))}</span>` +
    rejoinNoteHTML("span", "carisma-panel__circle-sub", firstLevelLabel) +
    `<button type="button" class="carisma-panel__circle-rejoin" data-cw-circle-rejoin>${REJOIN_LABEL}</button>` +
    `<span class="carisma-panel__circle-gap" role="status" data-cw-circle-rejoin-msg></span>` +
    `</div>`
  );
}

/** R5.4: under the minimum age, one line and nothing else. */
export function circlePanelMinorHTML(minor: { minAge: number | null } | null): string {
  if (!minor) return "";
  return (
    `<div class="carisma-panel__circle carisma-panel__circle--minor" data-cw-qc="${CIRCLE_V2_QC}" data-cw-circle="panel-minor">` +
    `<span class="carisma-panel__circle-left">${escapeHtml(minorText(minor.minAge))}</span></div>`
  );
}

/** The whole menu block for one summary state. */
export function circlePanelStateHTML(st: CircleSummaryState | null, x: PanelCircleExtras = {}): string {
  if (!st) return "";
  if (st.kind === "left") return circlePanelLeftHTML(st.left, x.firstLevelLabel);
  if (st.kind === "minor") return circlePanelMinorHTML(st);
  return circlePanelRowHTML(st.summary, x);
}

/* ── A member who left / under the minimum age ─────────────────────────── */

/** "You left Carisma Circle on 14 November 2026" (Malta date; no date when the server gave none). */
export function leftText(l: CircleLeftModel): string {
  const ms = Date.parse(l.leftAt);
  if (!Number.isFinite(ms)) return "You left Carisma Circle";
  try {
    const d = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Malta", day: "numeric", month: "long", year: "numeric" }).format(new Date(ms));
    return `You left Carisma Circle on ${d}`;
  } catch {
    return "You left Carisma Circle";
  }
}

function circleLeftCardHTML(l: CircleLeftModel, tone: "primary" | "secondary", firstLevelLabel = ""): string {
  return (
    `<div class="cw-card cw-circle-left" data-cw-circle="left">` +
    `<p class="cw-circle__level" ${M}>${escapeHtml(leftText(l))}</p>` +
    rejoinNoteHTML("p", "cw-circle__rule", firstLevelLabel) +
    `<div class="cw-actions"><button type="button" class="cw-btn cw-btn--${tone}" data-cw-circle-rejoin>${REJOIN_LABEL}</button></div>` +
    `</div>`
  );
}

/** The Overview card for a member who left. "" when null. */
export function circleOverviewLeftHTML(l: CircleLeftModel | null, firstLevelLabel = ""): string {
  if (!l) return "";
  return (
    `<section class="cw-circle-ov cw-rise" aria-labelledby="cw-circle-ov-title" data-cw-qc="${CIRCLE_V2_QC}" data-cw-circle="overview-left">` +
    `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-ov-title">Carisma Circle</h2>` +
    `<a class="cw-section__more" href="${CIRCLE_HREF}">Credit &amp; rewards${ARROW}</a></div>` +
    circleLeftCardHTML(l, "secondary", firstLevelLabel) +
    `</section>`
  );
}

/** R5.4 on the account: one line, nothing else. */
export function circleOverviewMinorHTML(minor: { minAge: number | null } | null): string {
  if (!minor) return "";
  return (
    `<section class="cw-circle-ov cw-rise" aria-label="Carisma Circle" data-cw-qc="${CIRCLE_V2_QC}" data-cw-circle="overview-minor">` +
    `<p class="cw-circle__line">${escapeHtml(minorText(minor.minAge))}</p></section>`
  );
}

/* ── A level on its way (ADDENDUM X2, BE-c) ────────────────────────────── */

/** The server's own sentence for a booked visit that takes her up a level, or "" (never one the kit writes). */
export function circleOnItsWayText(m: { levelOnItsWay: { sentence: string } | null; nextLevel: unknown }): string {
  return m.nextLevel && m.levelOnItsWay ? nbWords(m.levelOnItsWay.sentence) : "";
}

/* ── The Overview greeting's Circle line (ADDENDUM KIT-2, board 10) ─────── */

/**
 * Under "Good evening, Maria": "Level 3 · Ruby · Member since 2024 · CC 0042 1187". "Member since" only from the
 * API's `member.since` (BE-e; absent → left out), the number only when she has one. "" for null.
 */
export function circleMemberLineText(m: CircleModel | null): string {
  if (!m) return "";
  const year = /^(\d{4})(?:-\d{2}-\d{2})?$/.exec(m.member.since)?.[1] ?? "";
  return [
    m.level.label,
    year ? `Member since${NB}${year}` : "",
    m.member.number ? m.member.number.replace(/ /g, NB) : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function circleMemberLineHTML(m: CircleModel | null): string {
  const t = circleMemberLineText(m);
  if (!t || !m) return "";
  const rest = t.slice(m.level.label.length);
  return `<p class="cw-lede cc-since" ${M} data-cw-circle="member-line"><b>${escapeHtml(m.level.label)}</b>${escapeHtml(rest)}</p>`;
}

/* ── The Hero (account, thank-you) ─────────────────────────────────────── */

function heroLinesHTML(m: CircleModel): string {
  const ends = endsText(m);
  const paused = m.member.spendPausedUntil ? pausedText(m.member.spendPausedUntil) : "";
  const pending = m.pendingPoints > 0 ? onTheWayText(m.pendingCents, m.pendingPoints) : "";
  const awaiting = m.awaitingEmail
    ? `${creditText(m.awaitingEmail.cents)} · ${pointsText(m.awaitingEmail.points)} waiting for an email on your account`
    : "";
  return [ends, paused, pending, awaiting]
    .filter(Boolean)
    .map((t) => `<p class="cc-note" ${M}>${escapeHtml(t)}</p>`)
    .join("");
}

/**
 * The Hero: jewel 240, level, balance, reading, what ends first, ONE next step,
 * ONE action, conditions. `say` replaces the next step (the thank-you page's
 * gain sentence); `conditions: "earned"` on an earned moment.
 */
export function circleHeroHTML(
  m: CircleModel | null,
  x: CircleExtras & { say?: string; conditions?: "earned" | "spend"; action?: { label: string; href: string } | false } = {},
): string {
  if (!m) return "";
  // The ONE next step (`CK.hero`): a level on its way (the server's sentence, X2), else the level sentence (R5.3).
  // The ending-soon sentence is not the Hero's: the dated part under the balance says it (X4), as board 10 draws.
  const next = x.say ?? (circleOnItsWayText(m) || levelSentenceText(m));
  const dated = datedText(m.datedEnds, m.pointsPerEuro);
  const action =
    x.action === false
      ? ""
      : x.action
        ? `<a class="cc-btn" href="${escapeHtml(x.action.href)}">${escapeHtml(x.action.label)}</a>`
        : m.affordable && !m.belowZero
          ? `<a class="cc-btn" href="${CIRCLE_HREF}#rewards">${escapeHtml(actionText(m))}</a>`
          : x.bookHref
            ? `<a class="cc-btn" href="${escapeHtml(x.bookHref)}">${escapeHtml(actionText(m))}</a>`
            : "";
  const cond = x.conditions === "earned" ? CONDITIONS_EARNED : conditionsText(m.brands);
  return (
    `<div class="cc cc-hero" data-cw-circle="hero">` +
    slot(m.level.key, m.progressBp / 10000, 240, "full", x) +
    // The level alone (`CK.S.level`): her member number has its own place (the Overview greeting, KIT-2; Credit and
    // rewards' "Your member number").
    `<p class="cc-level" ${M}>${escapeHtml(m.level.label)}</p>` +
    `<p class="cc-bal" ${M}>${escapeHtml(creditText(m.creditCents))}</p>` +
    // ADDENDUM X4: the dated part directly under the balance it describes.
    (dated ? `<p class="cc-dated" ${M}>${escapeHtml(dated)}</p>` : "") +
    `<p class="cc-read" ${M}>${escapeHtml(readingText(m, memberRate(m)))}</p>` +
    heroLinesHTML(m) +
    (next ? `<p class="cc-next" ${M}>${escapeHtml(next)}</p>` : "") +
    action +
    `<p class="cc-cond">${withTermsHTML(cond, terms(x))}</p>` +
    `</div>`
  );
}

/* ── The ladder: all five levels, from the API's table ─────────────────── */

export function circleLadderHTML(
  levels: CircleLevelRule[],
  current: CircleLevelView | null,
  pointsPerEuro: number,
  x?: CircleExtras & { earnPerEuro?: number },
): string {
  if (!levels.length) return "";
  const rungs = levels
    .map((l) => {
      const got = current ? l.number <= current.number : false;
      const you = current ? l.key === current.key : false;
      const rate = rateText(l.multiplier, pointsPerEuro, x?.earnPerEuro);
      const when = l.thresholdCents <= 0 ? "When you join" : `${creditText(l.thresholdCents).replace(/\.00$/, "")} paid in a calendar year`;
      // `CK.ladder`: "€500 paid in a calendar year · 7.5% back", the dot and the rate held to their words.
      const detail = [when, rate ? `${rate}${NB}back` : ""].filter(Boolean).join(`${NB}·${NB}`);
      return (
        `<li class="cc-rung${got ? "" : " todo"}${you ? " you" : ""}"${you ? ' aria-current="step"' : ""}>` +
        slot(l.key, 1, 56, "icon", x) +
        `<span class="cc-rung__t"><b>${escapeHtml(l.label)}</b><span>${escapeHtml(detail)}</span></span>` +
        (you ? `<span class="cc-you">Your level</span>` : "<span></span>") +
        `</li>`
      );
    })
    .join("");
  return `<ol class="cc cc-ladder" role="list" aria-label="${escapeHtml(`The ${countWord(levels.length)} levels`)}">${rungs}</ol>`;
}

/* ── Activity ──────────────────────────────────────────────────────────── */

export interface CircleActivityItem {
  id: string;
  at: string;
  day: string;
  type: string;
  brand: string;
  label: string;
  points: number;
  cents: number;
  status: string;
  expiresAt: string | null;
}

export function readCircleActivity(
  body: unknown,
  pointsPerEuro = 0,
): { items: CircleActivityItem[]; nextCursor: string | null } | null {
  const o = obj(unwrapEnvelope(body));
  // Only when a row carries no cents: its points at the programme's rate (the API's, else the 20-points fallback).
  const ppe = pointsPerEuro > 0 ? pointsPerEuro : 100 / CENTS_PER_POINT;
  if (!o || o.enabled !== true || !Array.isArray(o.items)) return null;
  const items = o.items
    .map(obj)
    .filter((r): r is Record<string, unknown> => Boolean(r && str(r.id)))
    .filter((r) => str(obj(r.brand)?.house) !== "medical")
    .map((r) => {
      const pts = int(r.points);
      return {
        id: str(r.id),
        at: str(r.at),
        day: str(r.day),
        type: str(r.type),
        brand: str(obj(r.brand)?.name),
        label: str(r.label) || "Carisma credit",
        points: pts,
        cents: int(r.cents, Math.round((pts * 100) / ppe)),
        status: str(r.status),
        expiresAt: str(r.expiresAt) || null,
      };
    });
  return { items, nextCursor: str(o.nextCursor) || null };
}

const STATUS_WORD: Record<string, string> = {
  received: "Received",
  reversed: "Removed",
  expired: "Expired",
  spent: "Paid with points",
  returned: "Returned",
  adjusted: "Adjusted",
  pending: "On the way",
};

function signed(cents: number): string {
  return `${cents < 0 ? "−" : "+"}${creditText(Math.abs(cents))}`;
}

export function circleActivityRowsHTML(items: CircleActivityItem[]): string {
  return items
    .map((it) => {
      const tone = it.cents < 0 || it.status === "spent" || it.status === "reversed" || it.status === "expired" ? "out" : "in";
      const meta = [maltaDayLong(it.day || it.at), it.brand, STATUS_WORD[it.status] || ""].filter(Boolean).join(" · ");
      return (
        `<li class="cw-circle-act__row" data-cw-act="${escapeHtml(it.id)}">` +
        `<div class="cw-circle-act__text"><p class="cw-circle-act__label" ${M}>${escapeHtml(it.label)}</p>` +
        `<p class="cw-circle-act__meta" ${M}>${escapeHtml(meta)}</p></div>` +
        `<p class="cw-circle-act__amt cw-circle-act__amt--${tone}" ${M}>${escapeHtml(signed(it.cents))}` +
        `<span class="cw-circle-act__pts">${escapeHtml(pointsText(Math.abs(it.points)))}</span></p>` +
        `</li>`
      );
    })
    .join("");
}

export function circleActivityHTML(
  m: CircleModel,
  activity: { items: CircleActivityItem[]; nextCursor: string | null } | null,
  opts: { limit?: number; moreHref?: string } = {},
): string {
  const rows = activity ? (opts.limit ? activity.items.slice(0, opts.limit) : activity.items) : [];
  const list = rows.length
    ? `<ul class="cw-circle-act" role="list" data-cw-circle-activity>${circleActivityRowsHTML(rows)}</ul>` +
      (opts.moreHref
        ? `<a class="cw-section__more" href="${escapeHtml(opts.moreHref)}">See all${ARROW}</a>`
        : activity?.nextCursor
          ? `<button type="button" class="cw-btn cw-btn--secondary cw-btn--sm" data-cw-circle-more="${escapeHtml(activity.nextCursor)}">Show more</button>`
          : "")
    : activity
      ? `<p class="cw-muted">Your credit activity will show here after your first paid visit.</p>`
      : "";
  if (!list) return "";
  // ADDENDUM KIT-2 / BE-e: what her points paid for this calendar year, only from the server's own figure.
  const saved =
    typeof m.savedThisYearCents === "number" && m.savedThisYearCents > 0
      ? `<p class="cc-saved" ${M} data-cw-circle="saved"><span>Saved with Carisma Circle this year</span><b>${escapeHtml(creditText(m.savedThisYearCents))}</b></p>`
      : "";
  return (
    `<section class="cw-section cw-rise" aria-labelledby="cw-circle-act-title" data-cw-circle="activity">` +
    `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-act-title">Activity</h2></div>` +
    saved +
    list +
    `</section>`
  );
}

/* ── The account Overview: the member dashboard (board 10) ─────────────── */

/**
 * Overview's Circle block: the Circle panel (her Hero on the left; the level
 * track with what the next level unlocks and what hers gives on the right),
 * then what her points buy (photo cards, filled after a second read), more
 * ways to earn, and three rows of activity. "" for null.
 */
export function circleOverviewHTML(
  m: CircleModel | null,
  x: CircleExtras & {
    rewards?: CircleReward[] | null;
    activity?: { items: CircleActivityItem[]; nextCursor: string | null } | null;
    /** The public status's retail boost (the "Spa products" card); unknown → no card. */
    retailBoostPct?: number | null;
  } = {},
): string {
  if (!m) return "";
  const own = ownPerksOf(m);
  const next = nextPerksOf(m);
  const unlocks = unlocksList(own, next, m.pointsPerEuro, m.earnPerEuro);
  const gives = benefitsList(own, m.pointsPerEuro, m.earnPerEuro);
  const top = !m.nextLevel;
  // Board 10, right column: "Your next level" ("Your level" at the top), the track with what it unlocks, then a box
  // "Your Level 3 · Ruby benefits" (live perks only, X2) kept "until 31 Dec 2027" for Levels 2–4.
  const until = !top && m.level.number > 1 && m.heldUntil ? maltaDayLong(m.heldUntil) : "";
  return (
    `<section class="cw-circle-ov cw-rise cc-dash" aria-labelledby="cw-circle-ov-title" data-cw-qc="${CIRCLE_V2_QC}" data-cw-circle="overview">` +
    `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-ov-title">Carisma Circle</h2>` +
    `<a class="cw-section__more" href="${CIRCLE_HREF}">Credit &amp; rewards${ARROW}</a></div>` +
    `<div class="cc-dash__panel" data-cw-jewel-hover>` +
    circleHeroHTML(m, x) +
    `<div class="cc-dash__level">` +
    `<p class="cc-eyebrow">${top ? "Your level" : "Your next level"}</p>` +
    circleTrackHTML(
      { ...m, spendThisYearCents: m.spendThisYearCents, onItsWay: m.levelOnItsWay },
      { unlocks, poster: x.poster },
    ) +
    (gives.length
      ? `<div class="cc-gives"><p class="cc-eyebrow"><span>${escapeHtml(`Your ${m.level.label} benefits`)}</span>` +
        (until ? `<span class="cc-gives__until">${escapeHtml(`until${NB}${until.replace(/ /g, NB)}`)}</span>` : "") +
        `</p><ul>${gives.map((g) => `<li>${escapeHtml(g)}</li>`).join("")}</ul></div>`
      : "") +
    (m.levels.length ? `<a class="cw-link cc-link" href="${CIRCLE_HREF}#levels">${escapeHtml(`See all ${countWord(m.levels.length)} levels`)}</a>` : "") +
    `</div></div>` +
    `<div class="cw-circle-slot" data-cw-circle-slot="ov-rewards">${circleRewardsHTML(x.rewards ?? null, m.points, { art: x.art, photo: x.photo, pointsPerEuro: m.pointsPerEuro })}</div>` +
    `<div class="cw-circle-slot" data-cw-circle-slot="ov-earn">${circleWaysCardsHTML(m, { retailBoostPct: x.retailBoostPct ?? null })}</div>` +
    `<div class="cw-circle-slot" data-cw-circle-slot="ov-activity">${x.activity ? circleActivityHTML(m, x.activity, { limit: 3, moreHref: CIRCLE_HREF }) : ""}</div>` +
    `</section>`
  );
}

/* ── Wallet line ───────────────────────────────────────────────────────── */

/**
 * Carisma credit as its own line in the Wallet, NOT added to "Available to
 * spend" (points pay one whole treatment, never part of a bill). "" when null.
 */
export function circleWalletLineHTML(m: CircleModel | null): string {
  if (!m) return "";
  return (
    `<a class="cw-strip cw-rise cw-circle-strip" href="${CIRCLE_HREF}" data-cw-qc="${CIRCLE_V2_QC}" data-cw-circle="wallet">` +
    `<span class="cw-strip__icon">${COIN}</span>` +
    `<span class="cw-strip__text"><span class="cw-strip__label">Carisma credit</span>` +
    `<span class="cw-strip__value" ${M}>${escapeHtml(m.display)}</span>` +
    `<span class="cw-strip__note">${escapeHtml(conditionsText(m.brands))}</span></span>` +
    `<span class="cw-strip__arrow" aria-hidden="true">${ARROW}</span></a>`
  );
}

/* ── "Your card": the Circle card in Apple / Google Wallet (ADDENDUM X9, KIT-4) ── */

/** The one quiet line under the Wallet button: the card identifies her; it never pays. */
export const CIRCLE_CARD_LINE = "Your card shows the desk who you are. Paying with points at the desk needs the code in the Carisma app.";

/**
 * Which Wallet this browser may offer: "apple" on an iPhone or iPad in Safari, "google" on Android in Chrome,
 * null everywhere else (never on a desktop browser, ADDENDUM KIT-4). `touchPoints` tells iPadOS (which reports
 * a Mac) from a Mac.
 */
export function circleWalletPlatform(ua: string, touchPoints = 0): "apple" | "google" | null {
  const u = ua || "";
  const ios = /\b(iPhone|iPad|iPod)\b/.test(u) || (/\bMacintosh\b/.test(u) && touchPoints > 1);
  if (ios) return /Safari\//.test(u) && !/(CriOS|FxiOS|EdgiOS|OPiOS|GSA)\//.test(u) ? "apple" : null;
  if (/\bAndroid\b/.test(u)) return /Chrome\//.test(u) && !/(EdgA|OPR|SamsungBrowser|Firefox|YaBrowser|wv\))/.test(u) ? "google" : null;
  return null;
}

/**
 * `GET /client/wallet/availability` → the Circle card per platform (`circle: {apple, google}`, ADD-W4). Any
 * other shape — the old `{apple, google}` with no `circle`, an error, garbage — is "no".
 */
export function readCircleWalletAvailability(body: unknown): { apple: boolean; google: boolean } {
  const o = obj(unwrapEnvelope(body));
  const c = o ? obj(o.circle) : null;
  return { apple: c?.apple === true, google: c?.google === true };
}

/** The "Your card" block for one platform. Its button is bound by browser.ts (`data-cw-circle-wallet`). */
export function circleCardBlockHTML(which: "apple" | "google"): string {
  const label = which === "apple" ? "Add to Apple Wallet" : "Add to Google Wallet";
  return (
    `<section class="cw-section cw-rise cc-card-wallet" aria-labelledby="cw-circle-card-title" data-cw-circle="your-card">` +
    `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-card-title">Your card</h2></div>` +
    `<button type="button" class="cw-btn cw-btn--secondary" data-cw-circle-wallet="${which}">${escapeHtml(label)}</button>` +
    `<p class="cw-fine">${escapeHtml(CIRCLE_CARD_LINE)}</p>` +
    `</section>`
  );
}

/* ── The Credit & rewards page ─────────────────────────────────────────── */

export interface CircleViewInput extends CircleExtras {
  me: CircleModel;
  activity: { items: CircleActivityItem[]; nextCursor: string | null } | null;
  rewards: CircleReward[] | null;
  perks?: CirclePerks | null;
  /** The member's "Offers and reminders" answer (null = the box is not drawn). */
  prefs?: CirclePrefs | null;
}

function memberNumberHTML(m: CircleModel): string {
  if (!m.member.number) return "";
  return (
    `<section class="cw-section cw-rise cc-member" aria-label="Your member number" data-cw-circle="member">` +
    `<p class="cw-label">Your member number</p><p class="cc-member__n" ${M}>${escapeHtml(m.member.number)}</p>` +
    `<p class="cw-fine">For reference only: at reception your Carisma app card or the desk code is what pays with points.</p>` +
    `</section>`
  );
}

/** The whole Credit & rewards page body. "" when the member read is null. */
export function circleViewHTML(input: CircleViewInput | null): string {
  if (!input) return "";
  const m = input.me;
  const own = ownPerksOf(m);
  const unlocks = unlocksList(own, nextPerksOf(m), m.pointsPerEuro, m.earnPerEuro);
  const age = ageLineText(m.minAge);
  const t = terms(input);
  return (
    `<div class="cw-rec cw-circle" data-cw-qc="${CIRCLE_V2_QC}">` +
    `<section class="cw-rise cc-view__top" aria-label="Carisma Circle" data-cw-circle="balance" data-cw-jewel-hover>` +
    circleHeroHTML(m, input) +
    `<div class="cc-view__track">${circleTrackHTML({ ...m, onItsWay: m.levelOnItsWay }, { unlocks, poster: input.poster })}</div>` +
    `</section>` +
    `<div id="rewards">${circleRewardsHTML(input.rewards, m.points, { art: input.art, photo: input.photo, pointsPerEuro: m.pointsPerEuro })}</div>` +
    // ADDENDUM KIT-4: "Your card", empty and hidden; browser.ts fills it only when the availability read answers
    // circle.<platform>: true on an iPhone/iPad (Safari) or Android (Chrome) AND the host passed circleWallet.
    `<div class="cw-circle-slot" id="your-card" data-cw-circle-slot="your-card" hidden></div>` +
    (m.levels.length
      ? `<section class="cw-section cw-rise" id="levels" aria-labelledby="cw-circle-levels-title" data-cw-circle="levels">` +
        `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-levels-title">${escapeHtml(`All ${countWord(m.levels.length)} levels`)}</h2></div>` +
        circleLadderHTML(m.levels, m.level, m.pointsPerEuro, { ...input, earnPerEuro: m.earnPerEuro }) +
        `<p class="cw-fine">${escapeHtml("Your level counts what you pay in a calendar year. It lasts the rest of the year you reach it and all of the next.")}</p>` +
        `</section>`
      : "") +
    // BE-i: a perk row only while her own `perks.live` says that perk is switched on.
    circlePerksHTML(input.perks ?? null, { spaDayHref: input.spaDayHref, live: own?.live ?? null }) +
    circleWaysHTML(m) +
    circleActivityHTML(m, input.activity) +
    memberNumberHTML(m) +
    `<p class="cw-fine cw-prose">${escapeHtml(PROMISE_QUALIFIER)}${age ? ` ${escapeHtml(`${age}.`)}` : ""}${t ? ` ${termsLinkHTML(t, "Terms of Carisma Circle")}` : ""}</p>` +
    circlePrefsSlotHTML(input.prefs ?? null, { whatsapp: input.whatsappPref !== false }) +
    circleLeaveFootHTML() +
    `</div>`
  );
}

/** The Credit & rewards page for a member who left: the date, Rejoin, then "Offers and reminders". */
export function circleLeftViewHTML(
  input: { left: CircleLeftModel; prefs?: CirclePrefs | null; firstLevelLabel?: string; whatsappPref?: boolean } | null,
): string {
  if (!input) return "";
  return (
    `<div class="cw-rec cw-circle cw-circle--left" data-cw-qc="${CIRCLE_V2_QC}">` +
    `<section class="cw-circle-left-wrap cw-rise" aria-label="Carisma Circle" data-cw-circle="left-view">` +
    circleLeftCardHTML(input.left, "primary", input.firstLevelLabel ?? "") +
    `</section>` +
    circlePrefsSlotHTML(input.prefs ?? null, { whatsapp: input.whatsappPref !== false }) +
    `</div>`
  );
}

/** R5.4: the Credit & rewards page under the minimum age: one line. */
export function circleMinorViewHTML(minor: { minAge: number | null } | null): string {
  if (!minor) return "";
  return (
    `<div class="cw-rec cw-circle" data-cw-qc="${CIRCLE_V2_QC}"><section class="cw-section cw-rise" data-cw-circle="minor-view">` +
    `<p class="cw-circle__line">${escapeHtml(minorText(minor.minAge))}</p></section></div>`
  );
}

/* ── Leave Carisma Circle (W3) ─────────────────────────────────────────── */

function circleLeaveFootHTML(): string {
  return (
    `<section class="cw-circle-leave" aria-labelledby="cw-circle-leave-title" data-cw-circle="leave">` +
    `<h2 class="cw-label" id="cw-circle-leave-title">Leave Carisma Circle</h2>` +
    `<p class="cw-fine">You can leave at any time. Leaving gives up your Carisma credit, and we show you exactly how much before you confirm.</p>` +
    `<button type="button" class="cw-link cw-circle-leave__btn" data-cw-circle-leave>Leave Carisma Circle</button>` +
    `</section>`
  );
}

/** GET /client/loyalty/leave, read for the confirm sheet. */
export type LeavePreview =
  | { kind: "preview"; points: number; cents: number; warning: string }
  | { kind: "left"; left: CircleLeftModel };

export function readLeavePreview(body: unknown, pointsPerEuro = 0): LeavePreview | null {
  const o = obj(unwrapEnvelope(body));
  if (!o || o.enabled !== true) return null;
  if (o.left === true) {
    const left = readCircleLeft(o);
    return { kind: "left", left: left ?? { leftAt: "" } };
  }
  if (o.left !== false) return null;
  const f = obj(o.forfeit);
  if (!f) return null;
  const points = Math.max(0, int(f.points));
  const ppe = pointsPerEuro > 0 ? pointsPerEuro : 100 / CENTS_PER_POINT;
  const cents = Math.max(0, int(f.cents, Math.round((points * 100) / ppe)));
  const warning =
    str(o.warning).trim() ||
    `If you leave Carisma Circle, your ${creditText(cents)} of Carisma credit (${pointsText(points)}) is forfeited and cannot be restored, even if you rejoin. We stop using your purchase history for the programme.`;
  return { kind: "preview", points, cents, warning };
}

export function leaveSheetBodyHTML(p: LeavePreview | null, state: "loading" | "ready" | "failed", alert = ""): string {
  const err = alert ? `<p class="cw-rs-alert" role="alert">${escapeHtml(alert)}</p>` : "";
  if (state === "loading") {
    return (
      `<div class="cw-cx-summary" aria-hidden="true"><span class="cw-skel cw-skel--line" style="width:40%"></span>` +
      `<span class="cw-skel cw-skel--line" style="width:30%;height:22px"></span></div>` +
      `<p class="cw-vh">Checking your points…</p>`
    );
  }
  if (state === "failed" || !p || p.kind !== "preview") {
    return `<p class="cw-cx-line" role="alert">We couldn't check your points just now. Nothing has changed, so try again in a moment.</p>`;
  }
  return (
    err +
    `<div class="cw-cx-summary cw-cx-summary--bad" data-cw-circle-forfeit>` +
    `<p class="cw-label">You would give up</p>` +
    `<p class="cw-cx-summary__amount" ${M}>${escapeHtml(creditText(p.cents))}</p>` +
    `<p class="cw-circle__points" ${M}>${escapeHtml(pointsText(p.points))}</p>` +
    `</div>` +
    `<p class="cw-cx-line" ${M} data-cw-circle-warning>${escapeHtml(p.warning)}</p>`
  );
}

export function leaveSheetFootHTML(p: LeavePreview | null, busy = false): string {
  const canLeave = Boolean(p && p.kind === "preview");
  const label = busy
    ? "Leaving…"
    : p && p.kind === "preview" && p.cents > 0
      ? `Leave and give up ${creditText(p.cents)}`
      : "Leave Carisma Circle";
  return (
    `<div class="cw-cx-actions">` +
    `<button type="button" class="cw-btn cw-btn--primary" data-cw-dialog-close autofocus${busy ? ' aria-disabled="true"' : ""}>Stay in Carisma Circle</button>` +
    (canLeave
      ? `<button type="button" class="cw-btn cw-btn--danger${busy ? " is-busy" : ""}" data-cw-circle-leave-commit` +
        (busy ? ' aria-disabled="true"' : "") +
        `>${escapeHtml(label)}</button>`
      : "") +
    `</div>`
  );
}

/** POST /client/loyalty/rejoin answered: the member is in again (or never left). */
export function readRejoined(body: unknown): boolean {
  const o = obj(unwrapEnvelope(body));
  return Boolean(o && o.enabled === true && o.left === false);
}

/* ── Offers and reminders (W3) ─────────────────────────────────────────── */

/** The two consent sentences, word for word. One box per channel; never pre-ticked, never rewarded. */
export const OFFERS_EMAIL_SENTENCE =
  "Email me offers and reminders from Carisma Spa, Carisma Aesthetics and Carisma Slimming.";
export const OFFERS_WHATSAPP_SENTENCE =
  "Send me offers and reminders on WhatsApp from Carisma Spa, Carisma Aesthetics and Carisma Slimming.";

export type OffersChannel = "email" | "whatsapp";

export interface CirclePrefsBrand {
  brandId: string;
  name: string;
  offersEmail: boolean;
  offersWhatsapp: boolean;
  canEmail: boolean;
  canWhatsapp: boolean;
}

export interface CirclePrefs {
  left: boolean;
  brands: CirclePrefsBrand[];
}

export function readCirclePrefs(body: unknown): CirclePrefs | null {
  const o = obj(unwrapEnvelope(body));
  if (!o || o.enabled !== true || !Array.isArray(o.brands)) return null;
  const brands = o.brands
    .map(obj)
    .filter((b): b is Record<string, unknown> => Boolean(b && str(b.brandId)))
    .filter((b) => !/medical/i.test(str(b.name)) && str(b.house) !== "medical")
    .map((b) => ({
      brandId: str(b.brandId),
      name: str(b.name),
      offersEmail: b.offersEmail === true,
      offersWhatsapp: b.offersWhatsapp === true,
      canEmail: b.canEmail === true,
      canWhatsapp: b.canWhatsapp === true,
    }));
  return brands.length ? { left: o.left === true, brands } : null;
}

export function offersState(p: CirclePrefs, channel: OffersChannel): { state: "on" | "off" | "mixed"; onFor: string[] } {
  const key = channel === "email" ? "offersEmail" : "offersWhatsapp";
  const onFor = p.brands.filter((b) => b[key]).map((b) => b.name).filter(Boolean);
  const n = p.brands.filter((b) => b[key]).length;
  return { state: n === 0 ? "off" : n === p.brands.length ? "on" : "mixed", onFor };
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function offersErrorText(code: string): string {
  if (code === "LOYALTY_NO_EMAIL") return "We don't have an email address for you yet. Ask the team to add it to your details, then tick this box again.";
  if (code === "LOYALTY_NO_PHONE") return "We don't have a mobile number for you yet. Ask the team to add it to your details, then tick this box again.";
  return "That didn't save, so nothing has changed. Please try again in a moment.";
}

export function offersSavedText(p: CirclePrefs, channel: OffersChannel): string {
  const { state } = offersState(p, channel);
  const how = channel === "email" ? "by email" : "on WhatsApp";
  return state === "off" ? `Saved. No more offers and reminders ${how}.` : `Saved. You'll get offers and reminders ${how}.`;
}

function offersRowHTML(p: CirclePrefs, channel: OffersChannel, busy: boolean): string {
  const { state, onFor } = offersState(p, channel);
  const id = `cw-circle-pref-${channel}`;
  const sentence = channel === "email" ? OFFERS_EMAIL_SENTENCE : OFFERS_WHATSAPP_SENTENCE;
  const note =
    state === "mixed"
      ? `<p class="cw-circle-prefs__note" id="${id}-note" ${M}>${escapeHtml(`On for ${joinNames(onFor)} only. Untick to stop all three.`)}</p>`
      : "";
  return (
    `<div class="cw-circle-prefs__row">` +
    `<input type="checkbox" class="cw-circle-prefs__box" id="${id}" data-cw-circle-pref="${channel}"` +
    (state !== "off" ? " checked" : "") +
    (state === "mixed" ? " data-cw-mixed" : "") +
    (note ? ` aria-describedby="${id}-note"` : "") +
    (busy ? " disabled" : "") +
    `>` +
    `<label class="cw-circle-prefs__label" for="${id}">${escapeHtml(sentence)}</label>` +
    `</div>` +
    note
  );
}

/**
 * "Offers and reminders". `opts.whatsapp: false` (ADDENDUM KIT-6, `circleWhatsappPref`) leaves the WhatsApp box out
 * (the Slimming WhatsApp number is locked by Meta); the default draws both boxes, as before.
 */
export function circlePrefsHTML(
  p: CirclePrefs | null,
  msg?: { text: string; tone: "ok" | "bad" } | null,
  busy = false,
  opts: { whatsapp?: boolean } = {},
): string {
  if (!p) return "";
  const whatsapp = opts.whatsapp !== false;
  return (
    `<section class="cw-section cw-rise cw-circle-prefs" aria-labelledby="cw-circle-prefs-title" data-cw-circle="prefs">` +
    `<div class="cw-section__head"><h2 class="cw-section__title" id="cw-circle-prefs-title">Offers and reminders</h2></div>` +
    `<div class="cw-card cw-circle-prefs__card">` +
    offersRowHTML(p, "email", busy) +
    (whatsapp ? offersRowHTML(p, "whatsapp", busy) : "") +
    `<p class="cw-fine">${
      whatsapp
        ? "Optional, and not needed for Carisma Circle. No credit is given for ticking these. Untick either box at any time to stop."
        : "Optional, and not needed for Carisma Circle. No credit is given for ticking this. Untick it at any time to stop."
    }</p>` +
    `<p class="cw-circle-prefs__msg${msg ? ` cw-circle-prefs__msg--${msg.tone}` : ""}" role="status" aria-live="polite" data-cw-circle-pref-msg>${msg ? escapeHtml(msg.text) : ""}</p>` +
    `</div>` +
    `</section>`
  );
}

export function circlePrefsSlotHTML(p: CirclePrefs | null, opts: { whatsapp?: boolean } = {}): string {
  return `<div class="cw-circle-slot" data-cw-circle-slot="prefs">${circlePrefsHTML(p, null, false, opts)}</div>`;
}

/* ── The credit moment (thank-you page, any brand site) ────────────────── */

export interface CreditMomentInput {
  /** What THIS bill gives, in cents and points (the server's figures). */
  earnedCents: number;
  earnedPoints?: number;
  /**
   * The signed-in member's own read. `null` for a guest: a guest page never
   * carries a balance (a guest checkout can name anyone's email).
   */
  member: CircleModel | null;
  /** The switched-on brands (from the member read, or the public status for a guest). */
  brands?: CircleBrand[];
  /** The booking has a line that never earns (a medical / excluded treatment). */
  hasExcludedLine: boolean;
  /** A line was paid with points: that booking earns nothing on it. */
  paidWithPoints?: { points: number } | null;
  /** Booked, not paid yet ("on its way", never "received"). */
  unpaid?: boolean;
  /** The programme's rate (the API's `rules.pointsPerEuro`), for a figure sent without its points. */
  pointsPerEuro?: number;
}

export interface CreditMoment {
  /**
   * `earned`   — a member: the Hero with the CEO sentence and the earned conditions;
   * `received` — a guest: this bill's figure + the sentence (never a balance);
   * `paid`     — paid with points: one quiet line + "This treatment earns no points";
   * `onTheWay` — unpaid: "€11.90 · 238 points on the way when you pay";
   * `none`     — nothing on this page (off, an excluded line, no figure).
   */
  kind: "earned" | "received" | "paid" | "onTheWay" | "none";
  hero: string;
  sentence: string;
  conditions: string;
  quiet: string;
  /**
   * "Paid with points · 2,180 points · This treatment earns no points" when a line of this bill was paid with
   * points, else "". On a bill with money lines too, the moment stays the earned one (what the paid lines gave)
   * and this line is drawn beside it for the points line.
   */
  paidLine: string;
}

const NONE: CreditMoment = { kind: "none", hero: "", sentence: "", conditions: "", quiet: "", paidLine: "" };

export function creditMoment(input: CreditMomentInput | null | undefined): CreditMoment {
  if (!input || input.hasExcludedLine === true) return NONE;
  const paidLine =
    input.paidWithPoints && input.paidWithPoints.points > 0
      ? `Paid with points · ${pointsText(input.paidWithPoints.points)} · This treatment earns no points`
      : "";
  const earned = Math.round(Number(input.earnedCents) || 0);
  // Only a line paid with points, nothing paid with money: the one quiet line.
  if (paidLine && earned <= 0) return { kind: "paid", hero: "", sentence: "", conditions: "", quiet: paidLine, paidLine };
  if (earned <= 0) return NONE;
  const points = Math.max(0, Math.round(Number(input.earnedPoints) || 0));
  if (input.unpaid) {
    const given = input.pointsPerEuro ?? input.member?.pointsPerEuro ?? 0;
    const ppe = given > 0 ? given : 100 / CENTS_PER_POINT;
    return {
      kind: "onTheWay",
      hero: "",
      sentence: "",
      conditions: "",
      quiet: onTheWayText(earned, points || Math.round((earned * ppe) / 100)),
      paidLine,
    };
  }
  const brands = input.member?.brands.length ? input.member.brands : input.brands ?? [];
  if (input.member) {
    return {
      kind: "earned",
      hero: creditText(input.member.creditCents),
      sentence: gainText(earned, brands, input.member.affordable),
      conditions: CONDITIONS_EARNED,
      quiet: "",
      paidLine,
    };
  }
  return {
    kind: "received",
    hero: creditText(earned),
    sentence: gainText(earned, brands, false),
    conditions: CONDITIONS_EARNED,
    quiet: "",
    paidLine,
  };
}

/**
 * floor(eligible euros × points per €1 × multiplier) points — euros paid, VAT-inclusive (BRIEF §2 Earning).
 * `earnPerEuro` is the API's `rules.earnPerEuro` (1 point per €1 today; 1 only as the fallback).
 */
export function earnPoints(eligibleCents: number, multiplier = 1, earnPerEuro = 1): number {
  const euros = Math.max(0, Number(eligibleCents) || 0) / 100;
  const mm = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  const per = Number.isFinite(earnPerEuro) && earnPerEuro > 0 ? earnPerEuro : 1;
  return Math.floor(euros * per * mm + 1e-9);
}

/** The member model as the menu summary (the account page has the full read). */
export { summaryOf as circleSummaryOf };
