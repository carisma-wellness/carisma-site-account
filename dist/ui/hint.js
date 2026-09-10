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
export const HINT_SIGNED_IN = "cw-signed-in";
export const HINT_INITIALS = "cw-initials";
/** True only when the host cookie cw-signed-in=1 is present. No network, ever. */
export function readSignedInHint(cookie) {
    return new RegExp(`(?:^|;\\s*)${HINT_SIGNED_IN}=1(?:;|$)`).test(cookie || "");
}
/**
 * One or two Latin letters, upper-cased. Anything else (digits, three letters, a
 * tag, punctuation) is absent — the header falls back to the silhouette rather than
 * render attacker-controlled text.
 */
export function readInitialsHint(cookie) {
    const m = (cookie || "").match(new RegExp(`(?:^|;\\s*)${HINT_INITIALS}=([A-Za-z]{1,2})(?:;|$)`));
    return m && m[1] ? m[1].toUpperCase() : "";
}
//# sourceMappingURL=hint.js.map