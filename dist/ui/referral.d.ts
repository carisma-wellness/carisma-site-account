/**
 * Refer a friend, the 24 Nov 2026 flow (12-Tech/Docs/refer-a-friend-flow-2026-11-24).
 *
 * ONE place for everything a brand site says or sends about a referral:
 *  - the brand keys (spa | aesthetics | slimming; Medical, Hair Clinic and Pulse never),
 *  - the link shape `<brand origin>/r/<CODE>`,
 *  - the share message (Mert, 24 Nov: a warm sentence with the link at the END, never a bare link;
 *    amounts from the API, never typed),
 *  - the email subject + body, the WhatsApp / text / email hrefs, the Remind note for a friend who
 *    joined and has not booked,
 *  - the friend's claim (POST /client/referrals/claim through the member proxy) and the signed-in
 *    friend's gift (`friendGift[brand]` on GET /client/referrals/me).
 *
 * Pure apart from `claimReferral` / `readFriendGift`, which take their fetch.
 * Marker: referral-flow-20261124
 */
export declare const REFERRAL_FLOW_MARKER = "referral-flow-20261124";
export type ReferralBrandKey = "spa" | "aesthetics" | "slimming";
export declare const REFERRAL_BRANDS: readonly ReferralBrandKey[];
export declare const REFERRAL_BRAND_NAME: Record<ReferralBrandKey, string>;
/** The public www origin of each brand: the link a friend opens. */
export declare const REFERRAL_BRAND_ORIGIN: Record<ReferralBrandKey, string>;
/** A brand name, slug or host → its key, or null (Medical, Hair Clinic, Pulse, unknown). */
export declare function referralBrandKey(brand: string | null | undefined): ReferralBrandKey | null;
/** A code as the link carries it: upper-case, separators out, the forgiving O→0, I/L→1 reading. Null if not a code. */
export declare function referralLinkCode(raw: string | null | undefined): string | null;
/** `<brand origin>/r/<CODE>` — the one link shape (contract §5). */
export declare function referralLink(brand: ReferralBrandKey, code: string, origin?: string | null): string;
/** "https://www.carismaspa.com/r/X" → "carismaspa.com/r/X" (what the link card shows). */
export declare function referralLinkLabel(url: string): string;
/** The friend's side as the API sends it (lookup `friend`, `programmes[].friend`, public status `earning.referral.friend`). */
export interface ReferralFriendOffer {
    type: "AMOUNT_OFF" | "PERCENT_OFF";
    valueCents: number | null;
    valuePercent: number | null;
    minSpendCents: number | null;
    maxDiscountCents: number | null;
}
/** Read any of the API's friend-offer shapes. Null when it says nothing we can word honestly. */
export declare function readFriendOffer(raw: unknown): ReferralFriendOffer | null;
/** €20, €20.50 — whole euros without the cents. */
export declare function euroShort(cents: number): string;
/** "€20 off" / "10% off". Null without an offer. */
export declare function offerHeadline(o: ReferralFriendOffer | null): string | null;
/** "€20" — the amount alone, for "Claim my €20". Null for a percentage or none. */
export declare function offerAmount(o: ReferralFriendOffer | null): string | null;
export interface ShareInput {
    brand: ReferralBrandKey;
    link: string;
    offer: ReferralFriendOffer | null;
    /** The brand's display name; defaults to the key's. */
    brandName?: string;
}
/**
 * "I've been going to Carisma Spa and I think you'd love it. Here's €20 off your first visit
 * (anything from €50) with my link: https://www.carismaspa.com/r/NPAAD04J"
 * The link is ALWAYS last; the amount and the minimum come from the API or are left out.
 */
export declare function referralShareMessage(i: ShareInput): string;
/** Subject: "€20 off your first visit at Carisma Spa". */
export declare function referralEmailSubject(i: ShareInput): string;
export declare function referralEmailBody(i: ShareInput): string;
export declare function whatsappHref(text: string): string;
export declare function smsHref(text: string): string;
export declare function mailtoHref(subject: string, body: string): string;
/** The note the SHARER sends a friend who joined and has not booked (Carisma never messages the friend). */
export declare function referralRemindMessage(i: ShareInput & {
    friendFirstName?: string | null;
}): string;
export type ClaimState = "READY" | "OWN_LINK" | "NOT_NEW" | "NOT_FOUND";
export interface FriendGift {
    code: string;
    brand: ReferralBrandKey;
    referrerFirstName: string | null;
    offer: ReferralFriendOffer | null;
    expiresAt: string | null;
}
export interface ClaimAnswer {
    state: ClaimState;
    gift: FriendGift | null;
}
/** A claim answer body → state + gift. Null for anything not understood (treated as silence). */
export declare function readClaimAnswer(body: unknown, brand: ReferralBrandKey): ClaimAnswer | null;
type FetchLike = (url: string, init?: Record<string, unknown>) => Promise<{
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
}>;
/**
 * Save the friend's gift to the signed-in account (POST /client/referrals/claim through the member proxy).
 * Never throws: an older API (404), a refusal or a network error answers null and the caller stays silent;
 * the code is still applied as a normal promo code at the pay step.
 */
export declare function claimReferral(fetchImpl: FetchLike, code: string, brand: ReferralBrandKey): Promise<ClaimAnswer | null>;
/** `friendGift[brand]` from a GET /client/referrals/me body, or null. */
export declare function friendGiftFrom(body: unknown, brand: ReferralBrandKey): FriendGift | null;
/** The signed-in member's own code (GET /client/referrals/me `code`), upper-cased, or null. */
export declare function ownCodeFrom(body: unknown): string | null;
/** Read GET /client/referrals/me through the member proxy. Null when signed out, refused or unreachable. */
export declare function readMyReferrals(fetchImpl: FetchLike): Promise<unknown | null>;
/** What the friend is told after a claim, per state (WebFriendJoin / landing states). */
export declare function claimStateText(a: ClaimAnswer, brandName: string): {
    title: string;
    line: string;
};
export {};
//# sourceMappingURL=referral.d.ts.map