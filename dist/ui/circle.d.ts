export declare const CIRCLE_QC = "carisma-circle-20261115";
export declare const CIRCLE_HREF = "/account/rewards";
/** Every brand a member can earn at and spend at, in customer words. */
export declare const CIRCLE_BRANDS = "Carisma Spa, Aesthetics and Slimming";
/** 20 points = €1, so a point is 5 cents (Bible pointValue). */
export declare const CENTS_PER_POINT = 5;
export declare const DEFAULT_MIN_REDEEM_POINTS = 100;
export declare const DEFAULT_MAX_SHARE_PCT = 50;
export declare const PROMISE_QUALIFIER = "Medical treatments prescribed or performed by a doctor, fees and tips don't earn credit. Gift cards earn for the person who uses them.";
export declare const EARN_TERMS_LINE = "No credit is given for reviews, ratings, follows, posts, tags or shares.";
/** The five levels, in order. Names and numerals are fixed by the Bible; thresholds are euros a calendar year. */
export declare const CIRCLE_LEVELS: ReadonlyArray<{
    key: string;
    name: string;
    numeral: string;
    thresholdEur: number;
}>;
/** The verb-gap only shows when one visit closes it (Bible tierRules.nudgeGapRule; €150 = the new-member figure). */
export declare const GAP_NUDGE_MAX_CENTS = 15000;
export interface CircleLevelView {
    key: string;
    name: string;
    numeral: string;
    /** 0..4 on the ladder. */
    index: number;
}
export interface CircleAction {
    key: string;
    label: string;
    points: number;
    cents: number;
    done: boolean;
}
export interface CircleModel {
    creditCents: number;
    points: number;
    minRedeemCents: number;
    /** The balance can be used now (≥ the minimum redemption). */
    ready: boolean;
    /** How much more credit until it can be used; 0 when ready. */
    toReadyCents: number;
    maxSharePct: number;
    level: CircleLevelView;
    nextLevel: (CircleLevelView & {
        thresholdCents: number;
    }) | null;
    spendThisYearCents: number;
    headStartCents: number;
    toNextLevelCents: number;
    pendingCents: number;
    expiring: {
        cents: number;
        date: string;
    } | null;
    nextVisitCredit: {
        cents: number;
        useBy: string;
    } | null;
    passport: {
        spa: boolean;
        aesthetics: boolean;
        slimming: boolean;
        count: number;
    };
    actions: CircleAction[];
    actionsDone: number;
    actionsLeftCents: number;
}
/** True on every site that may show the Circle. Carisma Medical never does. */
export declare function circleAllowedOn(siteBrand?: string): boolean;
/**
 * `/client/loyalty/me` → the model, or null when the programme is not live for
 * this member. Null for: `enabled` anything but `true`, no credit block, an
 * unknown level, a non-object body, an envelope around any of those.
 */
export declare function readCircle(body: unknown): CircleModel | null;
/** "€62.00" — credit is always two decimals. */
export declare function creditText(cents: number): string;
/** "1,240 points" / "1 point". */
export declare function pointsText(points: number): string;
/** "€40" — level-spend euros are whole and rounded UP (never undersell a gap). */
export declare function wholeEuroUp(cents: number): string;
/** "III Golden Hour" — a level never appears without its numeral. */
export declare function levelText(l: {
    numeral: string;
    name: string;
}): string;
/** "€20.00 of it until 7 Dec" — the soonest use-by, so nothing lapses unseen. "" when none. */
export declare function useByText(m: CircleModel): string;
/** "€62.00 ready to use", or below the minimum "€3.25 Carisma credit · €1.75 more and you can use it". */
export declare function readyText(m: CircleModel): string;
/**
 * "Spend €40 more this year to reach Moonlight" — only when one visit closes
 * the gap (≤ €150); otherwise "" and the bar alone tells the story.
 */
export declare function gapText(m: CircleModel, cap?: number): string;
/** "2 of 5 done · €29.00 more to earn". */
export declare function waysToEarnText(m: CircleModel): string;
/** Progress toward the next level, 0..100, including the Welcome start segment. */
export declare function levelProgress(m: CircleModel): {
    spentPct: number;
    headStartPct: number;
};
/** The five-step ladder, current step marked. Numerals always shown. */
export declare function ladderHTML(level: CircleLevelView, cls?: string): string;
/**
 * The header-panel row: "€62.00 ready to use", points and the soonest use-by,
 * the level with its ladder, the verb-gap when one visit closes it. One link
 * to Credit & rewards. "" when the model is null.
 */
export declare function circlePanelRowHTML(m: CircleModel | null): string;
/** The Overview card set: credit, level, ways to earn. "" when null. */
export declare function circleOverviewHTML(m: CircleModel | null): string;
/**
 * Carisma credit as its own line in the Wallet, NOT added to "Available to
 * spend" (it covers up to half of a booking, so summing it would overstate
 * what a member can pay with). "" when null.
 */
export declare function circleWalletLineHTML(m: CircleModel | null): string;
export interface CircleActivityItem {
    id: string;
    at: string;
    brand: string;
    label: string;
    points: number;
    cents: number;
    status: string;
    expiresAt: string | null;
}
export declare function readCircleActivity(body: unknown): {
    items: CircleActivityItem[];
    nextCursor: string | null;
} | null;
export declare function circleActivityRowsHTML(items: CircleActivityItem[]): string;
export interface CircleReward {
    id: string;
    brand: string;
    name: string;
    points: number;
    valueCents: number;
    levelLock: string;
    discovery: boolean;
    discoveryPoints: number | null;
    affordable: boolean;
}
export declare function readCircleRewards(body: unknown): CircleReward[] | null;
/** "Yours now" (all affordable, server order) then at most two "Next up", nearest first. */
export declare function shopGroups(items: CircleReward[]): {
    now: CircleReward[];
    next: CircleReward[];
};
export declare function circleShopHTML(items: CircleReward[] | null, m: CircleModel): string;
export interface CircleViewInput {
    me: CircleModel;
    activity: {
        items: CircleActivityItem[];
        nextCursor: string | null;
    } | null;
    rewards: CircleReward[] | null;
    bookHref?: string;
}
export declare function circleActivityHTML(m: CircleModel, activity: CircleViewInput["activity"]): string;
/** The whole Credit & rewards page body. "" when the member read is null. */
export declare function circleViewHTML(input: CircleViewInput | null): string;
export interface CreditMomentInput {
    /** What THIS bill gave, in cents. */
    earnedCents: number;
    /**
     * The spendable balance after this bill, in cents — ONLY from the signed-in
     * member's own read. `null` when unknown: a guest page never carries a
     * balance (a guest checkout can name anyone's email, so the guest-session
     * answer leaves the balance and the account state out on purpose).
     */
    balanceCents: number | null;
    /** The booking has a line that never earns (a medical / excluded treatment). */
    hasExcludedLine: boolean;
    /** The soonest use-by part of the credit, when there is one. */
    useBy?: {
        cents: number;
        date: string;
    } | null;
    minRedeemCents?: number;
}
export interface CreditMoment {
    /**
     * `hero`     — balance known: "€62.00 ready to use" + the CEO sentence + the conditions line;
     * `received` — balance NOT known (a guest) and this bill alone reaches the minimum:
     *              the bill's figure + the CEO sentence + the conditions line;
     * `quiet`    — one line ("€3.25 added … €1.75 more and you can use it.", or,
     *              balance unknown, just "€3.25 added to your Carisma credit.");
     * `none`     — nothing on this page (no credit, or an excluded line: that visit
     *              is a quiet ledger entry in the account, never a thank-you hero).
     */
    kind: "hero" | "received" | "quiet" | "none";
    /** The big figure: "€62.00 ready to use" (hero) or "€15.45" (received). */
    hero: string;
    sentence: string;
    /** The conditions line, without "Terms" (the page links its own terms). */
    conditions: string[];
    quiet: string;
}
/**
 * The Bible's render rule (storeCredit.renderRule), in one place for every
 * site: the hero and "You can use it already" only when this bill gave credit,
 * the spendable balance is at least €5.00 and there is no excluded line;
 * otherwise the one quiet line; an excluded line shows nothing here. With the
 * balance unknown, "You can use it already" is said only when THIS bill alone
 * reaches the minimum (then the balance does too), and the figure is the
 * bill's — never a balance we were not given.
 */
export declare function creditMoment(input: CreditMomentInput | null | undefined): CreditMoment;
/** The pay-step disclosure (Bible storeCredit.payStepDisclosure), word for word. */
export declare const PAY_STEP_DISCLOSURE = "If you cancel, the credit this booking gives you is removed; if you've already used it, its value comes off your refund.";
/**
 * "You'll receive €X in Carisma credit" for a pre-payment line, from the euros
 * a booking will charge on eligible lines and the member's level multiplier.
 * floor(euros × multiplier) points, 20 points = €1 (Bible amountRule). Returns
 * "" below one point. `from` prefixes "from" for a price that is a floor.
 */
export declare function earnLine(eligibleCents: number, multiplier?: number, from?: boolean): string;
/** floor(eligible euros × multiplier) points — whole euros paid, VAT-inclusive. */
export declare function earnPoints(eligibleCents: number, multiplier?: number): number;
//# sourceMappingURL=circle.d.ts.map