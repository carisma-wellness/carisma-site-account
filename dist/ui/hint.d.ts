/**
 * The readable host hints the site's own server stamps after sign-in, and the ONLY
 * thing the header reads to decide its appearance (W-2, W-4). These are set by a
 * server Set-Cookie of /api/auth/*, never by document.cookie, and are host-only.
 *
 * cw-signed-in : value is always "1"
 * cw-initials  : one or two Latin letters; ANYTHING else is treated as absent so a
 *                crafted cookie cannot paint markup into the header circle. This is
 *                the exact shape check Medical's lib/portal/signedInHint.ts@33c86ac
 *                applies, with the cw- cookie names.
 */
export declare const HINT_SIGNED_IN = "cw-signed-in";
export declare const HINT_INITIALS = "cw-initials";
/** True only when the host cookie cw-signed-in=1 is present. No network, ever. */
export declare function readSignedInHint(cookie: string | null | undefined): boolean;
/**
 * One or two Latin letters, upper-cased. Anything else (digits, three letters, a
 * tag, punctuation) is absent — the header falls back to the silhouette rather than
 * render attacker-controlled text.
 */
export declare function readInitialsHint(cookie: string | null | undefined): string;
//# sourceMappingURL=hint.d.ts.map