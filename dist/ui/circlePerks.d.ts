import { type CirclePerksLive } from "./circleCore.js";
export interface CirclePerkUpcoming {
    kind: string;
    id: string;
    name: string;
    brandSlug: string;
    opensAt: string;
    opensAtForYou: string;
}
export interface CirclePerks {
    year: number;
    spaDays: {
        entitlement: number;
        used: number;
        left: number;
        serviceIds: string[];
        resetsOn: string;
    } | null;
    noDeposit: {
        active: boolean;
        fromLabel: string;
    };
    earlyAccess: {
        hours: number;
        upcoming: CirclePerkUpcoming[];
    };
}
/** `GET /client/loyalty/perks` → the model, or null (off, left, 404, garbage). */
export declare function readCirclePerks(body: unknown): CirclePerks | null;
/** "1 free Spa day this year · 1 left" / "2 free Spa days this year · 1 left". "" when none. */
export declare function spaDaysText(p: CirclePerks): string;
/**
 * The perks block. "" when nothing in the read is worth a line. `spaDayHref` = where "Book it" goes.
 *
 * `live` is her own `/me.perks.live` (ADDENDUM X2 / BE-i): a row is drawn only while ITS perk is switched on —
 * the Spa days with `spaDays`, the early-access line with `earlyAccess` (and something upcoming, R5.7), no deposit
 * with `noDeposit`. Without `live` nothing is switched on, so nothing is drawn: the terms do not promise them yet.
 */
export declare function circlePerksHTML(p: CirclePerks | null, opts?: {
    spaDayHref?: string | null;
    live?: Partial<CirclePerksLive> | null;
}): string;
//# sourceMappingURL=circlePerks.d.ts.map