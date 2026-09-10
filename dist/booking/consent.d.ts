/**
 * src/booking/consent.ts — the marketing tick rules (8.6, W-17, W-23).
 *
 * Three defects close together in the live kit: the box is pre-ticked
 * (reducer.ts:72-76@87e2670), it names "Carisma Spa" on four brands
 * (DetailsStep.tsx:306@87e2670), and its value never reaches CarismaSoft
 * (GUEST_CHECKOUT_WIRE_KEYS has no such key). This file is the single source of
 * the corrected rule:
 *   guest, any brand  -> tick SHOWN, UNTICKED, named for THIS brand, recorded
 *   member            -> tick HIDDEN (the account already carries a per-brand
 *                        preference; a checkout is not the place to re-ask)
 * The unticking and the brand naming ship unconditionally, so a rollback
 * (ACCOUNT_LOGIN=off) still corrects them (W-23).
 */
import type { BookingSession } from "./types.js";
/** The consent value a fresh Step 3 starts from. Never pre-ticked (8.6). */
export declare const MARKETING_DEFAULT_CHECKED = false;
/** Shown for a guest, hidden for a member (W-17). */
export declare function showMarketingConsent(session: BookingSession): boolean;
export interface MarketingConsentField {
    /** Whether the tick renders at all. */
    shown: boolean;
    /** Always false on first render — the box is never pre-ticked. */
    checked: boolean;
    /** The brand this consent is for — never a hard-coded "Carisma Spa". */
    brandName: string;
    /** The label the tick carries, naming this brand and the unsubscribe route. */
    label: string;
}
/**
 * Build the consent field for a brand. `brandName` is required and has no
 * default, so a fork that forgets it fails loudly rather than silently naming
 * the wrong brand — the exact regression W-23 forbids.
 */
export declare function marketingConsentField(session: BookingSession, brandName: string): MarketingConsentField;
//# sourceMappingURL=consent.d.ts.map