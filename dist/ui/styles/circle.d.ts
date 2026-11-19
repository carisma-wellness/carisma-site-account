/**
 * Carisma Circle: the Overview card set, the Credit & rewards page, the
 * wallet line. Same contract as every portal sheet: each rule starts
 * `.carisma-portal` and reads only `var(--cw-account-*)` (no raw colour —
 * test/portal-wave1.test.mjs reads PORTAL_RULES_CSS for hex and rgba).
 *
 * A Circle slot is drawn `hidden` and stays out of the layout until
 * browser.ts fills it, so a site whose member read answers enabled:false
 * renders pixel-for-pixel what it rendered before.
 */
export declare const PORTAL_CIRCLE_CSS: string;
/**
 * The header-panel row. The panel sheet (chromeCss.ts) is not under
 * `.carisma-portal`, so these rules are scoped to `.carisma-panel__circle`.
 */
/**
 * Circle v2 parts (carisma-circle-v2-20261117): the jewel slot, the level, the
 * balance, the reading, the track, the Hero, the ink pill, the reward photo
 * cards, the ladder, ways to earn, perks. One generator, every rule under the
 * caller's scope and token-only, so the portal, the header panel and a site's
 * own wrapper (the Spa's pay step, thank-you page, programme page) draw the
 * same parts from the same source.
 */
export declare function circlePartsCSS(scope: string): string;
export declare const PANEL_CIRCLE_CSS: string;
//# sourceMappingURL=circle.d.ts.map