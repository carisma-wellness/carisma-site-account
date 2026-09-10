/** The consent value a fresh Step 3 starts from. Never pre-ticked (8.6). */
export const MARKETING_DEFAULT_CHECKED = false;
/** Shown for a guest, hidden for a member (W-17). */
export function showMarketingConsent(session) {
    return !session.signedIn;
}
/**
 * Build the consent field for a brand. `brandName` is required and has no
 * default, so a fork that forgets it fails loudly rather than silently naming
 * the wrong brand — the exact regression W-23 forbids.
 */
export function marketingConsentField(session, brandName) {
    if (!brandName || !brandName.trim()) {
        throw new Error("marketingConsentField: brandName is required (no 'Carisma Spa' default — W-23).");
    }
    const brand = brandName.trim();
    return {
        shown: showMarketingConsent(session),
        checked: MARKETING_DEFAULT_CHECKED,
        brandName: brand,
        label: `Email me ${brand} offers and news. You can unsubscribe at any time.`,
    };
}
//# sourceMappingURL=consent.js.map