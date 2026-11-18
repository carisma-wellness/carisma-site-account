import { type CircleAction, type CircleModel } from "./circleCore.js";
/** "+€2.50 · 50 points" — one figure, euro first, never broken inside (board 10's `fig`). */
export declare function actionValueText(a: {
    cents: number;
    points: number;
}): string;
/** "3 of 6 done · €30.00 more to earn". "" when the server sent no actions. */
export declare function waysSummaryText(m: CircleModel): string;
/** The Instagram tap target: the brand's own profile, in a new tab; browser.ts adds the award. */
export declare function instagramLinkHTML(a: CircleAction, label?: string): string;
/** The Ways to earn section. "" when the member read is null. */
export declare function circleWaysHTML(m: CircleModel | null, opts?: {
    title?: string;
}): string;
/**
 * The account overview's "More ways to earn" (ADDENDUM KIT-2, board 10): a card each, ONE figure each, every figure
 * the server's. In the board's order: "Book your next visit before you leave" (only from `/me.rebookNext`, BE-k),
 * "Spa products" (only with the public status's retail boost and Carisma Spa switched on), the brand bonuses
 * (Full Circle; X10 drops them while one house is on), "Refer a friend" (only while `/me.referral` pays her in
 * points, X8/BE-j: never a typed 2,000), "Follow … on Instagram" (from `/me.actions`), then any other open action.
 * "" when there is nothing to earn.
 */
export declare function circleWaysCardsHTML(m: CircleModel | null, opts?: {
    retailBoostPct?: number | null;
}): string;
//# sourceMappingURL=circleWays.d.ts.map