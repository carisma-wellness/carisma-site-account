import { type CircleGemKey } from "./circleMark.js";
/** The v2 QC marker: present in the built kit, and in every v2 Circle node's `data-cw-qc`. */
export declare const CIRCLE_V2_QC = "carisma-circle-v2-20261117";
/** Kept for the attribute name only; v2 nodes carry `CIRCLE_V2_QC`. */
export declare const CIRCLE_QC = "carisma-circle-v2-20261117";
export declare const CIRCLE_HREF = "/account/rewards";
/**
 * The Carisma Circle terms, served by each Circle site at this path (a 308 to
 * the brand's `/terms-conditions#carisma-circle`). Every "Terms" beside a points
 * sentence links here. The terms text itself is not this kit's: it stays the
 * public v1.2 until a Maltese advocate approves v2 (BRIEF §1.12).
 */
export declare const CIRCLE_TERMS_HREF = "/carisma-circle/terms";
/** The fallback only: 20 points = €1, so a point is 5 cents. The API's `rules.pointsPerEuro` wins. */
export declare const CENTS_PER_POINT = 5;
/** Counsel's wording (terms v1.0 §3–§4, surface-consistency row 1), word for word: what never earns. */
export declare const PROMISE_QUALIFIER = "Medical treatments, consultations with a doctor, prescription-only medicines, fees and tips don't earn credit. A gift card someone bought earns for the person who uses it.";
/** Under every Ways to earn (surfaces §0): money earns; a public review, rating, post, tag or share never does. */
export declare const REVIEWS_FOOTNOTE = "We never give points for public reviews, ratings, posts, tags or shares.";
/** v1 name kept for sites that import it; the words are v2's. */
export declare const EARN_TERMS_LINE = "We never give points for public reviews, ratings, posts, tags or shares.";
/** R5.4: a review hold (BE-3 `ON_HOLD`). */
export declare const ON_HOLD_TEXT = "Paying with points is on hold while we review your account";
/**
 * The pay-step disclosure. Counsel's wording (surface-consistency row 6; terms §12–§13: spent credit is never
 * taken from a refund, the balance goes below zero instead), word for word; still true in v2.
 */
export declare const PAY_STEP_DISCLOSURE = "If you cancel, the credit this booking gives you is removed. If you've already used it, your balance can go below zero. We never take it from your refund.";
export declare const M = "data-clarity-mask=\"True\"";
/**
 * The no-break space the design of record writes (`kit.js` NB): "Level 3 · Ruby" never breaks before its number,
 * "1,448 points" never leaves its figure, "Mon 7 Dec" stays one piece, " · Terms" never starts a line.
 */
export declare const NB = "\u00A0";
/**
 * The design's no-break rules applied to a sentence the API wrote (BE-1 sends plain spaces until BE-m): idempotent,
 * so a sentence that already carries them comes back unchanged.
 *  - "Level 4 · Sapphire" → "Level 4 · Sapphire" (it breaks only before the gem name);
 *  - "Fri 20 Nov" → "Fri 20 Nov"; "kept until 31 Dec 2027" → "kept until 31 Dec 2027";
 *  - "1,448 points" → "1,448 points".
 */
export declare function nbWords(s: string): string;
export interface CircleLevelView {
    /** The stone: the API's `level.key`. */
    key: CircleGemKey;
    number: number;
    name: string;
    /** "Level 3 · Ruby" — the API's label (built from number + name only when absent). */
    label: string;
}
/**
 * Which level perks are switched ON (ADDENDUM X2 / BE-i: `perks.live {spaDays, earlyAccess, noDeposit}`, each
 * default false, one setting each). The perk VALUES above are sent whether or not a perk is live (BE-1 always
 * sends Ruby's free Spa day and no deposit), so a surface lists a Spa day, early access or no deposit ONLY while
 * its flag here is true. The rate and the birthday credit are not perks: they always show.
 */
export interface CirclePerksLive {
    spaDays: boolean;
    earlyAccess: boolean;
    noDeposit: boolean;
}
/** Nothing switched on: what an answer with no `live` block means (BE-1 today). */
export declare const PERKS_NOT_LIVE: Readonly<CirclePerksLive>;
export interface CirclePerkSet {
    multiplier: number;
    birthdayCreditCents: number;
    freeSpaDaysPerYear: number;
    earlyAccessHours: number;
    noDeposit: boolean;
    /** Which of the three perks are switched on (only a literal `true` from the API counts). */
    live: CirclePerksLive;
}
export interface CircleLevelRule extends CircleLevelView, CirclePerkSet {
    thresholdCents: number;
}
export interface CircleBrand {
    house: string;
    brandId: string;
    name: string;
}
export interface CircleAction {
    id: string;
    key: string;
    /** For a per-brand action (Instagram): the brand's house and id. */
    house: string;
    brandId: string;
    label: string;
    points: number;
    cents: number;
    done: boolean;
    /** Instagram: the brand's own profile. Without it the server sends no row (BE-1 R1.21). */
    url: string;
}
export interface CircleMember {
    /** "CC 1234 5678" — display only, never an authenticator (R1.25). */
    number: string;
    emailVerified: boolean;
    /** ISO instant while an email change pauses spending (48 h), else "". */
    spendPausedUntil: string;
    /** ADDENDUM BE-e: the Malta day her Circle history starts (YYYY-MM-DD, or a year), "" when the API does not send it. */
    since: string;
}
/**
 * ADDENDUM BE-c (BE-2 sends it on `/me`): a booked visit this year that takes her to the next level. The sentence is
 * the server's ("Your visit on Fri 20 Nov takes you to Level 4 · Sapphire"), never one the kit writes.
 */
export interface CircleLevelOnItsWay {
    level: CircleLevelView;
    appointmentId: string;
    startAt: string;
    sentence: string;
}
/** ADDENDUM BE-j (BE-3): the friends ladder in points, present only while Circle pays THIS member in points. */
export interface CircleReferral {
    ladder: Array<{
        friend: number;
        points: number;
        cents: number;
    }>;
    upToPoints: number;
    upToCents: number;
    /** Her share link, "" when the server has none for her. */
    link: string;
}
/** ADDENDUM BE-k: what booking her next visit before she leaves would add, at the server's own figure. */
export interface CircleRebookNext {
    appointmentId: string;
    startAt: string;
    points: number;
    cents: number;
}
export interface CircleModel {
    /** May be below zero (a refund of points already spent): never charged, recovered from future points. */
    points: number;
    creditCents: number;
    /** The API's balance face, "€72.40 · 1,448 points". */
    display: string;
    /** The server's own "this balance pays for a featured treatment" (BE-2); false when not sent. */
    affordable: boolean;
    belowZero: boolean;
    level: CircleLevelView;
    nextLevel: (CircleLevelView & {
        thresholdCents: number;
    }) | null;
    levelSentence: string;
    /** 0..10000 of the way to the next level. */
    progressBp: number;
    spendThisYearCents: number;
    toNextLevelCents: number;
    heldUntil: string;
    levels: CircleLevelRule[];
    perks: CirclePerkSet | null;
    nextLevelPerks: CirclePerkSet | null;
    brands: CircleBrand[];
    minAge: number | null;
    brandBonusMinCents: number;
    pointsPerEuro: number;
    /** Points per €1 paid at Level 1 (the API's `rules.earnPerEuro`; 1 only as the fallback). */
    earnPerEuro: number;
    /** Booked, not yet paid. */
    pendingPoints: number;
    pendingCents: number;
    /** Points waiting for an email on the account (they land when one is added). */
    awaitingEmail: {
        points: number;
        cents: number;
    } | null;
    pointsExpireAt: string;
    pointsExpireKind: "balance" | "birthday" | "";
    balanceLapse: {
        at: string;
        points: number;
    } | null;
    datedEnds: {
        at: string;
        points: number;
    } | null;
    passport: {
        spa: boolean;
        aesthetics: boolean;
        slimming: boolean;
        count: number;
    };
    fullCircleAt: string;
    actions: CircleAction[];
    actionsDone: number;
    actionsOf: number;
    actionsLeftPoints: number;
    member: CircleMember;
    /** ADDENDUM BE-c: a booked visit that takes her up a level (the server's sentence), or null. */
    levelOnItsWay: CircleLevelOnItsWay | null;
    /** ADDENDUM BE-e: what points paid for this calendar year, in cents; null when the API does not send it. */
    savedThisYearCents: number | null;
    /** ADDENDUM BE-j: the friends ladder, only while the server says it pays her in points; null otherwise. */
    referral: CircleReferral | null;
    /** ADDENDUM BE-k: the rebook figure for her next visit, or null (BE-2 does not send it yet). */
    rebookNext: CircleRebookNext | null;
}
export interface CircleLeftModel {
    /** ISO instant, or "" when the server did not say. */
    leftAt: string;
}
/** What the member read says: live, left, under the minimum age, or nothing to show (null). */
export type CircleState = {
    kind: "live";
    model: CircleModel;
} | {
    kind: "left";
    left: CircleLeftModel;
} | {
    kind: "minor";
    minAge: number | null;
};
/** The nav balance (`/client/loyalty/summary`): the read-model row, no ledger replay. */
export interface CircleSummary {
    level: CircleLevelView;
    nextLevel: (CircleLevelView & {
        thresholdCents: number;
    }) | null;
    points: number;
    creditCents: number;
    display: string;
    affordable: boolean;
    belowZero: boolean;
    toNextLevelCents: number;
    progressBp: number;
    levelSentence: string;
    pointsExpireAt: string;
    memberNumber: string;
    spendPausedUntil: string;
    pointsPerEuro: number;
    /** Points per €1 paid before the multiplier (`rules.earnPerEuro` when the summary sends it; 1 only as the fallback). */
    earnPerEuro: number;
    /** "€20.00 of it until Mon 7 Dec": the soonest dated part of the balance (BE-1 R1.14), or null. */
    datedEnds: {
        at: string;
        points: number;
    } | null;
    /** The last day she keeps her level (YYYY-MM-DD), or "". */
    heldUntil: string;
    /**
     * Paid this year, and the two perk rows, only when the summary sends them (BE-1's built summary does
     * not yet: BRIEF §9 ask). Without them the menu reads `/me` once for the unlock line and the caption.
     */
    spendThisYearCents: number | null;
    perks: CirclePerkSet | null;
    nextLevelPerks: CirclePerkSet | null;
    /** ADDENDUM BE-c on the summary, only when the server sends it there (BE-2 sends it on `/me` only). */
    levelOnItsWay: CircleLevelOnItsWay | null;
}
export type CircleSummaryState = {
    kind: "live";
    summary: CircleSummary;
} | {
    kind: "left";
    left: CircleLeftModel;
} | {
    kind: "minor";
    minAge: number | null;
};
/** `GET /public/loyalty/status` v2: what a signed-out visitor may be told. */
export interface CircleStatus {
    levels: CircleLevelRule[];
    pointsPerEuro: number;
    earnPerEuro: number;
    retailBoostPct: number;
    rebookSharePct: number;
    brandBonusPoints: number[];
    brandBonusMinCents: number;
    actions: Array<{
        key: string;
        points: number;
        perBrand: boolean;
        brands: Array<{
            house: string;
            brandId: string;
            url: string;
        }>;
    }>;
    expiry: {
        inactiveMonths: number;
        noticeDaysBefore: number[];
        birthdayUseByDays: number;
    };
    brands: CircleBrand[];
    minAge: number | null;
}
export declare function obj(v: unknown): Record<string, unknown> | null;
export declare function int(v: unknown, fallback?: number): number;
export declare function num(v: unknown, fallback?: number): number;
export declare function str(v: unknown): string;
/**
 * The sites that may show the Circle: Carisma Spa, Carisma Aesthetics and Carisma Slimming ONLY (ADDENDUM KIT-6:
 * an allow-list, never "anything but Medical"). An unknown site ("" — localhost, an App Runner host), Carisma Hair
 * Clinic, Pulse and Carisma Medical are all false, so a host must name its brand (`siteBrand`) to show it.
 */
export declare function circleAllowedOn(siteBrand?: string): boolean;
/** A level from the wire, or null (no gem key = a v1 or unknown level: never guessed). */
export declare function levelFrom(raw: unknown): CircleLevelView | null;
/**
 * ADDENDUM BE-c: `{level, appointmentId, startAt, sentence}` → the model, or null for anything less (the sentence
 * is the server's own, so without one nothing is drawn; never a sentence the kit makes up).
 */
export declare function levelOnItsWayFrom(raw: unknown): CircleLevelOnItsWay | null;
/** ADDENDUM BE-j: `/me.referral` → the ladder, only while `payInPoints` is literally true and it carries a top. */
export declare function referralFrom(raw: unknown): CircleReferral | null;
/** ADDENDUM BE-k: `/me.rebookNext` → the figure, or null (the server's own figure only). */
export declare function rebookNextFrom(raw: unknown): CircleRebookNext | null;
/**
 * A place's own `live` block (`{spaDays, earlyAccess, noDeposit}`), else its `perks.live` (a `levels[]` step may
 * nest it), or null when the place sent none. Only a literal `true` switches a perk on.
 */
export declare function perksLiveFrom(raw: unknown): CirclePerksLive | null;
/** The switched-on brands, never Carisma Medical (it never joins; this holds if a stray row ever arrived). */
export declare function brandsFrom(raw: unknown): CircleBrand[];
/**
 * `/client/loyalty/me` (v2) → the model, or null when the programme is not
 * live for this member: `enabled` anything but `true`, left, minor, no credit
 * block, a level whose key is not a gem (a v1 answer), a non-object body.
 */
export declare function readCircle(body: unknown): CircleModel | null;
/** `/client/loyalty/me` → the left state, or null. Only a clean `enabled: true` + `left: true`. */
export declare function readCircleLeft(body: unknown): CircleLeftModel | null;
/** One read, four outcomes: live, left, minor (R5.4: one line only), or null (draw nothing). */
export declare function readCircleState(body: unknown): CircleState | null;
/** `/client/loyalty/summary` (or the session's folded `loyalty`) → the nav balance, or null. */
export declare function readCircleSummary(body: unknown): CircleSummary | null;
export declare function readCircleSummaryState(body: unknown): CircleSummaryState | null;
/** A member model is a summary too (the account page has the full read; the menu needs only these). */
export declare function summaryOf(m: CircleModel): CircleSummary;
/** `GET /public/loyalty/status` v2 → what a signed-out page may say, or null (off, v1, garbage). */
export declare function readCircleStatus(body: unknown): CircleStatus | null;
/** "€62.00" — credit is always two decimals; below zero "−€3.50". */
export declare function creditText(cents: number): string;
/** "1,240 points" / "1 point" — the figure and its word never part (a no-break space, the design's `CK.S.points`). */
export declare function pointsText(points: number): string;
/** One figure, euro first: "€65.00 · 1,300 points", never broken inside (the design's reward and earn figures). */
export declare function creditPointsText(cents: number, points: number): string;
/** "€40" — level-spend euros are whole and rounded UP (never undersell a gap). */
export declare function wholeEuroUp(cents: number): string;
/** "€960" — paid this year, whole euros rounded DOWN (never oversell progress). */
export declare function wholeEuroDown(cents: number): string;
/** Points → their euro value at the programme's rate: "€21.00". */
export declare function pointsEuroText(points: number, pointsPerEuro: number): string;
/**
 * "7.5%" — what a level gives back: points per €1 (`earnPerEuro`, 1 when the API does not say) × the level
 * multiplier × (100 / points per euro) percent of every euro paid.
 */
export declare function rateText(multiplier: number, pointsPerEuro: number, earnPerEuro?: number): string;
/** A calendar day (YYYY-MM-DD) or an instant → "7 Dec" in Malta. Days are read as Malta days, never shifted. */
export declare function maltaDayShort(iso: string): string;
/** "31 Dec 2027". */
export declare function maltaDayLong(iso: string): string;
/** "Mon 7 Dec" in Malta (a calendar day is read as that Malta day). */
export declare function maltaDayWeek(iso: string): string;
/** "five" for 5 (the level count printed in words, from `levels.length`); digits past ten. */
export declare function countWord(n: number): string;
/** "Thu 19 Nov, 20:15" in Malta. */
export declare function maltaWhen(iso: string): string;
/**
 * R5.2 — the brands a member can use their points at, from `brands[]`:
 * one → "Carisma Spa"; two → "Carisma Spa and Carisma Aesthetics";
 * three → "Carisma Spa, Aesthetics and Slimming". "" when none is known.
 */
export declare function brandsLine(brands: ReadonlyArray<{
    name: string;
}>): string;
/**
 * "For one whole treatment at Carisma Spa" (the conditions line, without its Terms link). In this line each brand's
 * full name keeps "Carisma" and its word together ("Carisma Spa, Aesthetics and Slimming"), as `CK.S.cond`.
 */
export declare function conditionsText(brands: ReadonlyArray<{
    name: string;
}>): string;
/** On an earned moment: "For one whole treatment · Comes off if this booking is cancelled" (`CK.S.condEarned`). */
export declare const CONDITIONS_EARNED = "For one whole treatment\u00A0\u00B7\u00A0Comes off if this booking is cancelled";
/** The joiner before a sentence's Terms link: " · " held to the words around it (`CK.S`'s NB·NB). */
export declare const TERMS_JOIN = "\u00A0\u00B7\u00A0";
/** "Terms" as a link, or "" when the site has no terms page to point at. */
export declare function termsLinkHTML(href: string | null | undefined, label?: string): string;
/** A sentence with " · Terms" at its end (escaped). */
export declare function withTermsHTML(text: string, termsHref: string | null | undefined): string;
/** R5.4: the reading under the balance. Below zero / nothing yet / ready to use / just the points. */
export declare function readingText(m: {
    points: number;
    affordable: boolean;
    belowZero: boolean;
}, rate?: string): string;
/** The rate a member's level gives (from her perks), e.g. "7.5%". "" when not known. */
export declare function memberRate(m: CircleModel): string;
/** The level sentence: the API's words, or at the top level "Our highest level, kept until 31 Dec 2027". */
export declare function levelSentenceText(m: {
    levelSentence: string;
    nextLevel: unknown;
    heldUntil?: string;
}): string;
/**
 * ADDENDUM X4: the dated part of her balance, directly under the balance it describes: "€20.00 of it until
 * Mon 7 Dec". "" when nothing in the balance is dated.
 */
export declare function datedText(d: {
    at: string;
    points: number;
} | null | undefined, pointsPerEuro: number): string;
/**
 * When the ending-soon sentence takes over from the dated part: inside the LAST expiry notice before the day (the
 * programme sends them at 60 and 14 days, BE-1 `expiry.noticeDaysBefore`). The design draws it a week before
 * (Mon 30 Nov for a lot ending Mon 7 Dec) and the dated part 17 to 23 days before; a 14-day window agrees with every
 * state it draws, a 60-day one does not (ADD-V1 README "Expiry"). The public status sends the notice days
 * (`expiry.noticeDaysBefore`): a caller that has them passes the smallest; this is the fallback only.
 */
export declare const ENDING_SOON_DAYS = 14;
/**
 * ADDENDUM X5 (the rollout's `CK.S.expiring`): "Your €20.00 birthday credit ends Mon 7 Dec. Use it on a treatment
 * before then." — only while her birthday credit is the part that ends first AND it ends within `withinDays` Malta
 * days of `now`; "" otherwise (then the dated part under the balance says it, X4).
 */
export declare function expiringText(m: {
    pointsExpireKind: string;
    datedEnds: {
        at: string;
        points: number;
    } | null;
    pointsPerEuro: number;
}, now?: number, withinDays?: number): string;
/** Whole Malta calendar days from `now` to a day (YYYY-MM-DD) or an instant; null when unreadable. */
export declare function maltaDaysUntil(iso: string, now?: number): number | null;
/** R5.4 + R1.14: the line under the balance that says what ends first. "" when nothing is close. */
export declare function endsText(m: CircleModel): string;
/** "Paying with points is paused until Thu 19 Nov, 20:15" (an email change pauses spending 48 h). */
export declare function pausedText(untilIso: string): string;
/** R5.4 under-18: one line, nothing else. */
export declare function minorText(minAge: number | null): string;
/** R5.5: "Carisma Circle is for people aged 18 and over" (+ Terms where drawn). */
export declare function ageLineText(minAge: number | null): string;
/** The CEO's sentence for an earned moment (R5.2, R5.4; `CK.S.gainLong`, the curly apostrophe included). */
export declare function gainText(earnedCents: number, brands: ReadonlyArray<{
    name: string;
}>, affordable: boolean): string;
/** "€11.90 · 238 points on the way when you pay". */
export declare function onTheWayText(cents: number, points: number): string;
/** "Paid with points · 2,180 points". */
export declare function paidWithPointsText(points: number): string;
/** "Earns €5.45 · 109 points" — the server's earn figure for a treatment (public earn, Level 1 for a guest). */
export declare function earnsText(cents: number, points: number): string;
/** The ONE action under a Card or Hero. */
export declare function actionText(m: {
    affordable: boolean;
    belowZero: boolean;
    points: number;
}): string;
/**
 * Beside every Rejoin: counsel's sentence (surface-consistency row 8, terms §13) with the retired level name
 * replaced by the API's first-level label ("Level 1 · Pearl", R5.1); without one, "the first level".
 */
export declare function rejoinNoteText(firstLevelLabel?: string): string;
/**
 * The sign-in dialog's line (R5.2, R5.5), live only: "Your Carisma account
 * collects Carisma credit at Carisma Spa." + "+50 points when you sign in with
 * your email" (from the status's `verified_email` action). "" when off.
 */
export declare function signInLineText(status: CircleStatus | null): {
    line: string;
    bonus: string;
    age: string;
} | null;
//# sourceMappingURL=circleCore.d.ts.map