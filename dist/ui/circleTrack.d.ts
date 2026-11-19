import { type CircleLevelRule, type CircleLevelView, type CirclePerkSet } from "./circleCore.js";
export interface TrackInput {
    level: CircleLevelView;
    nextLevel: (CircleLevelView & {
        thresholdCents: number;
    }) | null;
    progressBp: number;
    toNextLevelCents: number;
    levelSentence: string;
    heldUntil?: string;
    /** Paid this year (the member read sends it; the summary does not, so it is derived from the gap). */
    spendThisYearCents?: number | null;
    /**
     * ADDENDUM X2 / BE-c: a booked visit that takes her to the next level — the head is then the SERVER's sentence
     * ("Your visit on Fri 20 Nov takes you to Level 4 · Sapphire") and the caption's right end says what is left
     * ("€40 to go"). Absent or null: the gap sentence and the next level's name. Never made up from local maths.
     * The pay step passes the earn preview's `levelAfterVisit` here (this visit), never `/me`'s booked visit.
     */
    onItsWay?: {
        sentence: string;
    } | null;
    /**
     * BE-4 (W-4): this year's booked, not yet paid eligible spend in cents — the bar's hatched "on its way" end, from
     * her progress onward (ADDENDUM X2: "drawn only when the API sends the lift"). A visit on its way (`onItsWay`)
     * crosses the threshold, so the hatch then runs to the next stone whatever this says. null/absent: no hatch.
     */
    pendingSpendCents?: number | null;
    /**
     * The API's level table (`/me.levels`, a member model spread in carries it): her level's own threshold places the
     * hatch on the bar. Without it (the summary) only a visit that crosses draws a hatch (to the next stone).
     */
    levels?: ReadonlyArray<{
        key: string;
        thresholdCents: number;
    }>;
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
/** "€960 of €1,000 paid this year" — "" at the top level or when the figures are not known. */
export declare function paidLineText(t: TrackInput): string;
/**
 * What a level adds over the one before it (the reason to reach it), from the
 * API's perks. `pointsPerEuro` (and `earnPerEuro`, points per €1 before the
 * multiplier) turn a multiplier into the share back.
 *
 * Early access to sales is NOT listed (nor in `benefitsList`): it reaches only
 * offers opened in the Carisma account, not the website's offer pages or
 * Klaviyo sends, and its wording waits on the CEO and the advocate (RECONCILED
 * Q5; R5.7 keeps the one perks line, drawn only with something upcoming).
 *
 * ADDENDUM X2 / BE-i: a free Spa day and no deposit are listed ONLY while the API
 * marks that perk live (`live.spaDays`, `live.noDeposit`); the values alone say
 * nothing (BE-1 sends them from Ruby up whether or not the perk is switched on,
 * and the terms do not promise them yet). The rate and the birthday credit are
 * not perks and always show.
 */
export declare function unlocksList(cur: CirclePerkSet | null, next: CirclePerkSet | null, pointsPerEuro: number, earnPerEuro?: number): string[];
/** Everything a level gives (the account's "What Level 3 · Ruby gives you"). Perks only while live (X2 / BE-i). */
export declare function benefitsList(p: CirclePerkSet | null, pointsPerEuro: number, earnPerEuro?: number): string[];
/** One line for tight places: "Level 4 · Sapphire unlocks 8.75% back and a second free Spa day every year". */
export declare function unlockLineText(nextLabel: string, unlocks: string[]): string;
/** The perks the API gives for the level after hers: `nextLevelPerks`, else that level's row in `levels[]`. */
export declare function nextPerksOf(m: {
    nextLevel: CircleLevelView | null;
    nextLevelPerks: CirclePerkSet | null;
    levels: CircleLevelRule[];
}): CirclePerkSet | null;
/** Her own perks: `perks`, else her level's row in `levels[]`. */
export declare function ownPerksOf(m: {
    level: CircleLevelView;
    perks: CirclePerkSet | null;
    levels: CircleLevelRule[];
}): CirclePerkSet | null;
/**
 * The hatched end's width in percent of the bar (0 = none): to the next stone when a visit on its way crosses, else
 * where this year's paid spend plus the booked spend would put the bar, from the API's own figures — her level's
 * threshold (`levels[]`), the next level's, and this year's paid spend. A level held over from last year whose spend
 * this year is still below its own threshold shows the bar at 0, and booked spend that stays below that threshold
 * moves nothing, so it draws nothing (review WEB-3 major #2). Without her level's threshold: no partial hatch.
 */
export declare function liftPct(t: TrackInput, pct: number): number;
/** The track as HTML. "" for a null input. */
export declare function circleTrackHTML(t: TrackInput | null, opts?: TrackOptions): string;
//# sourceMappingURL=circleTrack.d.ts.map