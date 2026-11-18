import { summaryOf, type CircleBrand, type CircleLeftModel, type CircleLevelRule, type CircleLevelView, type CircleModel, type CircleSummary, type CircleSummaryState } from "./circleCore.js";
import { type CirclePerks } from "./circlePerks.js";
import { type CircleReward, type CircleRewardArt, type CircleRewardPhoto } from "./circleFeatured.js";
export * from "./circleCore.js";
export { asGemKey, circleMarkSVG, jewelSlotHTML, progressFraction, CIRCLE_GEM_KEYS, type CircleGemKey } from "./circleMark.js";
export { benefitsList, circleTrackHTML, nextPerksOf, ownPerksOf, paidLineText, unlockLineText, unlocksList, type TrackInput, type TrackOptions, } from "./circleTrack.js";
export { actionValueText, circleWaysCardsHTML, circleWaysHTML, instagramLinkHTML, waysSummaryText } from "./circleWays.js";
export { circlePerksHTML, readCirclePerks, spaDaysText, type CirclePerks, type CirclePerkUpcoming } from "./circlePerks.js";
export { circleNowRowHTML, circleRewardsHTML, REWARDS_FOOT, nextRewardText, readCircleRewards, rewardGroups, rewardTitle, type CircleReward, type CircleRewardArt, type CircleRewardPhoto, } from "./circleFeatured.js";
/** Same literal as panel.ts ACCOUNT_DETAILS_HREF (not imported: panel.ts imports this module). */
export declare const REJOIN_LABEL = "Rejoin Carisma Circle";
/**
 * The rejoin sentence WITHOUT a level name ("the first level"), for a site that cannot read the public status.
 * Every left state draws `rejoinNoteText(firstLevelLabel)` instead, inside `[data-cw-circle-rejoin-note]`, and
 * the browser puts the API's first-level label in ("Level 1 · Pearl", R5.1) as soon as the host hands it over.
 */
export declare const REJOIN_NOTE: string;
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
/**
 * The header chip for a signed-in member: the flat mark and the balance in
 * euros ("€72.40"). The live jewel opens in the account menu, so three.js never
 * loads on a page just because the header is there (surfaces §9 Q2 default).
 */
export declare function circleChipHTML(s: CircleSummary | null): string;
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
export declare function circlePanelRowHTML(s: CircleSummary | null, x?: PanelCircleExtras): string;
/** The menu block for a member who left: the date and Rejoin, nothing else. "" when null. */
export declare function circlePanelLeftHTML(l: CircleLeftModel | null, firstLevelLabel?: string): string;
/** R5.4: under the minimum age, one line and nothing else. */
export declare function circlePanelMinorHTML(minor: {
    minAge: number | null;
} | null): string;
/** The whole menu block for one summary state. */
export declare function circlePanelStateHTML(st: CircleSummaryState | null, x?: PanelCircleExtras): string;
/** "You left Carisma Circle on 14 November 2026" (Malta date; no date when the server gave none). */
export declare function leftText(l: CircleLeftModel): string;
/** The Overview card for a member who left. "" when null. */
export declare function circleOverviewLeftHTML(l: CircleLeftModel | null, firstLevelLabel?: string): string;
/** R5.4 on the account: one line, nothing else. */
export declare function circleOverviewMinorHTML(minor: {
    minAge: number | null;
} | null): string;
/**
 * The Hero: jewel 240, level, balance, reading, what ends first, ONE next step,
 * ONE action, conditions. `say` replaces the next step (the thank-you page's
 * gain sentence); `conditions: "earned"` on an earned moment.
 */
export declare function circleHeroHTML(m: CircleModel | null, x?: CircleExtras & {
    say?: string;
    conditions?: "earned" | "spend";
    action?: {
        label: string;
        href: string;
    } | false;
}): string;
export declare function circleLadderHTML(levels: CircleLevelRule[], current: CircleLevelView | null, pointsPerEuro: number, x?: CircleExtras & {
    earnPerEuro?: number;
}): string;
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
export declare function readCircleActivity(body: unknown, pointsPerEuro?: number): {
    items: CircleActivityItem[];
    nextCursor: string | null;
} | null;
export declare function circleActivityRowsHTML(items: CircleActivityItem[]): string;
export declare function circleActivityHTML(m: CircleModel, activity: {
    items: CircleActivityItem[];
    nextCursor: string | null;
} | null, opts?: {
    limit?: number;
    moreHref?: string;
}): string;
/**
 * Overview's Circle block: the Circle panel (her Hero on the left; the level
 * track with what the next level unlocks and what hers gives on the right),
 * then what her points buy (photo cards, filled after a second read), more
 * ways to earn, and three rows of activity. "" for null.
 */
export declare function circleOverviewHTML(m: CircleModel | null, x?: CircleExtras & {
    rewards?: CircleReward[] | null;
    activity?: {
        items: CircleActivityItem[];
        nextCursor: string | null;
    } | null;
}): string;
/**
 * Carisma credit as its own line in the Wallet, NOT added to "Available to
 * spend" (points pay one whole treatment, never part of a bill). "" when null.
 */
export declare function circleWalletLineHTML(m: CircleModel | null): string;
/** The one quiet line under the Wallet button: the card identifies her; it never pays. */
export declare const CIRCLE_CARD_LINE = "Your card shows the desk who you are. Paying with points at the desk needs the code in the Carisma app.";
/**
 * Which Wallet this browser may offer: "apple" on an iPhone or iPad in Safari, "google" on Android in Chrome,
 * null everywhere else (never on a desktop browser, ADDENDUM KIT-4). `touchPoints` tells iPadOS (which reports
 * a Mac) from a Mac.
 */
export declare function circleWalletPlatform(ua: string, touchPoints?: number): "apple" | "google" | null;
/**
 * `GET /client/wallet/availability` → the Circle card per platform (`circle: {apple, google}`, ADD-W4). Any
 * other shape — the old `{apple, google}` with no `circle`, an error, garbage — is "no".
 */
export declare function readCircleWalletAvailability(body: unknown): {
    apple: boolean;
    google: boolean;
};
/** The "Your card" block for one platform. Its button is bound by browser.ts (`data-cw-circle-wallet`). */
export declare function circleCardBlockHTML(which: "apple" | "google"): string;
export interface CircleViewInput extends CircleExtras {
    me: CircleModel;
    activity: {
        items: CircleActivityItem[];
        nextCursor: string | null;
    } | null;
    rewards: CircleReward[] | null;
    perks?: CirclePerks | null;
    /** The member's "Offers and reminders" answer (null = the box is not drawn). */
    prefs?: CirclePrefs | null;
}
/** The whole Credit & rewards page body. "" when the member read is null. */
export declare function circleViewHTML(input: CircleViewInput | null): string;
/** The Credit & rewards page for a member who left: the date, Rejoin, then "Offers and reminders". */
export declare function circleLeftViewHTML(input: {
    left: CircleLeftModel;
    prefs?: CirclePrefs | null;
    firstLevelLabel?: string;
    whatsappPref?: boolean;
} | null): string;
/** R5.4: the Credit & rewards page under the minimum age: one line. */
export declare function circleMinorViewHTML(minor: {
    minAge: number | null;
} | null): string;
/** GET /client/loyalty/leave, read for the confirm sheet. */
export type LeavePreview = {
    kind: "preview";
    points: number;
    cents: number;
    warning: string;
} | {
    kind: "left";
    left: CircleLeftModel;
};
export declare function readLeavePreview(body: unknown, pointsPerEuro?: number): LeavePreview | null;
export declare function leaveSheetBodyHTML(p: LeavePreview | null, state: "loading" | "ready" | "failed", alert?: string): string;
export declare function leaveSheetFootHTML(p: LeavePreview | null, busy?: boolean): string;
/** POST /client/loyalty/rejoin answered: the member is in again (or never left). */
export declare function readRejoined(body: unknown): boolean;
/** The two consent sentences, word for word. One box per channel; never pre-ticked, never rewarded. */
export declare const OFFERS_EMAIL_SENTENCE = "Email me offers and reminders from Carisma Spa, Carisma Aesthetics and Carisma Slimming.";
export declare const OFFERS_WHATSAPP_SENTENCE = "Send me offers and reminders on WhatsApp from Carisma Spa, Carisma Aesthetics and Carisma Slimming.";
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
export declare function readCirclePrefs(body: unknown): CirclePrefs | null;
export declare function offersState(p: CirclePrefs, channel: OffersChannel): {
    state: "on" | "off" | "mixed";
    onFor: string[];
};
export declare function offersErrorText(code: string): string;
export declare function offersSavedText(p: CirclePrefs, channel: OffersChannel): string;
/**
 * "Offers and reminders". `opts.whatsapp: false` (ADDENDUM KIT-6, `circleWhatsappPref`) leaves the WhatsApp box out
 * (the Slimming WhatsApp number is locked by Meta); the default draws both boxes, as before.
 */
export declare function circlePrefsHTML(p: CirclePrefs | null, msg?: {
    text: string;
    tone: "ok" | "bad";
} | null, busy?: boolean, opts?: {
    whatsapp?: boolean;
}): string;
export declare function circlePrefsSlotHTML(p: CirclePrefs | null, opts?: {
    whatsapp?: boolean;
}): string;
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
    paidWithPoints?: {
        points: number;
    } | null;
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
export declare function creditMoment(input: CreditMomentInput | null | undefined): CreditMoment;
/**
 * floor(eligible euros × points per €1 × multiplier) points — euros paid, VAT-inclusive (BRIEF §2 Earning).
 * `earnPerEuro` is the API's `rules.earnPerEuro` (1 point per €1 today; 1 only as the fallback).
 */
export declare function earnPoints(eligibleCents: number, multiplier?: number, earnPerEuro?: number): number;
/** The member model as the menu summary (the account page has the full read). */
export { summaryOf as circleSummaryOf };
//# sourceMappingURL=circle.d.ts.map