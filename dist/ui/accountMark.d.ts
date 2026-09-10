export declare const MEMBER_HREF = "/member";
export declare const PANEL_HREF = "#account-panel";
/** The hydration hook + the QC stamp the boundary/QC scripts and tests look for. */
export declare const ACCOUNT_MARK_ATTR = "data-carisma-account-mark";
export declare const ACCOUNT_MARK_QC = "account-mark-20260908";
export interface AccountMarkState {
    signedIn: boolean;
    initials: string;
    /** signed-out opens the /member door; signed-in opens the side panel */
    href: string;
    ariaLabel: string;
    session: "in" | "out";
}
/** The post-mount decision, derived from the host cookie alone. */
export declare function accountMarkState(cookie: string | null | undefined): AccountMarkState;
export interface AccountMarkOptions {
    /** optional desktop label ("Account"); the initials chip replaces it when signed in */
    label?: string;
    /** extra classes the brand's CSS sizes the box with (44px below lg, 40px from lg) */
    className?: string;
}
/**
 * The byte-identical server markup — always the guest state. This is the only HTML
 * CloudFront ever holds for the mark, so it must never branch on a cookie.
 */
export declare function accountMarkServerHTML(opts?: AccountMarkOptions): string;
/**
 * The inner markup for the signed-in chip, swapped in during hydration. The initials
 * carry data-clarity-mask="True" (W-25): Microsoft Clarity records this DOM with no
 * consent gate, and a rendered name is neither a number nor an address, so it is not
 * masked by Clarity's default mode.
 */
export declare function accountMarkSignedInHTML(initials: string): string;
//# sourceMappingURL=accountMark.d.ts.map