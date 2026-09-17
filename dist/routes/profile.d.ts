/**
 * Minimisation applied in the site route handler, on the server, never in the browser
 * (40- 5.2, 6.3). The full email address never reaches page JavaScript; the panel and
 * the header see a masked address and the initials only.
 */
export interface MaskedProfile {
    firstName: string;
    lastName: string;
    emailMasked: string;
    countryCode: string | null;
    phone: string | null;
    initials: string;
    /**
     * The member's own profile photo (CarismaSoft `profilePicture`), https only — the
     * one they uploaded in the Customer App, or the Google picture stored on a first
     * social sign-in. It is their own face on their own screen, so it is not masked;
     * it is also the ONE profile field the header paints, and it never enters a cookie.
     */
    avatarUrl: string | null;
}
export declare function initialsFrom(firstName?: string, lastName?: string, email?: string): string;
export declare function maskEmail(email?: string): string;
export declare function maskProfile(raw: unknown): MaskedProfile;
//# sourceMappingURL=profile.d.ts.map