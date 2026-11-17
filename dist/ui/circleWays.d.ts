import { type CircleAction, type CircleModel } from "./circleCore.js";
/** "+€2.50 · 50 points". */
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
 * The account overview's "More ways to earn": one card per open action, ONE
 * figure each (board 10), Instagram cards carry the Follow link. "" when
 * everything is done or nothing was sent.
 */
export declare function circleWaysCardsHTML(m: CircleModel | null): string;
//# sourceMappingURL=circleWays.d.ts.map