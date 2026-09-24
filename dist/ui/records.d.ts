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
    /** A free referral voucher (`origin: "REFERRAL_REWARD"`): treatments only, no cash value. */
    referralReward: boolean;
}
export interface PackageView {
    name: string;
    sessionsLeft: number | null;
    sessionsTotal: number | null;
    expiresAt: string | null;
    amountDue: number;
}
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
 * "Available to spend": account credit plus what is left on gift cards.
 * Packages are NOT money — they are sessions — so they never add to it, and a
 * spent card (or a negative figure from a bad row) never subtracts from it.
 */
export declare function walletTotal(m: WalletModel): number;
/** "Credit €85.00 · 2 gift cards · 1 package" — only the parts that exist. */
export declare function walletSources(m: WalletModel): string;
export declare function walletHTML(m: WalletModel): string;
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
//# sourceMappingURL=records.d.ts.map