export declare const MEMBER_RECORDS_QC = "account-records-20260922";
export interface GiftCardView {
    code: string;
    balance: number;
    originalValue: number;
    expiresAt: string | null;
    from: string | null;
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
export declare function walletHTML(m: WalletModel): string;
export interface StatementLineView {
    description: string;
    amountDue: number;
    amountPaid: number;
    total: number;
    when: string;
    appointmentId: string | null;
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
}
export declare function buildDocumentsModel(body: unknown): DocumentView[];
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
export declare function membershipHTML(m: MembershipModel): string;
//# sourceMappingURL=records.d.ts.map