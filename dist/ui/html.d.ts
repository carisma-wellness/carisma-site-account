/**
 * Shared HTML helpers + the two account glyphs. String builders on purpose: a
 * brand site renders the byte-identical guest chip into its server HTML (W-1),
 * and the client hydrates from a cookie post-mount with the same markup shape.
 * No framework is imported — the site owns the React/Next shell.
 */
/** Escape the five HTML-significant characters. Personal strings are also masked. */
export declare function escapeHtml(input: unknown): string;
/** Signed-out: a person outline. Never a padlock, never the words "Log in" (4.1). */
export declare const GUEST_GLYPH_SVG: string;
/** Signed-in, no initials available: the same silhouette, filled. */
export declare const SIGNED_GLYPH_SVG: string;
//# sourceMappingURL=html.d.ts.map