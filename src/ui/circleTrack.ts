/**
 * Carisma Circle v2 — the LEVEL TRACK (surfaces R5.3; CEO 17 Nov: "showcase a
 * bit of a progress bar ... so they can upgrade to the next level and unlock
 * additional benefits"). carisma-circle-v2-20261117.
 *
 * Her jewel — a bar — the next stone; how far it is ("€960 of €1,000 paid this
 * year"); what the next level unlocks (from the API's `nextLevelPerks` against
 * her own `perks`, or the `levels[]` table). One track per Circle block. At the
 * top level the bar runs to the edge and there is no next stone. Never a bar
 * without the next stone.
 */
import { escapeHtml } from "./html.js";
import { jewelSlotHTML } from "./circleMark.js";
import {
  M,
  creditText,
  levelSentenceText,
  rateText,
  wholeEuroDown,
  wholeEuroUp,
  type CircleLevelRule,
  type CircleLevelView,
  type CirclePerkSet,
} from "./circleCore.js";

export interface TrackInput {
  level: CircleLevelView;
  nextLevel: (CircleLevelView & { thresholdCents: number }) | null;
  progressBp: number;
  toNextLevelCents: number;
  levelSentence: string;
  heldUntil?: string;
  /** Paid this year (the member read sends it; the summary does not, so it is derived from the gap). */
  spendThisYearCents?: number | null;
}

export interface TrackOptions {
  /** 44 px jewels and no list (the menu, the pay step). Default 56 px. */
  compact?: boolean;
  /** The list of what the next level unlocks (the account). */
  unlocks?: string[] | null;
  /** One line instead of the list (the menu). */
  unlockLine?: string;
  /** false = leave the sentence above the bar out (the surface already said it). */
  head?: boolean;
  /** Poster for a slot, by gem and kind (the site's `/circle/jewel/v1/<gem>-<kind>.webp`). */
  poster?: ((gem: string, kind: "small" | "full" | "icon") => string) | null;
}

const ORDINAL = ["", "", "second", "third", "fourth", "fifth"];

function paidThisYear(t: TrackInput): number | null {
  if (typeof t.spendThisYearCents === "number" && t.spendThisYearCents >= 0) return t.spendThisYearCents;
  if (!t.nextLevel || t.nextLevel.thresholdCents <= 0) return null;
  return Math.max(0, t.nextLevel.thresholdCents - Math.max(0, t.toNextLevelCents));
}

/** "€960 of €1,000 paid this year" — "" at the top level or when the figures are not known. */
export function paidLineText(t: TrackInput): string {
  if (!t.nextLevel || t.nextLevel.thresholdCents <= 0) return "";
  const paid = paidThisYear(t);
  if (paid === null) return "";
  return `${wholeEuroDown(paid)} of ${wholeEuroUp(t.nextLevel.thresholdCents)} paid this year`;
}

/**
 * What a level adds over the one before it (the reason to reach it), from the
 * API's perks. `pointsPerEuro` turns a multiplier into the share back.
 */
export function unlocksList(cur: CirclePerkSet | null, next: CirclePerkSet | null, pointsPerEuro: number): string[] {
  if (!next) return [];
  const a: CirclePerkSet = cur ?? { multiplier: 0, birthdayCreditCents: 0, freeSpaDaysPerYear: 0, earlyAccessHours: 0, noDeposit: false };
  const out: string[] = [];
  if (next.multiplier > a.multiplier) {
    const to = rateText(next.multiplier, pointsPerEuro);
    const from = rateText(a.multiplier, pointsPerEuro);
    if (to) out.push(`${to} back in Carisma credit${from ? `, up from ${from}` : ""}`);
  }
  if (next.freeSpaDaysPerYear > a.freeSpaDaysPerYear) {
    const n = next.freeSpaDaysPerYear;
    out.push(n === 1 ? "A free Spa day every year" : `A ${ORDINAL[n] || `${n}th`} free Spa day every year`);
  }
  if (next.birthdayCreditCents > a.birthdayCreditCents) {
    out.push(
      `${creditText(next.birthdayCreditCents)} birthday credit` +
        (a.birthdayCreditCents > 0 ? `, up from ${creditText(a.birthdayCreditCents)}` : ""),
    );
  }
  if (next.earlyAccessHours > a.earlyAccessHours) out.push(`Sales and offers ${next.earlyAccessHours} hours early`);
  // D7: no deposit applies to desk, phone and Cara bookings only (online keeps its payment).
  if (next.noDeposit && !a.noDeposit) out.push("No deposit when you book by phone or at the desk");
  return out;
}

/** Everything a level gives (the account's "What Level 3 · Ruby gives you"). */
export function benefitsList(p: CirclePerkSet | null, pointsPerEuro: number): string[] {
  if (!p) return [];
  const out: string[] = [];
  const r = rateText(p.multiplier, pointsPerEuro);
  if (r) out.push(`${r} back in Carisma credit`);
  if (p.birthdayCreditCents > 0) out.push(`${creditText(p.birthdayCreditCents)} birthday credit`);
  if (p.freeSpaDaysPerYear > 0) {
    out.push(p.freeSpaDaysPerYear === 1 ? "A free Spa day every year" : `${p.freeSpaDaysPerYear} free Spa days every year`);
  }
  if (p.earlyAccessHours > 0) out.push(`Sales and offers ${p.earlyAccessHours} hours early`);
  if (p.noDeposit) out.push("No deposit when you book by phone or at the desk");
  return out;
}

/** One line for tight places: "Level 4 · Sapphire unlocks 8.75% back and a second free Spa day every year". */
export function unlockLineText(nextLabel: string, unlocks: string[]): string {
  if (!nextLabel || !unlocks.length) return "";
  const short = unlocks.map((x) => x.replace(/,? up from .*/, "").replace(" in Carisma credit", ""));
  const second = short[1] ? ` and ${short[1].charAt(0).toLowerCase()}${short[1].slice(1)}` : "";
  return `${nextLabel} unlocks ${short[0]}${second}`;
}

/** The perks the API gives for the level after hers: `nextLevelPerks`, else that level's row in `levels[]`. */
export function nextPerksOf(
  m: { nextLevel: CircleLevelView | null; nextLevelPerks: CirclePerkSet | null; levels: CircleLevelRule[] },
): CirclePerkSet | null {
  if (!m.nextLevel) return null;
  if (m.nextLevelPerks) return m.nextLevelPerks;
  const row = m.levels.find((l) => l.key === m.nextLevel?.key);
  return row ?? null;
}

/** Her own perks: `perks`, else her level's row in `levels[]`. */
export function ownPerksOf(m: { level: CircleLevelView; perks: CirclePerkSet | null; levels: CircleLevelRule[] }): CirclePerkSet | null {
  return m.perks ?? m.levels.find((l) => l.key === m.level.key) ?? null;
}

/** The track as HTML. "" for a null input. */
export function circleTrackHTML(t: TrackInput | null, opts: TrackOptions = {}): string {
  if (!t) return "";
  const top = !t.nextLevel;
  const h = opts.compact ? 44 : 56;
  const pct = top ? 100 : Math.max(0, Math.min(100, Math.round(t.progressBp / 100)));
  const paid = paidLineText(t);
  const sentence = levelSentenceText(t);
  const poster = opts.poster ?? null;
  const slot = (gem: string, p: number) =>
    jewelSlotHTML({ gem: gem as CircleLevelView["key"], progress: p, height: h, kind: "small", poster: poster ? poster(gem, "small") : undefined });
  const aria = top ? t.level.label : paid || `${pct}% of the way to ${t.nextLevel?.label ?? ""}`;
  const bar =
    `<div class="cc-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${escapeHtml(aria)}">` +
    `<i style="width:${pct}%"></i></div>`;
  const head = opts.head === false || !sentence ? "" : `<p class="cc-track-h" ${M}>${escapeHtml(sentence)}</p>`;
  const cap =
    top || !paid
      ? ""
      : `<p class="cc-track-cap" ${M}><span>${escapeHtml(paid)}</span><span>${escapeHtml(t.nextLevel?.label ?? "")}</span></p>`;
  const list = !top && opts.unlocks && opts.unlocks.length
    ? `<div class="cc-unlocks"><p class="cc-eyebrow">${escapeHtml(`${t.nextLevel?.label ?? ""} unlocks`)}</p>` +
      `<ul>${opts.unlocks.map((u) => `<li>${escapeHtml(u)}</li>`).join("")}</ul></div>`
    : "";
  const line = !top && !list && opts.unlockLine ? `<p class="cc-track-line">${escapeHtml(opts.unlockLine)}</p>` : "";
  return (
    `<div class="cc cc-track${opts.compact ? " compact" : ""}" data-cw-circle="track">` +
    head +
    `<div class="cc-track-row${top ? " top" : ""}" ${M}>` +
    slot(t.level.key, t.progressBp / 10000) +
    bar +
    (top || !t.nextLevel ? "" : slot(t.nextLevel.key, 0)) +
    `</div>` +
    cap +
    list +
    line +
    `</div>`
  );
}
