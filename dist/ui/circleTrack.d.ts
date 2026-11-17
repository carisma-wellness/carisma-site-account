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
 * API's perks. `pointsPerEuro` turns a multiplier into the share back.
 */
export declare function unlocksList(cur: CirclePerkSet | null, next: CirclePerkSet | null, pointsPerEuro: number): string[];
/** Everything a level gives (the account's "What Level 3 · Ruby gives you"). */
export declare function benefitsList(p: CirclePerkSet | null, pointsPerEuro: number): string[];
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
/** The track as HTML. "" for a null input. */
export declare function circleTrackHTML(t: TrackInput | null, opts?: TrackOptions): string;
//# sourceMappingURL=circleTrack.d.ts.map