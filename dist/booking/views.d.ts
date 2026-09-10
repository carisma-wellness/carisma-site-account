import type { MarketingConsentField } from "./consent.js";
/** The QC marker on the Step 3 container (14.2). Chunk-only, never in HTML. */
export declare const STEP3_QC = "step3-account-20260908";
/** Data attributes the site's browser wiring binds its dispatches to. */
export declare const STEP3_ATTR: {
    readonly account: "data-carisma-continue-account";
    readonly create: "data-carisma-create-account";
    readonly guest: "data-carisma-book-as-guest";
    readonly memberContinue: "data-carisma-member-continue";
    readonly editDetails: "data-carisma-edit-details";
    readonly signOutLocal: "data-carisma-signout-local";
};
export interface DoorsOptions {
    /** The validated relative return path, e.g. /face-treatments?resume=booking. */
    next: string;
    /** ACCOUNT_GUEST_ENABLED. When false the guest door and the divider vanish. */
    guestEnabled?: boolean;
}
/**
 * State A. The door SET and COPY are fixed by ADR invariant 27; the primary tap
 * carries prompt=login and the secondary prompt=create, and neither ever carries
 * an email address (8.1). "Book as a guest" is a button, not a link: it swaps the
 * guest form in place with no navigation (W-12), so the site's wiring dispatches
 * OPEN_GUEST_DOOR on it.
 */
export declare function step3DoorsHTML(opts: DoorsOptions): string;
export interface ConfirmModel {
    /** The member's full name, shown as static text (masked for Clarity, W-25). */
    name: string;
    emailMasked: string;
    /** A display phone; empty triggers the inline ask (8.4). */
    phoneDisplay: string;
    /** True when the member expanded Edit details (8.2). */
    editing?: boolean;
    /** False when the profile has no usable phone: Continue is disabled (8.4). */
    canContinue?: boolean;
}
/**
 * State B. One Continue, which dispatches SUBMIT_DETAILS with a full GuestDetails
 * built from the profile (8.2, W-10). No marketing tick — the account already
 * carries a per-brand preference (8.6, W-17). Every personal line is masked; the
 * couples second-guest fieldset and the notes box are the SITE's, appended after.
 */
export declare function step3ConfirmHTML(model: ConfirmModel): string;
/**
 * The consent tick HTML for the guest door. Renders ONLY when the field is shown
 * (a member gets nothing). Never pre-ticked, named for this brand — the three
 * defects 8.6 closes. Returns "" when hidden so a member checkout carries no tick.
 */
export declare function marketingTickHTML(field: MarketingConsentField): string;
//# sourceMappingURL=views.d.ts.map