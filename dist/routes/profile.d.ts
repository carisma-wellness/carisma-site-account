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
}
export declare function initialsFrom(firstName?: string, lastName?: string, email?: string): string;
export declare function maskEmail(email?: string): string;
export declare function maskProfile(raw: unknown): MaskedProfile;
//# sourceMappingURL=profile.d.ts.map