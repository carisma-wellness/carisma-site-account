/**
 * Shared HTML helpers + the two account glyphs. String builders on purpose: a
 * brand site renders the byte-identical guest chip into its server HTML (W-1),
 * and the client hydrates from a cookie post-mount with the same markup shape.
 * No framework is imported — the site owns the React/Next shell.
 */
/** Escape the five HTML-significant characters. Personal strings are also masked. */
export function escapeHtml(input) {
    return String(input).replace(/[&<>"']/g, (c) => c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;");
}
/** Signed-out: a person outline. Never a padlock, never the words "Log in" (4.1). */
export const GUEST_GLYPH_SVG = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="8" r="3.25"></circle>' +
    '<path d="M5.5 19c.7-3.2 3.3-5 6.5-5s5.8 1.8 6.5 5"></path></svg>';
/** Signed-in, no initials available: the same silhouette, filled. */
export const SIGNED_GLYPH_SVG = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">' +
    '<circle cx="12" cy="8" r="3.25"></circle>' +
    '<path d="M5.5 19c.7-3.2 3.3-5 6.5-5s5.8 1.8 6.5 5"></path></svg>';
//# sourceMappingURL=html.js.map