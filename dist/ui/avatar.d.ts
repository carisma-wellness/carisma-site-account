/** Cache TTL for a fetched photo URL. Shorter than the backend's 1h presigned expiry. */
export declare const AVATAR_CACHE_TTL_MS: number;
/** sessionStorage key. Per tab, per origin: it holds a URL, never a token. */
export declare const AVATAR_CACHE_KEY = "cw-avatar";
/**
 * Accept only an absolute https URL. Anything else — `javascript:`, `data:`, a relative
 * path, a hostile string — is treated as absent, so a compromised upstream field can
 * paint no markup and fetch nothing. The length cap keeps a pathological presigned URL
 * out of storage.
 */
export declare function sanitizeAvatarUrl(raw: unknown): string | null;
/** Read `profile.avatarUrl` (or a raw `profilePicture`) out of a session/profile body. */
export declare function avatarUrlFromSession(body: unknown): string | null;
/**
 * The <img> layered over the initials. `data-clarity-mask` for the same reason the
 * initials carry it (W-25): Clarity records this DOM with no consent gate and a face is
 * the most personal thing on the page. `onerror` removes the node, revealing the chip.
 */
export declare function accountMarkPhotoHTML(url: string): string;
//# sourceMappingURL=avatar.d.ts.map