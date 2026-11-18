export interface CircleReward {
    brandName: string;
    brandSlug: string;
    house: string;
    serviceId: string;
    serviceOptionId: string;
    name: string;
    durationMinutes: number;
    fromCents: number;
    fromPoints: number;
    /** null on the public featured read (it never says what a visitor can afford). */
    affordable: boolean | null;
    /** The catalogue's own photo of the service (BE-2 §8 ask), https only; "" when the API sends none. */
    imageUrl: string;
}
/**
 * Under the reward cards: counsel's corrected sentence (surface-consistency row 26), word for word, as the v1
 * kit shipped it under its old name. Still true in v2: a reward is one whole treatment, paid in full, and at
 * the desk it is the card in the Carisma app. A rewrite needs counsel's OK first.
 */
export declare const REWARDS_FOOT = "Rewards are paid in full with credit: show your card in the Carisma app at the desk. Prices include VAT.";
/** A photo and a booking link the site knows for a service id. */
export type CircleRewardArt = Record<string, {
    img?: string;
    href?: string;
} | undefined>;
/**
 * ADDENDUM X3/KIT-3: the host's own photo for a featured service (the brand site's library), or null. Asked
 * before the API's `imageUrl`; with neither, the card is words only (never a stock image).
 */
export type CircleRewardPhoto = (item: CircleReward) => {
    src: string;
    alt?: string;
} | null | undefined;
/** Either read → the items, or null (off, 404, garbage). Carisma Medical is dropped if it ever came. */
export declare function readCircleRewards(body: unknown): CircleReward[] | null;
/** "Anti-Stress Massage, 55 min" (the duration only when the name does not already say it). */
export declare function rewardTitle(r: CircleReward): string;
/**
 * Yours now (the best her points pay for today: the server's `affordable`),
 * Next up (the nearest she cannot yet pay), One day (the one to aim for).
 */
export declare function rewardGroups(items: CircleReward[], balancePoints: number): {
    now: CircleReward | null;
    next: CircleReward | null;
    dream: CircleReward | null;
};
/** R5.3 on the pay step: "€38.00 more and your points pay for Anti-Stress Massage, 55 min". "" when none. */
export declare function nextRewardText(items: CircleReward[] | null, balancePoints: number, pointsPerEuro: number): string;
/**
 * The photo cards: Yours now / Next up / One day. `balancePoints` = her
 * balance (the gap lines); for a visitor pass null (public featured: each card
 * shows its price only). "" when there is nothing to show.
 */
export declare function circleRewardsHTML(items: CircleReward[] | null, balancePoints: number | null, opts?: {
    art?: CircleRewardArt;
    photo?: CircleRewardPhoto;
    pointsPerEuro?: number;
    scroll?: boolean;
    title?: string;
    foot?: string;
}): string;
/** The account menu's "Yours now" row: the treatment's photo, its name, what it costs. "" when nothing is affordable. */
export declare function circleNowRowHTML(items: CircleReward[] | null, art?: CircleRewardArt, photo?: CircleRewardPhoto): string;
//# sourceMappingURL=circleFeatured.d.ts.map