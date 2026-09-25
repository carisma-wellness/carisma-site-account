export declare const MEMBER_RECORDS_QC = "account-records-20260922";
/**
 * What a record view may know about the page around it. Optional: bodyFor is
 * called with answers alone today, and every view renders correctly without
 * it — the name label and the tel link simply do not appear.
 */
export interface RecordsContext {
    /** The member's first name, for the membership card. */
    memberName?: string;
    /** The brand's phone ("+35627802062"), offered beside "speak to the team". */
    contactPhone?: string;
    /**
     * This site's brand ("Carisma Aesthetics"), so Refer a friend leads with this
     * site's programme and the wallet's "Available to spend" counts this site's
     * gift cards.
     */
    siteBrand?: string;
    /** This site's origin, so the shared link is this site's own (https only). */
    siteOrigin?: string;
    /** The clock, for a voucher's expiry (tests pass one). Defaults to now. */
    now?: Date;
}
/** "September 2026" + a sortable "2026-09" key, on the Malta clock. */
export declare function monthOf(raw: string): {
    key: string;
    label: string;
};
export interface GiftCardView {
    code: string;
    balance: number;
    originalValue: number;
    expiresAt: string | null;
    from: string | null;
    brand: string | null;
    /** The wire's brand key ("aesthetics", "spa"), when it sent one. */
    brandKey?: string | null;
    /** A free referral voucher (`origin: "REFERRAL_REWARD"`): treatments only, no cash value. */
    referralReward: boolean;
}
export interface PackageVenueView {
    brandLocationId: string;
    name: string;
}
/** One treatment a package can be booked for. */
export interface PackageTreatmentView {
    serviceId: string;
    serviceOptionId: string | null;
    name: string;
    /** Sessions of THIS treatment still on the package. */
    remaining: number;
}
export interface PackageView {
    /** The ClientPackage id. "" from a server that sends none — then no buttons. */
    id: string;
    name: string;
    /** ACTIVE / EXPIRED / CANCELLED / … — "" when the server sent none (treated as active). */
    status: string;
    sessionsLeft: number | null;
    sessionsTotal: number | null;
    expiresAt: string | null;
    amountDue: number;
    /**
     * Sessions the member may book right now (`availableSessions`). A package
     * sold per session unlocks a session as it is paid for, so this can be 0
     * while sessions are left. null from a server that does not send it.
     */
    bookableNow: number | null;
    /** The plan's brand, for the member checkout. "" when not sent. */
    brandId: string;
    /** Where the package can be used. Empty from an older server. */
    venues: PackageVenueView[];
    /** What the package can be booked for, with sessions still on it. */
    treatments: PackageTreatmentView[];
}
/**
 * What a package card offers.
 *
 * The rule the desk asked for (2026-09-25): a package with money still owed
 * offers Pay now AND Book now; a package paid in full offers Book now only.
 * Both are withheld from a package that is not live (expired, cancelled, used
 * up), and Book now is withheld when the server has not told us enough to
 * book it without charging again (no brand, no venue, no treatment) — the
 * site's ordinary booking pop-up is NOT a fallback, because it would take the
 * member's card for a session they have already bought.
 */
export interface PackageActions {
    pay: boolean;
    book: boolean;
    /** Sessions are left but none is unlocked until the next one is paid. */
    lockedUntilPaid: boolean;
}
export declare function packageActions(p: PackageView): PackageActions;
export interface WalletModel {
    giftCards: GiftCardView[];
    packages: PackageView[];
    credit: number;
    isEmpty: boolean;
}
export declare function buildWalletModel(input: {
    giftCards?: unknown;
    packages?: unknown;
    credit?: unknown;
}): WalletModel;
/**
 * "Available to spend": account credit plus what is left on this site's gift
 * cards. A Spa card cannot pay for an Aesthetics treatment, so on the
 * Aesthetics site it is listed but not counted (walletElsewhere names it).
 * Without `siteBrand` (a test, an unknown host) every card counts, as before.
 * Packages are NOT money — they are sessions — so they never add to it, and a
 * spent card (or a negative figure from a bad row) never subtracts from it.
 */
export declare function walletTotal(m: WalletModel, siteBrand?: string): number;
/** What is left on gift cards for OTHER Carisma brands than this site's. 0 without `siteBrand`. */
export declare function walletElsewhere(m: WalletModel, siteBrand?: string): number;
/** "Credit €85.00 · 2 gift cards · 1 package" — only the parts that exist. */
export declare function walletSources(m: WalletModel): string;
export declare function walletHTML(m: WalletModel, ctx?: RecordsContext): string;
export interface StatementLineView {
    description: string;
    kind: string;
    amountDue: number;
    amountPaid: number;
    total: number;
    when: string;
    appointmentId: string | null;
    receiptUrl: string | null;
}
export interface StatementModel {
    totalDue: number;
    due: StatementLineView[];
    history: StatementLineView[];
}
export declare function buildStatementModel(body: unknown): StatementModel;
export declare function statementHTML(m: StatementModel): string;
export interface DocumentView {
    id: string;
    name: string;
    caption: string | null;
    url: string | null;
    uploadedAt: string;
    category: string;
    mimeType: string;
    isImage: boolean;
}
export declare function buildDocumentsModel(body: unknown): DocumentView[];
/** "Laser consent form.pdf" → "Laser consent form". A name that is only an extension keeps it. */
export declare function documentTitle(name: string): string;
export declare function documentsHTML(docs: DocumentView[]): string;
export interface MembershipModel {
    hasMembership: boolean;
    planName: string;
    status: string;
    price: number;
    nextChargeAt: string | null;
    storedValue: number;
    id: string | null;
    canPause: boolean;
    canResume: boolean;
}
export declare function buildMembershipModel(body: unknown): MembershipModel;
export declare function membershipHTML(m: MembershipModel, ctx?: RecordsContext): string;
/**
 * GET /client/referrals/me (referral v2 pack, 06 §3). A member has ONE code,
 * good at every brand whose programme is live; each live brand sends its own
 * card with its own words and link. The page leads with THIS site's programme
 * and lists the others under it.
 *
 * What the member is told about a friend is deliberately thin: an initial, the
 * brand and where the voucher is. Never the treatment, the amount the friend
 * spent, or the day (02 §11).
 */
/**
 * `no_voucher`: the friend qualified and the member's voucher was skipped for a
 * programme reason (a cap, the monthly budget, netting). `not_eligible` is for
 * a friend who did not qualify. Anything newer renders without a chip.
 */
export type ReferFriendStatus = "joined" | "on_its_way" | "rewarded" | "no_voucher" | "not_eligible" | "withdrawn";
export interface ReferProgrammeView {
    brandName: string;
    /** "aesthetics" | "slimming" | "spa" | …: which site family runs this programme. */
    family: string;
    /** The friend's side, as the friend reads it: "€20 off your first visit (minimum spend €50)". */
    offerText: string;
    /** The member's side: "€20 voucher for you". */
    rewardText: string;
    /** "After your friend's visit" | "As soon as your friend has paid". */
    releaseText: string;
    voucherValidityDays: number;
    /** https only; anything else is dropped rather than linked. */
    termsUrl: string | null;
    shareUrl: string | null;
    /**
     * False while a friend using the code here would be refused because of the
     * MEMBER (the brand wants a paid visit first). Nothing is offered to share
     * for this brand then; `referBlockedText` says why. A card without the field
     * (an older backend) can refer.
     */
    canRefer: boolean;
    /** Why not, in the member's own words ("Your code starts working after your first paid visit with us."). */
    referBlockedText: string | null;
}
export interface ReferFriendView {
    id: string;
    /** "A." — the backend sends an initial, never a name. */
    initial: string;
    brandName: string | null;
    /** One of ReferFriendStatus, or whatever a newer server sent (rendered without a chip). */
    status: string;
}
export interface ReferModel {
    code: string;
    /** This site's programme; failing that, the first live one. Null when none is live. */
    programme: ReferProgrammeView | null;
    /** Every other live programme. */
    others: ReferProgrammeView[];
    /** What Share and Copy link send: this site's own link when it runs the programme. */
    shareUrl: string | null;
    friends: ReferFriendView[];
    /** Earned vouchers still to spend, as wallet gift cards (withdrawn, cancelled and expired ones are left out). */
    rewards: GiftCardView[];
    /** Vouchers earned and not yet issued ("€20 on its way"), in euros. */
    pending: number;
}
/**
 * Which site family a brand belongs to. Hair Clinic has no programme of its
 * own: it runs on Aesthetics' (the backend's BRAND_IS_ALIAS), so a Hair Clinic
 * member is shown the Aesthetics card and shares a Hair Clinic link.
 */
export declare function referFamily(brand: string): string;
export declare function buildReferModel(body: unknown, ctx?: RecordsContext): ReferModel;
/** What a share sends, before the link: "Here's €20 off your first visit (…) at Carisma Aesthetics. Use my code 7K2MX9QA when you book." */
export declare function referShareText(p: ReferProgrammeView, code: string): string;
export declare function referHTML(m: ReferModel): string;
//# sourceMappingURL=records.d.ts.map